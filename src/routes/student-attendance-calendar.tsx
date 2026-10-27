import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  AlertCircle,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Clock,
  GraduationCap,
  MessageSquare,
  Users,
  XCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/student-attendance-calendar")({
  head: () => ({
    meta: [
      { title: "Student Attendance — Akira School ERP" },
      {
        name: "description",
        content: "Calendar view of an individual student's attendance history.",
      },
    ],
  }),
  component: StudentAttendanceCalendarPage,
});

type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type SchoolClass = { schoolClassKey: string; className: string };
type Section = { sectionKey: string; sectionLabel: string };
type StudentOption = { studentKey: string; studentName: string; admissionNumber: string };

type HistoryRow = {
  studentAttendanceKey: string;
  attendanceDate: string;
  status: string;
  remarks: string | null;
  leaveTypeName: string | null;
};

type SummaryModel = {
  totalMarkedDays: number;
  presentEquivalentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  excusedDays: number;
  requiredPercent: number;
  attendancePercent: number | null;
};

const STATUS_DOT: Record<string, string> = {
  PRESENT: "bg-success",
  ABSENT: "bg-destructive",
  LATE: "bg-warning",
  HALF_DAY: "bg-info",
  ON_DUTY: "bg-[oklch(0.75_0.17_300)]",
  MEDICAL_LEAVE: "bg-[oklch(0.75_0.17_300)]",
  APPROVED_LEAVE: "bg-[oklch(0.75_0.17_300)]",
  HOLIDAY: "bg-[oklch(0.55_0.1_200)]",
  SUSPENDED: "bg-destructive",
};

const STATUS_CELL: Record<string, string> = {
  PRESENT: "bg-success/15 text-success",
  ABSENT: "bg-destructive/15 text-destructive",
  LATE: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  HALF_DAY: "bg-info/15 text-info",
  ON_DUTY: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
  MEDICAL_LEAVE: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
  APPROVED_LEAVE: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
  HOLIDAY: "bg-[oklch(0.55_0.1_200)]/15 text-[oklch(0.4_0.12_200)]",
  SUSPENDED: "bg-destructive/15 text-destructive",
};

const STATUS_LABEL: Record<string, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  HALF_DAY: "Half Day",
  ON_DUTY: "On Duty",
  MEDICAL_LEAVE: "Medical Leave",
  APPROVED_LEAVE: "Approved Leave",
  HOLIDAY: "Holiday",
  SUSPENDED: "Suspended",
};

