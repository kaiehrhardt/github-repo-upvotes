import { useState, type FormEvent } from 'react';
import { clearStoredToken, setStoredToken, useToken } from '../hooks/useToken';
import { getOAuthRedirectUri, initiateOAuthFlow, isOAuthConfigured } from '../oauth';
import { EyeIcon, EyeOffIcon, GitHubIcon } from './Icons';
import { ErrorBox } from './StatusViews';

const linkClass = 'text-github-accent-emphasis dark:text-github-accent-dark hover:underline';
const codeClass = 'px-1 py-0.5 bg-github-canvas-subtle dark:bg-github-canvas-darkSubtle rounded';

function TokenHelp() {
  return (
    <div className="text-xs text-github-fg-muted dark:text-github-fg-darkMuted mt-2 space-y-1">
      <p>Required: GitHub&apos;s GraphQL API only accepts authenticated requests.</p>
      <p>ℹ️ Your token is stored locally and never sent to any server except GitHub&apos;s API.</p>
      <p>
        <strong>Classic Token:</strong> Create at{' '}
        <a
          href="https://github.com/settings/tokens/new?description=GitHub%20Spotlight&scopes=public_repo,read:org"
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          github.com/settings/tokens
        </a>{' '}
        with <code className={codeClass}>public_repo</code> scope (plus{' '}
        <code className={codeClass}>read:org</code> to see private org members).
      </p>
      <p>
        <strong>Fine-grained Token (recommended):</strong> Create at{' '}
        <a
          href="https://github.com/settings/personal-access-tokens/new"
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          github.com/settings/personal-access-tokens/new
        </a>{' '}
        with <strong>Public Repositories (read-only)</strong> access and{' '}
        <code className={codeClass}>Contents: Read-only</code> permission.
      </p>
    </div>
  );
}

export function TokenSettings() {
  const token = useToken();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [visible, setVisible] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const showForm = !token || editing;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setStoredToken(draft);
    setDraft('');
    setEditing(false);
  };

  const handleOAuthLogin = async () => {
    const workerUrl = import.meta.env.VITE_OAUTH_WORKER_URL || '';
    try {
      await initiateOAuthFlow({ workerUrl, redirectUri: getOAuthRedirectUri() });
    } catch (error) {
      setOauthError(error instanceof Error ? error.message : 'Failed to initiate OAuth login');
    }
  };

  return (
    <section className="card mb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">GitHub Token</h2>
        {token && !editing && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-github-success-emphasis dark:text-github-success-dark">
              ✓ Token saved
            </span>
            <button
              onClick={() => setEditing(true)}
              className="text-github-fg-muted dark:text-github-fg-darkMuted hover:text-github-fg-default dark:hover:text-github-fg-dark"
            >
              Change
            </button>
            <button
              onClick={clearStoredToken}
              className="text-github-fg-muted dark:text-github-fg-darkMuted hover:text-github-danger-emphasis dark:hover:text-github-danger-dark transition-colors"
            >
              Clear Token
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="mt-4">
          {isOAuthConfigured() && (
            <button
              type="button"
              onClick={handleOAuthLogin}
              className="w-full mb-3 px-4 py-2 bg-github-canvas-subtle dark:bg-github-canvas-darkSubtle border border-github-border-default dark:border-github-border-dark rounded-md hover:bg-github-canvas-default dark:hover:bg-github-canvas-dark transition-colors flex items-center justify-center gap-2"
            >
              <GitHubIcon className="w-5 h-5" />
              Sign in with GitHub
            </button>
          )}
          {oauthError && (
            <div className="mb-3">
              <ErrorBox message={oauthError} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={visible ? 'text' : 'password'}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="input-field pr-10"
                placeholder="ghp_... / github_pat_..."
                autoComplete="off"
                aria-label="GitHub token"
              />
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-github-fg-muted dark:text-github-fg-darkMuted hover:text-github-fg-default dark:hover:text-github-fg-dark"
                aria-label="Toggle token visibility"
              >
                {visible ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <button type="submit" className="btn-primary" disabled={!draft.trim()}>
              Save
            </button>
            {editing && (
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
          </form>
          <TokenHelp />
        </div>
      )}
    </section>
  );
}
