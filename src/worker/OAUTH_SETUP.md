# GitHub OAuth Setup Guide

This guide explains how to set up GitHub OAuth authentication as an alternative to manual token input.

## Architecture Overview

The OAuth flow uses a Cloudflare Worker as a secure backend to handle the token exchange:

1. **Frontend** (this app) - Initiates OAuth flow and receives tokens
2. **Cloudflare Worker** - Handles OAuth callbacks and exchanges codes for tokens
3. **GitHub OAuth App** - Authenticates users

## Setup Steps

### 1. Create a GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in the details:
   - **Application name**: `GitHub Repo Upvotes` (or your custom name)
   - **Homepage URL**: `https://your-domain.com` (your deployed app URL)
   - **Authorization callback URL**: `https://your-domain.com` (same as homepage)
   - **Application description**: (optional) "View GitHub repository issues and PRs ranked by reactions"

4. Click **"Register application"**
5. Save your **Client ID**
6. Click **"Generate a new client secret"** and save it securely

### 2. Deploy the Cloudflare Worker

#### Install Wrangler CLI

```bash
bun add -g wrangler
```

Or use it via bunx without global installation.

#### Login to Cloudflare

```bash
bunx wrangler login
```

#### Configure the Worker

1. Navigate to the worker directory:

```bash
cd src/worker
```

2. Install dependencies:

```bash
bun install
```

3. Edit `wrangler.toml` and set your configuration:

```toml
name = "github-oauth-worker"
main = "oauth-worker.ts"
compatibility_date = "2024-01-01"

[vars]
GITHUB_CLIENT_ID = "your_github_client_id_here"
ALLOWED_ORIGINS = "https://your-domain.com,http://localhost:5173"
```

4. Set the client secret as a secure environment variable:

```bash
bunx wrangler secret put GITHUB_CLIENT_SECRET
```

When prompted, paste your GitHub OAuth App client secret.

#### Deploy the Worker

```bash
bun run deploy
```

This will deploy your worker and give you a URL like:

```
https://github-oauth-worker.<your-subdomain>.workers.dev
```

Save this URL - you'll need it for the frontend configuration.

### 3. Configure the Frontend

Add the worker URL to your environment:

#### For Local Development

Create a `.env.local` file in the project root:

```env
VITE_OAUTH_WORKER_URL=https://github-oauth-worker.<your-subdomain>.workers.dev
```

#### For Production (GitHub Pages)

If using GitHub Actions for deployment, add the worker URL as a repository secret:

1. Go to your repository settings → Secrets and variables → Actions
2. Add a new secret:
   - Name: `VITE_OAUTH_WORKER_URL`
   - Value: `https://github-oauth-worker.<your-subdomain>.workers.dev`

3. Update your GitHub Actions workflow (`.github/workflows/deploy.yml`) to use the secret:

```yaml
- name: Build
  run: bun run build
  env:
    VITE_OAUTH_WORKER_URL: ${{ secrets.VITE_OAUTH_WORKER_URL }}
```

### 4. Update CORS Settings

Make sure your worker's `ALLOWED_ORIGINS` includes:

- Your production domain (e.g., `https://your-domain.com`)
- Localhost for development (e.g., `http://localhost:5173`)

### 5. Test the OAuth Flow

1. Start your local dev server:

```bash
bun run dev
```

2. You should see a **"Sign in with GitHub"** button
3. Click it to test the OAuth flow
4. You'll be redirected to GitHub for authorization
5. After authorizing, you'll be redirected back with a token

## Security Considerations

### Token Security

- **Client Secret**: Never commit your GitHub client secret to git. Always use `wrangler secret` to store it securely.
- **CORS**: The worker only allows requests from domains listed in `ALLOWED_ORIGINS`
- **State Parameter**: The OAuth flow uses a cryptographic state parameter to prevent CSRF attacks
- **Token Storage**: Tokens are stored in localStorage and only sent to GitHub's API

### Rate Limits

OAuth-authenticated requests have the same rate limits as personal access tokens:

- **5000 requests/hour** for authenticated requests
- **60 requests/hour** for unauthenticated requests

## Troubleshooting

### "OAuth worker URL not configured"

Make sure you've set `VITE_OAUTH_WORKER_URL` in your environment variables and rebuilt the app.

### "Invalid OAuth state parameter"

This can happen if:

- You cleared your browser's localStorage between starting the flow and the callback
- The state was tampered with
- You're testing in an incognito window that cleared state

Solution: Start the OAuth flow again.

### CORS Errors

Make sure:

1. Your domain is listed in `ALLOWED_ORIGINS` in the worker's `wrangler.toml`
2. You've redeployed the worker after changing CORS settings

### "Token exchange failed"

Check:

1. Your GitHub OAuth App's client ID and secret are correct
2. The callback URL matches your app's URL exactly
3. The worker logs for more details: `wrangler tail`

## Development vs Production

### Development

```env
VITE_OAUTH_WORKER_URL=https://github-oauth-worker.your-subdomain.workers.dev
```

GitHub OAuth callback URL: `http://localhost:5173`

### Production

```env
VITE_OAUTH_WORKER_URL=https://github-oauth-worker.your-subdomain.workers.dev
```

GitHub OAuth callback URL: `https://your-domain.com`

**Note**: You can use the same OAuth App for both dev and production by adding multiple callback URLs in your GitHub OAuth App settings.

## Custom Domain (Optional)

You can configure a custom domain for your worker:

1. In Cloudflare Dashboard, go to Workers & Pages → your worker
2. Click "Triggers" tab
3. Add a custom domain route
4. Update `VITE_OAUTH_WORKER_URL` to use your custom domain

## Monitoring

Monitor your worker's performance and errors:

```bash
bun run tail
```

This streams real-time logs from your worker.

## Cost

Cloudflare Workers Free Tier includes:

- **100,000 requests/day**
- **10ms CPU time per request**

This is more than enough for most use cases. OAuth token exchanges are quick and infrequent.

## Alternative: Manual Token Input

Users can still use the manual token input if they prefer. The OAuth flow is completely optional.

## Support

For issues or questions:

- Check the [main README](../README.md)
- Open an issue on [GitHub](https://github.com/kaiehrhardt/github-repo-upvotes/issues)
