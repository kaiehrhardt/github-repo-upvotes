import type {
  ContributionSource,
  Issue,
  PullRequest,
  Repository,
  StateFilter,
  TimeRange,
} from './types';

// Repository validation
export function parseRepository(input: string): Repository | null {
  const trimmed = input.trim();
  const parts = trimmed.split('/');

  if (parts.length !== 2) {
    return null;
  }

  const [owner, name] = parts;

  if (!owner || !name || owner.includes(' ') || name.includes(' ')) {
    return null;
  }

  return { owner, name };
}

export function isValidRepository(input: string): boolean {
  return parseRepository(input) !== null;
}

// Sorting functions
export function sortByReactions<T extends Issue | PullRequest>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    // Primary: positive reactions count (descending)
    const reactionDiff = b.reactions.positiveCount - a.reactions.positiveCount;
    if (reactionDiff !== 0) {
      return reactionDiff;
    }
    // Secondary: issue/PR number (descending - newer first)
    return b.number - a.number;
  });
}

// Filtering functions
export function filterIssues(issues: Issue[], filter: StateFilter): Issue[] {
  if (filter === 'all') {
    return issues;
  }
  if (filter === 'open') {
    return issues.filter((issue) => issue.state === 'OPEN');
  }
  if (filter === 'closed') {
    return issues.filter((issue) => issue.state === 'CLOSED');
  }
  // 'merged' filter doesn't apply to issues
  return [];
}

export function filterPullRequests(prs: PullRequest[], filter: StateFilter): PullRequest[] {
  if (filter === 'all') {
    return prs;
  }
  if (filter === 'open') {
    return prs.filter((pr) => pr.state === 'OPEN');
  }
  if (filter === 'closed') {
    return prs.filter((pr) => pr.state === 'CLOSED');
  }
  if (filter === 'merged') {
    return prs.filter((pr) => pr.state === 'MERGED');
  }
  return [];
}

// Format helpers
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'today';
  } else if (diffDays === 1) {
    return 'yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
}

export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) {
    return `${count} ${singular}`;
  }
  return `${count} ${plural || singular + 's'}`;
}

// Time ranges for contributions
export const TIME_RANGES: ReadonlyArray<{ value: TimeRange; label: string }> = [
  { value: 'month', label: 'Last month' },
  { value: '3months', label: 'Last 3 months' },
  { value: 'year', label: 'Last year' },
  { value: 'all', label: 'All' },
];

export function isTimeRange(value: string | null): value is TimeRange {
  return TIME_RANGES.some((range) => range.value === value);
}

/** Start date of a time range, or null for 'all'. */
export function getRangeStart(range: TimeRange, now: Date = new Date()): Date | null {
  const start = new Date(now);
  switch (range) {
    case 'month':
      start.setMonth(start.getMonth() - 1);
      return start;
    case '3months':
      start.setMonth(start.getMonth() - 3);
      return start;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      return start;
    case 'all':
      return null;
  }
}

/** GitHub search query for PRs/issues authored by a user within a time range. */
export function buildAuthorSearch(
  login: string,
  type: 'pr' | 'issue',
  range: TimeRange,
  now: Date = new Date()
): string {
  const start = getRangeStart(range, now);
  const created = start ? ` created:>=${start.toISOString().slice(0, 10)}` : '';
  return `author:${login} is:${type}${created}`;
}

// GitHub logins: alphanumeric or single hyphens, max 39 chars
const LOGIN_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

export function isValidLogin(login: string): boolean {
  return LOGIN_PATTERN.test(login);
}

/** Parses a comma/whitespace separated list of logins (leading @ allowed), deduplicated. */
export function parseLoginList(input: string): string[] {
  const seen = new Set<string>();
  const logins: string[] = [];
  for (const raw of input.split(/[\s,]+/)) {
    const login = raw.trim().replace(/^@/, '');
    if (!login || seen.has(login.toLowerCase())) continue;
    seen.add(login.toLowerCase());
    logins.push(login);
  }
  return logins;
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// Contribution sources in the URL: `kind:value[:label]`, e.g. `users:torvalds,gaearon`,
// `followers:kaiehrhardt`, `org:vercel:My team`

/** Identity of a source (kind + accounts), ignoring its label. */
export function sourceIdentity(source: ContributionSource): string {
  switch (source.kind) {
    case 'users':
      return `users:${source.logins.join(',')}`;
    case 'followers':
      return `followers:${source.login}`;
    case 'org':
      return `org:${source.org}`;
  }
}

export function serializeSource(source: ContributionSource): string {
  const label = source.label?.trim();
  return label ? `${sourceIdentity(source)}:${label}` : sourceIdentity(source);
}

/** Parses `kind:value[:label]`; returns null for unknown kinds or invalid logins. */
export function parseSource(value: string): ContributionSource | null {
  const first = value.indexOf(':');
  if (first === -1) return null;
  const kind = value.slice(0, first);
  const rest = value.slice(first + 1);
  const second = rest.indexOf(':');
  const accounts = second === -1 ? rest : rest.slice(0, second);
  const label = second === -1 ? undefined : rest.slice(second + 1).trim() || undefined;

  if (kind === 'users') {
    const logins = parseLoginList(accounts).filter(isValidLogin);
    return logins.length > 0 ? { kind, logins, label } : null;
  }
  const login = accounts.trim().replace(/^@/, '');
  if (!isValidLogin(login)) return null;
  if (kind === 'followers') return { kind, login, label };
  if (kind === 'org') return { kind, org: login, label };
  return null;
}

/** Parses a list of serialized sources, dropping invalid entries and duplicates. */
export function parseSources(values: readonly string[]): ContributionSource[] {
  const seen = new Set<string>();
  const sources: ContributionSource[] = [];
  for (const value of values) {
    const source = parseSource(value);
    if (!source) continue;
    const identity = sourceIdentity(source).toLowerCase();
    if (seen.has(identity)) continue;
    seen.add(identity);
    sources.push(source);
  }
  return sources;
}

/** Builds a query string, keeping `:`, `,` and `@` readable. */
export function buildQueryString(params: Array<[string, string]>): string {
  if (params.length === 0) return '';
  const encode = (value: string) =>
    encodeURIComponent(value).replace(/%3A/gi, ':').replace(/%2C/gi, ',').replace(/%40/gi, '@');
  return '?' + params.map(([key, value]) => `${encode(key)}=${encode(value)}`).join('&');
}
