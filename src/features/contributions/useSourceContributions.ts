import { useInfiniteQuery, useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  COUNTS_BATCH_SIZE,
  fetchContributionCounts,
  fetchMembersPage,
} from '../../api/contributions';
import { toAPIError } from '../../api/client';
import type {
  APIError,
  ContributionCounts,
  ContributionSource,
  Member,
  TimeRange,
} from '../../types';
import { chunk, sourceIdentity } from '../../utils';

export interface ContributorRow extends Member {
  counts: ContributionCounts | null; // null while loading or failed
  failed: boolean;
}

export function useSourceContributions(
  source: ContributionSource,
  range: TimeRange,
  pageSize: number,
  token: string | null
) {
  const enabled = token !== null;

  const membersQuery = useInfiniteQuery({
    queryKey: ['source-members', sourceIdentity(source).toLowerCase(), pageSize],
    queryFn: ({ pageParam, signal }) =>
      fetchMembersPage(source, pageParam, pageSize, token, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
  });

  const pages = membersQuery.data?.pages;
  const members = useMemo(() => pages?.flatMap((page) => page.members) ?? [], [pages]);
  const notFound = useMemo(() => pages?.flatMap((page) => page.notFound) ?? [], [pages]);
  const totalCount = pages?.[0]?.totalCount ?? 0;

  // Batches stay aligned across "load more" pages, so already loaded batches are cache hits
  const batches = useMemo(
    () =>
      chunk(
        members.map((member) => member.login),
        COUNTS_BATCH_SIZE
      ),
    [members]
  );

  const countQueries = useQueries({
    queries: batches.map((logins) => ({
      queryKey: ['contribution-counts', range, logins],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchContributionCounts(logins, range, token, signal),
      enabled,
    })),
  });

  const countsByLogin = new Map<string, ContributionCounts>();
  const failedLogins = new Set<string>();
  let pendingBatches = 0;
  let countsError: APIError | null = null;
  for (const [i, query] of countQueries.entries()) {
    query.data?.forEach((counts) => countsByLogin.set(counts.login, counts));
    if (query.isPending) pendingBatches++;
    if (query.isError && !query.data) {
      countsError ??= toAPIError(query.error);
      batches[i]?.forEach((login) => failedLogins.add(login));
    }
  }

  const rows: ContributorRow[] = members.map((member) => ({
    ...member,
    counts: countsByLogin.get(member.login) ?? null,
    failed: failedLogins.has(member.login),
  }));

  const refresh = () => {
    void membersQuery.refetch();
    countQueries.forEach((query) => void query.refetch());
  };

  return {
    rows,
    notFound,
    totalCount,
    membersLoading: membersQuery.isPending && enabled,
    membersError: membersQuery.isError ? toAPIError(membersQuery.error) : null,
    countsLoading: pendingBatches > 0,
    countsError,
    hasMore: membersQuery.hasNextPage,
    loadingMore: membersQuery.isFetchingNextPage,
    loadMore: () => void membersQuery.fetchNextPage(),
    isRefreshing: membersQuery.isRefetching || countQueries.some((q) => q.isRefetching),
    refresh,
  };
}
