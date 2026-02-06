import type { Theme } from './types';

const STORAGE_KEYS = {
  TOKEN: 'github_token',
  THEME: 'theme_preference',
  LAST_REPO: 'last_repository',
} as const;

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
