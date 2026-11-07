import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * ScrollToTop component ensuring that navigating to any new page
 * opens from the very top (0, 0), while preserving browser back/forward (POP)
 * scroll restoration history.
 */
export const ScrollToTop = () => {
  const { pathname, search, hash } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    // Only reset scroll on PUSH or REPLACE (clicking links, internal navigation without hash)
    // Do NOT reset on POP so browser back and forward buttons restore the previous position
    if (navType !== 'POP' && !hash) {
      const resetScroll = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
        if (document.documentElement) {
          document.documentElement.scrollTop = 0;
        }
        if (document.body) {
          document.body.scrollTop = 0;
        }
      };

      // Reset immediately
      resetScroll();

      // Also reset on next frame and after tick to handle lazy-loaded Suspense mounts
      const rafId = requestAnimationFrame(resetScroll);
      const timerId = setTimeout(resetScroll, 50);

      return () => {
        cancelAnimationFrame(rafId);
        clearTimeout(timerId);
      };
    }
  }, [pathname, search, hash, navType]);

  return null;
};
