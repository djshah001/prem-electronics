import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * ScrollToTop component ensuring that navigating to any new page
 * opens from the very top (0, 0), while preserving browser back/forward (POP)
 * scroll restoration history.
 */
export const ScrollToTop = () => {
  const { pathname, search } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    // Only reset scroll on PUSH or REPLACE (clicking links, internal navigation)
    // Do NOT reset on POP so browser back and forward buttons restore the previous position
    if (navType !== 'POP') {
      window.scrollTo(0, 0);

      // Handle documentElement and body for full cross-browser reliability
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }
    }
  }, [pathname, search, navType]);

  return null;
};
