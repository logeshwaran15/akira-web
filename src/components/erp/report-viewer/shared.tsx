import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RefreshCw, Star, Zap, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { exportToCsv } from "@/lib/csv";
import type { ReportViewerProps } from "./types";

export function ParamsBar({
  params,
  paramValues,
  setParamValues,
  academicYears,
  schoolClasses,
  departments,
}: Pick<
  ReportViewerProps,
  "params" | "paramValues" | "setParamValues" | "academicYears" | "schoolClasses" | "departments"
>) {
  if (params.length === 0) return null;

  return (
    <div className="mb-6 flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
      {params.map((p) => (
        <div key={p.name} className="min-w-[160px] space-y-1.5">
          <Label required={p.required}>{p.label}</Label>
          {p.type === "date" ? (
            <DatePicker
              value={paramValues[p.name] ?? ""}
              onChange={(v) => setParamValues((s) => ({ ...s, [p.name]: v }))}
            />
          ) : p.type === "daterange" ? (
            <div className="flex gap-1.5">
              <DatePicker
                value={paramValues[`${p.name}From`] ?? ""}
                onChange={(v) => setParamValues((s) => ({ ...s, [`${p.name}From`]: v }))}
                placeholder="From"
              />
              <DatePicker
                value={paramValues[`${p.name}To`] ?? ""}
                onChange={(v) => setParamValues((s) => ({ ...s, [`${p.name}To`]: v }))}
                placeholder="To"
              />
            </div>
          ) : p.type === "number" ? (
            <Input
              type="number"
              className="rounded-md"
              value={paramValues[p.name] ?? ""}
              onChange={(e) => setParamValues((s) => ({ ...s, [p.name]: e.target.value }))}
            />
          ) : p.type === "academicYear" ||
            p.type === "schoolClass" ||
            p.type === "department" ||
            p.type === "select" ? (
            <Select
              value={paramValues[p.name] ?? ""}
              onValueChange={(v) => setParamValues((s) => ({ ...s, [p.name]: v }))}
            >
              <SelectTrigger className="w-[160px] rounded-md">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {(p.type === "academicYear"
                  ? academicYears
                  : p.type === "schoolClass"
                    ? schoolClasses
                    : p.type === "department"
                      ? departments
                      : p.optionsCsv
                          .split(",")
                          .filter(Boolean)
                          .map((o) => ({ label: o.trim(), value: o.trim() }))
                ).map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              className="rounded-md"
              value={paramValues[p.name] ?? ""}
              onChange={(e) => setParamValues((s) => ({ ...s, [p.name]: e.target.value }))}
            />
          )}
        </div>
      ))}
      <p className="ml-auto self-center text-xs text-muted-foreground">
        Changed a filter? Click <span className="font-medium">Refresh</span> above to re-run.
      </p>
    </div>
  );
}

/** Top-right header actions: Favorite and Refresh stay as one-click buttons
 * (used every time), everything else (export/print/email/schedule/save &
 * reset view) lives behind a single "Actions" dropdown so the report body
 * below gets the full page width instead of a persistent side panel. */
export function ReportHeaderActions({
  meta,
  isFavorite,
  toggleFavorite,
  executing,
  generate,
  exportRows,
  saveView,
  resetView,
}: Pick<
  ReportViewerProps,
  "meta" | "isFavorite" | "toggleFavorite" | "executing" | "generate" | "saveView" | "resetView"
> & {
  exportRows: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-md border-warning/40 bg-warning/10 text-warning hover:bg-warning hover:text-warning-foreground"
        onClick={toggleFavorite}
      >
        <Star className={isFavorite ? "h-4 w-4 fill-current" : "h-4 w-4"} />
      </Button>
      <Button
        variant="outline"
        className="gap-1.5 rounded-md border-info/40 bg-info/10 text-info hover:bg-info hover:text-info-foreground"
        disabled={executing}
        onClick={generate}
      >
        <RefreshCw className={executing ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Refresh
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="gap-1.5 rounded-md bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
            <Zap className="h-4 w-4" /> Actions <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {meta.allowExport && (
            <DropdownMenuItem onClick={exportRows}>
              <Icons.FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-success" /> Export Excel
            </DropdownMenuItem>
          )}
          {meta.allowPrint && (
            <DropdownMenuItem onClick={() => window.print()}>
              <Icons.FileText className="mr-2 h-3.5 w-3.5 text-destructive" /> Export PDF
            </DropdownMenuItem>
          )}
          {meta.allowPrint && (
            <DropdownMenuItem onClick={() => window.print()}>
              <Icons.Printer className="mr-2 h-3.5 w-3.5 text-info" /> Print Report
            </DropdownMenuItem>
          )}
          {meta.allowEmail && (
            <DropdownMenuItem onClick={() => toast.info("Emailing reports is coming soon.")}>
              <Icons.Mail className="mr-2 h-3.5 w-3.5 text-[oklch(0.55_0.2_300)]" /> Email Report
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => toast.info("Sharing is coming soon.")}>
            <Icons.Share2 className="mr-2 h-3.5 w-3.5 text-primary" /> Share
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast.info("Scheduled reports are coming soon.")}>
            <Icons.CalendarClock className="mr-2 h-3.5 w-3.5 text-warning" /> Schedule Report
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={saveView}>
            <Icons.BookmarkPlus className="mr-2 h-3.5 w-3.5 text-[oklch(0.4_0.12_200)]" /> Save View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={resetView}>
            <Icons.RotateCcw className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> Reset View
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function makeExportRows(
  displayName: string,
  columns: { key: string; header: string }[],
  rows: Record<string, unknown>[],
) {
  return () => exportToCsv(`${displayName}.csv`, columns, rows);
}
