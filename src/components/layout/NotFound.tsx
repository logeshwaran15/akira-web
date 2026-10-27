import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, HelpCircle, LayoutDashboard, Settings } from "lucide-react";

// Decorative "browser window" illustration for the 404 page -- built from
// plain shapes/lucide icons (no external image asset) so it always renders.
function NotFoundIllustration() {
  return (
    <div className="relative mx-auto mb-2 h-56 w-72 sm:h-64 sm:w-80">
      {/* Floating clouds */}
      <div className="absolute left-2 top-6 h-6 w-14 rounded-full bg-primary/10" />
      <div className="absolute right-2 top-2 h-7 w-16 rounded-full bg-primary/10" />

      {/* Monitor */}
      <div className="absolute left-1/2 top-8 w-56 -translate-x-1/2 overflow-hidden rounded-xl border border-primary/20 bg-card shadow-lg shadow-primary/10 sm:w-64">
        <div className="flex items-center gap-1.5 bg-primary px-3 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/70" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/70" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/70" />
        </div>
        <div className="flex flex-col items-center gap-1 py-5">
          <span className="text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">
            404
          </span>
          <span className="text-sm font-semibold text-primary/80">Oops!</span>
        </div>
      </div>
      {/* Monitor stand */}
      <div className="absolute left-1/2 top-[9.5rem] h-4 w-3 -translate-x-1/2 rounded-b bg-primary/20 sm:top-[10.5rem]" />
      <div className="absolute left-1/2 top-[11.2rem] h-1.5 w-14 -translate-x-1/2 rounded-full bg-primary/20 sm:top-[12.2rem]" />

      {/* Warning triangle */}
      <div className="absolute bottom-2 left-4 flex h-14 w-14 rotate-[-8deg] items-center justify-center rounded-2xl bg-amber-400/90 shadow-md sm:h-16 sm:w-16">
        <AlertTriangle className="h-7 w-7 text-white sm:h-8 sm:w-8" strokeWidth={2.5} />
      </div>

      {/* Gear */}
      <div className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 sm:h-14 sm:w-14">
        <Settings className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
      <div className="w-full max-w-md text-center">
        <NotFoundIllustration />

        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Oops! Page Not Found</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          The page you are looking for doesn&apos;t exist or has been moved. Please check the URL
          or go back to the dashboard.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/30 transition-colors hover:bg-primary/90"
          >
            <LayoutDashboard className="h-4 w-4" />
            Go to Dashboard
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>

        <div className="mt-8 flex items-start gap-3 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-left">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <HelpCircle className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Need help?</p>
            <p className="text-xs text-muted-foreground">
              If the problem persists, please contact your system administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
