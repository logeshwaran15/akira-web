import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle, CalendarCheck, CheckCircle2, ChevronLeft, ChevronRight, Clock, XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/erp/PageHeader";
import { StudentAvatar } from "@/components/erp/StudentAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/PageLoader";
import { apiFetch } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/parent-attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — Akira School ERP" },
      { name: "description", content: "Daily attendance calendar and summary for your child." },
    ],
  }),
  component: ParentAttendancePage,
});

// Backed by the PARENT-only /api/Parent/children/{id}/attendance endpoints (read-only).
type Child = {
  studentKey: string;
  studentName: string;
  className: string | null;
  sectionLabel: string | null;
  gender: string | null;
  photoUrl: string | null;
};
type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type AttendanceRow = {
  studentAttendanceKey: string;
  attendanceDate: string;
  status: string;
  remarks: string | null;
  leaveTypeName: string | null;
};
type Summary = {
  totalMarkedDays: number;
  presentEquivalentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  excusedDays: number;
  requiredPercent: number;
  attendancePercent: number | null;
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
const LEGEND = ["PRESENT", "ABSENT", "LATE", "HALF_DAY", "ON_DUTY", "HOLIDAY"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const statusLabel = (s: string) => STATUS_LABEL[s] ?? s.replace(/_/g, " ");
const isoDate = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function ParentAttendancePage() {
  const { user, loading: userLoading } = useCurrentUser();
  const today = new Date();

  const [children, setChildren] = useState<Child[]>([]);
  const [childKey, setChildKey] = useState<string | null>(null);
  const [yearKey, setYearKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [history, setHistory] = useState<AttendanceRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([apiFetch("/api/Parent/children"), apiFetch("/api/Parent/academic-years")])
      .then(([c, y]) => {
        if (c.status === "fulfilled") {
          const list: Child[] = c.value ?? [];
          setChildren(list);
          setChildKey(list[0]?.studentKey ?? null);
        } else {
          toast.error("Failed to load your children");
        }
        if (y.status === "fulfilled") {
          const years: AcademicYear[] = y.value ?? [];
          setYearKey((years.find((x) => x.status === "Active") ?? years[0])?.academicYearKey ?? null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Year-to-date summary: per child / academic year
  useEffect(() => {
    if (!childKey || !yearKey) {
      setSummary(null);
      return;
    }
    apiFetch(`/api/Parent/children/${childKey}/attendance/summary?academicYearId=${yearKey}`)
      .then((s: Summary) => setSummary(s))
      .catch(() => setSummary(null));
  }, [childKey, yearKey]);

  // Month history: per child / visible month
  useEffect(() => {
    if (!childKey) return;
    setDataLoading(true);
    setSelectedDate(null);
    const from = isoDate(viewYear, viewMonth, 1);
    const to = isoDate(viewYear, viewMonth, new Date(viewYear, viewMonth + 1, 0).getDate());
    apiFetch(`/api/Parent/children/${childKey}/attendance?fromDate=${from}&toDate=${to}`)
      .then((rows: AttendanceRow[]) => setHistory(rows ?? []))
      .catch((err) => {
        setHistory([]);
        toast.error(err instanceof Error ? err.message : "Failed to load attendance");
      })
      .finally(() => setDataLoading(false));
  }, [childKey, viewYear, viewMonth]);

  const byDate = useMemo(() => {
    const map = new Map<string, AttendanceRow>();
    for (const h of history) map.set(h.attendanceDate.slice(0, 10), h);
    return map;
  }, [history]);

  const cells = useMemo(() => {
    const blanks = new Date(viewYear, viewMonth, 1).getDay();
    const days = new Date(viewYear, viewMonth + 1, 0).getDate();
    const out: (number | null)[] = Array(blanks).fill(null);
    for (let d = 1; d <= days; d++) out.push(d);
    return out;
  }, [viewYear, viewMonth]);

  const monthCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const h of history) c[h.status] = (c[h.status] ?? 0) + 1;
    return c;
  }, [history]);

  const goToMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  if (userLoading) return <PageLoader />;
  // Parent-only page; everyone else uses the admin attendance screens.
  if (user && user.roleCode !== "PARENT") return <Navigate to="/dashboard" replace />;

  const selected = selectedDate ? byDate.get(selectedDate) ?? null : null;
  const percent = summary?.attendancePercent ?? null;
  const aboveRequired = percent != null && summary != null && percent >= summary.requiredPercent;
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  return (
    <div>
      <PageHeader title="Attendance" />

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>
      ) : children.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
          No children are linked to your account. Please contact the school office.
        </div>
      ) : (
        <>
          {/* Child tabs */}
          <div className="-mx-1 mb-5 flex gap-2.5 overflow-x-auto px-1 pb-1">
            {children.map((c) => {
              const active = c.studentKey === childKey;
              return (
                <button
                  key={c.studentKey}
                  type="button"
                  onClick={() => setChildKey(c.studentKey)}
                  aria-pressed={active}
                  className={cn(
                    "flex shrink-0 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25"
                      : "border-border bg-card shadow-sm hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
                  )}
                >
                  <StudentAvatar photoUrl={c.photoUrl} gender={c.gender} studentName={c.studentName} className="h-9 w-9" />
                  <span>
                    <span className="block text-sm font-semibold leading-tight">{c.studentName}</span>
                    <span className={cn("block text-xs", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {[c.className, c.sectionLabel].filter(Boolean).join(" - ") || "—"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Year summary */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              icon={percent != null && !aboveRequired ? AlertCircle : CheckCircle2}
              label="Attendance"
              value={percent != null ? `${Math.round(percent)}%` : "—"}
              tone={percent != null && !aboveRequired ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}
              note={
                summary && percent != null
                  ? `${aboveRequired ? "Above" : "Below"} required ${summary.requiredPercent}%`
                  : undefined
              }
              noteBad={percent != null && !aboveRequired}
            />
            <StatTile
              icon={CalendarCheck}
              label="Present Days"
              value={summary ? String(Math.round(summary.presentEquivalentDays)) : "—"}
              tone="bg-info/10 text-info"
              note={summary ? `of ${summary.totalMarkedDays} marked` : undefined}
            />
            <StatTile
              icon={XCircle}
              label="Absent Days"
              value={summary ? String(summary.absentDays) : "—"}
              tone="bg-destructive/10 text-destructive"
            />
            <StatTile
              icon={Clock}
              label="Late Days"
              value={summary ? String(summary.lateDays) : "—"}
              tone="bg-warning/15 text-[oklch(0.45_0.12_65)]"
            />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(260px,0.8fr)]">
            {/* Calendar */}
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-md"
                  disabled={isCurrentMonth}
                  onClick={() => {
                    setViewYear(today.getFullYear());
                    setViewMonth(today.getMonth());
                  }}
                >
                  Today
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-md" aria-label="Previous month" onClick={() => goToMonth(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="w-40 text-center text-base font-semibold">
                    {MONTHS[viewMonth]} {viewYear}
                  </div>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-md" aria-label="Next month" onClick={() => goToMonth(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="hidden w-[68px] sm:block" />
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                {LEGEND.map((s) => (
                  <span key={s} className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[s])} />
                    {STATUS_LABEL[s]}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-muted-foreground">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>
              <div className={cn("mt-1 grid grid-cols-7 gap-1.5 transition-opacity", dataLoading && "opacity-50")}>
                {cells.map((day, idx) => {
                  if (day == null) return <div key={idx} />;
                  const dateStr = isoDate(viewYear, viewMonth, day);
                  const entry = byDate.get(dateStr);
                  const isToday = new Date(viewYear, viewMonth, day).toDateString() === today.toDateString();
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!entry}
                      onClick={() => setSelectedDate(dateStr)}
                      className={cn(
                        "flex min-h-[56px] flex-col items-start gap-1 rounded-lg border p-1.5 text-left transition-colors sm:min-h-[64px]",
                        entry ? cn(STATUS_CELL[entry.status] ?? "bg-muted", "hover:brightness-95") : "bg-card text-muted-foreground",
                        isToday ? "border-primary/50" : "border-border/60",
                        selectedDate === dateStr && "ring-2 ring-primary",
                      )}
                    >
                      <span className="flex w-full items-center justify-between text-sm font-medium">
                        {day}
                        {isToday && <span className="text-[9px] font-semibold uppercase text-primary">Today</span>}
                      </span>
                      {entry && (
                        <span className="flex items-center gap-1 text-[10px] font-medium leading-none">
                          <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[entry.status])} />
                          <span className="hidden sm:inline">{statusLabel(entry.status)}</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {selected && (
                <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">
                      {new Date(selected.attendanceDate).toLocaleDateString(undefined, {
                        weekday: "long", day: "numeric", month: "short", year: "numeric",
                      })}
                    </div>
                    <Badge className={cn("gap-1 rounded-md border-0 text-xs font-medium", STATUS_CELL[selected.status])}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[selected.status])} />
                      {statusLabel(selected.status)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-muted-foreground">Leave type</div>
                      <div className="mt-0.5 font-medium">{selected.leaveTypeName || "—"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Remarks</div>
                      <div className="mt-0.5 font-medium">{selected.remarks || "—"}</div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Month summary */}
            <section className="h-fit rounded-xl border border-border bg-card p-4 shadow-sm">
              <h2 className="font-display text-base font-bold">{MONTHS[viewMonth]} {viewYear}</h2>
              <p className="mb-3 text-xs text-muted-foreground">
                {history.length === 0 ? "No attendance marked this month." : `${history.length} day(s) marked`}
              </p>
              <dl className="divide-y divide-border text-sm">
                {Object.entries(monthCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                      <dt className="flex items-center gap-2 text-muted-foreground">
                        <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[status] ?? "bg-muted-foreground")} />
                        {statusLabel(status)}
                      </dt>
                      <dd className="font-semibold">{count}</dd>
                    </div>
                  ))}
              </dl>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon, label, value, tone, note, noteBad,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  tone: string;
  note?: string;
  noteBad?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tone)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="font-display text-xl font-bold leading-tight">{value}</div>
        {note && <div className={cn("text-xs", noteBad ? "text-destructive" : "text-muted-foreground")}>{note}</div>}
      </div>
    </div>
  );
}
