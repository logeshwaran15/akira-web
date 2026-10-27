import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Percent } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/exam-type-master")({
  head: () => ({
    meta: [
      { title: "Exam Type Master — Akira School ERP" },
      { name: "description", content: "Define exam categories (Unit Test, Mid-Term, Final) and their weightage in the final result." },
    ],
  }),
  component: ExamTypeMasterPage,
});

type ExamType = {
  examTypeKey: string;
  examTypeName: string;
  examTypeCode: string;
  category: string;
  weightagePercent: number;
  description: string;
  isActive: boolean;
};

type Draft = {
  examTypeName: string;
  examTypeCode: string;
  category: string;
  weightagePercent: number;
  description: string;
  isActive: boolean;
};

const CATEGORIES = ["FORMATIVE", "SUMMATIVE", "BOARD"];

const CATEGORY_STYLES: Record<string, string> = {
  FORMATIVE: "bg-info text-info-foreground font-semibold",
  SUMMATIVE: "bg-warning text-warning-foreground font-semibold",
  BOARD: "bg-[oklch(0.55_0.2_300)] text-white font-semibold",
};

const empty: Draft = { examTypeName: "", examTypeCode: "", category: "FORMATIVE", weightagePercent: 0, description: "", isActive: true };

function ExamTypeMasterPage() {
  const [rows, setRows] = useState<ExamType[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExamType | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExamType | null>(null);

  const load = () => {
    setLoading(true);
    apiFetch("/api/ExamType")
      .then((d: ExamType[]) => setRows(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load exam types"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const totalWeightage = rows.filter((r) => r.isActive && r.category !== "BOARD").reduce((sum, r) => sum + r.weightagePercent, 0);

  const openNew = () => {
    setEditing(null);
    setDraft(empty);
    setOpen(true);
  };

  const openEdit = (r: ExamType) => {
    setEditing(r);
    setDraft({
      examTypeName: r.examTypeName, examTypeCode: r.examTypeCode, category: r.category,
      weightagePercent: r.weightagePercent, description: r.description, isActive: r.isActive,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.examTypeName.trim()) return toast.error("Exam type name is required.");
    if (!draft.examTypeCode.trim()) return toast.error("Exam type code is required.");
    if (draft.weightagePercent < 0 || draft.weightagePercent > 100) return toast.error("Weightage must be between 0 and 100.");

    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/ExamType/${editing.examTypeKey}`, {
          method: "PUT",
          body: JSON.stringify({ examTypeKey: editing.examTypeKey, ...draft, examTypeCode: draft.examTypeCode.toUpperCase() }),
        });
        toast.success("Exam type updated");
      } else {
        await apiFetch("/api/ExamType", {
          method: "POST",
          body: JSON.stringify({ ...draft, examTypeCode: draft.examTypeCode.toUpperCase() }),
        });
        toast.success("Exam type created");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save exam type");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/ExamType/${deleteTarget.examTypeKey}`, { method: "DELETE" });
      toast.success("Exam type removed");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove exam type");
    }
  };

  const columns: Column<ExamType>[] = [
    {
      key: "examTypeName", header: "Exam Type", sortable: true,
      accessor: (r) => (
        <div>
          <div className="font-medium">{r.examTypeName}</div>
          <div className="font-mono text-xs text-muted-foreground">{r.examTypeCode}</div>
        </div>
      ),
    },
    {
      key: "category", header: "Category", sortable: true,
      accessor: (r) => (
        <Badge className={cn("rounded-md border-0", CATEGORY_STYLES[r.category] ?? "bg-muted text-muted-foreground")}>
          {r.category.charAt(0) + r.category.slice(1).toLowerCase()}
        </Badge>
      ),
    },
    {
      key: "weightagePercent", header: "Weightage", sortable: true,
      accessor: (r) => r.category === "BOARD"
        ? <span className="text-xs text-muted-foreground">Not counted</span>
        : <span className="font-medium">{r.weightagePercent}%</span>,
    },
    { key: "description", header: "Description", className: "hidden max-w-xs truncate md:table-cell", accessor: (r) => <span className="text-muted-foreground">{r.description || "—"}</span> },
    {
      key: "isActive", header: "Status", sortable: true,
      accessor: (r) => r.isActive
        ? <Badge className="rounded-md border-0 bg-success text-success-foreground font-semibold">Active</Badge>
        : <Badge className="rounded-md border-0 bg-muted text-muted-foreground">Inactive</Badge>,
    },
    {
      key: "actions", header: "", className: "text-right",
      accessor: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-purple-600 hover:text-purple-700" onClick={() => openEdit(r)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive" onClick={() => setDeleteTarget(r)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Exam Type Master"
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> Add Exam Type
          </Button>
        }
      />

      {totalWeightage !== 100 && rows.some((r) => r.category !== "BOARD") && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-[oklch(0.45_0.12_65)]">
          <Percent className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Active non-board exam types currently total <strong>{totalWeightage}%</strong> weightage. This should add up to 100% before
            result processing can run correctly.
          </span>
        </div>
      )}

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.examTypeKey}
        searchPlaceholder="Search exam types..."
        searchFields={(r) => `${r.examTypeName} ${r.examTypeCode} ${r.category}`}
        storageKey="exam-type-master"
        emptyMessage={loading ? "Loading..." : "No exam types yet. Click \"Add Exam Type\" to create one."}
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Exam Type" : "Add Exam Type"}
        submitLabel={editing ? "Save Changes" : "Create"}
        onSubmit={save}
        submitting={saving}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label required>Exam Type Name</Label>
              <Input
                value={draft.examTypeName}
                onChange={(e) => setDraft({ ...draft, examTypeName: e.target.value })}
                placeholder="Mid-Term Examination"
                className="rounded-md"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label required>Code</Label>
              <Input
                value={draft.examTypeCode}
                onChange={(e) => setDraft({ ...draft, examTypeCode: e.target.value.toUpperCase() })}
                placeholder="MID"
                className="rounded-md font-mono"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label required>Category</Label>
              <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
                <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label required={draft.category !== "BOARD"}>Weightage in Final Result (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={draft.weightagePercent}
                disabled={draft.category === "BOARD"}
                onChange={(e) => setDraft({ ...draft, weightagePercent: Number(e.target.value) })}
                className="rounded-md"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Optional notes about when/how this exam type is used"
              className="rounded-md"
              rows={3}
            />
          </div>
          <label className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <div className="text-sm font-medium">Active</div>
              <div className="text-xs text-muted-foreground">Inactive types are hidden from Exam Configuration.</div>
            </div>
            <Switch checked={draft.isActive} onCheckedChange={(v) => setDraft({ ...draft, isActive: v })} />
          </label>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.examTypeName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. If this exam type is already used in an Exam Configuration, deleting it may affect those records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); confirmDelete(); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
