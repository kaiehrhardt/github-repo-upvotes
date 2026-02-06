import type { Issue, PullRequest, StateFilter, LoadStateFilter, TabType, APIError } from './types';
import { filterIssues, filterPullRequests, sortByReactions } from './utils';

// DOM Elements
const getElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Element with id '${id}' not found`);
  return element as T;
};

// Show/Hide functions
export function showLoading(): void {
  getElement('loading-state').classList.remove('hidden');
  getElement('error-state').classList.add('hidden');
  getElement('results-section').classList.add('hidden');
}

export function hideLoading(): void {
  getElement('loading-state').classList.add('hidden');
}

export function updateLoadingProgress(issuesCount: number, prsCount: number): void {
  const progressElement = getElement('loading-progress');
  progressElement.textContent = `Loaded ${issuesCount} issues and ${prsCount} pull requests...`;
}

export function showError(error: APIError): void {
  hideLoading();
  const errorState = getElement('error-state');
  const errorMessage = getElement('error-message');
  errorMessage.textContent = error.message;
  errorState.classList.remove('hidden');
  getElement('results-section').classList.add('hidden');
}

export function hideError(): void {
  getElement('error-state').classList.add('hidden');
}

export function showResults(): void {
  hideLoading();
  hideError();
  getElement('results-section').classList.remove('hidden');
}

// Render individual cards
function renderIssueCard(issue: Issue): string {
  const stateBadgeClass = issue.state === 'OPEN' ? 'badge-open' : 'badge-closed';
  const stateText = issue.state === 'OPEN' ? 'Open' : 'Closed';

  return `
    <div class="card">
      <div class="flex items-start justify-between">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-2">
            <a
              href="${issue.url}"
              target="_blank"
              rel="noopener noreferrer"
              class="text-github-fg-muted dark:text-github-fg-darkMuted hover:text-github-accent-emphasis dark:hover:text-github-accent-dark font-medium"
            >
              #${issue.number}
            </a>
            <span class="badge ${stateBadgeClass}">${stateText}</span>
          </div>
          <h3 class="text-lg font-medium mb-2">
            <a
              href="${issue.url}"
              target="_blank"
              rel="noopener noreferrer"
              class="text-github-fg-default dark:text-github-fg-dark hover:text-github-accent-emphasis dark:hover:text-github-accent-dark"
            >
              ${escapeHtml(issue.title)}
            </a>
          </h3>
        </div>
        <div class="flex flex-col items-end ml-4 gap-1">
          <div class="flex items-center text-green-600 dark:text-green-400">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"></path>
            </svg>
            <span class="font-semibold text-lg">${issue.reactions.positiveCount}</span>
          </div>
          ${issue.reactions.negativeCount > 0 ? `
          <div class="flex items-center text-red-600 dark:text-red-400">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"></path>
            </svg>
            <span class="font-semibold">${issue.reactions.negativeCount}</span>
          </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderPullRequestCard(pr: PullRequest): string {
  let stateBadgeClass: string;
  let stateText: string;

  if (pr.state === 'OPEN') {
    stateBadgeClass = 'badge-open';
    stateText = 'Open';
  } else if (pr.state === 'MERGED') {
    stateBadgeClass = 'badge-merged';
    stateText = 'Merged';
  } else {
    stateBadgeClass = 'badge-closed';
    stateText = 'Closed';
  }

  return `
    <div class="card">
      <div class="flex items-start justify-between">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-2">
            <a
              href="${pr.url}"
              target="_blank"
              rel="noopener noreferrer"
              class="text-github-fg-muted dark:text-github-fg-darkMuted hover:text-github-accent-emphasis dark:hover:text-github-accent-dark font-medium"
            >
              #${pr.number}
            </a>
            <span class="badge ${stateBadgeClass}">${stateText}</span>
          </div>
          <h3 class="text-lg font-medium mb-2">
            <a
              href="${pr.url}"
              target="_blank"
              rel="noopener noreferrer"
              class="text-github-fg-default dark:text-github-fg-dark hover:text-github-accent-emphasis dark:hover:text-github-accent-dark"
            >
              ${escapeHtml(pr.title)}
            </a>
          </h3>
        </div>
        <div class="flex flex-col items-end ml-4 gap-1">
          <div class="flex items-center text-green-600 dark:text-green-400">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"></path>
            </svg>
            <span class="font-semibold text-lg">${pr.reactions.positiveCount}</span>
          </div>
          ${pr.reactions.negativeCount > 0 ? `
          <div class="flex items-center text-red-600 dark:text-red-400">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"></path>
            </svg>
            <span class="font-semibold">${pr.reactions.negativeCount}</span>
          </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

// Render lists
export function renderIssues(issues: Issue[], filter: StateFilter): void {
  const issuesList = getElement('issues-list');
  const emptyState = getElement('empty-state');

  const filtered = filterIssues(issues, filter);
  const sorted = sortByReactions(filtered);

  if (sorted.length === 0) {
    issuesList.classList.add('hidden');
    emptyState.classList.remove('hidden');
  } else {
    issuesList.classList.remove('hidden');
    emptyState.classList.add('hidden');
    issuesList.innerHTML = sorted.map(issue => renderIssueCard(issue)).join('');
  }
}

export function renderPullRequests(prs: PullRequest[], filter: StateFilter): void {
  const prsList = getElement('prs-list');
  const emptyState = getElement('empty-state');

  const filtered = filterPullRequests(prs, filter);
  const sorted = sortByReactions(filtered);

  if (sorted.length === 0) {
    prsList.classList.add('hidden');
    emptyState.classList.remove('hidden');
  } else {
    prsList.classList.remove('hidden');
    emptyState.classList.add('hidden');
    prsList.innerHTML = sorted.map(pr => renderPullRequestCard(pr)).join('');
  }
}

// Update counts
export function updateCounts(issuesCount: number, prsCount: number): void {
  getElement('issues-count').textContent = `(${issuesCount})`;
  getElement('prs-count').textContent = `(${prsCount})`;
}

// Tab management
export function switchTab(tab: TabType): void {
  const issuesTab = getElement('tab-issues');
  const prsTab = getElement('tab-prs');
  const issuesList = getElement('issues-list');
  const prsList = getElement('prs-list');
  const mergedFilter = getElement('merged-filter');

  if (tab === 'issues') {
    issuesTab.classList.add('active');
    prsTab.classList.remove('active');
    issuesList.classList.remove('hidden');
    prsList.classList.add('hidden');
    // Hide merged filter for issues (they can't be merged)
    mergedFilter.classList.add('hidden');
  } else {
    issuesTab.classList.remove('active');
    prsTab.classList.add('active');
    issuesList.classList.add('hidden');
    prsList.classList.remove('hidden');
    // Show merged filter for PRs
    mergedFilter.classList.remove('hidden');
  }
}

// Filter button management
export function updateFilterButtons(activeFilter: StateFilter, loadStateFilter: LoadStateFilter): void {
  const filterButtons = document.querySelectorAll('.filter-button');
  filterButtons.forEach(button => {
    const filter = button.getAttribute('data-filter') as StateFilter;

    // Update "All" button text based on loadStateFilter
    if (filter === 'all') {
      const allButton = button as HTMLButtonElement;
      if (loadStateFilter === 'open') {
        allButton.textContent = 'All Open';
      } else if (loadStateFilter === 'closed') {
        allButton.textContent = 'All Closed';
      } else {
        allButton.textContent = 'All';
      }
    }

    // Determine if button should be disabled
    let shouldDisable = false;
    if (loadStateFilter === 'open' && (filter === 'closed' || filter === 'merged')) {
      shouldDisable = true;
    } else if (loadStateFilter === 'closed' && filter === 'open') {
      shouldDisable = true;
    }

    // Update button state
    if (shouldDisable) {
      button.classList.add('opacity-50', 'cursor-not-allowed');
      button.setAttribute('disabled', 'true');
      button.classList.remove('active');
    } else {
      button.classList.remove('opacity-50', 'cursor-not-allowed');
      button.removeAttribute('disabled');

      if (filter === activeFilter) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    }
  });
}

// Token visibility
export function toggleTokenVisibility(): boolean {
  const tokenInput = getElement<HTMLInputElement>('token-input');
  const eyeIcon = getElement('eye-icon');
  const eyeOffIcon = getElement('eye-off-icon');

  if (tokenInput.type === 'password') {
    tokenInput.type = 'text';
    eyeIcon.classList.add('hidden');
    eyeOffIcon.classList.remove('hidden');
    return true;
  } else {
    tokenInput.type = 'password';
    eyeIcon.classList.remove('hidden');
    eyeOffIcon.classList.add('hidden');
    return false;
  }
}

// Token clear button visibility
export function updateClearTokenButton(hasToken: boolean): void {
  const clearBtn = getElement('clear-token-btn');
  if (hasToken) {
    clearBtn.classList.remove('hidden');
  } else {
    clearBtn.classList.add('hidden');
  }
}
