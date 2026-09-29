import { useAtom } from 'jotai';
import { Sun, Moon } from 'lucide-react';
import { themeAtom } from '../../store/themeAtom';
import { clsx } from 'clsx';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const [theme, setTheme] = useAtom(themeAtom);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    const root = document.documentElement;
    if (next === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  };

  return (
    <button
      id="theme-toggle-btn"
      onClick={toggle}
      className={clsx(
        'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
        'bg-card border border-border hover:bg-accent hover:border-primary/30',
        className
      )}
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-400" />
      )}
    </button>
  );
};
