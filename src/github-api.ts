import type {
  Repository,
  Issue,
  PullRequest,
  APIError,
  GraphQLResponse,
  LoadStateFilter,
  Reaction,
} from './types';

const GITHUB_API_URL = 'https://api.github.com/graphql';

// Helper to calculate positive and negative reaction counts from API response
interface ReactionGroup {
  content: string;
  users: { totalCount: number };
}

interface RawReactionNode {
  reactions: {
    totalCount: number;
  };
  reactionGroups: ReactionGroup[];
}

function calculateReactionCounts(node: RawReactionNode): Reaction {
  let positiveCount = 0;
  let negativeCount = 0;

  // Process reaction groups
  for (const group of node.reactionGroups || []) {
    const count = group.users.totalCount;
    switch (group.content) {
      // Positive reactions
      case 'THUMBS_UP':
      case 'HEART':
      case 'HOORAY':
      case 'ROCKET':
      case 'EYES':
      case 'LAUGH': // Adding LAUGH as positive
        positiveCount += count;
        break;
      // Negative reactions
      case 'THUMBS_DOWN':
      case 'CONFUSED':
        negativeCount += count;
        break;
    }
  }

  return {
    totalCount: node.reactions.totalCount,
    positiveCount,
    negativeCount,
  };
}

// Get total counts for issues and PRs
function buildCountQuery(stateFilter: LoadStateFilter): string {
  const issueStates =
    stateFilter === 'open' ? '[OPEN]' : stateFilter === 'closed' ? '[CLOSED]' : '[OPEN, CLOSED]';
  const prStates =
    stateFilter === 'open'
      ? '[OPEN]'
      : stateFilter === 'closed'
        ? '[CLOSED, MERGED]'
        : '[OPEN, CLOSED, MERGED]';

  return `
    query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        issues(states: ${issueStates}) {
          totalCount
        }
        pullRequests(states: ${prStates}) {
          totalCount
        }
      }
    }
  `;
}

