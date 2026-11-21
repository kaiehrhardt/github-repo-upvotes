import { useCallback, useState } from 'react';
import { getSources, saveSources } from '../storage';
import type { ContributionSource } from '../types';

/** Contribution sources, persisted to localStorage. */
export function useSources(): [ContributionSource[], (next: ContributionSource[]) => void] {
  const [sources, setSources] = useState<ContributionSource[]>(getSources);
  const update = useCallback((next: ContributionSource[]) => {
    saveSources(next);
    setSources(next);
  }, []);
  return [sources, update];
}
