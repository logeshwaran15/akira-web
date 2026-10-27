import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { InfoAlert } from "@/components/erp/InfoAlert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
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
  CalendarCheck,
  Check,
  CheckCheck,
  Clock,
  Lock,
  type LucideIcon,
  Send,
  Users2,
  X,
} from "lucide-react";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAcademicYear } from "@/hooks/use-academic-year";

export const Route = createFileRoute("/period-attendance")({
  head: () => ({
    meta: [
      { title: "Period Attendance — Akira School ERP" },
      {
        name: "description",
        content: "Mark subject-period attendance for a class section, once daily attendance is submitted.",
      },
    ],
  }),
  component: PeriodAttendancePage,
});

type SchoolClass = { schoolClassKey: string; className: string };
type Section = { sectionKey: string; sectionLabel: string };

type DailyRegisterRow = {
  studentKey: string;
  status: string | null;
  studentAttendanceKey: string | null;
};

type TimetableSlot = {
  timetableSlotKey: string;
  dayOfWeek: number;
  periodNumber: number;
  subjectKey: string | null;
  subjectName: string | null;
  akiraUserKey: string | null;
  teacherName: string | null;
  isPractical: boolean;
  isBreak: boolean;
};

type PeriodRegisterRow = {
  studentEnrollmentKey: string;
  studentKey: string;
  admissionNumber: string;
  studentName: string;
  photoUrl: string | null;
  rollNumber: string | null;
  dailyStatus: string;
  periodAttendanceKey: string | null;
  periodStatus: string | null;
};

const KPI_TONES = {
  success: { wash: "bg-success/[0.06]", badge: "bg-success text-success-foreground", bar: "bg-success" },
  destructive: {
    wash: "bg-destructive/[0.06]",
    badge: "bg-destructive text-destructive-foreground",
    bar: "bg-destructive",
  },
  muted: { wash: "bg-muted/50", badge: "bg-muted-foreground text-background", bar: "bg-muted-foreground/50" },
  info: { wash: "bg-info/[0.06]", badge: "bg-info text-info-foreground", bar: "bg-info" },
} as const;

