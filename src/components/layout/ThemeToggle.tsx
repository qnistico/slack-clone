import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const handleClick = () => {
    console.log('Theme toggle clicked. Current theme:', theme);
    toggleTheme();
    // Check if dark class is applied after a brief delay
    setTimeout(() => {
      const hasDarkClass = document.documentElement.classList.contains('dark');
      console.log('After toggle - Dark class present:', hasDarkClass);
      console.log('All classes:', document.documentElement.className);
    }, 100);
  };

  return (
    <button
      onClick={handleClick}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon size={20} className="text-gray-600 dark:text-gray-400" />
      ) : (
        <Sun size={20} className="text-gray-400" />
      )}
    </button>
  );
}
