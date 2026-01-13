import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface ThemeToggleProps {
  variant?: 'default' | 'sidebar';
}

export default function ThemeToggle({ variant = 'default' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  if (variant === 'sidebar') {
    return (
      <button
        onClick={toggleTheme}
        className="flex flex-col items-center gap-1 py-3 px-2 rounded-lg text-purple-300 hover:bg-purple-800 hover:text-white transition"
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? (
          <Moon size={20} />
        ) : (
          <Sun size={20} />
        )}
        <span className="text-[10px] font-medium">Theme</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-300"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon size={20} className="text-gray-600 dark:text-gray-400 transition-colors duration-300" />
      ) : (
        <Sun size={20} className="text-gray-400 transition-colors duration-300" />
      )}
    </button>
  );
}
