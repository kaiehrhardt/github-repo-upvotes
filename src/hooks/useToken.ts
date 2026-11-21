import { useSyncExternalStore } from 'react';
import {
  clearAuthMethod,
  clearToken,
  getToken,
  saveAuthMethod,
  saveToken,
  TOKEN_STORAGE_KEY,
  type AuthMethod,
} from '../storage';

// Token lives in localStorage; this tiny store lets React (and non-React code) react to changes.
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === TOKEN_STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function setStoredToken(token: string, method: AuthMethod = 'token'): void {
  const trimmed = token.trim();
  if (!trimmed) {
    clearStoredToken();
    return;
  }
  saveToken(trimmed);
  saveAuthMethod(method);
  emit();
}

export function clearStoredToken(): void {
  clearToken();
  clearAuthMethod();
  emit();
}

export function useToken(): string | null {
  return useSyncExternalStore(subscribe, getToken);
}
