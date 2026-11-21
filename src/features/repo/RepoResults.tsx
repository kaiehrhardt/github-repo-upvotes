import { useMemo, useState } from 'react';
import { EmptyState } from '../../components/StatusViews';
import type { LoadStateFilter, RepositoryResult, StateFilter, TabType } from '../../types';
import { filterIssues, filterPullRequests, sortByReactions } from '../../utils';
import { ItemCard } from './ItemCard';
import { StateFilterBar } from './StateFilterBar';

interface Props {
  data: RepositoryResult;
  loadState: LoadStateFilter;
}

export function RepoResults({ data, loadState }: Props) {
  const [tab, setTab] = useState<TabType>('issues');
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');
  const [search, setSearch] = useState('');

  const items = useMemo(() => {
    const filtered =
      tab === 'issues'
        ? filterIssues(data.issues, stateFilter)
        : filterPullRequests(data.pullRequests, stateFilter);
    const query = search.trim().toLowerCase();
    const searched = query
      ? filtered.filter((item) => item.title.toLowerCase().includes(query))
      : filtered;
    return sortByReactions<(typeof searched)[number]>(searched);
  }, [data, tab, stateFilter, search]);

  const switchTab = (next: TabType) => {
    setTab(next);
    if (next === 'issues' && stateFilter === 'merged') setStateFilter('all');
  };

  return (
    <div>
      <div className="border-b border-github-border-default dark:border-github-border-dark mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            className={`tab-button ${tab === 'issues' ? 'active' : ''}`}
            onClick={() => switchTab('issues')}
          >
            Issues <span className="ml-1">({data.issues.length})</span>
          </button>
          <button
            className={`tab-button ${tab === 'pullRequests' ? 'active' : ''}`}
            onClick={() => switchTab('pullRequests')}
          >
            Pull Requests <span className="ml-1">({data.pullRequests.length})</span>
          </button>
        </nav>
      </div>

      <div className="mb-4">
        <label htmlFor="search-input" className="block text-sm font-medium mb-2">
          Search by title
        </label>
        <input
          type="text"
          id="search-input"
          className="input-field"
          placeholder="Type to filter by title..."
          autoComplete="off"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <StateFilterBar
        value={stateFilter}
        onChange={setStateFilter}
        loadState={loadState}
        tab={tab}
      />

      {items.length === 0 ? (
        <EmptyState message="No items found matching the current filter." />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <ItemCard key={item.number} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
