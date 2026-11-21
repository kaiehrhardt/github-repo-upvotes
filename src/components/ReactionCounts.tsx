import type { Reaction } from '../types';
import { ThumbDownIcon, ThumbUpIcon } from './Icons';

export function ReactionCounts({
  reactions,
  compact = false,
}: {
  reactions: Reaction;
  compact?: boolean;
}) {
  const iconClass = compact ? 'w-4 h-4 mr-1' : 'w-5 h-5 mr-1';
  return (
    <div className={`flex ${compact ? 'items-center gap-3' : 'flex-col items-end gap-1'}`}>
      <div className="flex items-center text-green-600 dark:text-green-400">
        <ThumbUpIcon className={iconClass} />
        <span className={`font-semibold ${compact ? '' : 'text-lg'}`}>
          {reactions.positiveCount}
        </span>
      </div>
      {reactions.negativeCount > 0 && (
        <div className="flex items-center text-red-600 dark:text-red-400">
          <ThumbDownIcon className={iconClass} />
          <span className="font-semibold">{reactions.negativeCount}</span>
        </div>
      )}
    </div>
  );
}
