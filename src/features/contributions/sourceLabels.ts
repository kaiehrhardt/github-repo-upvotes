import type { ContributionSource, SourceKind } from '../../types';

export const SOURCE_KIND_LABELS: Record<SourceKind, string> = {
  users: 'Accounts',
  followers: 'Followers of an account',
  org: 'Members of an organization',
};

export function describeSource(source: ContributionSource): string {
  switch (source.kind) {
    case 'users':
      return source.logins.map((login) => `@${login}`).join(', ');
    case 'followers':
      return `Followers of @${source.login}`;
    case 'org':
      return `Members of @${source.org}`;
  }
}

export function sourceTitle(source: ContributionSource): string {
  return source.label?.trim() || describeSource(source);
}
