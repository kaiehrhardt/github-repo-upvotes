# GitHub OAuth Worker

Cloudflare Worker for handling GitHub OAuth authentication.

## Quick Start

### From worker directory

1. Navigate to worker directory:

```bash
cd src/worker
```

2. Install dependencies:

```bash
bun install
```

3. Configure environment variables in `wrangler.toml`:

```toml
[vars]
GITHUB_CLIENT_ID = "your_client_id"
ALLOWED_ORIGINS = "https://your-domain.com,http://localhost:5173"
```

4. Set client secret:

```bash
bunx wrangler secret put GITHUB_CLIENT_SECRET
```

5. Deploy:

```bash
bun run deploy
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables in `wrangler.toml`:

```toml
[vars]
GITHUB_CLIENT_ID = "your_client_id"
ALLOWED_ORIGINS = "https://your-domain.com,http://localhost:5173"
```

4. Set client secret:

```bash
wrangler secret put GITHUB_CLIENT_SECRET
```

5. Deploy:

```bash
npm run deploy
```

### From project root

You can also use the scripts from the project root:

```bash
# Development
bun run worker:dev

# Deploy
bun run worker:deploy

# View logs
bun run worker:tail
```

## API Endpoints

### GET /auth/github

Initiates OAuth flow by returning GitHub authorization URL.

**Query Parameters:**

- `redirect_uri` (required) - Where GitHub should redirect after auth
- `state` (optional) - CSRF protection state parameter

**Response:**

```json
{
  "auth_url": "https://github.com/login/oauth/authorize?..."
}
```

### POST /auth/callback

Exchanges OAuth code for access token.

**Request Body:**

```json
{
  "code": "github_oauth_code"
}
```

**Response:**

```json
{
  "access_token": "gho_...",
  "token_type": "bearer"
}
```

### GET /health

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Environment Variables

- `GITHUB_CLIENT_ID` - Your GitHub OAuth App Client ID
- `GITHUB_CLIENT_SECRET` - Your GitHub OAuth App Client Secret (set via `wrangler secret`)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins

## Development

Run locally:

```bash
bun run dev
```

View logs:

```bash
bun run tail
```

## Documentation

See [OAUTH_SETUP.md](OAUTH_SETUP.md) for complete setup instructions.
