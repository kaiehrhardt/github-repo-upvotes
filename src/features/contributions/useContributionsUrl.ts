import { useLocation, useNavigate, useSearchParams } from 'react-router';
import {
  getMembersPageSize,
  MEMBERS_PAGE_SIZES,
  saveMembersPageSize,
  saveSources,
} from '../../storage';
import type { ContributionSource, TimeRange } from '../../types';
import { buildQueryString, isTimeRange, parseSources, serializeSource } from '../../utils';

export const DEFAULT_RANGE: TimeRange = 'month';

export interface ContributionsView {
  sources: ContributionSource[];
  range: TimeRange;
  /** Accounts loaded per source and per "Load more" */
  pageSize: number;
  hideInactive: boolean;
}

/**
 * Query string for the contributions page, e.g.
 * `?range=month&accounts=100&hide=inactive&src=org:vercel`.
 */
export function contributionsSearch(view: ContributionsView): string {
  return buildQueryString([
    ['range', view.range],
    ['accounts', String(view.pageSize)],
    ...(view.hideInactive ? [['hide', 'inactive'] as [string, string]] : []),
    ...view.sources.map((source): [string, string] => ['src', serializeSource(source)]),
  ]);
}

function parsePageSize(value: string | null): number {
  const size = Number(value);
  return (MEMBERS_PAGE_SIZES as readonly number[]).includes(size) ? size : getMembersPageSize();
}

/**
 * Sources, time range and options live in the URL, so a view can be bookmarked and shared.
 * Edits to sources and page size are also saved to localStorage as "last used"; opening a
 * shared link doesn't overwrite them.
 */
export function useContributionsUrl() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const srcParams = params.getAll('src');
  const rangeParam = params.get('range');
  const view: ContributionsView = {
    sources: parseSources(srcParams),
    range: isTimeRange(rangeParam) ? rangeParam : DEFAULT_RANGE,
    pageSize: parsePageSize(params.get('accounts')),
    hideInactive: params.get('hide') === 'inactive',
  };

  const update = (changes: Partial<ContributionsView>, replace = true) => {
    navigate({ pathname, search: contributionsSearch({ ...view, ...changes }) }, { replace });
  };

  return {
    view,
    hasSourceParams: srcParams.length > 0,
    setSources: (sources: ContributionSource[]) => {
      saveSources(sources);
      update({ sources });
    },
    setRange: (range: TimeRange) => update({ range }, false),
    setPageSize: (pageSize: number) => {
      saveMembersPageSize(pageSize);
      update({ pageSize });
    },
    setHideInactive: (hideInactive: boolean) => update({ hideInactive }),
  };
}
