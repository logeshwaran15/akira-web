import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { InfoAlert } from "@/components/erp/InfoAlert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CalendarCheck, CheckCheck, Lock, Save, Users2 } from "lucide-react";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — Akira School ERP" },
      { name: "description", content: "Mark the daily attendance register for a class section." },
    ],
  }),
  component: AttendancePage,
});

type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type SchoolClass = { schoolClassKey: string; className: string };
type Section = { sectionKey: string; sectionLabel: string };
type LeaveType = { leaveTypeKey: string; leaveTypeName: string };

type RegisterRow = {
  studentEnrollmentKey: string;
  studentKey: string;
  admissionNumber: string;
  studentName: string;
  photoUrl: string | null;
  rollNumber: string | null;
  studentAttendanceKey: string | null;
  status: string | null;
  leaveTypeKey: string | null;
  remarks: string | null;
  holidayName: string | null;
};

type DailySummaryRow = {
  sectionKey: string;
  sectionLabel: string;
  className: string;
  totalStudents: number;
  markedCount: number;
  presentCount: number;
  absentCount: number;
};

const STATUS_OPTIONS = [
  "PRESENT",
  "ABSENT",
  "HALF_DAY",
  "LATE",
  "ON_DUTY",
  "MEDICAL_LEAVE",
  "APPROVED_LEAVE",
  "HOLIDAY",
  "SUSPENDED",
];
const LEAVE_LINKED_STATUSES = ["ON_DUTY", "MEDICAL_LEAVE", "APPROVED_LEAVE"];
const STATUS_STYLES: Record<string, string> = {
  PRESENT: "bg-success/15 text-success",
  ABSENT: "bg-destructive/15 text-destructive",
  HALF_DAY: "bg-info/15 text-info",
  LATE: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  ON_DUTY: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
  MEDICAL_LEAVE: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
  APPROVED_LEAVE: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
  HOLIDAY: "bg-[oklch(0.55_0.1_200)]/15 text-[oklch(0.4_0.12_200)]",
  SUSPENDED: "bg-destructive/15 text-destructive",
};

const todayIso = () => new Date().toISOString().slice(0, 10);

