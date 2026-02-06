import type { Repository, Issue, PullRequest, APIError, GraphQLResponse, LoadStateFilter, Reaction } from './types';

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
      case 'LAUGH':  // Adding LAUGH as positive
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

// Build GraphQL query dynamically based on state filter
function buildQuery(stateFilter: LoadStateFilter): string {
  let issueStates: string;
  let prStates: string;

  switch (stateFilter) {
    case 'open':
      issueStates = '[OPEN]';
      prStates = '[OPEN]';
      break;
    case 'closed':
      issueStates = '[CLOSED]';
      prStates = '[CLOSED, MERGED]';
      break;
    case 'all':
    default:
      issueStates = '[OPEN, CLOSED]';
      prStates = '[OPEN, CLOSED, MERGED]';
      break;
  }

  return `
    query($owner: String!, $name: String!, $issuesCursor: String, $prsCursor: String) {
      repository(owner: $owner, name: $name) {
        issues(first: 100, after: $issuesCursor, states: ${issueStates}, orderBy: {field: CREATED_AT, direction: DESC}) {
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
        pullRequests(first: 100, after: $prsCursor, states: ${prStates}, orderBy: {field: CREATED_AT, direction: DESC}) {
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
  const query = buildQuery(stateFilter);
  let allIssues: Issue[] = [];
  let allPRs: PullRequest[] = [];
  let issuesCursor: string | null = null;
  let prsCursor: string | null = null;
  let hasMoreIssues = true;
  let hasMorePRs = true;

  while (hasMoreIssues || hasMorePRs) {
    const variables: Record<string, unknown> = {
      owner: repo.owner,
      name: repo.name,
    };

    if (hasMoreIssues && issuesCursor) {
      variables.issuesCursor = issuesCursor;
    }
    if (hasMorePRs && prsCursor) {
      variables.prsCursor = prsCursor;
    }

    try {
      const response = await makeGraphQLRequest(query, variables, token);

      if (response.errors && response.errors.length > 0) {
        const error = response.errors[0];
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

      if (!response.data?.repository) {
        return {
          issues: [],
          pullRequests: [],
          error: {
            message: 'Repository not found or is private.',
            type: 'NOT_FOUND',
          },
        };
      }

      const { issues, pullRequests } = response.data.repository;

      // Add issues from this page - transform reactions
      if (hasMoreIssues && issues.nodes.length > 0) {
        const transformedIssues = issues.nodes.map((node: any) => ({
          number: node.number,
          title: node.title,
          url: node.url,
          state: node.state,
          createdAt: node.createdAt,
          reactions: calculateReactionCounts(node),
        }));
        allIssues = [...allIssues, ...transformedIssues];
        hasMoreIssues = issues.pageInfo.hasNextPage;
        issuesCursor = issues.pageInfo.endCursor;
      } else {
        hasMoreIssues = false;
      }

      // Add PRs from this page - transform reactions
      if (hasMorePRs && pullRequests.nodes.length > 0) {
        const transformedPRs = pullRequests.nodes.map((node: any) => ({
          number: node.number,
          title: node.title,
          url: node.url,
          state: node.state,
          createdAt: node.createdAt,
          reactions: calculateReactionCounts(node),
        }));
        allPRs = [...allPRs, ...transformedPRs];
        hasMorePRs = pullRequests.pageInfo.hasNextPage;
        prsCursor = pullRequests.pageInfo.endCursor;
      } else {
        hasMorePRs = false;
      }

      // Report progress
      if (onProgress) {
        onProgress(allIssues.length, allPRs.length);
      }

      // If no more pages, break
      if (!hasMoreIssues && !hasMorePRs) {
        break;
      }

    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'UNAUTHORIZED') {
          return {
            issues: [],
            pullRequests: [],
            error: {
              message: 'Invalid GitHub token. Please check your token and try again.',
              type: 'UNAUTHORIZED',
            },
          };
        }
        if (error.message === 'RATE_LIMIT') {
          return {
            issues: [],
            pullRequests: [],
            error: {
              message: 'GitHub API rate limit exceeded. Please try again later or use a token.',
              type: 'RATE_LIMIT',
            },
          };
        }
        if (error.message === 'NETWORK') {
          return {
            issues: [],
            pullRequests: [],
            error: {
              message: 'Network error. Please check your connection and try again.',
              type: 'NETWORK',
            },
          };
        }
        return {
          issues: [],
          pullRequests: [],
          error: {
            message: error.message,
            type: 'UNKNOWN',
          },
        };
      }
      return {
        issues: [],
        pullRequests: [],
        error: {
          message: 'An unknown error occurred.',
          type: 'UNKNOWN',
        },
      };
    }
  }

  return {
    issues: allIssues,
    pullRequests: allPRs,
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
  console.log(`Fetched ${result.issues.length} issues and ${result.pullRequests.length} pull requests`);
  return result;
}
