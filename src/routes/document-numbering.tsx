import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, History, Loader2, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/document-numbering")({
  head: () => ({
    meta: [
      { title: "Document Numbering — Akira School ERP" },
      { name: "description", content: "Configure numbering series for admission numbers, receipts, TCs and more." },
    ],
  }),
  component: DocumentNumberingPage,
});

type Series = {
  documentNumberSeriesKey: string; seriesType: string; prefix: string; yearFormat: string; separator: string;
  sequenceLength: number; resetFrequency: string; startingNumber: number; currentSequence: number; isActive: boolean;
};
type IssuedNumber = { issuedDocumentNumberKey: string; fullNumber: string; sequenceValue: number; status: string; entityReference: string | null; cancelledReason: string | null; createdOn: string };

const SERIES_TYPES = [
  { code: "ADMISSION", label: "Admission Number", hint: "Lifetime unique — never resets" },
  { code: "TC", label: "Transfer Certificate (TC)", hint: "Resets each academic year" },
  { code: "FEE_RECEIPT", label: "Fee Receipt", hint: "Resets each academic year" },
  { code: "DEMAND_NOTE", label: "Demand Note / Fee Bill", hint: "Advance billing" },
  { code: "EXAM_HALL_TICKET", label: "Exam Hall Ticket", hint: "Board exam hall tickets" },
  { code: "ID_CARD", label: "ID Card Number", hint: "Often matches admission number" },
];
const YEAR_FORMATS = [{ v: "NONE", l: "None" }, { v: "YYYY_YY", l: "2025-26" }, { v: "YY_YY", l: "25-26" }];
const SEPARATORS = ["/", "-", "NONE"];
const RESET_FREQUENCIES = ["ANNUAL", "NEVER"];

