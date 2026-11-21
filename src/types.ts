// Core data types
export interface Repository {
  owner: string;
  name: string;
}

export interface Reaction {
  totalCount: number;
  positiveCount: number; // 👍 THUMBS_UP, ❤️ HEART, 🎉 HOORAY, 🚀 ROCKET, 👀 EYES, 😄 LAUGH
  negativeCount: number; // 👎 THUMBS_DOWN, 😕 CONFUSED
}

export type IssueState = 'OPEN' | 'CLOSED';
export type PullRequestState = 'OPEN' | 'CLOSED' | 'MERGED';

export interface Issue {
  number: number;
  title: string;
  url: string;
  state: IssueState;
  createdAt: string;
  reactions: Reaction;
}

export interface PullRequest {
  number: number;
  title: string;
  url: string;
  state: PullRequestState;
  createdAt: string;
  reactions: Reaction;
}

export interface RepositoryResult {
  issues: Issue[];
  pullRequests: PullRequest[];
}

// UI State types
export type StateFilter = 'all' | 'open' | 'closed' | 'merged';
export type LoadStateFilter = 'all' | 'open' | 'closed'; // Filter for loading data from API
export type TabType = 'issues' | 'pullRequests';
export type Theme = 'light' | 'dark';

// Error types
export type APIErrorType = 'NOT_FOUND' | 'RATE_LIMIT' | 'UNAUTHORIZED' | 'NETWORK' | 'UNKNOWN';

export interface APIError {
  message: string;
  type: APIErrorType;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  /** Unix timestamp (seconds) when the limit resets */
  reset: number;
}

// Contributions
export type TimeRange = 'month' | '3months' | 'year' | 'all';

export type ContributionSource = { id: string; label?: string } & (
  | { kind: 'users'; logins: string[] }
  | { kind: 'followers'; login: string }
  | { kind: 'org'; org: string }
);

export type SourceKind = ContributionSource['kind'];

export interface Member {
  login: string;
  name: string | null;
  avatarUrl: string;
}

export interface MemberPage {
  members: Member[];
  totalCount: number;
  /** Opaque cursor for the next page, null when there is none */
  nextCursor: string | null;
  /** Logins of a `users` source that could not be resolved */
  notFound: string[];
}

export interface ContributionCounts {
  login: string;
  pullRequests: number;
  issues: number;
  /** True if GitHub could not answer the search for this user (counts shown as 0) */
  unavailable: boolean;
}

export interface ContributionItem {
  number: number;
  title: string;
  url: string;
  state: PullRequestState;
  createdAt: string;
  repository: string;
  reactions: Reaction;
}

export interface ContributionDetail {
  pullRequests: ContributionItem[];
  issues: ContributionItem[];
}
