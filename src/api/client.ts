import type { APIError, APIErrorType, RateLimitInfo } from '../types';

const GITHUB_API_URL = 'https://api.github.com/graphql';
const MAX_CONCURRENT_REQUESTS = 4;

export class GitHubApiError extends Error implements APIError {
  readonly type: APIErrorType;

  constructor(message: string, type: APIErrorType) {
    super(message);
    this.name = 'GitHubApiError';
    this.type = type;
  }
}

export interface GraphQLErrorEntry {
  message: string;
  type?: string;
  path?: Array<string | number>;
}

export interface GraphQLResult<T> {
  data: T | null;
  errors: GraphQLErrorEntry[];
}

// --- Rate limit store (read from response headers, consumed via useSyncExternalStore) ---

let rateLimit: RateLimitInfo | null = null;
const rateLimitListeners = new Set<() => void>();

export function getRateLimit(): RateLimitInfo | null {
  return rateLimit;
}

export function subscribeRateLimit(listener: () => void): () => void {
  rateLimitListeners.add(listener);
  return () => rateLimitListeners.delete(listener);
}

function updateRateLimit(headers: Headers): void {
  const limit = Number(headers.get('x-ratelimit-limit'));
  const remaining = Number(headers.get('x-ratelimit-remaining'));
  const reset = Number(headers.get('x-ratelimit-reset'));
  if (!headers.has('x-ratelimit-remaining') || Number.isNaN(remaining)) return;
  rateLimit = { limit, remaining, reset };
  rateLimitListeners.forEach((listener) => listener());
}

// --- Concurrency limiter: avoids GitHub's secondary rate limits when many queries run at once ---

let activeRequests = 0;
const waiting: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests++;
    return;
  }
  await new Promise<void>((resolve) => waiting.push(resolve));
}

function releaseSlot(): void {
  const next = waiting.shift();
  if (next) {
    next(); // hand the slot over directly
  } else {
    activeRequests--;
  }
}

// --- Requests ---

/**
 * Executes a GraphQL request and returns data plus GraphQL-level errors (partial results allowed).
 * Throws GitHubApiError for HTTP/network failures.
 */
export async function graphqlRaw<T>(
  query: string,
  variables: Record<string, unknown>,
  token?: string | null,
  signal?: AbortSignal
): Promise<GraphQLResult<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  await acquireSlot();
  let response: Response;
  try {
    response = await fetch(GITHUB_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new GitHubApiError(
      'Network error. Please check your connection and try again.',
      'NETWORK'
    );
  } finally {
    releaseSlot();
  }

  updateRateLimit(response.headers);

  if (!response.ok) {
    if (!token && (response.status === 401 || response.status === 403)) {
      throw new GitHubApiError(
        "GitHub's GraphQL API requires a token. Please add a GitHub token above.",
        'UNAUTHORIZED'
      );
    }
    if (response.status === 401) {
      throw new GitHubApiError(
        'Invalid GitHub token. Please check your token and try again.',
        'UNAUTHORIZED'
      );
    }
    if (response.status === 403 || response.status === 429) {
      throw new GitHubApiError(
        'GitHub API rate limit exceeded. Please try again later.',
        'RATE_LIMIT'
      );
    }
    throw new GitHubApiError(`GitHub API error (HTTP ${response.status}).`, 'NETWORK');
  }

  const json = (await response.json()) as { data?: T | null; errors?: GraphQLErrorEntry[] };
  return { data: json.data ?? null, errors: json.errors ?? [] };
}

/** Like graphqlRaw, but throws on any GraphQL error. */
export async function graphql<T>(
  query: string,
  variables: Record<string, unknown>,
  token?: string | null,
  signal?: AbortSignal
): Promise<T> {
  const { data, errors } = await graphqlRaw<T>(query, variables, token, signal);
  if (errors.length > 0) {
    const [first] = errors;
    if (first.type === 'NOT_FOUND') throw new GitHubApiError(first.message, 'NOT_FOUND');
    if (first.type === 'RATE_LIMITED') throw new GitHubApiError(first.message, 'RATE_LIMIT');
    throw new GitHubApiError(first.message, 'UNKNOWN');
  }
  if (!data) throw new GitHubApiError('Empty response from GitHub API.', 'UNKNOWN');
  return data;
}

export function toAPIError(error: unknown): APIError {
  if (error instanceof GitHubApiError) return { message: error.message, type: error.type };
  if (error instanceof Error) return { message: error.message, type: 'UNKNOWN' };
  return { message: 'An unknown error occurred.', type: 'UNKNOWN' };
}
