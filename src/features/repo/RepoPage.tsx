import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { fetchRepositoryData } from '../../api/repo';
import { toAPIError } from '../../api/client';
import { ErrorBox, LoadingState } from '../../components/StatusViews';
import { useToken } from '../../hooks/useToken';
import { getLastRepo, saveLastRepo } from '../../storage';
import type { LoadStateFilter } from '../../types';
import { parseRepository } from '../../utils';
import { RepoResults } from './RepoResults';

function parseLoadState(value: string | null): LoadStateFilter {
  return value === 'all' || value === 'closed' ? value : 'open';
}

export function RepoPage() {
  const { owner, name } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useToken();

  const loadState = parseLoadState(searchParams.get('load'));
  const repo = owner && name ? { owner, name } : null;

  const [repoInput, setRepoInput] = useState(() =>
    repo ? `${owner}/${name}` : (getLastRepo() ?? '')
  );
  const [loadInput, setLoadInput] = useState<LoadStateFilter>(loadState);
  const [formError, setFormError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ issues: 0, prs: 0 });

  const query = useQuery({
    queryKey: ['repo', repo?.owner, repo?.name, loadState],
    queryFn: ({ signal }) => {
      setProgress({ issues: 0, prs: 0 });
      return fetchRepositoryData(
        repo!,
        loadState,
        token,
        (issues, prs) => setProgress({ issues, prs }),
        signal
      );
    },
    enabled: repo !== null && token !== null,
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const input = repoInput.trim();
    if (!input) {
      setFormError('Please enter a repository in the format: owner/repo');
      return;
    }
    const parsed = parseRepository(input);
    if (!parsed) {
      setFormError('Invalid repository format. Please use: owner/repo (e.g., facebook/react)');
      return;
    }
    setFormError(null);
    saveLastRepo(input);

    const isCurrent =
      parsed.owner === repo?.owner && parsed.name === repo?.name && loadInput === loadState;
    if (isCurrent) {
      void query.refetch();
    } else {
      navigate(`/repo/${parsed.owner}/${parsed.name}?load=${loadInput}`);
    }
  };

  return (
    <>
      <section className="card mb-8">
        <h2 className="text-lg font-semibold mb-4">Repository</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="repo-input" className="block text-sm font-medium mb-2">
              Repository (owner/repo)
            </label>
            <input
              type="text"
              id="repo-input"
              className="input-field"
              placeholder="e.g., facebook/react"
              autoComplete="off"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="load-state-filter" className="block text-sm font-medium mb-2">
              Which items to load?
            </label>
            <select
              id="load-state-filter"
              className="input-field"
              value={loadInput}
              onChange={(e) => setLoadInput(e.target.value as LoadStateFilter)}
            >
              <option value="all">All (Open, Closed, Merged)</option>
              <option value="open">Only Open</option>
              <option value="closed">Only Closed (includes Merged PRs)</option>
            </select>
            <p className="text-xs text-github-fg-muted dark:text-github-fg-darkMuted mt-1">
              Loading only open items is faster and uses fewer API requests
            </p>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={query.isFetching}>
            Load Repository Data
          </button>
        </form>
      </section>

      {formError && <ErrorBox message={formError} />}

      {!formError && repo && !token && (
        <ErrorBox message="Please add a GitHub token above to load repository data." />
      )}

      {!formError && repo && token && (
        <>
          {query.isFetching && !query.data && (
            <LoadingState
              title="Loading repository data..."
              detail={`Loaded ${progress.issues} issues and ${progress.prs} pull requests...`}
            />
          )}
          {query.isError && <ErrorBox message={toAPIError(query.error).message} />}
          {query.data && (
            <RepoResults
              key={`${repo.owner}/${repo.name}/${loadState}`}
              data={query.data}
              loadState={loadState}
            />
          )}
        </>
      )}
    </>
  );
}
