import { cn } from "@/lib/utils";

export function PageLoader({ label = "Loading", fullscreen = true, className }: { label?: string; fullscreen?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-background",
        fullscreen ? "fixed inset-0 z-[100]" : "w-full py-16",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-primary/10 shadow-sm">
            <img src="/akira-logo.png" alt="Akira" className="h-full w-full object-cover object-left" />
          </div>
        </div>
        <div className="text-center">
          <div className="font-display text-sm font-semibold tracking-tight">akira<span className="text-primary">.</span></div>
          <div className="mt-1 text-xs text-muted-foreground">{label}…</div>
        </div>
      </div>
    </div>
  );
}

export function InlineSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)}
      role="status"
      aria-label="Loading"
    />
  );
}
