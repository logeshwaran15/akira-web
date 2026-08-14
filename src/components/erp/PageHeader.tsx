import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface Crumb {
  label: string;
  to?: string;
  search?: Record<string, string>;
}

export function PageHeader({
  title,
  actions,
}: {
  title: string;
  /** @deprecated Breadcrumb trail was removed app-wide; this prop is accepted but ignored. */
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        {title}
      </h1>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function IconTile({
  icon: Icon,
  tone = "primary",
  className = "",
}: {
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "info" | "destructive" | "purple" | "teal";
  className?: string;
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/25 text-warning-foreground",
    info: "bg-info/15 text-info",
    destructive: "bg-destructive/15 text-destructive",
    purple: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
    teal: "bg-[oklch(0.55_0.1_200)]/15 text-[oklch(0.4_0.12_200)]",
  };
  return (
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-full ${tones[tone]} ${className}`}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}
