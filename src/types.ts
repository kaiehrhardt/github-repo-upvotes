// Core data types
export interface Repository {
  owner: string;
  name: string;
}

export interface Reaction {
  totalCount: number;
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

// API Response types
export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface IssuesConnection {
  nodes: Issue[];
  pageInfo: PageInfo;
}

export interface PullRequestsConnection {
  nodes: PullRequest[];
  pageInfo: PageInfo;
}

export interface RepositoryData {
  repository: {
    issues: IssuesConnection;
    pullRequests: PullRequestsConnection;
  };
}

export interface GraphQLResponse {
  data?: RepositoryData;
  errors?: Array<{
    message: string;
    type?: string;
  }>;
}

// UI State types
export type StateFilter = 'all' | 'open' | 'closed' | 'merged';
export type TabType = 'issues' | 'pullRequests';
export type Theme = 'light' | 'dark';

// Error types
export interface APIError {
  message: string;
  type: 'NOT_FOUND' | 'RATE_LIMIT' | 'UNAUTHORIZED' | 'NETWORK' | 'UNKNOWN';
}

// App State
export interface AppState {
  loading: boolean;
  error: APIError | null;
  repository: Repository | null;
  issues: Issue[];
  pullRequests: PullRequest[];
  activeTab: TabType;
  stateFilter: StateFilter;
  theme: Theme;
}
