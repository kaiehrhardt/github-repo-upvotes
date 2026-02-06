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
  getLastRepo
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
  updateLoadingProgress
} from './ui';

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
  theme: 'light',
};

// DOM Elements
const repoInput = document.getElementById('repo-input') as HTMLInputElement;
const tokenInput = document.getElementById('token-input') as HTMLInputElement;
const loadStateFilterSelect = document.getElementById('load-state-filter') as HTMLSelectElement;
const loadBtn = document.getElementById('load-btn') as HTMLButtonElement;
const themeToggle = document.getElementById('theme-toggle') as HTMLButtonElement;
const clearTokenBtn = document.getElementById('clear-token-btn') as HTMLButtonElement;
const toggleTokenBtn = document.getElementById('toggle-token-visibility') as HTMLButtonElement;
const tabIssues = document.getElementById('tab-issues') as HTMLButtonElement;
const tabPRs = document.getElementById('tab-prs') as HTMLButtonElement;
const filterButtons = document.querySelectorAll('.filter-button');

// Initialize app
function init(): void {
  // Initialize theme
  state.theme = initializeTheme();

  // Load saved token
  const savedToken = getToken();
  if (savedToken) {
    tokenInput.value = savedToken;
    updateClearTokenButton(true);
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
    }
  });

  clearTokenBtn.addEventListener('click', () => {
    tokenInput.value = '';
    clearToken();
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
  filterButtons.forEach(button => {
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
    const result = await fetchRepositoryData(repo, loadStateFilter, token, (issuesCount, prsCount) => {
      // Update counters (these come from separate parallel fetches)
      if (issuesCount > 0) currentIssuesCount = issuesCount;
      if (prsCount > 0) currentPRsCount = prsCount;
      updateLoadingProgress(currentIssuesCount, currentPRsCount);
    });

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
    renderIssues(state.issues, state.stateFilter);
  } else {
    renderPullRequests(state.pullRequests, state.stateFilter);
  }
}

// Start the app
init();
