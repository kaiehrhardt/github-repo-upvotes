import { Navigate } from 'react-router';
import { ErrorBox } from '../../components/StatusViews';
import { useToken } from '../../hooks/useToken';
import { getSources, MEMBERS_PAGE_SIZES } from '../../storage';
import { serializeSource } from '../../utils';
import { SourceConfig } from './SourceConfig';
import { SourceSection } from './SourceSection';
import { TimeRangeFilter } from './TimeRangeFilter';
import { contributionsSearch, useContributionsUrl } from './useContributionsUrl';

export function ContributionsPage() {
  const token = useToken();
  const { view, hasSourceParams, setSources, setRange, setPageSize, setHideInactive } =
    useContributionsUrl();
  const { sources, range, pageSize, hideInactive } = view;

  // Opened without sources in the URL (e.g. via the nav link): restore the last used set
  if (!hasSourceParams) {
    const stored = getSources();
    if (stored.length > 0) {
      return (
        <Navigate to={{ search: contributionsSearch({ ...view, sources: stored }) }} replace />
      );
    }
  }

  return (
    <>
      <SourceConfig sources={sources} onChange={setSources} />

      {sources.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <TimeRangeFilter value={range} onChange={setRange} />
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hideInactive}
                onChange={(e) => setHideInactive(e.target.checked)}
              />
              Hide accounts without contributions
            </label>
            <label className="flex items-center gap-2">
              Accounts per load
              <select
                className="input-field !w-auto !py-1"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                {MEMBERS_PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}

      {sources.length > 0 && !token && (
        <ErrorBox message="Please add a GitHub token above to load contributions." />
      )}

      {token && (
        <div className="space-y-6">
          {sources.map((source) => (
            <SourceSection
              key={serializeSource(source)}
              source={source}
              range={range}
              pageSize={pageSize}
              token={token}
              hideInactive={hideInactive}
            />
          ))}
        </div>
      )}

      {sources.length > 0 && (
        <p className="mt-6 text-xs text-github-fg-muted dark:text-github-fg-darkMuted">
          Counts are pull requests and issues authored in the selected period, based on GitHub
          search. Private repositories are included only if your token can access them.
        </p>
      )}
    </>
  );
}
