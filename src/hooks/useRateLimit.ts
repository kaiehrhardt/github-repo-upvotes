import { useSyncExternalStore } from 'react';
import { getRateLimit, subscribeRateLimit } from '../api/client';
import type { RateLimitInfo } from '../types';

export function useRateLimit(): RateLimitInfo | null {
  return useSyncExternalStore(subscribeRateLimit, getRateLimit);
}
