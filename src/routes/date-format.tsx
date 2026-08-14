import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Label } from "@/components/ui/label";
import { CalendarDays } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useTenantSetting, useRefreshTenantSetting } from "@/hooks/use-tenant-setting";
import { DATE_FORMAT_OPTIONS, DEFAULT_DATE_FORMAT, formatDate } from "@/lib/date";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/date-format")({
  head: () => ({
    meta: [
      { title: "Date Format — Akira School ERP" },
      { name: "description", content: "Configure how dates are displayed across the tenant." },
    ],
  }),
  component: DateFormatPage,
});

function DateFormatPage() {
  const { setting } = useTenantSetting();
  const refreshTenantSetting = useRefreshTenantSetting();
  const [value, setValue] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const current = value ?? setting?.dateFormat ?? DEFAULT_DATE_FORMAT;

  const save = async (next: string) => {
    setValue(next);
    setSaving(true);
    try {
      await apiFetch("/api/TenantSetting/date-format", {
        method: "PUT",
        body: JSON.stringify({ dateFormat: next }),
      });
      await refreshTenantSetting();
      toast.success("Date format updated — applies across the whole tenant.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update date format");
      setValue(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Date Format" breadcrumbs={[{ label: "School Setup" }, { label: "Date Format" }]} />

      <div className="rounded-md border border-border bg-card p-6 shadow-sm">
        <h3 className="font-display text-lg font-semibold">Tenant Date Format</h3>
        <p className="text-sm text-muted-foreground">
          Every screen in this tenant displays dates in this format — change it once here.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-border bg-secondary/40">
            <CalendarDays className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="min-w-[220px] space-y-1.5">
            <Label className="text-xs text-muted-foreground">Format</Label>
            <Select value={current} onValueChange={save} disabled={saving}>
              <SelectTrigger className="rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMAT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label} <span className="text-muted-foreground">({opt.example})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Preview</div>
            <div className="font-medium text-foreground">{formatDate(new Date(), current)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
