import { useEffect, type ReactNode } from "react";

// Dark mode has been removed from the app -- this only ensures the root
// element never carries a stale "dark" class from an earlier session.
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return children;
}
