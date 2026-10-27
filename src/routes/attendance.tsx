import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { InfoAlert } from "@/components/erp/InfoAlert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarCheck,
  Check,
  CheckCheck,
  Lock,
  MessageSquare,
  MoreVertical,
  Send,
  Users2,
  X,
} from "lucide-react";
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

// Kept intact — also used to populate the correction dialog's status list.
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
// The two one-tap actions shown directly on every row.
const PRIMARY_STATUS_OPTIONS = ["PRESENT", "ABSENT"];
// Everything else lives behind the row's "more" menu.
const SECONDARY_STATUS_OPTIONS = STATUS_OPTIONS.filter(
  (s) => !PRIMARY_STATUS_OPTIONS.includes(s),
);
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
  const [submitted, setSubmitted] = useState(false);

  const [dailySummary, setDailySummary] = useState<DailySummaryRow[]>([]);

  const [correctionTarget, setCorrectionTarget] = useState<RegisterRow | null>(null);
  const [correctionDraft, setCorrectionDraft] = useState({ requestedStatus: "", reason: "" });
  const [correctionSaving, setCorrectionSaving] = useState(false);

  const [remarksTarget, setRemarksTarget] = useState<string | null>(null);
  const [remarksDraft, setRemarksDraft] = useState("");

  const [showConfirm, setShowConfirm] = useState(false);

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
    setSubmitted(false);
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

  // Locking must survive a page reload: `submitted` is only in-memory session
  // state, but `studentAttendanceKey` reflects a real persisted record, so a
  // row that was already submitted (today or any past date) stays locked --
  // and keeps its colored status badge -- even after a refresh.
  const isLocked = (r: RegisterRow) => submitted || !!r.studentAttendanceKey;
  const allMarked = rows.length > 0 && rows.every((r) => isLocked(r) || !!r.status);

  const updateRow = (studentKey: string, patch: Partial<RegisterRow>) => {
    setRows((rs) => rs.map((r) => (r.studentKey === studentKey ? { ...r, ...patch } : r)));
  };

  const markAllPresent = () => {
    setRows((rs) => rs.map((r) => (isLocked(r) ? r : { ...r, status: "PRESENT" })));
  };

  const submit = async () => {
    if (!sectionFilter || !yearFilter) return;
    if (!allMarked) {
      toast.error("Every student must have a status before you can submit.");
      return;
    }
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
      toast.success(`Attendance submitted for ${res.studentsMarked} student(s)`);
      setSubmitted(true);
      setShowConfirm(false);
      loadRegisterKeepSubmitted();
      apiFetch(`/api/StudentAttendance/daily-summary?academicYearId=${yearFilter}&date=${date}`)
        .then((d: DailySummaryRow[]) => setDailySummary(d))
        .catch(() => {});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit attendance");
    } finally {
      setSaving(false);
    }
  };

  // Re-fetches the register after a successful submit without clearing the
  // just-set `submitted` lock (loadRegister() resets it as a side effect of
  // normal filter/date changes).
  const loadRegisterKeepSubmitted = () => {
    if (!sectionFilter || !yearFilter || !date) return;
    apiFetch(
      `/api/StudentAttendance/register?sectionId=${sectionFilter}&academicYearId=${yearFilter}&date=${date}`,
    )
      .then((d: RegisterRow[]) => setRows(d))
      .catch(() => {});
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

  const openRemarks = (r: RegisterRow) => {
    setRemarksTarget(r.studentKey);
    setRemarksDraft(r.remarks ?? "");
  };

  const saveRemarks = () => {
    if (remarksTarget) updateRow(remarksTarget, { remarks: remarksDraft || null });
    setRemarksTarget(null);
  };

  const holiday = rows.find((r) => r.holidayName)?.holidayName;

  const presentCount = rows.filter((r) => r.status === "PRESENT").length;
  const absentCount = rows.filter((r) => r.status === "ABSENT").length;
  const unmarkedCount = rows.filter((r) => !r.status).length;
  const totalCount = rows.length;

  return (
    <div>
      <PageHeader
        title="Attendance"
        breadcrumbs={[{ label: "Attendance" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DatePicker
              className="h-10 w-40"
              value={date}
              onChange={(v) => setDate(v)}
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

      {sectionFilter && rows.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex items-center gap-3 rounded-lg border border-success/20 bg-success/5 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-lg font-semibold leading-none">{presentCount}</div>
              <div className="text-xs text-muted-foreground">Present</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <X className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-lg font-semibold leading-none">{absentCount}</div>
              <div className="text-xs text-muted-foreground">Absent</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted-foreground/15 text-muted-foreground">
              <Users2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-lg font-semibold leading-none">{unmarkedCount}</div>
              <div className="text-xs text-muted-foreground">Unmarked</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/20 text-[oklch(0.45_0.12_65)]">
              <CalendarCheck className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-lg font-semibold leading-none">{totalCount}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
        </div>
      )}

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
          {isPastDate && !submitted && (
            <div className="mb-4">
              <InfoAlert tone="info" title="Past date — already-marked students are locked">
                Students already marked for this date can only be changed through a reviewed
                correction request. Unmarked students can still be backfilled directly.
              </InfoAlert>
            </div>
          )}
          {submitted && (
            <div className="mb-4">
              <InfoAlert tone="success" title="Attendance submitted and locked">
                This register has been submitted. Any further change now requires a Correction
                Request.
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
                disabled={loading || submitted || rows.length === 0}
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark All Present
              </Button>
              <Button
                size="sm"
                className="h-9 gap-1.5 rounded-md"
                onClick={() => setShowConfirm(true)}
                disabled={saving || loading || submitted || !allMarked}
                title={!allMarked ? "Every student needs a status before you can submit" : undefined}
              >
                <Send className="h-3.5 w-3.5" />{" "}
                {saving ? "Submitting..." : submitted ? "Submitted" : "Submit Attendance"}
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {rows.map((r, idx) => {
              const locked = isLocked(r);
              const isPresent = r.status === "PRESENT";
              const isAbsent = r.status === "ABSENT";
              const secondaryStatus =
                r.status && SECONDARY_STATUS_OPTIONS.includes(r.status) ? r.status : null;

              return (
                <div
                  key={r.studentKey}
                  className={cn(
                    "flex flex-col gap-3 border-b border-border p-4 transition-colors last:border-b-0 hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-5 shrink-0 text-xs text-muted-foreground">{idx + 1}</span>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-xs font-semibold text-primary">
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
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{r.studentName}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {r.admissionNumber}
                        {r.rollNumber ? ` · Roll ${r.rollNumber}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pl-8 sm:pl-0">
                    {locked ? (
                      <>
                        {r.status && (
                          <Badge
                            className={cn(
                              "gap-1 rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                              STATUS_STYLES[r.status],
                            )}
                          >
                            <Lock className="h-3 w-3" /> {r.status.replace(/_/g, " ")}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 rounded-md text-muted-foreground"
                          onClick={() => openCorrection(r)}
                        >
                          Request Correction
                        </Button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => updateRow(r.studentKey, { status: "PRESENT" })}
                          className={cn(
                            "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                            isPresent
                              ? "border-success/40 bg-success/15 text-success"
                              : "border-border text-muted-foreground hover:border-success/40 hover:text-success",
                          )}
                        >
                          <Check className="h-3.5 w-3.5" /> Present
                        </button>
                        <button
                          onClick={() => updateRow(r.studentKey, { status: "ABSENT" })}
                          className={cn(
                            "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                            isAbsent
                              ? "border-destructive/40 bg-destructive/15 text-destructive"
                              : "border-border text-muted-foreground hover:border-destructive/40 hover:text-destructive",
                          )}
                        >
                          <X className="h-3.5 w-3.5" /> Absent
                        </button>

                        {secondaryStatus && (
                          <Badge
                            className={cn(
                              "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                              STATUS_STYLES[secondaryStatus],
                            )}
                          >
                            {secondaryStatus.replace(/_/g, " ")}
                          </Badge>
                        )}

                        {r.status && LEAVE_LINKED_STATUSES.includes(r.status) && (
                          <Select
                            value={r.leaveTypeKey ?? ""}
                            onValueChange={(v) => updateRow(r.studentKey, { leaveTypeKey: v })}
                          >
                            <SelectTrigger className="h-8 w-36 rounded-md">
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

                        {r.remarks && (
                          <span
                            className="flex items-center gap-1 text-xs text-muted-foreground"
                            title={r.remarks}
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span className="max-w-[8rem] truncate">{r.remarks}</span>
                          </span>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-md text-muted-foreground"
                              aria-label={`More status options for ${r.studentName}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {SECONDARY_STATUS_OPTIONS.map((s) => (
                              <DropdownMenuItem
                                key={s}
                                onClick={() => updateRow(r.studentKey, { status: s })}
                              >
                                {s.replace(/_/g, " ")}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openRemarks(r)}>
                              <MessageSquare className="mr-2 h-3.5 w-3.5" /> Add remark
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {!loading && rows.length === 0 && (
              <div className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
                <CalendarCheck className="h-5 w-5 shrink-0" /> No active students enrolled in this
                section for the selected year.
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={showConfirm} onOpenChange={(v) => !saving && setShowConfirm(v)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Attendance Submission</DialogTitle>
            <DialogDescription>
              You're about to submit attendance for {date}. Once submitted, this register locks and
              further changes require a Correction Request.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center gap-1 rounded-lg border border-success/20 bg-success/5 py-3">
              <Check className="h-4 w-4 text-success" />
              <div className="text-lg font-semibold leading-none">{presentCount}</div>
              <div className="text-xs text-muted-foreground">Present</div>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-lg border border-destructive/20 bg-destructive/5 py-3">
              <X className="h-4 w-4 text-destructive" />
              <div className="text-lg font-semibold leading-none">{absentCount}</div>
              <div className="text-xs text-muted-foreground">Absent</div>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-muted/40 py-3">
              <Users2 className="h-4 w-4 text-muted-foreground" />
              <div className="text-lg font-semibold leading-none">{totalCount}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-md"
              onClick={() => setShowConfirm(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button className="gap-1.5 rounded-md" onClick={submit} disabled={saving}>
              <Send className="h-3.5 w-3.5" /> {saving ? "Submitting..." : "Confirm & Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!remarksTarget} onOpenChange={(v) => !v && setRemarksTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Remark</DialogTitle>
          </DialogHeader>
          <Textarea
            className="rounded-md"
            rows={3}
            value={remarksDraft}
            onChange={(e) => setRemarksDraft(e.target.value)}
            placeholder="Add a short remark..."
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" className="rounded-md" onClick={() => setRemarksTarget(null)}>
              Cancel
            </Button>
            <Button className="rounded-md" onClick={saveRemarks}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
