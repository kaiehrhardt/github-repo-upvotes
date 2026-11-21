import type {
  ContributionCounts,
  ContributionDetail,
  ContributionItem,
  ContributionSource,
  Member,
  MemberPage,
  TimeRange,
} from '../types';
import { buildAuthorSearch, chunk } from '../utils';
import { GitHubApiError, graphql, graphqlRaw } from './client';
import { calculateReactionCounts, REACTION_FIELDS, type RawReactionNode } from './reactions';

/** Users per counts query (2 search aliases each). Keeps a single query reasonably fast. */
export const COUNTS_BATCH_SIZE = 10;
const USER_LOOKUP_BATCH_SIZE = 50;
const DETAIL_ITEMS = 20;

type Token = string | null | undefined;

// --- Members ---

interface MemberConnection {
  totalCount: number;
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  nodes: Member[];
}

const FOLLOWERS_QUERY = `
  query($login: String!, $first: Int!, $after: String) {
    owner: user(login: $login) {
      connection: followers(first: $first, after: $after) {
        totalCount
        pageInfo { hasNextPage endCursor }
        nodes { login name avatarUrl }
      }
    }
  }
`;

const ORG_MEMBERS_QUERY = `
  query($login: String!, $first: Int!, $after: String) {
    owner: organization(login: $login) {
      connection: membersWithRole(first: $first, after: $after) {
        totalCount
        pageInfo { hasNextPage endCursor }
        nodes { login name avatarUrl }
      }
    }
  }
`;

async function fetchConnectionMembers(
  query: string,
  login: string,
  cursor: string | null,
  pageSize: number,
  token: Token,
  signal?: AbortSignal
): Promise<MemberPage> {
  const members: Member[] = [];
  let after = cursor;
  let totalCount = 0;
  let hasNextPage = true;

  while (members.length < pageSize && hasNextPage) {
    const first = Math.min(100, pageSize - members.length);
    const data = await graphql<{ owner: { connection: MemberConnection } | null }>(
      query,
      { login, first, after },
      token,
      signal
    );
    if (!data.owner) throw new GitHubApiError(`'${login}' not found.`, 'NOT_FOUND');

    const { connection } = data.owner;
    members.push(...connection.nodes);
    totalCount = connection.totalCount;
    hasNextPage = connection.pageInfo.hasNextPage;
    after = connection.pageInfo.endCursor;
  }

  return { members, totalCount, nextCursor: hasNextPage ? after : null, notFound: [] };
}

async function lookupUsers(
  logins: string[],
  token: Token,
  signal?: AbortSignal
): Promise<{ members: Member[]; notFound: string[] }> {
  const members: Member[] = [];
  const notFound: string[] = [];

  for (const batch of chunk(logins, USER_LOOKUP_BATCH_SIZE)) {
    const vars = batch.map((_, i) => `$l${i}: String!`).join(', ');
    const fields = batch
      .map((_, i) => `u${i}: user(login: $l${i}) { login name avatarUrl }`)
      .join('\n');
    const variables = Object.fromEntries(batch.map((login, i) => [`l${i}`, login]));

    const { data, errors } = await graphqlRaw<Record<string, Member | null>>(
      `query(${vars}) { ${fields} }`,
      variables,
      token,
      signal
    );
    const fatal = errors.find((error) => error.type !== 'NOT_FOUND');
    if (fatal || !data) throw new GitHubApiError(fatal?.message ?? 'Empty response.', 'UNKNOWN');

    batch.forEach((login, i) => {
      const user = data[`u${i}`];
      if (user) members.push(user);
      else notFound.push(login);
    });
  }

  return { members, notFound };
}

/**
 * Loads one page of members for a source. `cursor` is opaque: a GraphQL cursor for
 * followers/org members, or an offset into the login list for `users` sources.
 */