function DocumentNumberingPage() {
  const [series, setSeries] = useState<Record<string, Series | undefined>>({});
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [editType, setEditType] = useState("");
  const [draft, setDraft] = useState({ prefix: "", yearFormat: "NONE", separator: "/", sequenceLength: 4, resetFrequency: "ANNUAL", startingNumber: 1 });
  const [saving, setSaving] = useState(false);

  const [logFor, setLogFor] = useState<Series | null>(null);
  const [log, setLog] = useState<IssuedNumber[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<IssuedNumber | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const [testingType, setTestingType] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    apiFetch("/api/DocumentNumberSeries")
      .then((d: Series[]) => {
        const map: Record<string, Series> = {};
        d.forEach((s) => { map[s.seriesType] = s; });
        setSeries(map);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load document numbering"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openEdit = (type: string) => {
    const s = series[type];
    setEditType(type);
    setDraft(s ? {
      prefix: s.prefix, yearFormat: s.yearFormat, separator: s.separator,
      sequenceLength: s.sequenceLength, resetFrequency: s.resetFrequency, startingNumber: s.startingNumber,
    } : { prefix: "", yearFormat: "NONE", separator: "/", sequenceLength: 4, resetFrequency: "ANNUAL", startingNumber: 1 });
    setEditOpen(true);
  };

  const saveSeries = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/DocumentNumberSeries", { method: "PUT", body: JSON.stringify({ seriesType: editType, ...draft }) });
      toast.success("Numbering series saved");
      setEditOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save numbering series");
    } finally {
      setSaving(false);
    }
  };

  const previewFormat = (s: Partial<Series>) => {
    const sep = s.separator === "NONE" ? "" : (s.separator ?? "/");
    const year = s.yearFormat === "YYYY_YY" ? "2025-26" : s.yearFormat === "YY_YY" ? "25-26" : "";
    const seq = "1".padStart(s.sequenceLength ?? 4, "0");
    return [s.prefix, year, seq].filter(Boolean).join(sep);
  };

  const testIssue = async (type: string) => {
    setTestingType(type);
    try {
      const result = await apiFetch("/api/DocumentNumberSeries/issue-next", { method: "POST", body: JSON.stringify({ seriesType: type }) });
      toast.success(`Issued: ${result.fullNumber}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to issue number");
    } finally {
      setTestingType(null);
    }
  };

  const openLog = (s: Series) => {
    setLogFor(s);
    setLogLoading(true);
    apiFetch(`/api/DocumentNumberSeries/${s.documentNumberSeriesKey}/log`)
      .then((d: IssuedNumber[]) => setLog(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load issued numbers"))
      .finally(() => setLogLoading(false));
  };

  const confirmCancel = async () => {
    if (!cancelTarget || !cancelReason.trim()) return;
    setCancelling(true);
    try {
      await apiFetch(`/api/DocumentNumberSeries/issued/${cancelTarget.issuedDocumentNumberKey}/cancel`, {
        method: "POST",
        body: JSON.stringify({ cancelledReason: cancelReason }),
      });
      toast.success("Number cancelled — a new number must be issued to reissue");
      setCancelTarget(null);
      setCancelReason("");
      if (logFor) openLog(logFor);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel number");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div>
      <PageHeader title="Document Numbering" breadcrumbs={[{ label: "School Setup" }, { label: "Document Numbering" }]} />

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="rounded-md border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Format Preview</TableHead>
                <TableHead>Reset</TableHead>
                <TableHead>Current Sequence</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SERIES_TYPES.map((t) => {
                const s = series[t.code];
                return (
                  <TableRow key={t.code}>
                    <TableCell>
                      <div className="font-medium">{t.label}</div>
                      <div className="text-xs text-muted-foreground">{t.hint}</div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{s ? previewFormat(s) : <span className="text-muted-foreground">Not configured</span>}</TableCell>
                    <TableCell>
                      {s && <Badge variant="outline" className="rounded-md">{s.resetFrequency}</Badge>}
                    </TableCell>
                    <TableCell>{s?.currentSequence ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {s && (
                          <>
                            <Button variant="ghost" size="sm" className="h-8 gap-1.5 rounded-md" onClick={() => testIssue(t.code)} disabled={testingType === t.code}>
                              {testingType === t.code ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Test Issue
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 gap-1.5 rounded-md" onClick={() => openLog(s)}>
                              <History className="h-3.5 w-3.5" /> Log
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => openEdit(t.code)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <FormDialog open={editOpen} onOpenChange={setEditOpen} title={`Configure — ${SERIES_TYPES.find((t) => t.code === editType)?.label ?? ""}`} submitLabel="Save" onSubmit={saveSeries} submitting={saving} size="md">
        <div className="space-y-4">
          <div className="rounded-md border border-dashed border-border bg-secondary/30 p-3 text-center font-mono text-sm">
            {previewFormat(draft)}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Prefix</Label>
              <Input value={draft.prefix} onChange={(e) => setDraft({ ...draft, prefix: e.target.value.toUpperCase() })} placeholder="REC" className="rounded-md" />
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
              <Label>Sequence Length</Label>
              <Input type="number" min={1} max={10} value={draft.sequenceLength} onChange={(e) => setDraft({ ...draft, sequenceLength: Number(e.target.value) })} className="rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Label>Reset Frequency</Label>
              <Select value={draft.resetFrequency} onValueChange={(v) => setDraft({ ...draft, resetFrequency: v })}>
                <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESET_FREQUENCIES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Starting Number</Label>
              <Input type="number" min={1} value={draft.startingNumber} onChange={(e) => setDraft({ ...draft, startingNumber: Number(e.target.value) })} className="rounded-md" />
            </div>
          </div>
        </div>
      </FormDialog>

      <FormDialog open={!!logFor} onOpenChange={(v) => !v && setLogFor(null)} title={`Issued Numbers — ${SERIES_TYPES.find((t) => t.code === logFor?.seriesType)?.label ?? ""}`} submitLabel="Close" cancelLabel="Close" onSubmit={() => setLogFor(null)} size="lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issued On</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logLoading ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">Loading...</TableCell></TableRow>
            ) : log.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">No numbers issued yet.</TableCell></TableRow>
            ) : (
              log.map((l) => (
                <TableRow key={l.issuedDocumentNumberKey}>
                  <TableCell className="font-mono">{l.fullNumber}</TableCell>
                  <TableCell>
                    <Badge className={cn("rounded-md border-0", l.status === "ISSUED" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
                      {l.status}
                    </Badge>
                    {l.cancelledReason && <div className="mt-0.5 text-xs text-muted-foreground">{l.cancelledReason}</div>}
                  </TableCell>
                  <TableCell>{new Date(l.createdOn).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {l.status === "ISSUED" && (
                      <Button variant="ghost" size="sm" className="h-8 rounded-md text-destructive" onClick={() => setCancelTarget(l)}>Cancel</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </FormDialog>

      <AlertDialog open={!!cancelTarget} onOpenChange={(v) => !v && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel "{cancelTarget?.fullNumber}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This number can never be reused. It stays permanently logged as cancelled — issue a new number to replace it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5 px-1">
            <Label required>Reason</Label>
            <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Printing error, duplicate entry, etc." className="rounded-md" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Back</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelling || !cancelReason.trim()}
              onClick={(e) => { e.preventDefault(); confirmCancel(); }}
            >
              {cancelling ? "Cancelling..." : "Cancel Number"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
