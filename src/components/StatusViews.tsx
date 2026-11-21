import type { ReactNode } from 'react';
import { ErrorIcon, InboxIcon } from './Icons';

export function Spinner({ className = 'h-12 w-12' }: { className?: string }) {
  return (
    <div
      className={`inline-block animate-spin rounded-full border-b-2 border-github-accent-emphasis dark:border-github-accent-dark ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function LoadingState({ title, detail }: { title: string; detail?: ReactNode }) {
  return (
    <div className="text-center py-12">
      <Spinner />
      <p className="mt-4 text-github-fg-muted dark:text-github-fg-darkMuted">{title}</p>
      {detail && (
        <p className="text-sm text-github-fg-muted dark:text-github-fg-darkMuted mt-2">{detail}</p>
      )}
    </div>
  );
}

export function ErrorBox({ message, title = 'Error' }: { message: string; title?: string }) {
  return (
    <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
      <div className="flex items-start">
        <ErrorIcon className="w-6 h-6 text-red-600 dark:text-red-400 mr-3 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-red-900 dark:text-red-200">{title}</h3>
          <p className="text-red-800 dark:text-red-300 mt-1">{message}</p>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <InboxIcon className="w-16 h-16 mx-auto text-github-fg-muted dark:text-github-fg-darkMuted opacity-50" />
      <p className="mt-4 text-github-fg-muted dark:text-github-fg-darkMuted">{message}</p>
    </div>
  );
}
