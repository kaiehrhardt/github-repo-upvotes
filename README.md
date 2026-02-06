# GitHub Repo Upvotes

A static web application that displays GitHub repository issues and pull requests ranked by reactions (upvotes). Built with TypeScript, Vite, and Tailwind CSS.

## Features

- **Repository Search**: View issues and pull requests from any public GitHub repository
- **Reaction Sorting**: Items are automatically sorted by total reaction count (all reaction types: 👍❤️🎉😄😕👀🚀👎)
- **Separate Tabs**: Issues and Pull Requests are displayed in separate, filterable tabs
- **State Filtering**: Filter by All, Open, Closed, or Merged (PRs only)
- **Dark/Light Mode**: Toggle between dark and light themes with system preference detection
- **GitHub Token Support**: Optional token for increased API rate limits (60 → 5000 requests/hour)
- **Fully Static**: No backend required, can be hosted on GitHub Pages
- **Pagination Handling**: Automatically fetches all issues and PRs (100 per request)

## Usage

### Online

Visit the deployed application: `https://<your-username>.github.io/github-repo-upvotes/`

### Running Locally

1. **Install Node.js** (version 18 or higher)

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

5. **Preview production build**:
   ```bash
   npm run preview
   ```

## How to Use the App

1. **Enter a repository** in the format `owner/repo` (e.g., `facebook/react`)
2. **(Optional)** Enter a GitHub Personal Access Token for higher rate limits
3. Click **"Load Repository Data"**
4. Browse the **Issues** or **Pull Requests** tabs
5. Use the **filter buttons** to view All, Open, Closed, or Merged items
6. Toggle **Dark/Light mode** using the button in the header

## GitHub Token (Optional)

To increase your API rate limit, you can create a GitHub Personal Access Token:

1. Go to [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens)
2. Generate a new token (classic)
3. Select scopes: `public_repo` (or no scopes for public data only)
4. Copy the token and paste it into the app

**Note**: The token is stored in your browser's localStorage and never sent to any server except GitHub's API.

## Deployment to GitHub Pages

This project is configured for automatic deployment to GitHub Pages via GitHub Actions.

### Setup Steps

1. **Push your code** to a GitHub repository
2. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Set Source to "GitHub Actions"
3. **Push to main branch** - the workflow will automatically build and deploy
4. **Update `base` path** in `vite.config.ts` if your repo name differs:
   ```typescript
   base: '/your-repo-name/',
   ```

The app will be available at: `https://<your-username>.github.io/<repo-name>/`

## Technology Stack

- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **GitHub GraphQL API v4**: Data fetching
- **GitHub Pages**: Static hosting

## Project Structure

```
github-repo-upvotes/
├── src/
│   ├── main.ts           # App entry point & event handlers
│   ├── github-api.ts     # GitHub GraphQL API client
│   ├── ui.ts             # UI rendering functions
│   ├── types.ts          # TypeScript type definitions
│   ├── storage.ts        # LocalStorage utilities
│   ├── utils.ts          # Helper functions
│   └── styles.css        # Tailwind CSS styles
├── index.html            # HTML structure
├── vite.config.ts        # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Project dependencies
```

## API Rate Limits

- **Without token**: 60 requests/hour
- **With token**: 5,000 requests/hour

Each repository query fetches 100 issues and 100 PRs per request. Pagination continues until all items are loaded.

## Browser Support

Modern browsers with ES2020 support:
- Chrome/Edge 80+
- Firefox 75+
- Safari 13.1+

## License

MIT

## Contributing

Issues and pull requests are welcome!