function KpiTile({
  icon: Icon,
  tone,
  value,
  label,
  sub,
}: {
  icon: LucideIcon;
  tone: keyof typeof KPI_TONES;
  value: string | number;
  label: string;
  sub?: string;
}) {
  const t = KPI_TONES[tone];
  return (
    <div
      className={cn(
        "relative flex min-w-0 items-center gap-3 overflow-hidden rounded-xl border border-border p-3.5 shadow-sm transition-shadow hover:shadow-md",
        t.wash,
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", t.bar)} aria-hidden="true" />
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm", t.badge)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-xl font-bold leading-none tracking-tight text-foreground">{value}</div>
        <div className="mt-1 truncate text-xs font-medium text-muted-foreground">{label}</div>
        {sub && <div className="truncate text-xs text-muted-foreground/80">{sub}</div>}
      </div>
    </div>
  );
}

const todayIso = () => new Date().toISOString().slice(0, 10);
// JS getDay(): 0=Sun..6=Sat. Timetable dayOfWeek convention here: 1=Mon..6=Sat, 7=Sun.
const dayOfWeekFor = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`).getDay();
  return d === 0 ? 7 : d;
};

function PeriodAttendancePage() {
  const { selectedYearKey: yearKey } = useAcademicYear();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classKey, setClassKey] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionKey, setSectionKey] = useState("");
  const [date, setDate] = useState(todayIso());

  const [dailyRows, setDailyRows] = useState<DailyRegisterRow[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);

  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotKey, setSlotKey] = useState("");

  const [rows, setRows] = useState<PeriodRegisterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    apiFetch("/api/SchoolClass")
      .then((c: SchoolClass[]) => {
        setClasses(c);
        if (c.length > 0) setClassKey((prev) => prev || c[0].schoolClassKey);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load classes"));
  }, []);

  useEffect(() => {
    setSectionKey("");
    setSections([]);
    if (!classKey || !yearKey) return;
    apiFetch(`/api/Section?schoolClassId=${classKey}&academicYearId=${yearKey}`)
      .then((s: Section[]) => {
        setSections(s);
        setSectionKey(s[0]?.sectionKey ?? "");
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load sections"));
  }, [classKey, yearKey]);

  // Daily-marking gate: period attendance is only reachable once every
  // student in the section has a status on the daily register (Rule 4).
  // Reuses the exact same register endpoint the Daily Marking Sheet uses,
  // so "submitted" here means the same thing it means there.
  useEffect(() => {
    setDailyRows([]);
    if (!sectionKey || !yearKey || !date) return;
    setDailyLoading(true);
    apiFetch(
      `/api/StudentAttendance/register?sectionId=${sectionKey}&academicYearId=${yearKey}&date=${date}`,
    )
      .then((d: DailyRegisterRow[]) => setDailyRows(d))
      .catch(() => setDailyRows([]))
      .finally(() => setDailyLoading(false));
  }, [sectionKey, yearKey, date]);

  const dailySubmitted =
    dailyRows.length > 0 && dailyRows.every((r) => !!r.studentAttendanceKey || !!r.status);

  // Today's periods for this section, drawn from the published weekly
  // timetable and filtered to the selected date's day-of-week; breaks and
  // free periods are not attendance-eligible.
  useEffect(() => {
    setSlotKey("");
    setSlots([]);
    if (!sectionKey || !yearKey) return;
    setSlotsLoading(true);
    apiFetch(`/api/Timetable?sectionId=${sectionKey}&academicYearId=${yearKey}`)
      .then((d: TimetableSlot[]) => {
        const dow = dayOfWeekFor(date);
        setSlots(d.filter((s) => s.dayOfWeek === dow && !s.isBreak && s.subjectKey));
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [sectionKey, yearKey, date]);

  const selectedSlot = slots.find((s) => s.timetableSlotKey === slotKey) ?? null;

  const loadRegister = () => {
    setSubmitted(false);
    setRows([]);
    if (!sectionKey || !yearKey || !slotKey || !dailySubmitted) return;
    setLoading(true);
    apiFetch(
      `/api/PeriodAttendance/register?sectionId=${sectionKey}&academicYearId=${yearKey}&date=${date}&timetableSlotId=${slotKey}`,
    )
      .then((d: PeriodRegisterRow[]) => setRows(d))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load period register"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(loadRegister, [sectionKey, yearKey, slotKey, date, dailySubmitted]);

  const isLocked = (r: PeriodRegisterRow) => submitted || !!r.periodAttendanceKey;
  const eligibleRows = useMemo(
    () => rows.filter((r) => r.dailyStatus === "PRESENT" || r.dailyStatus === "LATE"),
    [rows],
  );
  const allMarked = eligibleRows.length > 0 && eligibleRows.every((r) => isLocked(r) || !!r.periodStatus);

  const updateRow = (studentKey: string, periodStatus: string) => {
    setRows((rs) => rs.map((r) => (r.studentKey === studentKey ? { ...r, periodStatus } : r)));
  };

  const markAllPresent = () => {
    setRows((rs) =>
      rs.map((r) =>
        isLocked(r) || (r.dailyStatus !== "PRESENT" && r.dailyStatus !== "LATE")
          ? r
          : { ...r, periodStatus: "PRESENT" },
      ),
    );
  };

  const submit = async () => {
    if (!sectionKey || !yearKey || !slotKey) return;
    if (!allMarked) {
      toast.error("Every eligible student must have a status before you can submit.");
      return;
    }
    setSaving(true);
    try {
      const entries = eligibleRows
        .filter((r) => r.periodStatus && !isLocked(r))
        .map((r) => ({ studentKey: r.studentKey, status: r.periodStatus }));
      const res: { studentsMarked: number } = await apiFetch("/api/PeriodAttendance/mark", {
        method: "POST",
        body: JSON.stringify({
          sectionKey,
          academicYearKey: yearKey,
          attendanceDate: date,
          timetableSlotKey: slotKey,
          entries,
        }),
      });
      toast.success(`Period attendance submitted for ${res.studentsMarked} student(s)`);
      setSubmitted(true);
      setShowConfirm(false);
      loadRegister();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit period attendance");
    } finally {
      setSaving(false);
    }
  };

  const presentCount = eligibleRows.filter((r) => r.periodStatus === "PRESENT").length;
  const absentCount = eligibleRows.filter((r) => r.periodStatus === "ABSENT").length;
  const unmarkedCount = eligibleRows.filter((r) => !r.periodStatus).length;

  return (
    <div>
      <PageHeader
        title="Period Attendance"
        actions={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
            <DatePicker
              value={date}
              onChange={setDate}
              max={todayIso()}
              className="h-10 w-full sm:w-44"
            />
            <Select value={classKey} onValueChange={setClassKey}>
              <SelectTrigger className="h-10 w-full rounded-md sm:w-40">
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
            <Select value={sectionKey} onValueChange={setSectionKey} disabled={!classKey}>
              <SelectTrigger className="h-10 w-full rounded-md sm:w-32">
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
            <Select value={slotKey} onValueChange={setSlotKey} disabled={!sectionKey || !dailySubmitted}>
              <SelectTrigger className="h-10 w-full rounded-md sm:w-48">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                {slots.map((s) => (
                  <SelectItem key={s.timetableSlotKey} value={s.timetableSlotKey}>
                    Period {s.periodNumber} · {s.subjectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {!sectionKey && (
        <InfoAlert tone="info" title="Select a class and section">
          Pick a class and section above to see today's periods for {date}.
        </InfoAlert>
      )}

      {sectionKey && !dailyLoading && !dailySubmitted && (
        <InfoAlert tone="warning" title="Daily attendance not yet submitted">
          Period-level attendance can't be marked until the Daily Attendance Marking Sheet has been
          submitted for this class, section and date. Complete daily marking first, then return here.
        </InfoAlert>
      )}

      {sectionKey && dailySubmitted && slots.length === 0 && !slotsLoading && (
        <InfoAlert tone="info" title="No teaching periods found for this date">
          There's no published timetable period (or every period is a break) for this section on{" "}
          {date}.
        </InfoAlert>
      )}

      {sectionKey && dailySubmitted && slots.length > 0 && !slotKey && (
        <InfoAlert tone="info" title="Select a period">
          Choose which period's attendance you want to mark from the Period dropdown above.
        </InfoAlert>
      )}

      {sectionKey && dailySubmitted && slotKey && (
        <div>
          {eligibleRows.length > 0 && (
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiTile icon={Check} tone="success" value={presentCount} label="Present" />
              <KpiTile icon={X} tone="destructive" value={absentCount} label="Absent" />
              <KpiTile icon={Users2} tone="muted" value={unmarkedCount} label="Unmarked" />
              <KpiTile
                icon={Clock}
                tone="info"
                value={`Period ${selectedSlot?.periodNumber ?? ""}`}
                label={selectedSlot?.subjectName ?? ""}
              />
            </div>
          )}

          {submitted && (
            <div className="mb-4">
              <InfoAlert tone="success" title="Period attendance submitted and locked">
                Any further change now requires an Attendance Correction Request.
              </InfoAlert>
            </div>
          )}

          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Loading period register..."
                : `${eligibleRows.length} student(s) present/late on the daily register`}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-9 flex-1 gap-1.5 rounded-md sm:flex-none"
                onClick={markAllPresent}
                disabled={loading || submitted || eligibleRows.length === 0}
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark All Present
              </Button>
              <Button
                size="sm"
                className="h-9 flex-1 gap-1.5 rounded-md sm:flex-none"
                onClick={() => setShowConfirm(true)}
                disabled={saving || loading || submitted || !allMarked}
                title={!allMarked ? "Every listed student needs a status before you can submit" : undefined}
              >
                <Send className="h-3.5 w-3.5" />{" "}
                {saving ? "Submitting..." : submitted ? "Submitted" : "Submit Period Attendance"}
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {eligibleRows.map((r, idx) => {
              const locked = isLocked(r);
              const isPresent = r.periodStatus === "PRESENT";
              const isAbsent = r.periodStatus === "ABSENT";

              return (
                <div
                  key={r.studentKey}
                  className="flex flex-col gap-3 border-b border-border p-4 transition-colors last:border-b-0 hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
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
                      r.periodStatus && (
                        <Badge
                          className={cn(
                            "gap-1 rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                            r.periodStatus === "PRESENT"
                              ? "bg-success/15 text-success"
                              : "bg-destructive/15 text-destructive",
                          )}
                        >
                          <Lock className="h-3 w-3" /> {r.periodStatus}
                        </Badge>
                      )
                    ) : (
                      <>
                        <button
                          onClick={() => updateRow(r.studentKey, "PRESENT")}
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
                          onClick={() => updateRow(r.studentKey, "ABSENT")}
                          className={cn(
                            "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                            isAbsent
                              ? "border-destructive/40 bg-destructive/15 text-destructive"
                              : "border-border text-muted-foreground hover:border-destructive/40 hover:text-destructive",
                          )}
                        >
                          <X className="h-3.5 w-3.5" /> Absent
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {!loading && eligibleRows.length === 0 && (
              <div className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
                <CalendarCheck className="h-5 w-5 shrink-0" /> No students marked Present or Late on
                the daily register for this section and date.
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={showConfirm} onOpenChange={(v) => !saving && setShowConfirm(v)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Period Attendance Submission</DialogTitle>
            <DialogDescription>
              You're about to submit Period {selectedSlot?.periodNumber} ({selectedSlot?.subjectName})
              attendance for {date}. Once submitted, this locks and further changes require a
              Correction Request.
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
              <div className="text-lg font-semibold leading-none">{eligibleRows.length}</div>
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
    </div>
  );
}
