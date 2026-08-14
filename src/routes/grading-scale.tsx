import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Pencil, Percent } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/grading-scale")({
  head: () => ({
    meta: [
      { title: "Grading Scale — Akira School ERP" },
      { name: "description", content: "Configure the percentage-to-grade bands used on report cards and exam results." },
    ],
  }),
  component: GradingScalePage,
});

type GradeBand = {
  gradeScaleKey: string;
  gradeName: string;
  minPercent: number;
  maxPercent: number;
  gradePoint: number | null;
  sortOrder: number;
};

const emptyDraft = { gradeName: "", minPercent: "", maxPercent: "", gradePoint: "", sortOrder: "" };

function GradingScalePage() {
  const [bands, setBands] = useState<GradeBand[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GradeBand | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GradeBand | null>(null);

  const load = () => {
    setLoading(true);
    apiFetch("/api/GradeScale")
      .then((d: GradeBand[]) => setBands(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load grading scale"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => {
    setEditing(null);
    const nextSort = bands.length > 0 ? Math.max(...bands.map((b) => b.sortOrder)) + 10 : 10;
    setDraft({ ...emptyDraft, sortOrder: String(nextSort) });
    setOpen(true);
  };

  const openEdit = (b: GradeBand) => {
    setEditing(b);
    setDraft({
      gradeName: b.gradeName,
      minPercent: String(b.minPercent),
      maxPercent: String(b.maxPercent),
      gradePoint: b.gradePoint != null ? String(b.gradePoint) : "",
      sortOrder: String(b.sortOrder),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.gradeName.trim() || draft.minPercent === "" || draft.maxPercent === "") {
      toast.error("Grade name, minimum percent and maximum percent are required.");
      return;
    }

    setSaving(true);
    try {
      const body = {
        gradeName: draft.gradeName.trim(),
        minPercent: Number(draft.minPercent),
        maxPercent: Number(draft.maxPercent),
        gradePoint: draft.gradePoint === "" ? null : Number(draft.gradePoint),
        sortOrder: Number(draft.sortOrder) || 0,
      };

      if (editing) {
        await apiFetch(`/api/GradeScale/${editing.gradeScaleKey}`, {
          method: "PUT",
          body: JSON.stringify({ gradeScaleKey: editing.gradeScaleKey, ...body }),
        });
        toast.success("Grade band updated");
      } else {
        await apiFetch("/api/GradeScale", { method: "POST", body: JSON.stringify(body) });
        toast.success("Grade band added");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save grade band");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/GradeScale/${deleteTarget.gradeScaleKey}`, { method: "DELETE" });
      toast.success("Grade band removed");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove grade band");
    }
  };

  const sortedBands = [...bands].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div>
      <PageHeader
        title="Grading Scale"
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> Add Grade Band
          </Button>
        }
      />

      <div className="mb-4 flex items-start gap-2 rounded-md border border-info/30 bg-info/10 px-4 py-2.5 text-sm text-info">
        <Percent className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          These percentage bands convert a student's exam percentage into a letter grade on report cards and exam
          results. Bands cannot overlap.
        </span>
      </div>

      <div className="rounded-md border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grade</TableHead>
              <TableHead>Percentage Range</TableHead>
              <TableHead>Grade Point</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">Loading...</TableCell></TableRow>
            ) : sortedBands.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">No grade bands configured yet.</TableCell></TableRow>
            ) : (
              sortedBands.map((b) => (
                <TableRow key={b.gradeScaleKey}>
                  <TableCell className="font-medium">{b.gradeName}</TableCell>
                  <TableCell>{b.minPercent}% – {b.maxPercent}%</TableCell>
                  <TableCell>{b.gradePoint ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{b.sortOrder}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => openEdit(b)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive" onClick={() => setDeleteTarget(b)}>
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

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Grade Band" : "Add Grade Band"}
        submitLabel={editing ? "Save Changes" : "Add"}
        onSubmit={save}
        submitting={saving}
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Grade Name</Label>
            <Input value={draft.gradeName} onChange={(e) => setDraft({ ...draft, gradeName: e.target.value.toUpperCase() })} placeholder="A1" maxLength={10} className="rounded-md" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label required>Min Percent</Label>
              <Input type="number" min={0} max={100} step="0.01" value={draft.minPercent} onChange={(e) => setDraft({ ...draft, minPercent: e.target.value })} className="rounded-md" required />
            </div>
            <div className="space-y-1.5">
              <Label required>Max Percent</Label>
              <Input type="number" min={0} max={100} step="0.01" value={draft.maxPercent} onChange={(e) => setDraft({ ...draft, maxPercent: e.target.value })} className="rounded-md" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Grade Point</Label>
              <Input type="number" min={0} step="0.01" value={draft.gradePoint} onChange={(e) => setDraft({ ...draft, gradePoint: e.target.value })} placeholder="Optional" className="rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Label>Sort Order</Label>
              <Input type="number" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })} className="rounded-md" />
            </div>
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove grade "{deleteTarget?.gradeName}"?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone. Existing exam results already using this grade keep their stored value.</AlertDialogDescription>
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