function AttendancePage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

  const [yearFilter, setYearFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [date, setDate] = useState(todayIso());

  const [rows, setRows] = useState<RegisterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [dailySummary, setDailySummary] = useState<DailySummaryRow[]>([]);

  const [correctionTarget, setCorrectionTarget] = useState<RegisterRow | null>(null);
  const [correctionDraft, setCorrectionDraft] = useState({ requestedStatus: "", reason: "" });
  const [correctionSaving, setCorrectionSaving] = useState(false);

  const isPastDate = date < todayIso();

  useEffect(() => {
    apiFetch("/api/AcademicYear")
      .then((y: AcademicYear[]) => {
        setYears(y);
        const active = y.find((x) => x.status === "Active");
        setYearFilter(active?.academicYearKey ?? y[0]?.academicYearKey ?? "");
      })
      .catch(() => {});
    apiFetch("/api/SchoolClass")
      .then((c: SchoolClass[]) => setClasses(c))
      .catch(() => {});
    apiFetch("/api/AttendancePolicy/leave-types")
      .then((l: LeaveType[]) => setLeaveTypes(l))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setSectionFilter("");
    setSections([]);
    if (!classFilter || !yearFilter) return;
    apiFetch(`/api/Section?schoolClassId=${classFilter}&academicYearId=${yearFilter}`)
      .then((s: Section[]) => setSections(s))
      .catch(() => {});
  }, [classFilter, yearFilter]);

  useEffect(() => {
    if (!yearFilter) return;
    apiFetch(`/api/StudentAttendance/daily-summary?academicYearId=${yearFilter}&date=${date}`)
      .then((d: DailySummaryRow[]) => setDailySummary(d))
      .catch(() => {});
  }, [yearFilter, date]);

  const loadRegister = () => {
    if (!sectionFilter || !yearFilter || !date) return;
    setLoading(true);
    apiFetch(
      `/api/StudentAttendance/register?sectionId=${sectionFilter}&academicYearId=${yearFilter}&date=${date}`,
    )
      .then((d: RegisterRow[]) => setRows(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load register"))
      .finally(() => setLoading(false));
  };

  useEffect(loadRegister, [sectionFilter, yearFilter, date]);

  const isLocked = (r: RegisterRow) => isPastDate && !!r.studentAttendanceKey;

  const updateRow = (studentKey: string, patch: Partial<RegisterRow>) => {
    setRows((rs) => rs.map((r) => (r.studentKey === studentKey ? { ...r, ...patch } : r)));
  };

  const markAllPresent = () => {
    setRows((rs) => rs.map((r) => (isLocked(r) ? r : { ...r, status: "PRESENT" })));
  };

  const save = async () => {
    if (!sectionFilter || !yearFilter) return;
    setSaving(true);
    try {
      const entries = rows
        .filter((r) => r.status && !isLocked(r))
        .map((r) => ({
          studentKey: r.studentKey,
          status: r.status,
          leaveTypeKey:
            r.status && LEAVE_LINKED_STATUSES.includes(r.status) ? r.leaveTypeKey || null : null,
          remarks: r.remarks || null,
        }));
      if (entries.length === 0) {
        toast.error("Mark at least one editable student before saving.");
        return;
      }
      const res: { studentsMarked: number; requiresCorrectionCount: number } = await apiFetch(
        "/api/StudentAttendance/mark",
        {
          method: "POST",
          body: JSON.stringify({
            sectionKey: sectionFilter,
            academicYearKey: yearFilter,
            attendanceDate: date,
            entries,
          }),
        },
      );
      toast.success(`Attendance saved for ${res.studentsMarked} student(s)`);
      loadRegister();
      apiFetch(`/api/StudentAttendance/daily-summary?academicYearId=${yearFilter}&date=${date}`)
        .then((d: DailySummaryRow[]) => setDailySummary(d))
        .catch(() => {});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const openCorrection = (r: RegisterRow) => {
    setCorrectionTarget(r);
    setCorrectionDraft({ requestedStatus: "", reason: "" });
  };

  const submitCorrection = async () => {
    if (!correctionTarget || !correctionDraft.requestedStatus || !correctionDraft.reason.trim()) {
      toast.error("Select the corrected status and give a reason.");
      return;
    }
    setCorrectionSaving(true);
    try {
      await apiFetch("/api/StudentAttendance/corrections", {
        method: "POST",
        body: JSON.stringify({
          studentKey: correctionTarget.studentKey,
          attendanceDate: date,
          requestedStatus: correctionDraft.requestedStatus,
          reason: correctionDraft.reason,
        }),
      });
      toast.success("Correction request filed — awaiting review under Attendance Requests.");
      setCorrectionTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to file correction request");
    } finally {
      setCorrectionSaving(false);
    }
  };

  const holiday = rows.find((r) => r.holidayName)?.holidayName;
  const totalSections = dailySummary.length;
  const markedSections = dailySummary.filter(
    (s) => s.totalStudents > 0 && s.markedCount === s.totalStudents,
  ).length;

  return (
    <div>
      <PageHeader
        title="Attendance"
        breadcrumbs={[{ label: "Attendance" }]}
        actions={
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="h-10 w-40 rounded-md"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={todayIso()}
            />
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="h-10 w-32 rounded-md">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y.academicYearKey} value={y.academicYearKey}>
                    {y.yearName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="h-10 w-40 rounded-md">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>
                    {c.className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sectionFilter} onValueChange={setSectionFilter} disabled={!classFilter}>
              <SelectTrigger className="h-10 w-32 rounded-md">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.sectionKey} value={s.sectionKey}>
                    {s.sectionLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="mb-5 flex items-center gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Users2 className="h-5 w-5" />
        </div>
        <div className="text-sm">
          <span className="font-semibold">{markedSections}</span> of{" "}
          <span className="font-semibold">{totalSections}</span> sections fully marked for {date}
        </div>
      </div>

      {!sectionFilter && (
        <InfoAlert tone="info" title="Select a class and section">
          Pick an academic year, class and section above to open its attendance register for {date}.
        </InfoAlert>
      )}

      {sectionFilter && (
        <div>
          {holiday && (
            <div className="mb-4">
              <InfoAlert tone="warning" title={`${date} is marked as a holiday: ${holiday}`}>
                You can still mark attendance for a special-schedule day if the school is actually
                open.
              </InfoAlert>
            </div>
          )}
          {isPastDate && (
            <div className="mb-4">
              <InfoAlert tone="info" title="Past date — already-marked students are locked">
                Students already marked for this date can only be changed through a reviewed
                correction request. Unmarked students can still be backfilled directly.
              </InfoAlert>
            </div>
          )}

          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading register..." : `${rows.length} student(s) in this section`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 rounded-md"
                onClick={markAllPresent}
                disabled={loading || rows.length === 0}
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark All Present
              </Button>
              <Button
                size="sm"
                className="h-9 gap-1.5 rounded-md"
                onClick={save}
                disabled={saving || loading || rows.length === 0}
              >
                <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save Attendance"}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            {rows.map((r) => {
              const locked = isLocked(r);
              return (
                <div
                  key={r.studentKey}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {r.photoUrl ? (
                      <img
                        src={`${API_BASE_URL}${r.photoUrl}`}
                        alt={r.studentName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      r.studentName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                    )}
                  </div>
                  <div className="min-w-[10rem] flex-1">
                    <div className="text-sm font-medium">{r.studentName}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {r.admissionNumber}
                      {r.rollNumber ? ` · Roll ${r.rollNumber}` : ""}
                    </div>
                  </div>

                  {!locked && (
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_OPTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => updateRow(r.studentKey, { status: s })}
                          className={cn(
                            "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                            r.status === s
                              ? STATUS_STYLES[s] + " border-transparent"
                              : "border-border text-muted-foreground hover:border-primary/50",
                          )}
                        >
                          {s.replace(/_/g, " ")}
                        </button>
                      ))}
                    </div>
                  )}

                  {!locked && r.status && LEAVE_LINKED_STATUSES.includes(r.status) && (
                    <Select
                      value={r.leaveTypeKey ?? ""}
                      onValueChange={(v) => updateRow(r.studentKey, { leaveTypeKey: v })}
                    >
                      <SelectTrigger className="h-8 w-40 rounded-md">
                        <SelectValue placeholder="Leave type" />
                      </SelectTrigger>
                      <SelectContent>
                        {leaveTypes.map((lt) => (
                          <SelectItem key={lt.leaveTypeKey} value={lt.leaveTypeKey}>
                            {lt.leaveTypeName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {!locked && (
                    <Input
                      placeholder="Remarks"
                      className="h-8 w-40 rounded-md"
                      value={r.remarks ?? ""}
                      onChange={(e) => updateRow(r.studentKey, { remarks: e.target.value })}
                    />
                  )}

                  {r.status && (
                    <Badge
                      className={cn(
                        "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                        STATUS_STYLES[r.status],
                      )}
                    >
                      {r.status.replace(/_/g, " ")}
                    </Badge>
                  )}

                  {locked && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 rounded-md text-muted-foreground"
                      onClick={() => openCorrection(r)}
                    >
                      <Lock className="h-3.5 w-3.5" /> Request Correction
                    </Button>
                  )}
                </div>
              );
            })}
            {!loading && rows.length === 0 && (
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                <CalendarCheck className="h-5 w-5 shrink-0" /> No active students enrolled in this
                section for the selected year.
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={!!correctionTarget} onOpenChange={(v) => !v && setCorrectionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Attendance Correction</DialogTitle>
            <DialogDescription>
              {correctionTarget?.studentName} — {date}. Currently marked{" "}
              <span className="font-medium">{correctionTarget?.status?.replace(/_/g, " ")}</span>.
              The change only takes effect once approved under Attendance Requests.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label required>Corrected Status</Label>
              <Select
                value={correctionDraft.requestedStatus}
                onValueChange={(v) =>
                  setCorrectionDraft({ ...correctionDraft, requestedStatus: v })
                }
              >
                <SelectTrigger className="rounded-md">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label required>Reason</Label>
              <Input
                className="rounded-md"
                value={correctionDraft.reason}
                onChange={(e) => setCorrectionDraft({ ...correctionDraft, reason: e.target.value })}
                placeholder="e.g. Marked absent by mistake, medical certificate submitted"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-md"
              onClick={() => setCorrectionTarget(null)}
              disabled={correctionSaving}
            >
              Cancel
            </Button>
            <Button className="rounded-md" onClick={submitCorrection} disabled={correctionSaving}>
              {correctionSaving ? "Filing..." : "File Correction Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
