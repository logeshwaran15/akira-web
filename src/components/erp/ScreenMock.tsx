// Simplified, labeled mock-ups of real Examination module screens for the
// User Manual — not pixel-perfect screenshots, but built from the exact
// field names, table columns and actions each real screen uses, so a reader
// recognizes the real screen the moment they open it.
import { cn } from "@/lib/utils";

function MockChrome({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border bg-background shadow-sm">
      <div className="flex items-center gap-1.5 border-b bg-muted/40 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-destructive/40" />
        <span className="h-2 w-2 rounded-full bg-warning/40" />
        <span className="h-2 w-2 rounded-full bg-success/40" />
        <span className="ml-2 truncate text-[11px] font-medium text-muted-foreground">{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function MockField({ label, value, w = "w-full" }: { label: string; value?: string; w?: string }) {
  return (
    <div className={cn("space-y-1", w)}>
      <div className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground/80">{label}</div>
      <div className="flex h-6 items-center rounded border bg-card px-1.5 text-[10px] text-foreground/70">{value ?? " "}</div>
    </div>
  );
}

function MockButton({ label, tone = "primary" }: { label: string; tone?: "primary" | "outline" | "success" | "ghost" }) {
  const cls =
    tone === "primary" ? "bg-primary text-primary-foreground" :
    tone === "success" ? "bg-success text-success-foreground" :
    tone === "outline" ? "border bg-card text-foreground" :
    "text-muted-foreground";
  return <span className={cn("inline-flex h-6 items-center rounded px-2.5 text-[10px] font-medium", cls)}>{label}</span>;
}

function MockBadge({ label, tone = "muted" }: { label: string; tone?: "success" | "warning" | "info" | "muted" | "destructive" }) {
  const cls =
    tone === "success" ? "bg-success/15 text-success" :
    tone === "warning" ? "bg-warning/15 text-warning" :
    tone === "info" ? "bg-info/15 text-info" :
    tone === "destructive" ? "bg-destructive/15 text-destructive" :
    "bg-muted text-muted-foreground";
  return <span className={cn("inline-flex h-5 items-center rounded px-1.5 text-[9px] font-medium", cls)}>{label}</span>;
}

/** Filter bar + data table shape — most list/queue screens (FA-02, FA-05, FA-18, FA-19, FA-23, FA-24, FA-25 etc). */
export function MockFilterTable({
  title, filters, columns, rows, actions,
}: {
  title: string;
  filters: string[];
  columns: string[];
  rows: (string | { text: string; badge?: { tone: "success" | "warning" | "info" | "muted" | "destructive" } })[][];
  actions?: string[];
}) {
  return (
    <MockChrome title={title}>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {filters.map((f) => <MockField key={f} label={f} w="w-20" />)}
        {actions && (
          <div className="ml-auto flex items-end gap-1 pb-0.5">
            {actions.map((a) => <MockButton key={a} label={a} />)}
          </div>
        )}
      </div>
      <div className="overflow-hidden rounded border">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="bg-muted/50">
              {columns.map((c) => (
                <th key={c} className="border-b px-2 py-1 text-left font-medium text-muted-foreground">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 1 ? "bg-muted/20" : undefined}>
                {row.map((cell, j) => (
                  <td key={j} className="border-b px-2 py-1 text-foreground/80 last:border-b-0">
                    {typeof cell === "string" ? cell : <MockBadge label={cell.text} tone={cell.badge?.tone} />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MockChrome>
  );
}

/** Form-panel shape — configuration screens (FA-03, FA-04, board setup, etc). */
export function MockFormPanel({
  title, fields, footer,
}: {
  title: string;
  fields: { label: string; value?: string; w?: string }[];
  footer?: string[];
}) {
  return (
    <MockChrome title={title}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {fields.map((f) => <MockField key={f.label} {...f} />)}
      </div>
      {footer && (
        <div className="mt-3 flex justify-end gap-1.5 border-t pt-2">
          {footer.map((a, i) => <MockButton key={a} label={a} tone={i === footer.length - 1 ? "primary" : "outline"} />)}
        </div>
      )}
    </MockChrome>
  );
}

/** Horizontal stage strip — lifecycle/workflow screens (Series status, Approval chain). */
export function MockWorkflowStrip({ title, stages, activeIndex }: { title: string; stages: string[]; activeIndex: number }) {
  return (
    <MockChrome title={title}>
      <div className="flex flex-wrap items-center gap-1">
        {stages.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span
              className={cn(
                "rounded px-2 py-1 text-[9px] font-medium",
                i < activeIndex ? "bg-success/15 text-success" : i === activeIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {s}
            </span>
            {i < stages.length - 1 && <span className="text-muted-foreground/40">→</span>}
          </span>
        ))}
      </div>
    </MockChrome>
  );
}

/** Document/canvas preview shape — Report Card Templates & Generation. */
export function MockDocumentPreview({ title, badges }: { title: string; badges: { label: string; tone: "success" | "warning" | "info" | "muted" }[] }) {
  return (
    <MockChrome title={title}>
      <div className="flex gap-3">
        <div className="flex h-28 w-20 shrink-0 flex-col gap-1 rounded border bg-card p-1.5">
          <div className="h-2 w-full rounded-sm bg-primary/70" />
          <div className="h-1 w-3/4 rounded-sm bg-muted-foreground/30" />
          <div className="mt-1 h-6 w-full rounded-sm bg-muted" />
          <div className="mt-1 space-y-0.5">
            <div className="h-1 w-full rounded-sm bg-muted-foreground/20" />
            <div className="h-1 w-full rounded-sm bg-muted-foreground/20" />
            <div className="h-1 w-2/3 rounded-sm bg-muted-foreground/20" />
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-between">
          <div className="space-y-1">
            <div className="h-2 w-2/3 rounded-sm bg-foreground/20" />
            <div className="flex flex-wrap gap-1">
              {badges.map((b) => <MockBadge key={b.label} label={b.label} tone={b.tone} />)}
            </div>
          </div>
          <div className="flex gap-1.5">
            <MockButton label="Preview" tone="outline" />
            <MockButton label="Publish" tone="success" />
          </div>
        </div>
      </div>
    </MockChrome>
  );
}
