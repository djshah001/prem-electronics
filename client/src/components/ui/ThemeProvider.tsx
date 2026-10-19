import { useEffect } from "react";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }, []);

  return <>{children}</>;
};
