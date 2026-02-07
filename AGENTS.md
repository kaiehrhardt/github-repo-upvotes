# Agent Context & Development History

This file documents key development decisions, architecture choices, and context for AI agents working on this project.

## Project Overview

**GitHub Repo Upvotes** is a static web application that displays GitHub Issues and Pull Requests ranked by community reactions (upvotes). It's built as a pure client-side app using TypeScript, Vite, and Tailwind CSS.

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

### TypeScript
- Type safety prevents runtime errors
- Better IDE support and autocomplete
- Self-documenting code

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
  - Uses Node.js LTS for stability

### Code Quality
- **ESLint + Prettier**: Enforces consistent code style
- **TypeScript strict mode**: Catches errors early
- **Automated formatting**: Run `npm run lint:fix` before commit

### Dependency Management
- **Renovate**: Automated dependency updates
- Runs twice weekly (Monday & Thursday at 3am)
- Groups all updates in single PR
- Auto-updates version badges in README via script

## File Structure Philosophy

```
src/
├── main.ts          # Entry point - event handlers, app initialization
├── github-api.ts    # All GitHub API logic isolated here
├── ui.ts            # DOM manipulation and rendering
├── types.ts         # TypeScript types - single source of truth
├── storage.ts       # LocalStorage wrapper
├── utils.ts         # Pure helper functions
└── styles.css       # Tailwind + component styles
```

**Separation of Concerns:**
- API logic separate from UI logic
- UI rendering separate from business logic
- Types defined once, used everywhere
- Pure functions in utils for testability

## Common Gotchas

### Rate Limits
- GitHub API: 60 requests/hour without token, 5000 with token
- Use `reactionGroups` instead of individual reaction queries
- Pagination fetches 100 items per request

### Token Security
- Never commit tokens to git
- Store in localStorage only
- Only sent to `api.github.com`
- Users should use fine-grained tokens with minimal permissions

### Build Configuration
- `base` path in `vite.config.ts` set to `/` for custom domain
- Change to `/github-repo-upvotes/` if using GitHub Pages subdomain
- TypeScript `target: ES2020` for modern browser support

## Future Improvement Ideas

### Potential Features
- [ ] Add search/filter within loaded items
- [ ] Export to CSV/JSON
- [ ] Bookmark favorite repositories
- [ ] Show reaction trends over time (requires historical data)
- [ ] Support for GitHub Enterprise

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
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build

# Code Quality
npm run lint         # Check linting errors
npm run lint:fix     # Auto-fix linting issues
npm run format       # Format with Prettier

# Testing
npm run build        # Also serves as smoke test
```

## Agent Instructions

When working on this project:

1. **Read this file first** to understand context and decisions
2. **Follow the separation of concerns** - don't mix API/UI/business logic
3. **Run linting** before committing: `npm run lint:fix`
4. **Test the build** after changes: `npm run build`
5. **Update this file** if you make significant architectural decisions
6. **Keep it simple** - this is a client-side-only app, don't add unnecessary complexity

## Deployment

- Automatic via GitHub Actions on push to `main`
- Hosted at: https://kaiehrhardt.github.io/github-repo-upvotes/
- No manual deployment needed

## Contact & Credits

Built by [Kai Ehrhardt](https://github.com/kaiehrhardt) with [OpenCode](https://opencode.ai) (Claude Sonnet 4.5)

Last updated: 2026-02-07
