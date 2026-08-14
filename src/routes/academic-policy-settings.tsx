import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Plus, Pencil, Trash2, History, ShieldAlert, Settings2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useFormatDate } from "@/hooks/use-tenant-setting";

export const Route = createFileRoute("/academic-policy-settings")({
  head: () => ({
    meta: [
      { title: "Academic Policy Settings — Akira School ERP" },
      { name: "description", content: "School- and board-configurable rules that other modules read, never hardcode." },
    ],
  }),
  component: AcademicPolicySettingsPage,
});

type Board = { boardKey: string; boardCode: string; boardName: string };
type Policy = {
  academicPolicyKey: string; boardKey: string | null; boardName: string | null; boardCode: string | null;
  policyCategory: string; policyKey: string; policyValue: string; requiresApproval: boolean; effectiveDate: string;
};
type HistoryEntry = { academicPolicyHistoryKey: string; oldValue: string | null; newValue: string; effectiveDate: string; changedOn: string; changedBy: string };

const CATEGORIES = ["ATTENDANCE", "PROMOTION", "EXAMINATION"];

const emptyDraft = { boardKey: "", policyCategory: "ATTENDANCE", policyKey: "", policyValue: "", requiresApproval: false, effectiveDate: "" };

function AcademicPolicySettingsPage() {
  const formatDate = useFormatDate();
  const [boards, setBoards] = useState<Board[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("ATTENDANCE");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Policy | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Policy | null>(null);

  const [historyFor, setHistoryFor] = useState<Policy | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [approveTarget, setApproveTarget] = useState<{ payload: Record<string, unknown>; isEdit: boolean; key?: string } | null>(null);

  const load = () => {
    setLoading(true);
    apiFetch("/api/AcademicPolicy")
      .then((d: Policy[]) => setPolicies(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load policies"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    apiFetch("/api/Board").then(setBoards).catch(() => {});
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setDraft({ ...emptyDraft, policyCategory: tab, effectiveDate: new Date().toISOString().slice(0, 10) });
    setOpen(true);
  };

  const openEdit = (p: Policy) => {
    setEditing(p);
    setDraft({
      boardKey: p.boardKey ?? "", policyCategory: p.policyCategory, policyKey: p.policyKey,
      policyValue: p.policyValue, requiresApproval: p.requiresApproval, effectiveDate: p.effectiveDate.slice(0, 10),
    });
    setOpen(true);
  };

  const doSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/AcademicPolicy/${editing.academicPolicyKey}`, {
          method: "PUT",
          body: JSON.stringify({
            academicPolicyKey: editing.academicPolicyKey,
            policyValue: draft.policyValue,
            requiresApproval: draft.requiresApproval,
            effectiveDate: draft.effectiveDate,
          }),
        });
        toast.success("Policy updated");
      } else {
        await apiFetch("/api/AcademicPolicy", {
          method: "POST",
          body: JSON.stringify({
            boardKey: draft.boardKey || null,
            policyCategory: draft.policyCategory,
            policyKey: draft.policyKey,
            policyValue: draft.policyValue,
            requiresApproval: draft.requiresApproval,
            effectiveDate: draft.effectiveDate || null,
          }),
        });
        toast.success("Policy created");
      }
      setOpen(false);
      setApproveTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save policy");
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (!draft.policyKey.trim() && !editing) {
      toast.error("Policy key is required.");
      return;
    }
    if (!draft.policyValue.trim()) {
      toast.error("Policy value is required.");
      return;
    }
    // Critical policies require an explicit confirm step before saving --
    // stands in for the doc's "Principal approval" workflow, since there's
    // no separate approval-role infrastructure to route this through yet.
    if (draft.requiresApproval || editing?.requiresApproval) {
      setApproveTarget({ payload: {}, isEdit: !!editing });
      return;
    }
    await doSave();
  };

  const openHistory = (p: Policy) => {
    setHistoryFor(p);
    setHistoryLoading(true);
    apiFetch(`/api/AcademicPolicy/${p.academicPolicyKey}/history`)
      .then((d: HistoryEntry[]) => setHistory(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load history"))
      .finally(() => setHistoryLoading(false));
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/AcademicPolicy/${deleteTarget.academicPolicyKey}`, { method: "DELETE" });
      toast.success("Policy removed");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove policy");
    }
  };

  const filtered = policies.filter((p) => p.policyCategory === tab);

  return (
    <div>
      <PageHeader
        title="Academic Policy Settings"
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> Add Policy
          </Button>
        }
      />

      <div className="mb-4 flex items-start gap-2 rounded-md border border-info/30 bg-info/10 px-4 py-2.5 text-sm text-info">
        <Settings2 className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          These values are meant to be the single source of truth for attendance, promotion, and examination thresholds — never hardcoded
          elsewhere. Leave Board empty for a tenant-wide default; add a board-specific row to override it for that board only.
        </span>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {CATEGORIES.map((c) => <TabsTrigger key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</TabsTrigger>)}
        </TabsList>

        {CATEGORIES.map((c) => (
          <TabsContent key={c} value={c}>
            <div className="rounded-md border border-border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy Key</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Board</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Approval</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">No {c.toLowerCase()} policies yet.</TableCell></TableRow>
                  ) : (
                    filtered.map((p) => (
                      <TableRow key={p.academicPolicyKey}>
                        <TableCell className="font-mono text-xs">{p.policyKey}</TableCell>
                        <TableCell className="font-medium">{p.policyValue}</TableCell>
                        <TableCell>{p.boardCode ? <Badge variant="outline" className="rounded-md">{p.boardCode}</Badge> : <span className="text-xs text-muted-foreground">Tenant-wide</span>}</TableCell>
                        <TableCell>{formatDate(p.effectiveDate)}</TableCell>
                        <TableCell>
                          {p.requiresApproval && (
                            <Badge className="gap-1 rounded-md border-0 bg-warning/25 text-[oklch(0.45_0.12_65)]">
                              <ShieldAlert className="h-3 w-3" /> Critical
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => openHistory(p)} title="Change history">
                              <History className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => openEdit(p)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive" onClick={() => setDeleteTarget(p)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Policy" : "Add Policy"}
        submitLabel={editing ? "Save Changes" : "Create"}
        onSubmit={save}
        submitting={saving}
        size="sm"
      >
        <div className="space-y-4">
          {!editing && (
            <>
              <div className="space-y-1.5">
                <Label required>Category</Label>
                <Select value={draft.policyCategory} onValueChange={(v) => setDraft({ ...draft, policyCategory: v })}>
                  <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label required>Policy Key</Label>
                <Input value={draft.policyKey} onChange={(e) => setDraft({ ...draft, policyKey: e.target.value.toUpperCase().replace(/\s+/g, "_") })} placeholder="MIN_ATTENDANCE_PERCENT_EXAM_ELIGIBILITY" className="rounded-md font-mono text-xs" required />
              </div>
              <div className="space-y-1.5">
                <Label>Board (optional — overrides the tenant-wide default for this board only)</Label>
                <Select value={draft.boardKey || "none"} onValueChange={(v) => setDraft({ ...draft, boardKey: v === "none" ? "" : v })}>
                  <SelectTrigger className="rounded-md"><SelectValue placeholder="Tenant-wide" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tenant-wide (all boards)</SelectItem>
                    {boards.map((b) => <SelectItem key={b.boardKey} value={b.boardKey}>{b.boardName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label required>Value</Label>
            <Input value={draft.policyValue} onChange={(e) => setDraft({ ...draft, policyValue: e.target.value })} placeholder="75" className="rounded-md" required />
          </div>
          <div className="space-y-1.5">
            <Label required>Effective Date</Label>
            <DatePicker value={draft.effectiveDate} onChange={(v) => setDraft({ ...draft, effectiveDate: v })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={draft.requiresApproval} onCheckedChange={(v) => setDraft({ ...draft, requiresApproval: !!v })} />
            Critical policy — require confirmation before changes take effect
          </label>
        </div>
      </FormDialog>

      <FormDialog
        open={!!historyFor}
        onOpenChange={(v) => !v && setHistoryFor(null)}
        title={`Change History — ${historyFor?.policyKey ?? ""}`}
        submitLabel="Close"
        cancelLabel="Close"
        onSubmit={() => setHistoryFor(null)}
        size="md"
      >
        {historyLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : history.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No changes recorded yet.</div>
        ) : (
          <div className="space-y-3">
            {history.map((h) => (
              <div key={h.academicPolicyHistoryKey} className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{h.oldValue ?? "(created)"} → {h.newValue}</span>
                  <span className="text-xs text-muted-foreground">Effective {formatDate(h.effectiveDate)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Changed by {h.changedBy} on {formatDate(h.changedOn)}</p>
              </div>
            ))}
          </div>
        )}
      </FormDialog>

      <AlertDialog open={!!approveTarget} onOpenChange={(v) => !v && setApproveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm critical policy change</AlertDialogTitle>
            <AlertDialogDescription>
              This policy is marked critical — other modules (attendance eligibility, promotion, exam eligibility) read this value directly.
              Changing it from {formatDate(draft.effectiveDate)} onward will affect every student it applies to going forward. Results already
              computed under the old value are not recomputed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); doSave(); }}>Confirm Change</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove policy "{deleteTarget?.policyKey}"?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); confirmDelete(); }}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
