import { Fragment, useMemo, useState } from 'react';
import { ChevronIcon } from '../../components/Icons';
import { Spinner } from '../../components/StatusViews';
import type { TimeRange } from '../../types';
import type { ContributorRow } from './useSourceContributions';
import { UserDetail } from './UserDetail';

type SortKey = 'total' | 'pullRequests' | 'issues' | 'login';

const COLUMNS: Array<{ key: SortKey; label: string; numeric: boolean }> = [
  { key: 'login', label: 'Account', numeric: false },
  { key: 'pullRequests', label: 'PRs', numeric: true },
  { key: 'issues', label: 'Issues', numeric: true },
  { key: 'total', label: 'Total', numeric: true },
];

function value(row: ContributorRow, key: Exclude<SortKey, 'login'>): number {
  if (!row.counts) return -1;
  if (key === 'total') return row.counts.pullRequests + row.counts.issues;
  return row.counts[key];
}

function compareRows(a: ContributorRow, b: ContributorRow, key: SortKey): number {
  if (key === 'login') return a.login.localeCompare(b.login, undefined, { sensitivity: 'base' });
  return value(b, key) - value(a, key) || a.login.localeCompare(b.login);
}

interface Props {
  rows: ContributorRow[];
  range: TimeRange;
  token: string | null;
  hideInactive: boolean;
}

export function LeaderboardTable({ rows, range, token, hideInactive }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const visible = hideInactive
      ? rows.filter((row) => !row.counts || row.counts.pullRequests + row.counts.issues > 0)
      : rows;
    return [...visible].sort((a, b) => compareRows(a, b, sortKey));
  }, [rows, sortKey, hideInactive]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-github-border-default dark:border-github-border-dark text-github-fg-muted dark:text-github-fg-darkMuted">
            <th className="py-2 pr-2 text-left font-medium w-10">#</th>
            {COLUMNS.map((column) => (
              <th
                key={column.key}
                className={`py-2 px-2 font-medium ${column.numeric ? 'text-right w-20' : 'text-left'}`}
              >
                <button
                  onClick={() => setSortKey(column.key)}
                  className={`hover:text-github-fg-default dark:hover:text-github-fg-dark ${
                    sortKey === column.key
                      ? 'text-github-fg-default dark:text-github-fg-dark font-semibold'
                      : ''
                  }`}
                >
                  {column.label}
                  {sortKey === column.key && (column.numeric ? ' ↓' : ' ↑')}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, index) => {
            const isExpanded = expanded === row.login;
            return (
              <Fragment key={row.login}>
                <tr
                  className="border-b border-github-border-default dark:border-github-border-dark hover:bg-github-canvas-subtle dark:hover:bg-github-canvas-dark cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : row.login)}
                >
                  <td className="py-2 pr-2 text-github-fg-muted dark:text-github-fg-darkMuted">
                    {index + 1}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <ChevronIcon
                        className={`w-3 h-3 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                      <img
                        src={row.avatarUrl}
                        alt=""
                        className="w-6 h-6 rounded-full flex-shrink-0"
                        loading="lazy"
                      />
                      <a
                        href={`https://github.com/${row.login}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium hover:text-github-accent-emphasis dark:hover:text-github-accent-dark"
                      >
                        {row.login}
                      </a>
                      {row.name && (
                        <span className="truncate text-github-fg-muted dark:text-github-fg-darkMuted">
                          {row.name}
                        </span>
                      )}
                      {row.counts?.unavailable && (
                        <span
                          title="GitHub could not search this account's contributions"
                          className="text-github-attention-emphasis dark:text-github-attention-dark"
                        >
                          ⚠
                        </span>
                      )}
                    </div>
                  </td>
                  {row.counts ? (
                    <>
                      <td className="py-2 px-2 text-right tabular-nums">
                        {row.counts.pullRequests}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">{row.counts.issues}</td>
                      <td className="py-2 px-2 text-right tabular-nums font-semibold">
                        {row.counts.pullRequests + row.counts.issues}
                      </td>
                    </>
                  ) : (
                    <td colSpan={3} className="py-2 px-2 text-right">
                      {row.failed ? (
                        <span className="text-github-fg-muted dark:text-github-fg-darkMuted">
                          –
                        </span>
                      ) : (
                        <Spinner className="h-4 w-4" />
                      )}
                    </td>
                  )}
                </tr>
                {isExpanded && (
                  <tr className="border-b border-github-border-default dark:border-github-border-dark">
                    <td colSpan={5} className="px-2 py-3">
                      <UserDetail login={row.login} range={range} token={token} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
