import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Trash2, Loader2, Save } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/attendance-policy")({
  head: () => ({
    meta: [
      { title: "Attendance Policy — Akira School ERP" },
      { name: "description", content: "Configure attendance type, thresholds and leave types." },
    ],
  }),
  component: AttendancePolicyPage,
});

type Board = { boardKey: string; boardCode: string; boardName: string };
type StagePolicy = {
  academicStageKey: string; stageName: string;
  attendancePolicyKey: string | null; attendanceType: string; requiresAttendance: boolean;
  minAttendancePercent: number; graceMinutes: number; latesToAbsent: number; halfDayCountsAsHalfAbsent: boolean;
};
type AlertConfig = { firstAlertPercent: number; secondAlertPercent: number; criticalAlertPercent: number; staffShiftStartTime: string; staffLateThresholdMinutes: number };
type LeaveType = { leaveTypeKey: string; leaveTypeName: string; requiresCertificate: boolean; countsAsPresent: boolean; maxDaysPerYear: number | null };

const ATTENDANCE_TYPES = ["DAY_WISE", "PERIOD_WISE", "BOTH"];

function AttendancePolicyPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardCode, setBoardCode] = useState("");
  const [stages, setStages] = useState<StagePolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const [alertConfig, setAlertConfig] = useState<AlertConfig>({ firstAlertPercent: 85, secondAlertPercent: 80, criticalAlertPercent: 75, staffShiftStartTime: "08:30", staffLateThresholdMinutes: 10 });
  const [alertSaving, setAlertSaving] = useState(false);

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveDraft, setLeaveDraft] = useState({ leaveTypeName: "", requiresCertificate: false, countsAsPresent: false, maxDaysPerYear: "" });
  const [leaveSaving, setLeaveSaving] = useState(false);
  const [deleteLeaveTarget, setDeleteLeaveTarget] = useState<LeaveType | null>(null);

  useEffect(() => {
    apiFetch("/api/Board").then((d: Board[]) => { setBoards(d); if (d.length > 0) setBoardCode(d[0].boardCode); }).catch(() => {});
    apiFetch("/api/AttendancePolicy/alert-config").then((d: AlertConfig | null) => { if (d) setAlertConfig(d); }).catch(() => {});
    apiFetch("/api/AttendancePolicy/leave-types").then((d: LeaveType[]) => setLeaveTypes(d)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!boardCode) return;
    setLoading(true);
    apiFetch(`/api/AttendancePolicy?boardCode=${boardCode}`)
      .then((d: StagePolicy[]) => setStages(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load attendance policy"))
      .finally(() => setLoading(false));
  }, [boardCode]);

  const updateStage = (key: string, patch: Partial<StagePolicy>) => {
    setStages((rows) => rows.map((r) => (r.academicStageKey === key ? { ...r, ...patch } : r)));
  };

  const saveStage = async (s: StagePolicy) => {
    setSavingKey(s.academicStageKey);
    try {
      await apiFetch("/api/AttendancePolicy", {
        method: "PUT",
        body: JSON.stringify({
          academicStageKey: s.academicStageKey,
          attendanceType: s.attendanceType,
          requiresAttendance: s.requiresAttendance,
          minAttendancePercent: s.minAttendancePercent,
          graceMinutes: s.graceMinutes,
          latesToAbsent: s.latesToAbsent,
          halfDayCountsAsHalfAbsent: s.halfDayCountsAsHalfAbsent,
        }),
      });
      toast.success(`${s.stageName} policy saved`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save policy");
    } finally {
      setSavingKey(null);
    }
  };

  const saveAlertConfig = async () => {
    setAlertSaving(true);
    try {
      await apiFetch("/api/AttendancePolicy/alert-config", { method: "PUT", body: JSON.stringify(alertConfig) });
      toast.success("Alert thresholds saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save alert thresholds");
    } finally {
      setAlertSaving(false);
    }
  };

  const openNewLeave = () => { setLeaveDraft({ leaveTypeName: "", requiresCertificate: false, countsAsPresent: false, maxDaysPerYear: "" }); setLeaveOpen(true); };

  const saveLeave = async () => {
    setLeaveSaving(true);
    try {
      await apiFetch("/api/AttendancePolicy/leave-types", {
        method: "POST",
        body: JSON.stringify({
          leaveTypeName: leaveDraft.leaveTypeName,
          requiresCertificate: leaveDraft.requiresCertificate,
          countsAsPresent: leaveDraft.countsAsPresent,
          maxDaysPerYear: leaveDraft.maxDaysPerYear ? Number(leaveDraft.maxDaysPerYear) : null,
        }),
      });
      toast.success("Leave type added");
      setLeaveOpen(false);
      apiFetch("/api/AttendancePolicy/leave-types").then((d: LeaveType[]) => setLeaveTypes(d));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add leave type");
    } finally {
      setLeaveSaving(false);
    }
  };

  const confirmDeleteLeave = async () => {
    if (!deleteLeaveTarget) return;
    try {
      await apiFetch(`/api/AttendancePolicy/leave-types/${deleteLeaveTarget.leaveTypeKey}`, { method: "DELETE" });
      toast.success("Leave type removed");
      setDeleteLeaveTarget(null);
      apiFetch("/api/AttendancePolicy/leave-types").then((d: LeaveType[]) => setLeaveTypes(d));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove leave type");
    }
  };

  return (
    <div>
      <PageHeader title="Attendance Policy" breadcrumbs={[{ label: "School Setup" }, { label: "Attendance Policy" }]} />

      <div className="mb-4 flex items-center gap-3 rounded-md border border-border bg-card p-3 shadow-sm">
        <Label className="text-sm font-medium">Board</Label>
        <Select value={boardCode} onValueChange={setBoardCode}>
          <SelectTrigger className="h-9 w-[260px] rounded-md"><SelectValue placeholder="Choose board" /></SelectTrigger>
          <SelectContent>
            {boards.map((b) => <SelectItem key={b.boardKey} value={b.boardCode}>{b.boardName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-4">
          {stages.map((s) => (
            <div key={s.academicStageKey} className="rounded-md border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-base font-semibold">{s.stageName}</h2>
                <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={() => saveStage(s)} disabled={savingKey === s.academicStageKey}>
                  {savingKey === s.academicStageKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={s.requiresAttendance} onCheckedChange={(v) => updateStage(s.academicStageKey, { requiresAttendance: !!v })} />
                    Requires Attendance
                  </label>
                </div>
                <div className="space-y-1.5">
                  <Label>Attendance Type</Label>
                  <Select value={s.attendanceType} onValueChange={(v) => updateStage(s.academicStageKey, { attendanceType: v })} disabled={!s.requiresAttendance}>
                    <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ATTENDANCE_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Minimum Attendance %</Label>
                  <Input type="number" min={0} max={100} value={s.minAttendancePercent} onChange={(e) => updateStage(s.academicStageKey, { minAttendancePercent: Number(e.target.value) })} disabled={!s.requiresAttendance} className="rounded-md" />
                </div>
                <div className="space-y-1.5">
                  <Label>Grace Period (min)</Label>
                  <Input type="number" min={0} value={s.graceMinutes} onChange={(e) => updateStage(s.academicStageKey, { graceMinutes: Number(e.target.value) })} className="rounded-md" />
                </div>
                <div className="space-y-1.5">
                  <Label>Lates → 1 Absent</Label>
                  <Input type="number" min={1} value={s.latesToAbsent} onChange={(e) => updateStage(s.academicStageKey, { latesToAbsent: Number(e.target.value) })} className="rounded-md" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={s.halfDayCountsAsHalfAbsent} onCheckedChange={(v) => updateStage(s.academicStageKey, { halfDayCountsAsHalfAbsent: !!v })} />
                    2 Half-Days = 1 Absent
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alert thresholds */}
      <div className="mt-6 rounded-md border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold">Shortage Alerts & Staff Attendance</h2>
            <p className="text-xs text-muted-foreground">Tenant-wide thresholds and staff shift configuration.</p>
          </div>
          <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={saveAlertConfig} disabled={alertSaving}>
            {alertSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="space-y-1.5">
            <Label>First Alert %</Label>
            <Input type="number" value={alertConfig.firstAlertPercent} onChange={(e) => setAlertConfig({ ...alertConfig, firstAlertPercent: Number(e.target.value) })} className="rounded-md" />
          </div>
          <div className="space-y-1.5">
            <Label>Second Alert %</Label>
            <Input type="number" value={alertConfig.secondAlertPercent} onChange={(e) => setAlertConfig({ ...alertConfig, secondAlertPercent: Number(e.target.value) })} className="rounded-md" />
          </div>
          <div className="space-y-1.5">
            <Label>Critical Alert %</Label>
            <Input type="number" value={alertConfig.criticalAlertPercent} onChange={(e) => setAlertConfig({ ...alertConfig, criticalAlertPercent: Number(e.target.value) })} className="rounded-md" />
          </div>
          <div className="space-y-1.5">
            <Label>Staff Shift Start</Label>
            <Input type="time" value={alertConfig.staffShiftStartTime} onChange={(e) => setAlertConfig({ ...alertConfig, staffShiftStartTime: e.target.value })} className="rounded-md" />
          </div>
          <div className="space-y-1.5">
            <Label>Staff Late Threshold (min)</Label>
            <Input type="number" value={alertConfig.staffLateThresholdMinutes} onChange={(e) => setAlertConfig({ ...alertConfig, staffLateThresholdMinutes: Number(e.target.value) })} className="rounded-md" />
          </div>
        </div>
      </div>

      {/* Leave types */}
      <div className="mt-6 rounded-md border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-display text-base font-semibold">Leave Types</h2>
          <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={openNewLeave}>
            <Plus className="h-3.5 w-3.5" /> New Leave Type
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Certificate Required</TableHead>
              <TableHead>Counts as Present</TableHead>
              <TableHead>Max Days/Year</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaveTypes.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">No leave types yet.</TableCell></TableRow>
            ) : (
              leaveTypes.map((lt) => (
                <TableRow key={lt.leaveTypeKey}>
                  <TableCell className="font-medium">{lt.leaveTypeName}</TableCell>
                  <TableCell>{lt.requiresCertificate ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    {lt.countsAsPresent ? <Badge className="rounded-md border-0 bg-success/15 text-success">Present</Badge> : "—"}
                  </TableCell>
                  <TableCell>{lt.maxDaysPerYear ?? "Unlimited"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive" onClick={() => setDeleteLeaveTarget(lt)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <FormDialog open={leaveOpen} onOpenChange={setLeaveOpen} title="New Leave Type" submitLabel="Create" onSubmit={saveLeave} submitting={leaveSaving} size="sm">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Name</Label>
            <Input value={leaveDraft.leaveTypeName} onChange={(e) => setLeaveDraft({ ...leaveDraft, leaveTypeName: e.target.value })} placeholder="Sports Leave" className="rounded-md" required />
          </div>
          <div className="space-y-1.5">
            <Label>Max Days / Year</Label>
            <Input type="number" min={0} value={leaveDraft.maxDaysPerYear} onChange={(e) => setLeaveDraft({ ...leaveDraft, maxDaysPerYear: e.target.value })} placeholder="Unlimited" className="rounded-md" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={leaveDraft.requiresCertificate} onCheckedChange={(v) => setLeaveDraft({ ...leaveDraft, requiresCertificate: !!v })} /> Requires certificate
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={leaveDraft.countsAsPresent} onCheckedChange={(v) => setLeaveDraft({ ...leaveDraft, countsAsPresent: !!v })} /> Counts as present (e.g. On Duty)
          </label>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteLeaveTarget} onOpenChange={(v) => !v && setDeleteLeaveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{deleteLeaveTarget?.leaveTypeName}"?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); confirmDeleteLeave(); }}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