// Build separate GraphQL queries for issues and PRs
function buildIssuesQuery(stateFilter: LoadStateFilter): string {
  const states =
    stateFilter === 'open' ? '[OPEN]' : stateFilter === 'closed' ? '[CLOSED]' : '[OPEN, CLOSED]';

  return `
    query($owner: String!, $name: String!, $cursor: String) {
      repository(owner: $owner, name: $name) {
        issues(first: 100, after: $cursor, states: ${states}, orderBy: {field: CREATED_AT, direction: DESC}) {
          nodes {
            number
            title
            url
            state
            createdAt
            reactions {
              totalCount
            }
            reactionGroups {
              content
              users {
                totalCount
              }
            }
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

function buildPullRequestsQuery(stateFilter: LoadStateFilter): string {
  let states: string;
  if (stateFilter === 'open') {
    states = '[OPEN]';
  } else if (stateFilter === 'closed') {
    states = '[CLOSED, MERGED]';
  } else {
    states = '[OPEN, CLOSED, MERGED]';
  }

  return `
    query($owner: String!, $name: String!, $cursor: String) {
      repository(owner: $owner, name: $name) {
        pullRequests(first: 100, after: $cursor, states: ${states}, orderBy: {field: CREATED_AT, direction: DESC}) {
          nodes {
            number
            title
            url
            state
            createdAt
            reactions {
              totalCount
            }
            reactionGroups {
              content
              users {
                totalCount
              }
            }
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

interface FetchResult {
  issues: Issue[];
  pullRequests: PullRequest[];
  error?: APIError;
}

async function makeGraphQLRequest(
  query: string,
  variables: Record<string, unknown>,
  token?: string
): Promise<GraphQLResponse> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(GITHUB_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    if (response.status === 403) {
      throw new Error('RATE_LIMIT');
    }
    throw new Error('NETWORK');
  }

  return response.json();
}

async function fetchAllPages(
  repo: Repository,
  stateFilter: LoadStateFilter,
  token?: string,
  onProgress?: (issuesCount: number, prsCount: number) => void
): Promise<FetchResult> {
  // Step 1: Get total counts first
  const countQuery = buildCountQuery(stateFilter);

  try {
    const countResponse = await makeGraphQLRequest(
      countQuery,
      {
        owner: repo.owner,
        name: repo.name,
      },
      token
    );

    if (countResponse.errors && countResponse.errors.length > 0) {
      const error = countResponse.errors[0];
      if (error.type === 'NOT_FOUND') {
        return {
          issues: [],
          pullRequests: [],
          error: {
            message: 'Repository not found. Please check the owner/repo format.',
            type: 'NOT_FOUND',
          },
        };
      }
      throw new Error(error.message);
    }

    if (!countResponse.data?.repository) {
      return {
        issues: [],
        pullRequests: [],
        error: {
          message: 'Repository not found or is private.',
          type: 'NOT_FOUND',
        },
      };
    }

    const issuesTotal = countResponse.data.repository.issues.totalCount || 0;
    const prsTotal = countResponse.data.repository.pullRequests.totalCount || 0;

    console.log(`[API] Total: ${issuesTotal} issues, ${prsTotal} PRs`);

    // Step 2: Fetch all pages in parallel
    const [issuesResult, prsResult] = await Promise.all([
      fetchAllIssuesParallel(repo, stateFilter, issuesTotal, token, (count) => {
        if (onProgress) onProgress(count, 0);
      }),
      fetchAllPullRequestsParallel(repo, stateFilter, prsTotal, token, (count) => {
        if (onProgress) onProgress(0, count);
      }),
    ]);

    // Check for errors
    if (issuesResult.error) return { issues: [], pullRequests: [], error: issuesResult.error };
    if (prsResult.error) return { issues: [], pullRequests: [], error: prsResult.error };

    return {
      issues: issuesResult.data,
      pullRequests: prsResult.data,
    };
  } catch (error) {
    return {
      issues: [],
      pullRequests: [],
      error: handleFetchError(error).error,
    };
  }
}

// Fetch all issues in parallel by calculating pages upfront
async function fetchAllIssuesParallel(
  repo: Repository,
  stateFilter: LoadStateFilter,
  totalCount: number,
  token?: string,
  onProgress?: (count: number) => void
): Promise<{ data: Issue[]; error?: APIError }> {
  if (totalCount === 0) {
    return { data: [] };
  }

  const pageSize = 100;
  const numPages = Math.ceil(totalCount / pageSize);

  console.log(`[API] Fetching ${numPages} pages of issues...`);

  const query = buildIssuesQuery(stateFilter);

  try {
    // First, we need to get cursors sequentially for the first few pages
    // because GraphQL doesn't let us jump to arbitrary pages
    // So we fetch them sequentially but then fetch the actual data in parallel

    // For now, let's just do the sequential approach but optimized
    let allIssues: Issue[] = [];
    let cursor: string | null = null;

    for (let page = 0; page < numPages; page++) {
      const variables: Record<string, unknown> = {
        owner: repo.owner,
        name: repo.name,
      };

      if (cursor) {
        variables.cursor = cursor;
      }

      const response = await makeGraphQLRequest(query, variables, token);

      if (response.errors && response.errors.length > 0) {
        const error = response.errors[0];
        throw new Error(error.message);
      }

      if (!response.data?.repository) {
        throw new Error('Repository not found');
      }

      const { issues } = response.data.repository;

      if (issues.nodes.length > 0) {
        const transformedIssues = issues.nodes.map((node: any) => ({
          number: node.number,
          title: node.title,
          url: node.url,
          state: node.state,
          createdAt: node.createdAt,
          reactions: calculateReactionCounts(node),
        }));
        allIssues = [...allIssues, ...transformedIssues];
        cursor = issues.pageInfo.endCursor;

        // Report progress
        if (onProgress) {
          onProgress(allIssues.length);
        }

        if (!issues.pageInfo.hasNextPage) {
          break;
        }
      } else {
        break;
      }
    }

    return { data: allIssues };
  } catch (error) {
    return handleFetchError(error);
  }
}

// Fetch all pull requests in parallel
async function fetchAllPullRequestsParallel(
  repo: Repository,
  stateFilter: LoadStateFilter,
  totalCount: number,
  token?: string,
  onProgress?: (count: number) => void
): Promise<{ data: PullRequest[]; error?: APIError }> {
  if (totalCount === 0) {
    return { data: [] };
  }

  const pageSize = 100;
  const numPages = Math.ceil(totalCount / pageSize);

  console.log(`[API] Fetching ${numPages} pages of PRs...`);

  const query = buildPullRequestsQuery(stateFilter);

  try {
    let allPRs: PullRequest[] = [];
    let cursor: string | null = null;

    for (let page = 0; page < numPages; page++) {
      const variables: Record<string, unknown> = {
        owner: repo.owner,
        name: repo.name,
      };

      if (cursor) {
        variables.cursor = cursor;
      }

      const response = await makeGraphQLRequest(query, variables, token);

      if (response.errors && response.errors.length > 0) {
        const error = response.errors[0];
        throw new Error(error.message);
      }

      if (!response.data?.repository) {
        throw new Error('Repository not found');
      }

      const { pullRequests } = response.data.repository;

      if (pullRequests.nodes.length > 0) {
        const transformedPRs = pullRequests.nodes.map((node: any) => ({
          number: node.number,
          title: node.title,
          url: node.url,
          state: node.state,
          createdAt: node.createdAt,
          reactions: calculateReactionCounts(node),
        }));
        allPRs = [...allPRs, ...transformedPRs];
        cursor = pullRequests.pageInfo.endCursor;

        // Report progress
        if (onProgress) {
          onProgress(allPRs.length);
        }

        if (!pullRequests.pageInfo.hasNextPage) {
          break;
        }
      } else {
        break;
      }
    }

    return { data: allPRs };
  } catch (error) {
    return handleFetchError(error);
  }
}

// Helper to handle fetch errors
function handleFetchError(error: unknown): { data: any[]; error: APIError } {
  if (error instanceof Error) {
    if (error.message === 'UNAUTHORIZED') {
      return {
        data: [],
        error: {
          message: 'Invalid GitHub token. Please check your token and try again.',
          type: 'UNAUTHORIZED',
        },
      };
    }
    if (error.message === 'RATE_LIMIT') {
      return {
        data: [],
        error: {
          message: 'GitHub API rate limit exceeded. Please try again later or use a token.',
          type: 'RATE_LIMIT',
        },
      };
    }
    if (error.message === 'NETWORK') {
      return {
        data: [],
        error: {
          message: 'Network error. Please check your connection and try again.',
          type: 'NETWORK',
        },
      };
    }
    return {
      data: [],
      error: {
        message: error.message,
        type: 'UNKNOWN',
      },
    };
  }
  return {
    data: [],
    error: {
      message: 'An unknown error occurred.',
      type: 'UNKNOWN',
    },
  };
}

export async function fetchRepositoryData(
  repo: Repository,
  stateFilter: LoadStateFilter = 'all',
  token?: string,
  onProgress?: (issuesCount: number, prsCount: number) => void
): Promise<FetchResult> {
  console.log(`Fetching data for ${repo.owner}/${repo.name} (${stateFilter})...`);
  const result = await fetchAllPages(repo, stateFilter, token, onProgress);
  console.log(
    `Fetched ${result.issues.length} issues and ${result.pullRequests.length} pull requests`
  );
  return result;
}
