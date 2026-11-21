<div align="center">

<img src="public/logo.svg" alt="GitHub Spotlight Logo" width="80" height="80">

# GitHub Spotlight (GHS)

**Discover the most popular issues and pull requests in any GitHub repository, ranked by community reactions — and see who contributes the most PRs and issues among accounts, followers, and org members.**

_Built with React, TypeScript, Vite, and Tailwind CSS_

[![Deploy to GitHub Pages](https://github.com/kaiehrhardt/github-spotlight/actions/workflows/deploy.yml/badge.svg)](https://github.com/kaiehrhardt/github-spotlight/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.1.4-646CFF?logo=vite)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.3.1-61DAFB?logo=react)](https://react.dev/)

**[🚀 Try it now](https://ghs.keh.zone/)**

---

</div>

## ✨ Features

- 🔍 **Browse any public repository** - Just enter `owner/repo` format
- 👍 **Smart reaction tracking** - Positive (👍❤️🎉🚀👀😄) vs negative (👎😕) reactions
- 📊 **Automatic sorting** - Most upvoted items at the top
- ⚡ **Fast filtering** - Load only open, closed, or all items
- 🏷️ **Separate tabs** - Issues and Pull Requests organized separately
- 🎯 **State filters** - View All, Open, Closed, or Merged (PRs only)
- 🔗 **Shareable links** - e.g. `#/repo/facebook/react?load=open`
- 🏆 **Contributions leaderboards** - Count authored PRs and issues per account, for:
  - individual accounts
  - followers of an account
  - members of an organization
- 🗂️ **Configurable sources** - Each source gets its own leaderboard section. Sources are encoded in the URL, so views can be bookmarked and shared
- ⏱️ **Quick time filters** - Last month, last 3 months, last year, or all time
- 🌓 **Dark/Light mode** - Automatic system preference detection
- 🔐 **OAuth authentication** - Sign in with GitHub (optional)
- 🔑 **Manual token support** - Use personal access tokens as alternative
- 🚫 **No backend needed** - Pure client-side application (OAuth worker optional)

## 🚀 Quick Start

### Use Online

Visit **[ghs.keh.zone](https://ghs.keh.zone/)**

### Run Locally

```bash
# Clone the repository
git clone https://github.com/kaiehrhardt/github-spotlight.git
cd github-spotlight

# Install dependencies
bun install

# Start development server
bun run dev
```

### Debug Renovate Config Locally

Test and debug the `renovate.json` without creating real PRs using Docker:

```bash
docker run \
  -e RENOVATE_TOKEN=<github-token> \
  -e LOG_LEVEL=debug \
  -v `pwd`:/test \
  -w /test \
  --rm \
  ghcr.io/renovatebot/renovate \
  --platform local
```

## 📖 How to Use

1. Enter a repository name (e.g., `facebook/react`)
2. Add a [GitHub token](#-github-token) (GitHub's GraphQL API requires authentication)
3. Choose what to load: All, Only Open, or Only Closed items
4. Click "Load Repository Data"
5. Browse issues/PRs and filter by state

### Contributions

1. Open the **Contributions** tab
2. Add sources: a list of accounts, the followers of an account, or the members of an organization
3. Pick a period (Last month / Last 3 months / Last year / All)
4. Sort by PRs, issues, or total; click an account to see its latest PRs and issues
5. Share or bookmark the URL. It contains your sources, the period and the options, e.g.
   `https://ghs.keh.zone/#/contributions?range=year&accounts=100&hide=inactive&src=org:vercel&src=users:torvalds,gaearon`

Large sources are loaded in steps (50–500 accounts per load, configurable) to protect your rate limit. Counts come from GitHub search, so private repositories are included only if your token can access them. Without org membership (or the `read:org` scope on classic tokens), only public org members are listed.

## 🔑 GitHub Token

### Option 1: OAuth Login (Recommended)

Sign in with your GitHub account for seamless authentication:

1. Set up OAuth using our [OAuth Setup Guide](src/worker/OAUTH_SETUP.md)
2. Click "Sign in with GitHub" in the app
3. Authorize the application
4. The token is stored automatically

The OAuth login requests the `read:org` scope, so org sources also list private members of organizations you belong to. See [OAuth Scopes](src/worker/OAUTH_SETUP.md#oauth-scopes) for details and how to change them.

### Option 2: Manual Token

Create a token:

**Fine-grained Token (recommended):**

1. Go to [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
2. Select **Public Repositories (read-only)**
3. Add **Contents: Read-only** permission
4. Generate and copy the token

**Classic Token:**

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens/new)
2. Select `public_repo` scope (add `read:org` to see private org members of your orgs)
3. Generate and copy the token

**Privacy:** Your token is stored locally in your browser and only sent to GitHub's API.

## 🛠️ Technology Stack

- **React** - UI
- **TanStack Query** - Caching, deduplication and retries for API calls
- **React Router** - Hash-based routing (works on GitHub Pages)
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS
- **GitHub GraphQL API v4** - Data fetching

## 📊 API Rate Limits

GitHub's GraphQL API requires a token and allows 5,000 points per hour. The current remaining budget is shown in the app header.

## 🌐 Browser Support

Modern browsers with ES2020 support (Chrome 80+, Firefox 75+, Safari 13.1+)

## 📄 License

MIT - see [LICENSE](LICENSE) file for details

## 🤝 Contributing

Issues and pull requests are welcome! Feel free to contribute.

---

<div align="center">

Built with ❤️ by [kaiehrhardt](https://github.com/kaiehrhardt) using AI (Claude Opus 5.5)

</div>
