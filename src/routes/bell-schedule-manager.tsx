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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/erp/DataTable";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, CalendarClock, Star } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bell-schedule-manager")({
  head: () => ({
    meta: [
      { title: "Bell Schedule Manager — Akira School ERP" },
      { name: "description", content: "Named day-patterns (Regular Day, Friday Schedule, Exam Schedule) that override Period Master timings." },
    ],
  }),
  component: BellScheduleManagerPage,
});

type Board = { boardKey: string; boardCode: string; boardName: string };
type Stage = { academicStageKey: string; stageName: string };
type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type PeriodMaster = {
  periodMasterKey: string; periodNumber: number; periodName: string;
  startTime: string; endTime: string; periodType: string;
};
type PeriodOverride = { periodMasterKey: string; periodName: string; startTime: string; endTime: string; isSkipped: boolean };
type BellSchedule = {
  bellScheduleKey: string; scheduleName: string; academicStageKey: string; academicYearKey: string;
  effectiveFrom: string; effectiveTo: string | null; isDefault: boolean; isActive: boolean;
  periods: PeriodOverride[];
};

function BellScheduleManagerPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardCode, setBoardCode] = useState("");
  const [stages, setStages] = useState<Stage[]>([]);
  const [stageKey, setStageKey] = useState("");
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearKey, setYearKey] = useState("");
  const [periodMasters, setPeriodMasters] = useState<PeriodMaster[]>([]);
  const [schedules, setSchedules] = useState<BellSchedule[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BellSchedule | null>(null);
  const [draft, setDraft] = useState({ scheduleName: "", effectiveFrom: "", effectiveTo: "", isDefault: false });
  const [draftPeriods, setDraftPeriods] = useState<PeriodOverride[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BellSchedule | null>(null);

  useEffect(() => {
    Promise.all([apiFetch("/api/Board"), apiFetch("/api/AcademicYear")])
      .then(([b, y]) => {
        setBoards(b);
        if (b.length > 0) setBoardCode(b[0].boardCode);
        setYears(y);
        const active = (y as AcademicYear[]).find((yy) => yy.status === "Active");
        setYearKey(active?.academicYearKey ?? "");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!boardCode) return;
    // Reuses the same per-board stage list as Period Structure Setup.
    apiFetch(`/api/AttendancePolicy?boardCode=${boardCode}`)
      .then((d: Stage[]) => {
        setStages(d);
        setStageKey(d[0]?.academicStageKey ?? "");
      })
      .catch(() => setStages([]));
  }, [boardCode]);

  useEffect(() => {
    if (!stageKey) {
      setPeriodMasters([]);
      return;
    }
    apiFetch(`/api/PeriodMaster?academicStageId=${stageKey}`)
      .then((d: PeriodMaster[]) => setPeriodMasters(d.filter((p) => p.periodType === "TEACHING")))
      .catch(() => setPeriodMasters([]));
  }, [stageKey]);

  const load = () => {
    if (!stageKey || !yearKey) {
      setSchedules([]);
      return;
    }
    setLoading(true);
    apiFetch(`/api/BellSchedule?academicStageId=${stageKey}&academicYearId=${yearKey}`)
      .then((d: BellSchedule[]) => setSchedules(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load bell schedules"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [stageKey, yearKey]);

  const openNew = () => {
    if (periodMasters.length === 0) {
      toast.error("Set up Period Master for this stage first.");
      return;
    }
    setEditing(null);
    setDraft({ scheduleName: "", effectiveFrom: "", effectiveTo: "", isDefault: schedules.length === 0 });
    setDraftPeriods(periodMasters.map((p) => ({
      periodMasterKey: p.periodMasterKey, periodName: p.periodName,
      startTime: p.startTime.slice(0, 5), endTime: p.endTime.slice(0, 5), isSkipped: false,
    })));
    setOpen(true);
  };

  const openEdit = (s: BellSchedule) => {
    setEditing(s);
    setDraft({
      scheduleName: s.scheduleName, effectiveFrom: s.effectiveFrom.slice(0, 10),
      effectiveTo: s.effectiveTo ? s.effectiveTo.slice(0, 10) : "", isDefault: s.isDefault,
    });
    // Merge current Period Master list with whatever overrides already exist,
    // so a period added to the master after this schedule was created still shows up.
    setDraftPeriods(periodMasters.map((p) => {
      const existing = s.periods.find((sp) => sp.periodMasterKey === p.periodMasterKey);
      return {
        periodMasterKey: p.periodMasterKey, periodName: p.periodName,
        startTime: existing?.startTime.slice(0, 5) ?? p.startTime.slice(0, 5),
        endTime: existing?.endTime.slice(0, 5) ?? p.endTime.slice(0, 5),
        isSkipped: existing?.isSkipped ?? false,
      };
    }));
    setOpen(true);
  };

  const updatePeriod = (periodMasterKey: string, patch: Partial<PeriodOverride>) => {
    setDraftPeriods((rows) => rows.map((r) => (r.periodMasterKey === periodMasterKey ? { ...r, ...patch } : r)));
  };

  const save = async () => {
    if (!draft.scheduleName.trim()) {
      toast.error("Schedule name is required.");
      return;
    }
    if (!draft.effectiveFrom) {
      toast.error("Effective from date is required.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        scheduleName: draft.scheduleName.trim(),
        academicStageKey: stageKey,
        academicYearKey: yearKey,
        effectiveFrom: draft.effectiveFrom,
        effectiveTo: draft.effectiveTo || null,
        isDefault: draft.isDefault,
        periods: draftPeriods.map((p) => ({
          periodMasterKey: p.periodMasterKey,
          startTime: `${p.startTime}:00`,
          endTime: `${p.endTime}:00`,
          isSkipped: p.isSkipped,
        })),
      };
      if (editing) {
        await apiFetch(`/api/BellSchedule/${editing.bellScheduleKey}`, {
          method: "PUT",
          body: JSON.stringify({ bellScheduleKey: editing.bellScheduleKey, ...body }),
        });
        toast.success("Bell schedule updated");
      } else {
        await apiFetch("/api/BellSchedule", { method: "POST", body: JSON.stringify(body) });
        toast.success("Bell schedule created");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save bell schedule");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/BellSchedule/${deleteTarget.bellScheduleKey}`, { method: "DELETE" });
      toast.success("Bell schedule removed");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove bell schedule");
    }
  };

  const columns: Column<BellSchedule>[] = [
    {
      key: "scheduleName",
      header: "Schedule",
      sortable: true,
      accessor: (s) => (
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{s.scheduleName}</span>
          {s.isDefault && (
            <Badge className="gap-1 rounded-md border-0 bg-primary/15 text-primary">
              <Star className="h-3 w-3" /> Default
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "effectiveFrom",
      header: "Effective Range",
      sortable: true,
      accessor: (s) => `${s.effectiveFrom.slice(0, 10)} ${s.effectiveTo ? `– ${s.effectiveTo.slice(0, 10)}` : "onward"}`,
    },
    {
      key: "periods",
      header: "Periods",
      accessor: (s) => `${s.periods.filter((p) => !p.isSkipped).length}/${s.periods.length} active`,
    },
    {
      key: "isActive",
      header: "Status",
      accessor: (s) => (
        <Badge className={cn("rounded-md border-0", s.isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
          {s.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      accessor: (s) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => openEdit(s)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive" onClick={() => setDeleteTarget(s)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Bell Schedule Manager"
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew} disabled={!stageKey}>
            <Plus className="h-4 w-4" /> Add Schedule
          </Button>
        }
      />

      <div className="mb-4 flex items-start gap-2 rounded-md border border-info/30 bg-info/10 px-4 py-2.5 text-sm text-info">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Named day-patterns — Regular Day, Friday Schedule, Exam Schedule — each re-timing the same periods from
          Period Master. Exactly one pattern per stage can be marked Default; the Timetable Builder falls back to it
          whenever no other pattern applies to a given date.
        </span>
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
        <Select value={yearKey} onValueChange={setYearKey}>
          <SelectTrigger className="h-9 w-[200px] rounded-md"><SelectValue placeholder="Academic Year" /></SelectTrigger>
          <SelectContent>
            {years.map((y) => <SelectItem key={y.academicYearKey} value={y.academicYearKey}>{y.yearName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={schedules}
        columns={columns}
        rowKey={(s) => s.bellScheduleKey}
        searchPlaceholder="Search schedules..."
        searchFields={(s) => s.scheduleName}
        emptyMessage={loading ? "Loading..." : "No bell schedules configured for this stage yet — Period Master timings apply by default."}
        storageKey="bell-schedule-manager"
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Bell Schedule" : "Add Bell Schedule"}
        description="Overrides re-time existing Period Master periods; they never invent new ones."
        submitLabel={editing ? "Save Changes" : "Create"}
        onSubmit={save}
        submitting={saving}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label required>Schedule Name</Label>
              <Input
                value={draft.scheduleName}
                onChange={(e) => setDraft({ ...draft, scheduleName: e.target.value })}
                placeholder="Friday Schedule"
                className="rounded-md"
                required
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={draft.isDefault} onCheckedChange={(v) => setDraft({ ...draft, isDefault: !!v })} />
                Default schedule for this stage
              </label>
            </div>
            <div className="space-y-1.5">
              <Label required>Effective From</Label>
              <DatePicker value={draft.effectiveFrom} onChange={(v) => setDraft({ ...draft, effectiveFrom: v })} />
            </div>
            <div className="space-y-1.5">
              <Label>Effective To (optional — leave open-ended)</Label>
              <DatePicker value={draft.effectiveTo} onChange={(v) => setDraft({ ...draft, effectiveTo: v })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Period Timings</Label>
            <div className="rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="p-2 text-left text-xs font-semibold uppercase text-muted-foreground">Period</th>
                    <th className="p-2 text-left text-xs font-semibold uppercase text-muted-foreground">Start</th>
                    <th className="p-2 text-left text-xs font-semibold uppercase text-muted-foreground">End</th>
                    <th className="p-2 text-left text-xs font-semibold uppercase text-muted-foreground">Skip</th>
                  </tr>
                </thead>
                <tbody>
                  {draftPeriods.map((p) => (
                    <tr key={p.periodMasterKey} className="border-b border-border last:border-0">
                      <td className="p-2 font-medium">{p.periodName}</td>
                      <td className="p-2">
                        <Input
                          type="time"
                          value={p.startTime}
                          onChange={(e) => updatePeriod(p.periodMasterKey, { startTime: e.target.value })}
                          disabled={p.isSkipped}
                          className="h-8 w-32 rounded-md"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="time"
                          value={p.endTime}
                          onChange={(e) => updatePeriod(p.periodMasterKey, { endTime: e.target.value })}
                          disabled={p.isSkipped}
                          className="h-8 w-32 rounded-md"
                        />
                      </td>
                      <td className="p-2">
                        <Checkbox
                          checked={p.isSkipped}
                          onCheckedChange={(v) => updatePeriod(p.periodMasterKey, { isSkipped: !!v })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{deleteTarget?.scheduleName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Any date currently referencing this pattern (e.g. via a dated override) falls back to the stage's
              default schedule. This cannot be undone.
            </AlertDialogDescription>
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
