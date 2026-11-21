import { useCallback, useState } from 'react';
import { initializeTheme, toggleTheme } from '../storage';
import type { Theme } from '../types';

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(initializeTheme);
  const toggle = useCallback(() => setTheme(toggleTheme()), []);
  return { theme, toggle };
}
