/**
 * Cloudflare Worker for GitHub OAuth
 *
 * This worker handles the GitHub OAuth flow as an alternative to static tokens.
 * It provides secure token exchange and refresh capabilities.
 *
 * Environment Variables Required:
 * - GITHUB_CLIENT_ID: Your GitHub OAuth App Client ID
 * - GITHUB_CLIENT_SECRET: Your GitHub OAuth App Client Secret
 * - ALLOWED_ORIGINS: Comma-separated list of allowed origins (e.g., https://example.com,https://other.com)
 */

interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  ALLOWED_ORIGINS: string;
}

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

// CORS headers helper
function getCorsHeaders(origin: string, allowedOrigins: string[]): HeadersInit {
  const isAllowed = allowedOrigins.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

// Handle OPTIONS preflight request
function handleOptions(request: Request, env: Env): Response {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());

  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin, allowedOrigins),
  });
}

// Exchange authorization code for access token
async function exchangeCodeForToken(code: string, env: Env): Promise<string> {
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code: code,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`GitHub token exchange failed: ${tokenResponse.status}`);
  }

  const data = (await tokenResponse.json()) as GitHubTokenResponse;

  if (!data.access_token) {
    throw new Error('No access token received from GitHub');
  }

  return data.access_token;
}

// Main request handler
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions(request, env);
    }

    // Route: GET /auth/github - Initiate OAuth flow
    if (url.pathname === '/auth/github' && request.method === 'GET') {
      const redirectUri = url.searchParams.get('redirect_uri');
      const state = url.searchParams.get('state');

      if (!redirectUri) {
        return new Response(JSON.stringify({ error: 'Missing redirect_uri parameter' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(origin, allowedOrigins),
          },
        });
      }

      // Build GitHub OAuth URL
      const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
      githubAuthUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
      githubAuthUrl.searchParams.set('redirect_uri', redirectUri);
      githubAuthUrl.searchParams.set('scope', 'public_repo read:user');

      if (state) {
        githubAuthUrl.searchParams.set('state', state);
      }

      return new Response(JSON.stringify({ auth_url: githubAuthUrl.toString() }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(origin, allowedOrigins),
        },
      });
    }

    // Route: POST /auth/callback - Exchange code for token
    if (url.pathname === '/auth/callback' && request.method === 'POST') {
      try {
        const body = (await request.json()) as { code: string };

        if (!body.code) {
          return new Response(JSON.stringify({ error: 'Missing authorization code' }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...getCorsHeaders(origin, allowedOrigins),
            },
          });
        }

        const accessToken = await exchangeCodeForToken(body.code, env);

        return new Response(
          JSON.stringify({
            access_token: accessToken,
            token_type: 'bearer',
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              ...getCorsHeaders(origin, allowedOrigins),
            },
          }
        );
      } catch (error) {
        console.error('Token exchange error:', error);
        return new Response(
          JSON.stringify({
            error: 'Failed to exchange code for token',
            details: error instanceof Error ? error.message : 'Unknown error',
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...getCorsHeaders(origin, allowedOrigins),
            },
          }
        );
      }
    }

    // Route: GET /health - Health check
    if (url.pathname === '/health' && request.method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(origin, allowedOrigins),
          },
        }
      );
    }

    // 404 for unknown routes
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(origin, allowedOrigins),
      },
    });
  },
};
