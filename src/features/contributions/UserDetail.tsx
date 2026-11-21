import { useQuery } from '@tanstack/react-query';
import { fetchContributionDetail } from '../../api/contributions';
import { toAPIError } from '../../api/client';
import { ReactionCounts } from '../../components/ReactionCounts';
import { StateBadge } from '../../components/StateBadge';
import { Spinner } from '../../components/StatusViews';
import type { ContributionItem, TimeRange } from '../../types';
import { buildAuthorSearch, formatDate } from '../../utils';

function ItemList({
  title,
  items,
  searchUrl,
}: {
  title: string;
  items: ContributionItem[];
  searchUrl: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm">{title}</h4>
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-github-accent-emphasis dark:text-github-accent-dark hover:underline"
        >
          View all on GitHub
        </a>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-github-fg-muted dark:text-github-fg-darkMuted">None</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.url} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-github-fg-muted dark:text-github-fg-darkMuted">
                  <StateBadge state={item.state} />
                  <span className="truncate">
                    {item.repository}#{item.number}
                  </span>
                  <span>· {formatDate(item.createdAt)}</span>
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate hover:text-github-accent-emphasis dark:hover:text-github-accent-dark"
                  title={item.title}
                >
                  {item.title}
                </a>
              </div>
              <ReactionCounts reactions={item.reactions} compact />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function githubSearchUrl(login: string, type: 'pr' | 'issue', range: TimeRange): string {
  const query = buildAuthorSearch(login, type, range);
  const searchType = type === 'pr' ? 'pullrequests' : 'issues';
  return `https://github.com/search?q=${encodeURIComponent(query)}&type=${searchType}&s=created&o=desc`;
}

export function UserDetail({
  login,
  range,
  token,
}: {
  login: string;
  range: TimeRange;
  token: string | null;
}) {
  const query = useQuery({
    queryKey: ['contribution-detail', login, range],
    queryFn: ({ signal }) => fetchContributionDetail(login, range, token, signal),
    enabled: token !== null,
  });

  if (query.isPending) {
    return (
      <div className="py-4 text-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <p className="py-2 text-sm text-red-700 dark:text-red-300">
        {toAPIError(query.error).message}
      </p>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 py-2">
      <ItemList
        title="Latest pull requests"
        items={query.data.pullRequests}
        searchUrl={githubSearchUrl(login, 'pr', range)}
      />
      <ItemList
        title="Latest issues"
        items={query.data.issues}
        searchUrl={githubSearchUrl(login, 'issue', range)}
      />
    </div>
  );
}
