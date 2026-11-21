import type { PullRequestState } from '../types';

const BADGES: Record<PullRequestState, { className: string; label: string }> = {
  OPEN: { className: 'badge-open', label: 'Open' },
  CLOSED: { className: 'badge-closed', label: 'Closed' },
  MERGED: { className: 'badge-merged', label: 'Merged' },
};

export function StateBadge({ state }: { state: PullRequestState }) {
  const badge = BADGES[state];
  return <span className={`badge ${badge.className}`}>{badge.label}</span>;
}
