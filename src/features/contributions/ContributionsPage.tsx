import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { ErrorBox } from '../../components/StatusViews';
import { useSources } from '../../hooks/useSources';
import { useToken } from '../../hooks/useToken';
import { getMembersPageSize, MEMBERS_PAGE_SIZES, saveMembersPageSize } from '../../storage';
import type { TimeRange } from '../../types';
import { isTimeRange } from '../../utils';
import { SourceConfig } from './SourceConfig';
import { SourceSection } from './SourceSection';
import { TimeRangeFilter } from './TimeRangeFilter';

export function ContributionsPage() {
  const token = useToken();
  const [sources, setSources] = useSources();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pageSize, setPageSize] = useState(getMembersPageSize);
  const [hideInactive, setHideInactive] = useState(false);

  const rangeParam = searchParams.get('range');
  const range: TimeRange = isTimeRange(rangeParam) ? rangeParam : 'month';

  const setRange = (next: TimeRange) => {
    setSearchParams((params) => {
      params.set('range', next);
      return params;
    });
  };

  const changePageSize = (size: number) => {
    saveMembersPageSize(size);
    setPageSize(size);
  };

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
                onChange={(e) => changePageSize(Number(e.target.value))}
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
              key={source.id}
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
