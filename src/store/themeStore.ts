import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const applyTheme = (theme: Theme) => {
  console.log('applyTheme called with:', theme);
  console.log('document.documentElement exists?', !!document.documentElement);

  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    console.log('Added dark class. Classes now:', document.documentElement.className);
  } else {
    document.documentElement.classList.remove('dark');
    console.log('Removed dark class. Classes now:', document.documentElement.className);
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => {
        console.log('toggleTheme called');
        return set((state) => {
          console.log('Current state.theme:', state.theme);
          const newTheme = state.theme === 'light' ? 'dark' : 'light';
          console.log('New theme will be:', newTheme);
          applyTheme(newTheme);
          return { theme: newTheme };
        });
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => {
        console.log('onRehydrateStorage: Starting rehydration');
        return (state) => {
          console.log('onRehydrateStorage: Rehydrated state:', state);
          if (state) {
            console.log('onRehydrateStorage: Applying theme:', state.theme);
            applyTheme(state.theme);
          }
        };
      },
    }
  )
);
