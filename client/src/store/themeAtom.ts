import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// Persisted theme preference
export const themeAtom = atomWithStorage<"light" | "dark">("theme", "light");

// Derived: apply class to document root
export const themeEffectAtom = atom(
  (get) => get(themeAtom),
  (_get, set, next: "light" | "dark") => {
    set(themeAtom, next);
    const root = document.documentElement;
    if (next === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  },
);
