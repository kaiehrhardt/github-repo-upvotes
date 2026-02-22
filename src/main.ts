import './styles.css';
import type { AppState, StateFilter, LoadStateFilter } from './types';
import { parseRepository } from './utils';
import { fetchRepositoryData } from './github-api';
import {
  getToken,
  saveToken,
  clearToken,
  initializeTheme,
  toggleTheme,
  saveLastRepo,
  getLastRepo,
  clearAuthMethod,
  saveAuthMethod,
} from './storage';
import {
  showLoading,
  showError,
  showResults,
  renderIssues,
  renderPullRequests,
  updateCounts,
  switchTab,
  updateFilterButtons,
  toggleTokenVisibility,
  updateClearTokenButton,
  updateLoadingProgress,
} from './ui';
import {
  isOAuthConfigured,
  initiateOAuthFlow,
  handleOAuthCallback,
  getOAuthRedirectUri,
} from './oauth';

// Application state
const state: AppState = {
  loading: false,
  error: null,
  repository: null,
  issues: [],
  pullRequests: [],
  activeTab: 'issues',
  stateFilter: 'all',
  loadStateFilter: 'open',
  searchQuery: '',
  theme: 'light',
};

// DOM Elements
const repoInput = document.getElementById('repo-input') as HTMLInputElement;
const tokenInput = document.getElementById('token-input') as HTMLInputElement;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const loadStateFilterSelect = document.getElementById('load-state-filter') as HTMLSelectElement;
const loadBtn = document.getElementById('load-btn') as HTMLButtonElement;
const themeToggle = document.getElementById('theme-toggle') as HTMLButtonElement;
const clearTokenBtn = document.getElementById('clear-token-btn') as HTMLButtonElement;
const toggleTokenBtn = document.getElementById('toggle-token-visibility') as HTMLButtonElement;
const oauthLoginBtn = document.getElementById('oauth-login-btn') as HTMLButtonElement;
const tabIssues = document.getElementById('tab-issues') as HTMLButtonElement;
const tabPRs = document.getElementById('tab-prs') as HTMLButtonElement;
const filterButtons = document.querySelectorAll('.filter-button');

// Initialize app
function init(): void {
  // Initialize theme
  state.theme = initializeTheme();

  // Check for OAuth callback
  handleOAuthCallbackIfPresent();

  // Load saved token
  const savedToken = getToken();
  if (savedToken) {
    tokenInput.value = savedToken;
    updateClearTokenButton(true);
  }

  // Show OAuth button if configured
  if (isOAuthConfigured()) {
    oauthLoginBtn.classList.remove('hidden');
  }

  // Load last repository
  const lastRepo = getLastRepo();
  if (lastRepo) {
    repoInput.value = lastRepo;
  }

  // Setup event listeners
  setupEventListeners();
}

// Setup all event listeners
function setupEventListeners(): void {
  // Theme toggle
  themeToggle.addEventListener('click', () => {
    state.theme = toggleTheme();
  });

  // Load button
  loadBtn.addEventListener('click', handleLoad);

  // OAuth login button
  oauthLoginBtn.addEventListener('click', handleOAuthLogin);

  // Enter key on inputs
  repoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleLoad();
    }
  });

  tokenInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleLoad();
    }
  });

  // Token management
  tokenInput.addEventListener('input', () => {
    const token = tokenInput.value.trim();
    updateClearTokenButton(token.length > 0);
    if (token) {
      saveToken(token);
      saveAuthMethod('token');
    }
  });

  clearTokenBtn.addEventListener('click', () => {
    tokenInput.value = '';
    clearToken();
    clearAuthMethod();
    updateClearTokenButton(false);
  });

  toggleTokenBtn.addEventListener('click', () => {
    toggleTokenVisibility();
  });

  // Tab switching
  tabIssues.addEventListener('click', () => {
    state.activeTab = 'issues';
    switchTab('issues');
    renderCurrentTab();
  });

  tabPRs.addEventListener('click', () => {
    state.activeTab = 'pullRequests';
    switchTab('pullRequests');
    renderCurrentTab();
  });

  // Filter buttons
  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.getAttribute('data-filter') as StateFilter;

      // Check if button is disabled
      if (button.hasAttribute('disabled')) {
        return;
      }

      state.stateFilter = filter;
      updateFilterButtons(filter, state.loadStateFilter);
      renderCurrentTab();
    });
  });

  // Search input
  searchInput.addEventListener('input', () => {
    state.searchQuery = searchInput.value.trim();
    renderCurrentTab();
  });
}