const LEGEND_STATUSES = ["PRESENT", "ABSENT", "LATE", "HALF_DAY", "ON_DUTY", "HOLIDAY"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function CircularProgress({ percent, size = 88, stroke = 9 }: { percent: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted/40" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-primary transition-[stroke-dashoffset] duration-500"
      />
    </svg>
  );
}

function StudentAttendanceCalendarPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearKey, setYearKey] = useState("");
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classFilter, setClassFilter] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionFilter, setSectionFilter] = useState("");

  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentKey, setStudentKey] = useState("");
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [summary, setSummary] = useState<SummaryModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<HistoryRow | null>(null);

  useEffect(() => {
    apiFetch("/api/AcademicYear")
      .then((y: AcademicYear[]) => {
        setYears(y);
        const active = y.find((x) => x.status === "Active");
        setYearKey(active?.academicYearKey ?? y[0]?.academicYearKey ?? "");
      })
      .catch(() => {});
    apiFetch("/api/SchoolClass")
      .then((c: SchoolClass[]) => setClasses(c))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setSectionFilter("");
    setSections([]);
    setStudentKey("");
    setStudents([]);
    if (!classFilter || !yearKey) return;
    apiFetch(`/api/Section?schoolClassId=${classFilter}&academicYearId=${yearKey}`)
      .then((s: Section[]) => setSections(s))
      .catch(() => {});
  }, [classFilter, yearKey]);

  useEffect(() => {
    setStudentKey("");
    if (!sectionFilter || !yearKey) {
      setStudents([]);
      return;
    }
    apiFetch(`/api/StudentAttendance/register?sectionId=${sectionFilter}&academicYearId=${yearKey}&date=${today.toISOString().slice(0, 10)}`)
      .then((rows: { studentKey: string; studentName: string; admissionNumber: string }[]) =>
        setStudents(rows.map((r) => ({ studentKey: r.studentKey, studentName: r.studentName, admissionNumber: r.admissionNumber }))),
      )
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionFilter, yearKey]);

  const load = () => {
    if (!studentKey) {
      setHistory([]);
      setSummary(null);
      return;
    }
    setLoading(true);
    const monthStart = new Date(viewYear, viewMonth, 1).toISOString().slice(0, 10);
    const monthEnd = new Date(viewYear, viewMonth + 1, 0).toISOString().slice(0, 10);
    Promise.all([
      apiFetch(`/api/StudentAttendance/student/${studentKey}?fromDate=${monthStart}&toDate=${monthEnd}`),
      yearKey
        ? apiFetch(`/api/StudentAttendance/student/${studentKey}/summary?academicYearId=${yearKey}`)
        : Promise.resolve(null),
    ])
      .then(([h, s]: [HistoryRow[], SummaryModel | null]) => {
        setHistory(h);
        setSummary(s);
        setSelectedDay(null);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load attendance"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [studentKey, viewYear, viewMonth, yearKey]);

  const historyByDate = useMemo(() => {
    const map = new Map<string, HistoryRow>();
    for (const h of history) map.set(h.attendanceDate.slice(0, 10), h);
    return map;
  }, [history]);

  const calendarCells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const leadingBlanks = firstOfMonth.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = Array(leadingBlanks).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);

  // Tallied from the currently loaded `history` (already scoped to viewYear/viewMonth by load()).
  const monthlyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const h of history) counts[h.status] = (counts[h.status] ?? 0) + 1;
    return {
      present: counts.PRESENT ?? 0,
      absent: counts.ABSENT ?? 0,
      late: counts.LATE ?? 0,
      halfDay: counts.HALF_DAY ?? 0,
      onDuty: counts.ON_DUTY ?? 0,
    };
  }, [history]);

  const goToMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  };

  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  const selectedStudent = students.find((x) => x.studentKey === studentKey) ?? null;
  const studentLabel = selectedStudent
    ? `${selectedStudent.studentName} (${selectedStudent.admissionNumber})`
    : "Select student";

  const isCurrentMonthView = viewYear === today.getFullYear() && viewMonth === today.getMonth();
  const attendancePercent = summary?.attendancePercent ?? null;
  const isAboveRequired = attendancePercent != null && summary != null && attendancePercent >= summary.requiredPercent;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Student Attendance"
        breadcrumbs={[{ label: "Attendance" }, { label: "Student Calendar" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="h-10 w-full rounded-md sm:w-36">
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
              <SelectTrigger className="h-10 w-full rounded-md sm:w-28">
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
            <Popover open={studentPickerOpen} onOpenChange={setStudentPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={!sectionFilter}
                  className="h-10 w-full justify-between gap-2 rounded-md px-2.5 font-normal sm:w-64"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {selectedStudent ? (
                      <>
                        <Avatar className="h-6 w-6 text-[10px]">
                          <AvatarFallback className="bg-primary/15 font-semibold text-primary">
                            {initialsOf(selectedStudent.studentName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 text-left leading-tight">
                          <span className="block truncate text-sm">{selectedStudent.studentName}</span>
                          <span className="block truncate font-mono text-[10px] text-muted-foreground">
                            {selectedStudent.admissionNumber}
                          </span>
                        </span>
                      </>
                    ) : (
                      <span className="truncate text-muted-foreground">{studentLabel}</span>
                    )}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Search by name or admission no..." />
                  <CommandList>
                    <CommandEmpty>No student found.</CommandEmpty>
                    <CommandGroup>
                      {students.map((s) => (
                        <CommandItem
                          key={s.studentKey}
                          value={`${s.studentName} ${s.admissionNumber}`}
                          onSelect={() => {
                            setStudentKey(s.studentKey);
                            setStudentPickerOpen(false);
                          }}
                        >
                          <Check
                            className={cn("h-4 w-4", studentKey === s.studentKey ? "opacity-100" : "opacity-0")}
                          />
                          {s.studentName}{" "}
                          <span className="font-mono text-xs text-muted-foreground">({s.admissionNumber})</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        }
      />
      <p className="-mt-4 text-sm text-muted-foreground">View attendance history and yearly performance</p>

      {!studentKey ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CalendarDays className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold">Select a student</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Choose a class, section and student to view attendance history.
          </p>
        </div>
      ) : loading && !summary ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,0.85fr)]">
            <Skeleton className="h-[420px] rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-48 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="relative flex shrink-0 items-center justify-center text-primary">
                <CircularProgress percent={attendancePercent ?? 0} />
                <span className="absolute font-display text-lg font-bold text-foreground">
                  {attendancePercent != null ? `${Math.round(attendancePercent)}%` : "—"}
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">Attendance</div>
                <div className="text-xs text-muted-foreground">This Academic Year</div>
                {summary && (
                  <div className="mt-1 text-xs text-muted-foreground">Required: {summary.requiredPercent}%</div>
                )}
                {attendancePercent != null && (
                  <div
                    className={cn(
                      "mt-1 flex items-center gap-1 text-xs font-medium",
                      isAboveRequired ? "text-success" : "text-destructive",
                    )}
                  >
                    {isAboveRequired ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                    {isAboveRequired ? "Above required attendance" : "Below required attendance"}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display text-2xl font-bold">
                  {summary ? Math.round(summary.presentEquivalentDays) : "—"}
                </div>
                <div className="text-xs text-muted-foreground">Present Days</div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display text-2xl font-bold">{summary?.absentDays ?? "—"}</div>
                <div className="text-xs text-muted-foreground">Absent Days</div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted-foreground/15 text-muted-foreground">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display text-2xl font-bold">{summary?.totalMarkedDays ?? "—"}</div>
                <div className="text-xs text-muted-foreground">Total Marked Days</div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,0.85fr)]">
            {/* Calendar */}
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <Button variant="outline" size="sm" className="h-8 rounded-md" onClick={goToToday} disabled={isCurrentMonthView}>
                  Today
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-md" onClick={() => goToMonth(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="w-40 text-center text-base font-semibold">
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </div>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-md" onClick={() => goToMonth(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="w-[68px]" />
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                {LEGEND_STATUSES.map((status) => (
                  <span key={status} className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[status])} />
                    {STATUS_LABEL[status]}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-muted-foreground">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1.5">
                {calendarCells.map((day, idx) => {
                  if (day == null) return <div key={idx} />;
                  const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const entry = historyByDate.get(dateStr);
                  const cellDate = new Date(viewYear, viewMonth, day);
                  const isFuture = cellDate > today;
                  const isToday = cellDate.toDateString() === today.toDateString();
                  const isSelected = entry && selectedDay?.studentAttendanceKey === entry.studentAttendanceKey;

                  return (
                    <button
                      key={idx}
                      disabled={!entry}
                      onClick={() => entry && setSelectedDay(entry)}
                      className={cn(
                        "flex min-h-[64px] flex-col items-start gap-1 rounded-lg border border-transparent p-1.5 text-left transition-colors",
                        entry ? cn(STATUS_CELL[entry.status] ?? "bg-muted", "hover:brightness-95") : "bg-card hover:bg-muted/40",
                        isFuture && !entry ? "text-muted-foreground/40" : "",
                        isToday ? "border-primary/50" : "border-border/60",
                        isSelected ? "ring-2 ring-primary" : "",
                      )}
                    >
                      <span className="flex w-full items-center justify-between text-sm font-medium">
                        {day}
                        {isToday && <span className="text-[9px] font-semibold uppercase text-primary">Today</span>}
                      </span>
                      {entry && (
                        <span className="flex items-center gap-1 text-[10px] font-medium leading-none">
                          <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[entry.status])} />
                          {STATUS_LABEL[entry.status] ?? entry.status.replace(/_/g, " ")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedDay && (
                <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold">
                      {new Date(selectedDay.attendanceDate).toLocaleDateString("en-GB", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </div>
                    <Badge className={cn("gap-1 rounded-md border-0 text-xs font-medium", STATUS_CELL[selectedDay.status])}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[selectedDay.status])} />
                      {STATUS_LABEL[selectedDay.status] ?? selectedDay.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-muted-foreground">Leave type</div>
                      <div className="mt-0.5 font-medium">{selectedDay.leaveTypeName || "—"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Remarks</div>
                      <div className="mt-0.5 font-medium">{selectedDay.remarks || "—"}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 text-sm font-semibold">Attendance Rate</div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl font-bold text-primary">
                    {attendancePercent != null ? `${Math.round(attendancePercent)}%` : "—"}
                  </span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, attendancePercent ?? 0))}%` }}
                  />
                </div>
                {summary && (
                  <div className="mt-2 text-xs text-muted-foreground">Required: {summary.requiredPercent}%</div>
                )}
                {attendancePercent != null && (
                  <div
                    className={cn(
                      "mt-2 flex items-center gap-1 text-xs font-medium",
                      isAboveRequired ? "text-success" : "text-destructive",
                    )}
                  >
                    {isAboveRequired ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                    {isAboveRequired ? "Above required attendance" : "Below required attendance"}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" /> Year-to-Date Breakdown
                </div>
                <dl className="divide-y divide-border text-sm">
                  <div className="flex items-center justify-between gap-2 py-2 first:pt-0">
                    <dt className="flex items-center gap-1.5 text-muted-foreground">
                      <CalendarCheck className="h-3.5 w-3.5" /> Total Marked Days
                    </dt>
                    <dd className="font-medium">{summary?.totalMarkedDays ?? "—"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-2">
                    <dt className="flex items-center gap-1.5 text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Present
                    </dt>
                    <dd className="font-medium">
                      {summary ? Math.round(summary.presentEquivalentDays) : "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-2">
                    <dt className="flex items-center gap-1.5 text-muted-foreground">
                      <XCircle className="h-3.5 w-3.5 text-destructive" /> Absent
                    </dt>
                    <dd className="font-medium">{summary?.absentDays ?? "—"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-2">
                    <dt className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 text-warning" /> Late
                    </dt>
                    <dd className="font-medium">{summary?.lateDays ?? "—"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-2">
                    <dt className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-3.5 w-3.5 text-info" /> Half Days
                    </dt>
                    <dd className="font-medium">{summary?.halfDays ?? "—"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-2 last:pb-0">
                    <dt className="flex items-center gap-1.5 text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5" /> Excused (On Duty / Others)
                    </dt>
                    <dd className="font-medium">{summary?.excusedDays ?? "—"}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-1 text-sm font-semibold">Monthly Summary</div>
                <div className="mb-3 text-xs text-muted-foreground">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </div>
                <div className="grid grid-cols-5 gap-2 text-center">
                  <div>
                    <div className="font-display text-lg font-bold text-success">{monthlyCounts.present}</div>
                    <div className="text-[10px] text-muted-foreground">Present</div>
                  </div>
                  <div>
                    <div className="font-display text-lg font-bold text-destructive">{monthlyCounts.absent}</div>
                    <div className="text-[10px] text-muted-foreground">Absent</div>
                  </div>
                  <div>
                    <div className="font-display text-lg font-bold text-[oklch(0.45_0.12_65)]">{monthlyCounts.late}</div>
                    <div className="text-[10px] text-muted-foreground">Late</div>
                  </div>
                  <div>
                    <div className="font-display text-lg font-bold text-info">{monthlyCounts.halfDay}</div>
                    <div className="text-[10px] text-muted-foreground">Half Day</div>
                  </div>
                  <div>
                    <div className="font-display text-lg font-bold text-[oklch(0.55_0.2_300)]">
                      {monthlyCounts.onDuty}
                    </div>
                    <div className="text-[10px] text-muted-foreground">On Duty</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
