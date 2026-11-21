import type { TimeRange } from '../../types';
import { TIME_RANGES } from '../../utils';

export function TimeRangeFilter({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-github-fg-muted dark:text-github-fg-darkMuted">
        Period:
      </span>
      {TIME_RANGES.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`filter-button ${value === range.value ? 'active' : ''}`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
