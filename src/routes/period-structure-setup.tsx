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
import { DataTable, type Column } from "@/components/erp/DataTable";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/period-structure-setup")({
  head: () => ({
    meta: [
      { title: "Period Structure Setup — Akira School ERP" },
      { name: "description", content: "The school's actual daily bell schedule, per academic stage." },
    ],
  }),
  component: PeriodStructureSetupPage,
});

type Board = { boardKey: string; boardCode: string; boardName: string };
type Stage = { academicStageKey: string; stageName: string };
type Period = {
  periodMasterKey: string; academicStageKey: string; periodNumber: number; periodName: string;
  startTime: string; endTime: string; periodType: string;
};

const PERIOD_TYPES = [
  { value: "TEACHING", label: "Teaching" },
  { value: "BREAK", label: "Short Break" },
  { value: "LUNCH", label: "Lunch" },
  { value: "ASSEMBLY", label: "Assembly" },
];
const typeBadge: Record<string, string> = {
  TEACHING: "bg-primary/15 text-primary",
  BREAK: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  LUNCH: "bg-info/15 text-info",
  ASSEMBLY: "bg-success/15 text-success",
};

const emptyDraft = { periodNumber: "1", periodName: "", startTime: "08:00", endTime: "08:45", periodType: "TEACHING" };

function PeriodStructureSetupPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardCode, setBoardCode] = useState("");
  const [stages, setStages] = useState<Stage[]>([]);
  const [stageKey, setStageKey] = useState("");
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Period | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Period | null>(null);

  useEffect(() => {
    apiFetch("/api/Board")
      .then((d: Board[]) => {
        setBoards(d);
        if (d.length > 0) setBoardCode(d[0].boardCode);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!boardCode) return;
    // Reuses Attendance Policy's per-board stage list rather than adding a
    // second "get stages by board" endpoint -- it already returns exactly
    // the (academicStageKey, stageName) pairs needed here.
    apiFetch(`/api/AttendancePolicy?boardCode=${boardCode}`)
      .then((d: Stage[]) => {
        setStages(d);
        setStageKey(d[0]?.academicStageKey ?? "");
      })
      .catch(() => setStages([]));
  }, [boardCode]);

  const load = () => {
    if (!stageKey) {
      setPeriods([]);
      return;
    }
    setLoading(true);
    apiFetch(`/api/PeriodMaster?academicStageId=${stageKey}`)
      .then((d: Period[]) => setPeriods(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load periods"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [stageKey]);

  const openNew = () => {
    setEditing(null);
    const nextNumber = periods.filter((p) => p.periodType === "TEACHING").length + 1;
    setDraft({ ...emptyDraft, periodNumber: String(nextNumber) });
    setOpen(true);
  };

  const openEdit = (p: Period) => {
    setEditing(p);
    setDraft({
      periodNumber: String(p.periodNumber), periodName: p.periodName,
      startTime: p.startTime.slice(0, 5), endTime: p.endTime.slice(0, 5), periodType: p.periodType,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.periodName.trim()) {
      toast.error("Period name is required.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        periodNumber: Number(draft.periodNumber) || 0,
        periodName: draft.periodName.trim(),
        startTime: `${draft.startTime}:00`,
        endTime: `${draft.endTime}:00`,
        periodType: draft.periodType,
      };
      if (editing) {
        await apiFetch(`/api/PeriodMaster/${editing.periodMasterKey}`, {
          method: "PUT",
          body: JSON.stringify({ periodMasterKey: editing.periodMasterKey, ...body }),
        });
        toast.success("Period updated");
      } else {
        await apiFetch("/api/PeriodMaster", {
          method: "POST",
          body: JSON.stringify({ academicStageKey: stageKey, ...body }),
        });
        toast.success("Period added");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save period");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/PeriodMaster/${deleteTarget.periodMasterKey}`, { method: "DELETE" });
      toast.success("Period removed");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove period");
    }
  };

  const columns: Column<Period>[] = [
    { key: "periodNumber", header: "Period #", sortable: true, accessor: (p) => <span className="font-medium">{p.periodNumber}</span> },
    { key: "periodName", header: "Name", sortable: true, accessor: (p) => p.periodName },
    {
      key: "startTime",
      header: "Time",
      sortable: true,
      accessor: (p) => `${p.startTime.slice(0, 5)} – ${p.endTime.slice(0, 5)}`,
    },
    {
      key: "periodType",
      header: "Type",
      sortable: true,
      accessor: (p) => (
        <Badge className={cn("rounded-md border-0 px-2 py-0.5 text-xs font-medium", typeBadge[p.periodType])}>
          {PERIOD_TYPES.find((t) => t.value === p.periodType)?.label ?? p.periodType}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      accessor: (p) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => openEdit(p)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive" onClick={() => setDeleteTarget(p)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Period Structure Setup"
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew} disabled={!stageKey}>
            <Plus className="h-4 w-4" /> Add Period
          </Button>
        }
      />

      <div className="mb-4 flex items-start gap-2 rounded-md border border-info/30 bg-info/10 px-4 py-2.5 text-sm text-info">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" />
        <span>The school's actual daily bell schedule, per academic stage — this feeds directly into Timetable Management and period-level Attendance marking.</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={boardCode} onValueChange={setBoardCode}>
          <SelectTrigger className="h-9 w-[200px] rounded-md"><SelectValue placeholder="Board" /></SelectTrigger>
          <SelectContent>
            {boards.map((b) => <SelectItem key={b.boardKey} value={b.boardCode}>{b.boardName}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stageKey} onValueChange={setStageKey} disabled={stages.length === 0}>
          <SelectTrigger className="h-9 w-[200px] rounded-md"><SelectValue placeholder="Stage" /></SelectTrigger>
          <SelectContent>
            {stages.map((s) => <SelectItem key={s.academicStageKey} value={s.academicStageKey}>{s.stageName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={periods}
        columns={columns}
        rowKey={(p) => p.periodMasterKey}
        searchPlaceholder="Search periods..."
        searchFields={(p) => p.periodName}
        emptyMessage={loading ? "Loading..." : "No periods configured for this stage yet."}
        storageKey="period-structure-setup"
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Period" : "Add Period"}
        submitLabel={editing ? "Save Changes" : "Add"}
        onSubmit={save}
        submitting={saving}
        size="sm"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label required>Period Number</Label>
              <Input type="number" min={1} value={draft.periodNumber} onChange={(e) => setDraft({ ...draft, periodNumber: e.target.value })} className="rounded-md" required />
            </div>
            <div className="space-y-1.5">
              <Label required>Type</Label>
              <Select value={draft.periodType} onValueChange={(v) => setDraft({ ...draft, periodType: v })}>
                <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIOD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label required>Period Name</Label>
            <Input value={draft.periodName} onChange={(e) => setDraft({ ...draft, periodName: e.target.value })} placeholder="Period 1" className="rounded-md" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label required>Start Time</Label>
              <Input type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} className="rounded-md" required />
            </div>
            <div className="space-y-1.5">
              <Label required>End Time</Label>
              <Input type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} className="rounded-md" required />
            </div>
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{deleteTarget?.periodName}"?</AlertDialogTitle>
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
