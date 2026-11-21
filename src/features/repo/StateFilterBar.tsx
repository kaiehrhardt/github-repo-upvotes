import type { LoadStateFilter, StateFilter, TabType } from '../../types';

const FILTERS: Array<{ value: StateFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'merged', label: 'Merged' },
];

function isDisabled(filter: StateFilter, loadState: LoadStateFilter): boolean {
  if (loadState === 'open') return filter === 'closed' || filter === 'merged';
  if (loadState === 'closed') return filter === 'open';
  return false;
}

function allLabel(loadState: LoadStateFilter): string {
  if (loadState === 'open') return 'All Open';
  if (loadState === 'closed') return 'All Closed';
  return 'All';
}

interface Props {
  value: StateFilter;
  onChange: (filter: StateFilter) => void;
  loadState: LoadStateFilter;
  tab: TabType;
}

export function StateFilterBar({ value, onChange, loadState, tab }: Props) {
  // Issues can't be merged
  const filters = tab === 'issues' ? FILTERS.filter((f) => f.value !== 'merged') : FILTERS;

  return (
    <div className="flex items-center space-x-2 mb-6">
      <span className="text-sm font-medium text-github-fg-muted dark:text-github-fg-darkMuted">
        Filter:
      </span>
      <div className="flex space-x-2">
        {filters.map((filter) => {
          const disabled = isDisabled(filter.value, loadState);
          return (
            <button
              key={filter.value}
              disabled={disabled}
              onClick={() => onChange(filter.value)}
              className={`filter-button ${!disabled && value === filter.value ? 'active' : ''} ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {filter.value === 'all' ? allLabel(loadState) : filter.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
