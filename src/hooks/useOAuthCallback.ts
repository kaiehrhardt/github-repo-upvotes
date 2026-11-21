import { useEffect, useState } from 'react';
import { handleOAuthCallback } from '../oauth';
import { setStoredToken } from './useToken';

// Module-level so React StrictMode's double effect run doesn't exchange the code twice
let callbackPromise: Promise<string> | null = null;

function getCallbackParams(): { code: string; state: string } | null {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  return code && state ? { code, state } : null;
}

function removeCallbackParams(): void {
  const url = new URL(window.location.href);
  url.search = '';
  window.history.replaceState({}, document.title, url.toString());
}

/** Completes the OAuth flow if the page was opened with ?code=&state= from GitHub. */
export function useOAuthCallback(): { pending: boolean; error: string | null } {
  const [status, setStatus] = useState(() => ({
    pending: getCallbackParams() !== null,
    error: null as string | null,
  }));

  useEffect(() => {
    const params = getCallbackParams();
    if (!params) return;

    if (!callbackPromise) {
      const workerUrl = import.meta.env.VITE_OAUTH_WORKER_URL || '';
      callbackPromise = workerUrl
        ? handleOAuthCallback(params.code, params.state, workerUrl)
        : Promise.reject(new Error('OAuth worker URL not configured'));
    }

    let cancelled = false;
    callbackPromise.then(
      (token) => {
        setStoredToken(token, 'oauth');
        removeCallbackParams();
        if (!cancelled) setStatus({ pending: false, error: null });
      },
      (error: unknown) => {
        console.error('OAuth callback error:', error);
        removeCallbackParams();
        if (!cancelled) {
          setStatus({
            pending: false,
            error: error instanceof Error ? error.message : 'OAuth authentication failed',
          });
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
