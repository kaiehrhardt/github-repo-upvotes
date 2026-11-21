import { HeartIcon } from './Icons';

export function Footer() {
  return (
    <footer className="container mx-auto px-4 py-8 text-center text-sm text-github-fg-muted dark:text-github-fg-darkMuted border-t border-github-border-default dark:border-github-border-dark mt-12">
      <p className="flex items-center justify-center gap-1">
        Built with
        <HeartIcon />
        by
        <a
          href="https://github.com/kaiehrhardt"
          target="_blank"
          rel="noopener noreferrer"
          className="text-github-accent-emphasis dark:text-github-accent-dark hover:underline font-medium"
        >
          kaiehrhardt
        </a>
        with OpenCode (Claude Sonnet 4.5) using the GitHub GraphQL API
      </p>
    </footer>
  );
}
