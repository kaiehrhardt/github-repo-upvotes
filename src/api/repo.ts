import type { Issue, LoadStateFilter, PullRequest, Repository, RepositoryResult } from '../types';
import { GitHubApiError, graphql } from './client';
import { calculateReactionCounts, REACTION_FIELDS, type RawReactionNode } from './reactions';

type ConnectionKind = 'issues' | 'pullRequests';

interface RawItemNode extends RawReactionNode {
  number: number;
  title: string;
  url: string;
  state: string;
  createdAt: string;
}

interface Connection {
  totalCount?: number;
  nodes: RawItemNode[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

type RepoResponse = { repository: Partial<Record<ConnectionKind, Connection>> | null };

function statesFor(kind: ConnectionKind, loadState: LoadStateFilter): string {
  if (kind === 'issues') {
    if (loadState === 'open') return '[OPEN]';
    if (loadState === 'closed') return '[CLOSED]';
    return '[OPEN, CLOSED]';
  }
  if (loadState === 'open') return '[OPEN]';
  if (loadState === 'closed') return '[CLOSED, MERGED]';
  return '[OPEN, CLOSED, MERGED]';
}

function buildCountQuery(loadState: LoadStateFilter): string {
  return `
    query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        issues(states: ${statesFor('issues', loadState)}) { totalCount }
        pullRequests(states: ${statesFor('pullRequests', loadState)}) { totalCount }
      }
    }
  `;
}

function buildPageQuery(kind: ConnectionKind, loadState: LoadStateFilter): string {
  return `
    query($owner: String!, $name: String!, $cursor: String) {
      repository(owner: $owner, name: $name) {
        ${kind}(first: 100, after: $cursor, states: ${statesFor(kind, loadState)}, orderBy: {field: CREATED_AT, direction: DESC}) {
          nodes {
            number
            title
            url
            state
            createdAt
            ${REACTION_FIELDS}
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `;
}

async function fetchAllOfKind<T extends Issue | PullRequest>(
  repo: Repository,
  kind: ConnectionKind,
  loadState: LoadStateFilter,
  totalCount: number,
  token: string | null | undefined,
  onProgress: (count: number) => void,
  signal?: AbortSignal
): Promise<T[]> {
  if (totalCount === 0) return [];

  const query = buildPageQuery(kind, loadState);
  const items: T[] = [];
  let cursor: string | null = null;

  // GraphQL cursors can't be computed upfront, so pages are fetched sequentially
  for (;;) {
    const data: RepoResponse = await graphql<RepoResponse>(
      query,
      { owner: repo.owner, name: repo.name, cursor },
      token,
      signal
    );
    const connection = data.repository?.[kind];
    if (!connection) throw new GitHubApiError('Repository not found.', 'NOT_FOUND');

    for (const node of connection.nodes) {
      items.push({
        number: node.number,
        title: node.title,
        url: node.url,
        state: node.state,
        createdAt: node.createdAt,
        reactions: calculateReactionCounts(node),
      } as T);
    }
    onProgress(items.length);

    if (!connection.pageInfo.hasNextPage || connection.nodes.length === 0) break;
    cursor = connection.pageInfo.endCursor;
  }

  return items;
}

/**
 * Fetches all issues and PRs of a repository. Totals are fetched first, then issues and PRs
 * are paginated in parallel.
 */
export async function fetchRepositoryData(
  repo: Repository,
  loadState: LoadStateFilter,
  token: string | null | undefined,
  onProgress?: (issuesCount: number, prsCount: number) => void,
  signal?: AbortSignal
): Promise<RepositoryResult> {
  const counts = await graphql<RepoResponse>(
    buildCountQuery(loadState),
    { owner: repo.owner, name: repo.name },
    token,
    signal
  ).catch((error: unknown) => {
    if (error instanceof GitHubApiError && error.type === 'NOT_FOUND') {
      throw new GitHubApiError(
        'Repository not found. Please check the owner/repo format.',
        'NOT_FOUND'
      );
    }
    throw error;
  });

  if (!counts.repository) {
    throw new GitHubApiError('Repository not found or is private.', 'NOT_FOUND');
  }

  const issuesTotal = counts.repository.issues?.totalCount ?? 0;
  const prsTotal = counts.repository.pullRequests?.totalCount ?? 0;

  let issuesLoaded = 0;
  let prsLoaded = 0;
  const report = () => onProgress?.(issuesLoaded, prsLoaded);

  const [issues, pullRequests] = await Promise.all([
    fetchAllOfKind<Issue>(
      repo,
      'issues',
      loadState,
      issuesTotal,
      token,
      (n) => {
        issuesLoaded = n;
        report();
      },
      signal
    ),
    fetchAllOfKind<PullRequest>(
      repo,
      'pullRequests',
      loadState,
      prsTotal,
      token,
      (n) => {
        prsLoaded = n;
        report();
      },
      signal
    ),
  ]);

  return { issues, pullRequests };
}
