# Agent Context & Development History

This file documents key development decisions, architecture choices, and context for AI agents working on this project.

## Project Overview

**GitHub Spotlight (GHS)** (formerly GitHub Repo Upvotes) is a static web application with two sections:

- **Repositories** (`#/repo/:owner/:name`): Issues and Pull Requests of a repo ranked by community reactions (upvotes)
- **Contributions** (`#/contributions`): Leaderboards of authored PRs and issues for user-configured sources (individual accounts, followers of an account, members of an org), with quick time filters (last month / 3 months / year / all)

It's built as a pure client-side app using React, TanStack Query, React Router, TypeScript, Vite, and Tailwind CSS.

## Key Architecture Decisions

### Why Client-Side Only?

- No backend needed - reduces complexity and hosting costs
- GitHub GraphQL API can be called directly from browser
- Tokens stored in localStorage (never sent anywhere except GitHub)
- Can be hosted on GitHub Pages for free

### Why GraphQL v4 instead of REST?

- More efficient - fetch only needed data
- Pagination with cursors is cleaner
- Reaction counts via `reactionGroups` to avoid rate limits
- Single query for all data needed

### Contributions Architecture

- **Counts via GitHub search, not `contributionsCollection`**: `search(type: ISSUE, first: 0, query: "author:X is:pr created:>=DATE") { issueCount }`.
  - `contributionsCollection` is capped at a 1-year span, so "All" would need a query per year.
  - It also hides private-repo PRs/issues as `restrictedContributionsCount`, even for repos the token can access.
  - Search has neither limitation, and a batch of 10 users (20 aliases) costs 1 rate-limit point.
- **Batching**: `COUNTS_BATCH_SIZE = 10` users per counts query. Search strings and logins are always passed as GraphQL variables, never interpolated.
- **Members**: `followers` / `membersWithRole` are paginated with `useInfiniteQuery`. The first page holds "accounts per load" members (50–500, `accounts` URL param), and "Load more" fetches the next page.
- **Caching**: Query keys:
  - `['source-members', sourceIdentity, pageSize]`
  - `['contribution-counts', range, logins]`
  - `['contribution-detail', login, range]`

  Count batches stay aligned across pages, so switching back to an already loaded period or loading more doesn't refetch.

- **The whole view lives in the URL**, e.g. `#/contributions?range=month&accounts=100&hide=inactive&src=users:torvalds,gaearon&src=org:vercel:My%20team`.
  - `range`, `accounts` (members per load) and `hide=inactive` hold the options.
  - Each source is a `src` param in the form `kind:value[:label]`.
  - Serialization lives in `utils.ts` (`serializeSource` / `parseSources`), URL handling in `features/contributions/useContributionsUrl.ts`.
  - Edits also save sources and page size to localStorage (`contribution_sources`, `members_page_size`) as "last used". Opening `#/contributions` without `src` params restores the sources, and opening a shared link doesn't overwrite them.
- **Concurrency**: `api/client.ts` limits parallel GraphQL requests to 4 to avoid GitHub's secondary rate limits.

### Parallel Data Fetching

- Issues and PRs are fetched in parallel for better performance
- Initial count query shows totals upfront before full data loads
- ~2x faster than sequential fetching for repos with unbalanced issue/PR counts

## Design Choices

### Color Scheme

- **Accent Color**: `#EBCB8B` (soft yellow) - chosen for warmth and visibility in both light/dark modes
- Originally was blue (GitHub default), then red, finally settled on yellow
- Same color used for both light and dark modes for consistency

### Logo

- Thumbs-up icon with yellow accent
- Simple and recognizable
- Represents the "upvote" concept clearly

### UI/UX Decisions

- **Load State Filter**: Default to "Only Open" for faster loading (most users care about active items)
- **Separate Tabs**: Issues vs PRs separated to avoid confusion
- **Visual Reactions**: Positive (green) vs Negative (red) clearly distinguished
- **Dark Mode**: Respects system preferences automatically

## Technical Stack Rationale

### React + TanStack Query + React Router

- React replaced the original vanilla DOM code (template strings + manual `classList` toggling) as the app grew a second section
- TanStack Query handles caching, deduplication, cancellation (`signal`) and retries. Retry happens only for `NETWORK` errors, and an `UNAUTHORIZED` error clears the stored token (see `main.tsx`)
- Hash router (`createHashRouter`) works on GitHub Pages without rewrites. The OAuth callback params (`?code=&state=`) sit before the hash and are handled by `useOAuthCallback`
- Token and rate-limit state are small external stores consumed via `useSyncExternalStore` (`hooks/useToken.ts`, `api/client.ts`)

### TypeScript

- Type safety prevents runtime errors
- Better IDE support and autocomplete
- Self-documenting code

### Bun

- Fast JavaScript runtime and package manager
- Drop-in replacement for npm/node
- Faster installs and script execution
- Compatible with Node.js ecosystem

### Vite

- Fast dev server with HMR
- Modern build tool optimized for ES modules
- Simple configuration

### Tailwind CSS

- Rapid UI development
- Consistent design system
- Small production bundle with purging

## Development Workflow

### CI/CD Pipeline

- **Feature Branch CI** (`.github/workflows/ci.yml`):
  - Runs on PRs and non-main branches
  - Linting → Type checking → Build
  - Fast feedback before merge
