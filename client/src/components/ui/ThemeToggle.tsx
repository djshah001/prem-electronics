import { Sun } from "lucide-react";
import { clsx } from "clsx";

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle = ({ className }: ThemeToggleProps) => {
  return (
    <button
      id="theme-toggle-btn"
      type="button"
      className={clsx(
        "w-9 h-9 rounded-lg flex items-center justify-center",
        "bg-card border border-border",
        className,
      )}
      aria-label="Light theme enabled"
      title="Light theme enabled"
      disabled
    >
      <Sun className="w-4 h-4 text-amber-400" />
    </button>
  );
};
