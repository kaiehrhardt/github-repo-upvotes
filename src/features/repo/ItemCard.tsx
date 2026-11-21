import { ReactionCounts } from '../../components/ReactionCounts';
import { StateBadge } from '../../components/StateBadge';
import type { Issue, PullRequest } from '../../types';

export function ItemCard({ item }: { item: Issue | PullRequest }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-github-fg-muted dark:text-github-fg-darkMuted hover:text-github-accent-emphasis dark:hover:text-github-accent-dark font-medium"
            >
              #{item.number}
            </a>
            <StateBadge state={item.state} />
          </div>
          <h3 className="text-lg font-medium mb-2">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-github-fg-default dark:text-github-fg-dark hover:text-github-accent-emphasis dark:hover:text-github-accent-dark"
            >
              {item.title}
            </a>
          </h3>
        </div>
        <div className="ml-4">
          <ReactionCounts reactions={item.reactions} />
        </div>
      </div>
    </div>
  );
}
