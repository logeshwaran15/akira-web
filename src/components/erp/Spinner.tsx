import { cn } from "@/lib/utils";

const SIZE_STYLES: Record<string, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-[3px]",
  lg: "h-9 w-9 border-4",
};

/** The single loading spinner used app-wide, so every loading state looks the same. */
export function Spinner({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block animate-spin rounded-full border-solid border-primary/20 border-t-primary",
        SIZE_STYLES[size],
        className,
      )}
    />
  );
}

/** Full-block loading state (replaces plain "Loading..." text) for a page or a section. */
export function PageLoader({
  label = "Loading...",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-64 flex-col items-center justify-center gap-3 text-sm text-muted-foreground",
        className,
      )}
    >
      <Spinner size="md" />
      <span>{label}</span>
    </div>
  );
}
