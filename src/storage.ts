import type { ContributionSource, Theme } from './types';

const STORAGE_KEYS = {
  TOKEN: 'github_token',
  THEME: 'theme_preference',
  LAST_REPO: 'last_repository',
  OAUTH_STATE: 'oauth_state',
  AUTH_METHOD: 'auth_method', // 'token' or 'oauth'
  CONTRIBUTION_SOURCES: 'contribution_sources',
  MEMBERS_PAGE_SIZE: 'members_page_size',
} as const;

export const TOKEN_STORAGE_KEY = STORAGE_KEYS.TOKEN;

// Token management
export function saveToken(token: string): void {
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
}

export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
}

// OAuth state management
export function saveOAuthState(state: string): void {
  localStorage.setItem(STORAGE_KEYS.OAUTH_STATE, state);
}

export function getOAuthState(): string | null {
  return localStorage.getItem(STORAGE_KEYS.OAUTH_STATE);
}

export function clearOAuthState(): void {
  localStorage.removeItem(STORAGE_KEYS.OAUTH_STATE);
}

// Auth method management
export type AuthMethod = 'token' | 'oauth';

export function saveAuthMethod(method: AuthMethod): void {
  localStorage.setItem(STORAGE_KEYS.AUTH_METHOD, method);
}

export function getAuthMethod(): AuthMethod | null {
  const method = localStorage.getItem(STORAGE_KEYS.AUTH_METHOD);
  return method === 'token' || method === 'oauth' ? method : null;
}

export function clearAuthMethod(): void {
  localStorage.removeItem(STORAGE_KEYS.AUTH_METHOD);
}

// Theme management
export function saveTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
  applyTheme(theme);
}

export function getTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEYS.THEME) as Theme | null;
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return getSystemTheme();
}

export function getSystemTheme(): Theme {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function applyTheme(theme: Theme): void {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function toggleTheme(): Theme {
  const currentTheme = getTheme();
  const newTheme: Theme = currentTheme === 'dark' ? 'light' : 'dark';
  saveTheme(newTheme);
  return newTheme;
}

// Repository management
export function saveLastRepo(repo: string): void {
  localStorage.setItem(STORAGE_KEYS.LAST_REPO, repo);
}

export function getLastRepo(): string | null {
  return localStorage.getItem(STORAGE_KEYS.LAST_REPO);
}

// Initialize theme on load
export function initializeTheme(): Theme {
  const theme = getTheme();
  applyTheme(theme);
  return theme;
}

// Contribution sources
function isContributionSource(value: unknown): value is ContributionSource {
  if (typeof value !== 'object' || value === null) return false;
  const source = value as Record<string, unknown>;
  if (typeof source.id !== 'string') return false;
  if (source.label !== undefined && typeof source.label !== 'string') return false;
  switch (source.kind) {
    case 'users':
      return Array.isArray(source.logins) && source.logins.every((l) => typeof l === 'string');
    case 'followers':
      return typeof source.login === 'string';
    case 'org':
      return typeof source.org === 'string';
    default:
      return false;
  }
}

/** Parses and validates a JSON list of sources. Throws on invalid input. */
export function parseSources(json: string): ContributionSource[] {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed) || !parsed.every(isContributionSource)) {
    throw new Error('Invalid sources format');
  }
  return parsed;
}

export function getSources(): ContributionSource[] {
  const stored = localStorage.getItem(STORAGE_KEYS.CONTRIBUTION_SOURCES);
  if (!stored) return [];
  try {
    return parseSources(stored);
  } catch {
    return [];
  }
}

export function saveSources(sources: ContributionSource[]): void {
  localStorage.setItem(STORAGE_KEYS.CONTRIBUTION_SOURCES, JSON.stringify(sources));
}

// Number of members loaded per source (and per "Load more" click)
export const MEMBERS_PAGE_SIZES = [50, 100, 200, 500] as const;
const DEFAULT_MEMBERS_PAGE_SIZE = 100;

export function getMembersPageSize(): number {
  const stored = Number(localStorage.getItem(STORAGE_KEYS.MEMBERS_PAGE_SIZE));
  return (MEMBERS_PAGE_SIZES as readonly number[]).includes(stored)
    ? stored
    : DEFAULT_MEMBERS_PAGE_SIZE;
}

export function saveMembersPageSize(size: number): void {
  localStorage.setItem(STORAGE_KEYS.MEMBERS_PAGE_SIZE, String(size));
}
