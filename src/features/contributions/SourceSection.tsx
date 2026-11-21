import { RefreshIcon } from '../../components/Icons';
import { ErrorBox, LoadingState } from '../../components/StatusViews';
import type { ContributionSource, TimeRange } from '../../types';
import { LeaderboardTable } from './LeaderboardTable';
import { describeSource, SOURCE_KIND_LABELS, sourceTitle } from './sourceLabels';
import { useSourceContributions } from './useSourceContributions';

interface Props {
  source: ContributionSource;
  range: TimeRange;
  pageSize: number;
  token: string | null;
  hideInactive: boolean;
}

export function SourceSection({ source, range, pageSize, token, hideInactive }: Props) {
  const result = useSourceContributions(source, range, pageSize, token);
  const title = sourceTitle(source);
  const description = describeSource(source);

  return (
    <section className="card">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold truncate">{title}</h3>
          <p className="text-xs text-github-fg-muted dark:text-github-fg-darkMuted">
            {SOURCE_KIND_LABELS[source.kind]}
            {title !== description && ` · ${description}`}
            {!result.membersLoading &&
              !result.membersError &&
              ` · ${result.rows.length} of ${result.totalCount} accounts loaded`}
          </p>
        </div>
        <button
          onClick={result.refresh}
          disabled={result.isRefreshing || result.membersLoading}
          className="p-1.5 rounded-md text-github-fg-muted dark:text-github-fg-darkMuted hover:text-github-fg-default dark:hover:text-github-fg-dark disabled:opacity-50"
          aria-label="Refresh"
          title="Refresh"
        >
          <RefreshIcon className={`w-5 h-5 ${result.isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {source.kind === 'org' && (
        <p className="text-xs text-github-fg-muted dark:text-github-fg-darkMuted mb-3">
          Only public members are listed unless you belong to the organization (classic tokens need
          the <code>read:org</code> scope).
        </p>
      )}

      {result.notFound.length > 0 && (
        <p className="text-sm text-github-attention-emphasis dark:text-github-attention-dark mb-3">
          Not found: {result.notFound.join(', ')}
        </p>
      )}

      {result.membersLoading && <LoadingState title="Loading accounts..." />}
      {result.membersError && <ErrorBox message={result.membersError.message} />}
      {result.countsError && (
        <div className="mb-3">
          <ErrorBox title="Some counts failed to load" message={result.countsError.message} />
        </div>
      )}

      {!result.membersLoading && !result.membersError && (
        <>
          {result.rows.length === 0 ? (
            <p className="text-sm text-github-fg-muted dark:text-github-fg-darkMuted">
              No accounts found.
            </p>
          ) : (
            <LeaderboardTable
              rows={result.rows}
              range={range}
              token={token}
              hideInactive={hideInactive}
            />
          )}

          {result.hasMore && (
            <button
              onClick={result.loadMore}
              disabled={result.loadingMore}
              className="btn-secondary w-full mt-4"
            >
              {result.loadingMore
                ? 'Loading...'
                : `Load more (+${Math.min(pageSize, result.totalCount - result.rows.length)})`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
