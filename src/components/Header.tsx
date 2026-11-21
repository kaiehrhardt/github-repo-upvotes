import { NavLink } from 'react-router';
import { useRateLimit } from '../hooks/useRateLimit';
import { useTheme } from '../hooks/useTheme';
import { GitHubIcon, MoonIcon, SunIcon } from './Icons';

const iconButtonClass =
  'p-2 rounded-md hover:bg-github-canvas-subtle dark:hover:bg-github-canvas-dark transition-colors text-github-fg-default dark:text-github-fg-dark';

function RateLimitBadge() {
  const rateLimit = useRateLimit();
  if (!rateLimit) return null;
  const resetAt = new Date(rateLimit.reset * 1000).toLocaleTimeString();
  const low = rateLimit.remaining < rateLimit.limit * 0.1;
  return (
    <span
      className={`hidden sm:inline text-xs px-2 py-1 rounded-md border border-github-border-default dark:border-github-border-dark ${
        low
          ? 'text-github-danger-emphasis dark:text-github-danger-dark'
          : 'text-github-fg-muted dark:text-github-fg-darkMuted'
      }`}
      title={`GitHub API rate limit, resets at ${resetAt}`}
    >
      API {rateLimit.remaining}/{rateLimit.limit}
    </span>
  );
}

export function Header() {
  const { toggle } = useTheme();

  return (
    <header className="border-b border-github-border-default dark:border-github-border-dark bg-github-canvas-default dark:bg-github-canvas-darkSubtle shadow-sm">
      <div className="container mx-auto px-4 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Logo" className="w-10 h-10" />
          <div>
            <h1 className="text-2xl font-bold text-github-fg-default dark:text-github-fg-dark">
              GitHub Spotlight
            </h1>
            <p className="text-xs text-github-fg-muted dark:text-github-fg-darkMuted">
              Discover top-voted issues & PRs and who contributes them
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RateLimitBadge />
          <a
            href="https://github.com/kaiehrhardt/github-spotlight"
            target="_blank"
            rel="noopener noreferrer"
            className={`${iconButtonClass} hover:text-github-accent-emphasis dark:hover:text-github-accent-dark`}
            aria-label="View source on GitHub"
            title="View source on GitHub"
          >
            <GitHubIcon />
          </a>
          <button onClick={toggle} className={iconButtonClass} aria-label="Toggle theme">
            <SunIcon className="w-6 h-6 hidden dark:block" />
            <MoonIcon className="w-6 h-6 block dark:hidden" />
          </button>
        </div>
      </div>
      <nav className="container mx-auto px-4 mt-3 flex gap-2" aria-label="Sections">
        <NavLink to="/repo" className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}>
          Repositories
        </NavLink>
        <NavLink
          to="/contributions"
          className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}
        >
          Contributions
        </NavLink>
      </nav>
    </header>
  );
}