export async function fetchMembersPage(
  source: ContributionSource,
  cursor: string | null,
  pageSize: number,
  token: Token,
  signal?: AbortSignal
): Promise<MemberPage> {
  switch (source.kind) {
    case 'followers':
      return fetchConnectionMembers(FOLLOWERS_QUERY, source.login, cursor, pageSize, token, signal);
    case 'org':
      return fetchConnectionMembers(ORG_MEMBERS_QUERY, source.org, cursor, pageSize, token, signal);
    case 'users': {
      const offset = Number(cursor ?? 0);
      const end = offset + pageSize;
      const { members, notFound } = await lookupUsers(
        source.logins.slice(offset, end),
        token,
        signal
      );
      return {
        members,
        notFound,
        totalCount: source.logins.length,
        nextCursor: end < source.logins.length ? String(end) : null,
      };
    }
  }
}

// --- Counts ---

/**
 * Counts PRs and issues authored by each login within the time range, using GitHub search
 * (issueCount only, so a whole batch costs a single rate limit point).
 */
export async function fetchContributionCounts(
  logins: string[],
  range: TimeRange,
  token: Token,
  signal?: AbortSignal
): Promise<ContributionCounts[]> {
  if (logins.length === 0) return [];

  const now = new Date();
  const variables: Record<string, string> = {};
  const declarations: string[] = [];
  const fields: string[] = [];

  logins.forEach((login, i) => {
    variables[`p${i}`] = buildAuthorSearch(login, 'pr', range, now);
    variables[`i${i}`] = buildAuthorSearch(login, 'issue', range, now);
    declarations.push(`$p${i}: String!`, `$i${i}: String!`);
    fields.push(
      `p${i}: search(type: ISSUE, first: 0, query: $p${i}) { issueCount }`,
      `i${i}: search(type: ISSUE, first: 0, query: $i${i}) { issueCount }`
    );
  });

  const { data, errors } = await graphqlRaw<Record<string, { issueCount: number } | null>>(
    `query(${declarations.join(', ')}) { ${fields.join('\n')} }`,
    variables,
    token,
    signal
  );
  if (!data) {
    throw new GitHubApiError(errors[0]?.message ?? 'Empty response from GitHub API.', 'UNKNOWN');
  }

  return logins.map((login, i) => {
    const prs = data[`p${i}`];
    const issues = data[`i${i}`];
    return {
      login,
      pullRequests: prs?.issueCount ?? 0,
      issues: issues?.issueCount ?? 0,
      unavailable: !prs || !issues,
    };
  });
}

// --- Detail ---

interface RawSearchItem extends RawReactionNode {
  number: number;
  title: string;
  url: string;
  state: ContributionItem['state'];
  createdAt: string;
  repository: { nameWithOwner: string };
}

const ITEM_FIELDS = `
  number
  title
  url
  state
  createdAt
  repository { nameWithOwner }
  ${REACTION_FIELDS}
`;

const DETAIL_QUERY = `
  query($prs: String!, $issues: String!, $first: Int!) {
    prs: search(type: ISSUE, first: $first, query: $prs) {
      nodes { ... on PullRequest { ${ITEM_FIELDS} } }
    }
    issues: search(type: ISSUE, first: $first, query: $issues) {
      nodes { ... on Issue { ${ITEM_FIELDS} } }
    }
  }
`;

function toItem(node: RawSearchItem): ContributionItem {
  return {
    number: node.number,
    title: node.title,
    url: node.url,
    state: node.state,
    createdAt: node.createdAt,
    repository: node.repository.nameWithOwner,
    reactions: calculateReactionCounts(node),
  };
}

/** Latest PRs and issues authored by a user within the time range. */
export async function fetchContributionDetail(
  login: string,
  range: TimeRange,
  token: Token,
  signal?: AbortSignal
): Promise<ContributionDetail> {
  const now = new Date();
  type SearchResult = { nodes: Array<RawSearchItem | Record<string, never>> };
  const data = await graphql<{ prs: SearchResult; issues: SearchResult }>(
    DETAIL_QUERY,
    {
      prs: `${buildAuthorSearch(login, 'pr', range, now)} sort:created-desc`,
      issues: `${buildAuthorSearch(login, 'issue', range, now)} sort:created-desc`,
      first: DETAIL_ITEMS,
    },
    token,
    signal
  );

  const items = (result: SearchResult) =>
    result.nodes.filter((node): node is RawSearchItem => 'number' in node).map(toItem);

  return { pullRequests: items(data.prs), issues: items(data.issues) };
}
