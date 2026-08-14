import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-md border border-transparent transition-colors hover:border-border",
        theme === "dark"
          ? "text-[oklch(0.55_0.15_65)] hover:bg-warning/15"
          : "text-[oklch(0.4_0.12_200)] hover:bg-[oklch(0.55_0.1_200)]/10",
        className,
      )}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
