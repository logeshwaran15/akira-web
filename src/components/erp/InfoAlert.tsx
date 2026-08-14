import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type AlertTone = "success" | "warning" | "info" | "error";

const tones: Record<AlertTone, { wrap: string; icon: typeof Info; iconWrap: string }> = {
  success: { wrap: "border-success/30 bg-success/10 text-foreground", icon: CheckCircle2, iconWrap: "text-success" },
  warning: { wrap: "border-warning/40 bg-warning/15 text-foreground", icon: AlertTriangle, iconWrap: "text-[oklch(0.55_0.15_65)]" },
  info: { wrap: "border-info/30 bg-info/10 text-foreground", icon: Info, iconWrap: "text-info" },
  error: { wrap: "border-destructive/30 bg-destructive/10 text-foreground", icon: XCircle, iconWrap: "text-destructive" },
};

export function InfoAlert({
  tone = "info",
  title,
  children,
  onClose,
}: {
  tone?: AlertTone;
  title: string;
  children?: ReactNode;
  onClose?: () => void;
}) {
  const t = tones[tone];
  const Icon = t.icon;
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-4", t.wrap)}>
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", t.iconWrap)} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{title}</div>
        {children && <div className="mt-1 text-sm text-muted-foreground">{children}</div>}
      </div>
      {onClose && (
        <button onClick={onClose} className="text-muted-foreground transition-colors hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
