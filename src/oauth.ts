/**
 * OAuth integration for GitHub authentication
 *
 * This module handles the OAuth flow using a Cloudflare Worker backend.
 */

import {
  saveToken,
  saveOAuthState,
  getOAuthState,
  clearOAuthState,
  saveAuthMethod,
} from './storage';

// Configuration - set this to your deployed worker URL
const OAUTH_WORKER_URL = import.meta.env.VITE_OAUTH_WORKER_URL || '';

interface OAuthConfig {
  workerUrl: string;
  redirectUri: string;
}

interface AuthUrlResponse {
  auth_url: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

/**
 * Generate a random state parameter for OAuth security
 */
function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if OAuth is configured (worker URL is set)
 */
export function isOAuthConfigured(): boolean {
  return OAUTH_WORKER_URL.length > 0;
}

/**
 * Initiate the OAuth flow by redirecting to GitHub
 */
export async function initiateOAuthFlow(config: OAuthConfig): Promise<void> {
  if (!config.workerUrl) {
    throw new Error('OAuth worker URL is not configured');
  }

  try {
    const state = generateState();
    saveOAuthState(state);

    const params = new URLSearchParams({
      redirect_uri: config.redirectUri,
      state: state,
    });

    const response = await fetch(`${config.workerUrl}/auth/github?${params}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get OAuth authorization URL: ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('OAuth worker returned invalid response (expected JSON)');
    }

    const data = (await response.json()) as AuthUrlResponse;

    // Redirect to GitHub authorization page
    window.location.href = data.auth_url;
  } catch (error) {
    console.error('OAuth initiation error:', error);
    throw error;
  }
}

/**
 * Handle OAuth callback and exchange code for token
 */
export async function handleOAuthCallback(
  code: string,
  state: string,
  workerUrl: string
): Promise<string> {
  if (!workerUrl) {
    throw new Error('OAuth worker URL is not configured');
  }

  // Verify state matches
  const savedState = getOAuthState();

  if (!savedState || savedState !== state) {
    throw new Error('Invalid OAuth state parameter');
  }

  // Clear state
  clearOAuthState();

  try {
    // Exchange code for token via worker
    const response = await fetch(`${workerUrl}/auth/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        throw new Error(error.error || 'Token exchange failed');
      } else {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
      }
    }

    const data = (await response.json()) as TokenResponse;

    // Save token and mark as OAuth authenticated
    saveToken(data.access_token);
    saveAuthMethod('oauth');

    return data.access_token;
  } catch (error) {
    console.error('OAuth callback error:', error);
    throw error;
  }
}

/**
 * Get the OAuth redirect URI for current page
 */
export function getOAuthRedirectUri(): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  return url.toString();
}
