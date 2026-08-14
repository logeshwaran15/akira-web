import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { IdCard, Pencil } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/student-id-config")({
  head: () => ({
    meta: [
      { title: "Student ID Configuration — Akira School ERP" },
      { name: "description", content: "Configure the format used to generate each student's permanent Student ID." },
    ],
  }),
  component: StudentIdConfigPage,
});

type DocumentNumberSeries = {
  documentNumberSeriesKey: string; seriesType: string; prefix: string; yearFormat: string; separator: string;
  sequenceLength: number; resetFrequency: string; startingNumber: number; currentSequence: number; isActive: boolean;
};

const YEAR_FORMATS = [{ v: "NONE", l: "None" }, { v: "YYYY_YY", l: "2025-26" }, { v: "YY_YY", l: "25-26" }];
const SEPARATORS = ["/", "-", "NONE"];
const RESET_FREQUENCIES = [
  { v: "NEVER", l: "Never — lifetime unique (recommended for Student ID)" },
  { v: "ANNUAL", l: "Every academic year" },
];

function previewStudentId(s: { prefix: string; yearFormat: string; separator: string; sequenceLength: number }) {
  const sep = s.separator === "NONE" ? "" : s.separator;
  const year = s.yearFormat === "YYYY_YY" ? "2025-26" : s.yearFormat === "YY_YY" ? "25-26" : "";
  const seq = "1".padStart(s.sequenceLength ?? 4, "0");
  return [s.prefix, year, seq].filter(Boolean).join(sep);
}

function StudentIdConfigPage() {
  const [series, setSeries] = useState<DocumentNumberSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState({ prefix: "", yearFormat: "NONE", separator: "-", sequenceLength: 4, resetFrequency: "NEVER", startingNumber: 1 });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch("/api/DocumentNumberSeries")
      .then((d: DocumentNumberSeries[]) => setSeries(d.find((s) => s.seriesType === "ID_CARD") ?? null))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load Student ID configuration"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openEdit = () => {
    setDraft(series ? {
      prefix: series.prefix, yearFormat: series.yearFormat, separator: series.separator,
      sequenceLength: series.sequenceLength, resetFrequency: series.resetFrequency, startingNumber: series.startingNumber,
    } : { prefix: "ID", yearFormat: "NONE", separator: "-", sequenceLength: 4, resetFrequency: "NEVER", startingNumber: 1 });
    setEditOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/DocumentNumberSeries", { method: "PUT", body: JSON.stringify({ seriesType: "ID_CARD", ...draft }) });
      toast.success("Student ID format updated");
      setEditOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update Student ID format");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Student ID Configuration" breadcrumbs={[{ label: "School Setup" }, { label: "Student ID" }]} />

      <div className="rounded-md border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-semibold">Student ID</h3>
            <p className="text-sm text-muted-foreground">
              A permanent ID separate from the Admission Number — auto-generated for every newly
              enrolled student using this format. Existing students keep no Student ID until re-issued.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 rounded-md" onClick={openEdit} disabled={loading}>
            <Pencil className="h-3.5 w-3.5" /> Configure
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-border bg-secondary/40">
            <IdCard className="h-6 w-6 text-muted-foreground" />
          </div>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : series ? (
            <>
              <div>
                <div className="text-xs text-muted-foreground">Format Preview</div>
                <div className="font-mono font-medium text-foreground">{previewStudentId(series)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Current Sequence</div>
                <div className="font-medium text-foreground">{series.currentSequence}</div>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Not configured yet — click Configure to set it up.</div>
          )}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Need to configure Admission Number, fee receipts, TCs or hall tickets too?{" "}
          <Link to="/document-numbering" className="text-primary hover:underline">
            Manage all document numbering
          </Link>.
        </p>

        <FormDialog open={editOpen} onOpenChange={setEditOpen} title="Configure Student ID Format" submitLabel="Save" onSubmit={save} submitting={saving} size="md">
          <div className="space-y-4">
            <div className="rounded-md border border-dashed border-border bg-secondary/30 p-3 text-center font-mono text-sm">
              {previewStudentId(draft)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Prefix</Label>
                <Input value={draft.prefix} onChange={(e) => setDraft({ ...draft, prefix: e.target.value.toUpperCase() })} placeholder="ID" className="rounded-md" />
              </div>
              <div className="space-y-1.5">
                <Label>Academic Year Format</Label>
                <Select value={draft.yearFormat} onValueChange={(v) => setDraft({ ...draft, yearFormat: v })}>
                  <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {YEAR_FORMATS.map((f) => <SelectItem key={f.v} value={f.v}>{f.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Separator</Label>
                <Select value={draft.separator} onValueChange={(v) => setDraft({ ...draft, separator: v })}>
                  <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEPARATORS.map((s) => <SelectItem key={s} value={s}>{s === "NONE" ? "None" : s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Digits</Label>
                <Input type="number" min={1} max={10} value={draft.sequenceLength} onChange={(e) => setDraft({ ...draft, sequenceLength: Number(e.target.value) })} className="rounded-md" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Reset Frequency</Label>
                <Select value={draft.resetFrequency} onValueChange={(v) => setDraft({ ...draft, resetFrequency: v })}>
                  <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RESET_FREQUENCIES.map((r) => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Starting Number</Label>
                <Input type="number" min={1} value={draft.startingNumber} onChange={(e) => setDraft({ ...draft, startingNumber: Number(e.target.value) })} className="rounded-md" />
              </div>
            </div>
          </div>
        </FormDialog>
      </div>
    </div>
  );
}
