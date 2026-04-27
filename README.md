<div align="center">

<img src="public/logo.svg" alt="GitHub Repo Upvotes Logo" width="80" height="80">

# GitHub Repo Upvotes

**Discover the most popular issues and pull requests in any GitHub repository, ranked by community reactions.**

_Built with TypeScript, Vite, and Tailwind CSS_

[![Deploy to GitHub Pages](https://github.com/kaiehrhardt/github-repo-upvotes/actions/workflows/deploy.yml/badge.svg)](https://github.com/kaiehrhardt/github-repo-upvotes/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0.10-646CFF?logo=vite)](https://vitejs.dev/)

**[🚀 Try it now](https://kaiehrhardt.github.io/github-repo-upvotes/)**

---

</div>

## ✨ Features

- 🔍 **Browse any public repository** - Just enter `owner/repo` format
- 👍 **Smart reaction tracking** - Positive (👍❤️🎉🚀👀😄) vs negative (👎😕) reactions
- 📊 **Automatic sorting** - Most upvoted items at the top
- ⚡ **Fast filtering** - Load only open, closed, or all items
- 🏷️ **Separate tabs** - Issues and Pull Requests organized separately
- 🎯 **State filters** - View All, Open, Closed, or Merged (PRs only)
- 🌓 **Dark/Light mode** - Automatic system preference detection
- 🔐 **OAuth authentication** - Sign in with GitHub (optional)
- 🔑 **Manual token support** - Use personal access tokens as alternative
- 🚫 **No backend needed** - Pure client-side application (OAuth worker optional)

## 🚀 Quick Start

### Use Online

Visit **[kaiehrhardt.github.io/github-repo-upvotes](https://kaiehrhardt.github.io/github-repo-upvotes/)**

### Run Locally

```bash
# Clone the repository
git clone https://github.com/kaiehrhardt/github-repo-upvotes.git
cd github-repo-upvotes

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
2. _(Optional)_ Add a [GitHub Personal Access Token](#-github-token-optional) for higher rate limits
3. Choose what to load: All, Only Open, or Only Closed items
4. Click "Load Repository Data"
5. Browse issues/PRs and filter by state

## 🔑 GitHub Token (Optional)

### Option 1: OAuth Login (Recommended)

Sign in with your GitHub account for seamless authentication:

1. Set up OAuth using our [OAuth Setup Guide](src/worker/OAUTH_SETUP.md)
2. Click "Sign in with GitHub" in the app
3. Authorize the application
4. Enjoy increased rate limits automatically

### Option 2: Manual Token

Increase your API rate limit by creating a token:

**Fine-grained Token (recommended):**

1. Go to [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
2. Select **Public Repositories (read-only)**
3. Add **Contents: Read-only** permission
4. Generate and copy the token

**Classic Token:**

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens/new)
2. Select `public_repo` scope
3. Generate and copy the token

**Privacy:** Your token is stored locally in your browser and only sent to GitHub's API.

## 🛠️ Technology Stack

- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS
- **GitHub GraphQL API v4** - Data fetching

## 📊 API Rate Limits

| Type          | Requests per hour |
| ------------- | ----------------- |
| Without token | 60                |
| With token    | 5,000             |

## 🌐 Browser Support

Modern browsers with ES2020 support (Chrome 80+, Firefox 75+, Safari 13.1+)

## 📄 License

MIT - see [LICENSE](LICENSE) file for details

## 🤝 Contributing

Issues and pull requests are welcome! Feel free to contribute.

---

<div align="center">

Built with ❤️ by [kaiehrhardt](https://github.com/kaiehrhardt) using OpenCode (Claude Sonnet 4.5)

</div>
