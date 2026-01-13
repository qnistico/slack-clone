import { useThemeStore } from '../store/themeStore';

export function useTheme() {
  const { theme, setTheme, toggleTheme } = useThemeStore();

  // The theme is already applied by the store's applyTheme function
  // No need for additional useEffect here

  return { theme, setTheme, toggleTheme };
}