// Handle load button click
async function handleLoad(): Promise<void> {
  // Validate repository input
  const repoString = repoInput.value.trim();
  if (!repoString) {
    showError({
      message: 'Please enter a repository in the format: owner/repo',
      type: 'UNKNOWN',
    });
    return;
  }

  const repo = parseRepository(repoString);
  if (!repo) {
    showError({
      message: 'Invalid repository format. Please use: owner/repo (e.g., facebook/react)',
      type: 'UNKNOWN',
    });
    return;
  }

  // Save repository for next time
  saveLastRepo(repoString);
  state.repository = repo;

  // Get token
  const token = tokenInput.value.trim() || undefined;
  if (token) {
    saveToken(token);
  }

  // Get load state filter
  const loadStateFilter = loadStateFilterSelect.value as LoadStateFilter;

  // Show loading state
  state.loading = true;
  showLoading();
  loadBtn.disabled = true;

  try {
    // Track progress separately for issues and PRs
    let currentIssuesCount = 0;
    let currentPRsCount = 0;

    // Fetch data with progress callback
    const result = await fetchRepositoryData(
      repo,
      loadStateFilter,
      token,
      (issuesCount, prsCount) => {
        // Update counters (these come from separate parallel fetches)
        if (issuesCount > 0) currentIssuesCount = issuesCount;
        if (prsCount > 0) currentPRsCount = prsCount;
        updateLoadingProgress(currentIssuesCount, currentPRsCount);
      }
    );

    if (result.error) {
      // Handle API errors
      if (result.error.type === 'UNAUTHORIZED') {
        // Clear invalid token
        tokenInput.value = '';
        clearToken();
        updateClearTokenButton(false);
      }
      showError(result.error);
      state.loading = false;
      loadBtn.disabled = false;
      return;
    }

    // Update state with results
    state.issues = result.issues;
    state.pullRequests = result.pullRequests;
    state.error = null;
    state.loading = false;
    state.loadStateFilter = loadStateFilter;

    // Update UI
    updateCounts(result.issues.length, result.pullRequests.length);
    showResults();

    // Reset to default tab and filter
    state.activeTab = 'issues';
    state.stateFilter = 'all';
    switchTab('issues');
    updateFilterButtons('all', loadStateFilter);

    // Render initial data
    renderCurrentTab();
  } catch (error) {
    console.error('Unexpected error:', error);
    showError({
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      type: 'UNKNOWN',
    });
    state.loading = false;
  } finally {
    loadBtn.disabled = false;
  }
}

// Render current tab with current filter
function renderCurrentTab(): void {
  if (state.activeTab === 'issues') {
    renderIssues(state.issues, state.stateFilter, state.searchQuery);
  } else {
    renderPullRequests(state.pullRequests, state.stateFilter, state.searchQuery);
  }
}

// Handle OAuth callback from GitHub
async function handleOAuthCallbackIfPresent(): Promise<void> {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');

  if (code && state) {
    // Show loading state
    showLoading();

    try {
      const workerUrl = import.meta.env.VITE_OAUTH_WORKER_URL || '';

      if (!workerUrl) {
        throw new Error('OAuth worker URL not configured');
      }

      const token = await handleOAuthCallback(code, state, workerUrl);

      // Update UI
      tokenInput.value = token;
      updateClearTokenButton(true);

      // Remove query params from URL
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, document.title, url.toString());

      // Show success message
      showResults();
    } catch (error) {
      console.error('OAuth callback error:', error);
      showError({
        message: error instanceof Error ? error.message : 'OAuth authentication failed',
        type: 'UNKNOWN',
      });
    }
  }
}

// Handle OAuth login button click
async function handleOAuthLogin(): Promise<void> {
  const workerUrl = import.meta.env.VITE_OAUTH_WORKER_URL || '';

  if (!workerUrl) {
    showError({
      message:
        'OAuth is not configured. Please set VITE_OAUTH_WORKER_URL or use a manual token instead.',
      type: 'UNKNOWN',
    });
    return;
  }

  try {
    await initiateOAuthFlow({
      workerUrl,
      redirectUri: getOAuthRedirectUri(),
    });
  } catch (error) {
    console.error('OAuth login error:', error);
    showError({
      message: error instanceof Error ? error.message : 'Failed to initiate OAuth login',
      type: 'UNKNOWN',
    });
  }
}

// Start the app
init();
