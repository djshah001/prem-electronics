import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { themeAtom } from '../../store/themeAtom';

/**
 * Applies the stored theme class to <html> on mount and on change.
 * Render once near the root of the app.
 */
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme] = useAtom(themeAtom);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return <>{children}</>;
};
