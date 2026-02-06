import type { Repository, Issue, PullRequest, APIError, GraphQLResponse } from './types';

const GITHUB_API_URL = 'https://api.github.com/graphql';

const QUERY = `
  query($owner: String!, $name: String!, $issuesCursor: String, $prsCursor: String) {
    repository(owner: $owner, name: $name) {
      issues(first: 100, after: $issuesCursor, states: [OPEN, CLOSED], orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes {
          number
          title
          url
          state
          createdAt
          reactions {
            totalCount
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
      pullRequests(first: 100, after: $prsCursor, states: [OPEN, CLOSED, MERGED], orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes {
          number
          title
          url
          state
          createdAt
          reactions {
            totalCount
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
  token?: string,
  onProgress?: (issuesCount: number, prsCount: number) => void
): Promise<FetchResult> {
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
      const response = await makeGraphQLRequest(QUERY, variables, token);

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

      // Add issues from this page
      if (hasMoreIssues && issues.nodes.length > 0) {
        allIssues = [...allIssues, ...issues.nodes];
        hasMoreIssues = issues.pageInfo.hasNextPage;
        issuesCursor = issues.pageInfo.endCursor;
      } else {
        hasMoreIssues = false;
      }

      // Add PRs from this page
      if (hasMorePRs && pullRequests.nodes.length > 0) {
        allPRs = [...allPRs, ...pullRequests.nodes];
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
  token?: string,
  onProgress?: (issuesCount: number, prsCount: number) => void
): Promise<FetchResult> {
  console.log(`Fetching data for ${repo.owner}/${repo.name}...`);
  const result = await fetchAllPages(repo, token, onProgress);
  console.log(`Fetched ${result.issues.length} issues and ${result.pullRequests.length} pull requests`);
  return result;
}