- **Deploy Workflow** (`.github/workflows/deploy.yml`):
  - Only runs on `main` branch
  - Automatic deployment to GitHub Pages
  - Uses Bun for faster builds

### Code Quality

- **ESLint + Prettier**: Enforces consistent code style
- **TypeScript strict mode**: Catches errors early
- **Automated formatting**: Run `bun run lint:fix` before commit

### Dependency Management

- **Renovate**: Automated dependency updates
- Runs twice weekly (Monday & Thursday at 3am)
- Groups all updates in single PR
- Auto-updates version badges in README via script

## File Structure Philosophy

```
src/
├── main.tsx             # Entry: QueryClient, hash router, routes
├── App.tsx              # Layout: header/nav, token settings, <Outlet/>, footer
├── api/
│   ├── client.ts        # GraphQL transport, GitHubApiError, rate-limit store, concurrency limit
│   ├── reactions.ts     # reactionGroups selection + positive/negative counting
│   ├── repo.ts          # Repository issues/PRs fetching
│   └── contributions.ts # Members (users/followers/org), search-based counts, detail
├── components/          # Shared UI: Header, Footer, TokenSettings, Icons, StateBadge, ...
├── features/
│   ├── repo/            # RepoPage, RepoResults, ItemCard, StateFilterBar
│   └── contributions/   # ContributionsPage, SourceConfig, SourceSection, LeaderboardTable, UserDetail
├── hooks/               # useToken, useTheme, useRateLimit, useOAuthCallback
├── types.ts             # TypeScript types - single source of truth
├── storage.ts           # LocalStorage wrapper
├── oauth.ts             # OAuth flow logic (frontend)
├── utils.ts             # Pure helper functions (filters, sorting, time ranges, login parsing)
├── styles.css           # Tailwind + component styles
└── worker/              # Cloudflare Worker for OAuth (optional)
    ├── oauth-worker.ts    # Worker implementation
    ├── wrangler.toml      # Worker configuration
    ├── package.json       # Worker dependencies
    ├── README.md          # Worker quick start
    └── OAUTH_SETUP.md     # Full OAuth setup guide
```

**Separation of Concerns:**

- API logic (`api/`) contains no React; components call it only through TanStack Query hooks
- Features are self-contained folders; shared UI lives in `components/`
- Types defined once, used everywhere
- Pure functions in utils for testability
- OAuth worker is completely optional (app works without it)

## Common Gotchas

### Rate Limits

- GitHub's GraphQL API **requires a token**: unauthenticated requests get HTTP 403, which `api/client.ts` reports as "token required"
- GraphQL budget: 5000 points/hour (remaining shown in header from `X-RateLimit-*` response headers)
- Use `reactionGroups` instead of individual reaction queries
- Pagination fetches 100 items per request

### Token Security

- Never commit tokens to git
- Store in localStorage only
- Only sent to `api.github.com`
- Users should use fine-grained tokens with minimal permissions

### Build Configuration

- `base` path in `vite.config.ts` set to `/` for the custom domain `ghs.keh.zone`
- Change to `/github-spotlight/` if serving from the `kaiehrhardt.github.io` subdirectory instead
- TypeScript `target: ES2020` for modern browser support

## Future Improvement Ideas

### Potential Features

- [ ] Export to CSV/JSON
- [ ] Bookmark favorite repositories
- [ ] Show reaction trends over time (requires historical data)
- [ ] Support for GitHub Enterprise

### Contributions Ideas

- [ ] Merged-PR / reviews counts
- [ ] Combined leaderboard across sources

### Performance Optimizations

- [ ] Virtual scrolling for large lists (1000+ items)
- [ ] Service Worker for offline support
- [ ] Cache API responses with expiry

### UX Enhancements

- [ ] Keyboard shortcuts
- [ ] Custom sorting options (date, comments, etc.)
- [ ] Saved filter presets

## Development Commands

```bash
# Development
bun run dev          # Start dev server
bun run build        # Production build
bun run preview      # Preview production build

# Code Quality
bun run lint         # Check linting errors
bun run lint:fix     # Auto-fix linting issues
bun run format       # Format with Prettier

# OAuth Worker (Optional)
bun run worker:dev   # Run worker locally
bun run worker:deploy # Deploy worker to Cloudflare
bun run worker:tail  # View worker logs

# Testing
bun run build        # Also serves as smoke test
```

## Agent Instructions

When working on this project:

1. **Read this file first** to understand context and decisions
2. **Follow the separation of concerns** - don't mix API/UI/business logic
3. **Run linting** before committing: `bun run lint:fix`
4. **Test the build** after changes: `bun run build`
5. **Update this file** if you make significant architectural decisions
6. **Keep it simple** - this is a client-side-only app, don't add unnecessary complexity

## Deployment

- Automatic via GitHub Actions on push to `main`
- Hosted at: https://ghs.keh.zone/ (custom domain configured in the repo's Pages settings)
- No manual deployment needed

## Contact & Credits

Built by [Kai Ehrhardt](https://github.com/kaiehrhardt) with [OpenCode](https://opencode.ai) (Claude Sonnet 4.5)

Last updated: 2026-11-21
