import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { IconTile } from "./PageHeader";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string;
  delta?: { value: string; direction: "up" | "down"; suffix?: string };
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "info" | "destructive" | "purple" | "teal";
}

const toneCardStyles: Record<NonNullable<StatCardProps["tone"]>, string> = {
  primary: "border-primary/20 bg-primary/[0.06]",
  success: "border-success/20 bg-success/[0.06]",
  warning: "border-warning/30 bg-warning/[0.08]",
  info: "border-info/20 bg-info/[0.06]",
  destructive: "border-destructive/20 bg-destructive/[0.06]",
  purple: "border-[oklch(0.75_0.17_300)]/20 bg-[oklch(0.75_0.17_300)]/[0.06]",
  teal: "border-[oklch(0.55_0.1_200)]/20 bg-[oklch(0.55_0.1_200)]/[0.06]",
};

const toneAccentStyles: Record<NonNullable<StatCardProps["tone"]>, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  destructive: "bg-destructive",
  purple: "bg-[oklch(0.75_0.17_300)]",
  teal: "bg-[oklch(0.55_0.1_200)]",
};

export function StatCard({ label, value, delta, icon, tone = "primary" }: StatCardProps) {
  const positive = delta?.direction === "up";
  return (
    <div className={cn("group relative overflow-hidden rounded-md border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md", toneCardStyles[tone])}>
      <span className={cn("absolute inset-y-0 left-0 w-1", toneAccentStyles[tone])} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-muted-foreground">{label}</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="font-display text-3xl font-bold tracking-tight text-foreground">{value}</div>
          </div>
          {delta && (
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold",
                  positive
                    ? "bg-success/15 text-success"
                    : "bg-destructive/15 text-destructive",
                )}
              >
                {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {delta.value}
              </span>
              <span className="text-muted-foreground">{delta.suffix ?? "vs yesterday"}</span>
            </div>
          )}
        </div>
        <IconTile icon={icon} tone={tone} />
      </div>
    </div>
  );
}
