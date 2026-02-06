import type { Repository, Issue, PullRequest, StateFilter } from './types';

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
    return issues.filter(issue => issue.state === 'OPEN');
  }
  if (filter === 'closed') {
    return issues.filter(issue => issue.state === 'CLOSED');
  }
  // 'merged' filter doesn't apply to issues
  return [];
}

export function filterPullRequests(prs: PullRequest[], filter: StateFilter): PullRequest[] {
  if (filter === 'all') {
    return prs;
  }
  if (filter === 'open') {
    return prs.filter(pr => pr.state === 'OPEN');
  }
  if (filter === 'closed') {
    return prs.filter(pr => pr.state === 'CLOSED');
  }
  if (filter === 'merged') {
    return prs.filter(pr => pr.state === 'MERGED');
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
