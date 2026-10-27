import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarCheck,
  Wallet,
  CalendarDays,
  Bell,
  CalendarClock,
  CheckCircle2,
  type LucideIcon,
  AlertCircle,
} from "lucide-react";
import { StudentAvatar } from "@/components/erp/StudentAvatar";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { NoticeCarousel, useActiveNotices } from "@/components/dashboard/NoticeBanner";

// Backed by the PARENT-only /api/Parent/* endpoints, which return just the students
// linked to the logged-in guardian.
type Child = {
  studentKey: string;
  studentName: string;
  admissionNumber: string;
  className: string | null;
  sectionLabel: string | null;
  rollNumber: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  bloodGroup: string | null;
  photoUrl: string | null;
  academicYearName: string | null;
  relationshipType: string | null;
};
type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type AttendanceSummary = {
  totalMarkedDays: number;
  presentEquivalentDays: number;
  absentDays: number;
  lateDays: number;
  requiredPercent: number;
  attendancePercent: number | null;
};
type AttendanceRow = { studentAttendanceKey: string; attendanceDate: string; status: string };
type FeeDemand = {
  feeDemandKey: string;
  feeHeadName: string;
  installmentLabel: string | null;
  dueDate: string;
  balanceAmount: number;
  status: string;
};
type FeeReceipt = {
  feeReceiptKey: string;
  receiptNumber: string;
  receiptDate: string;
  totalAmount: number;
  status: string;
};
type SchoolEvent = {
  schoolEventKey: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  category: "TEAM" | "WORK" | "EXTERNAL";
};

const EVENT_CATEGORY_STYLES: Record<string, string> = {
  TEAM: "bg-success/15 text-success",
  WORK: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  EXTERNAL: "bg-destructive/15 text-destructive",
};

const ATTENDANCE_STYLES: Record<string, string> = {
  PRESENT: "bg-success/15 text-success",
  ABSENT: "bg-destructive/15 text-destructive",
  LATE: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const relLabel = (r: string) => r.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function ParentDashboard() {
  const { user } = useCurrentUser();
  const noticeBanners = useActiveNotices();

  const [children, setChildren] = useState<Child[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [childrenError, setChildrenError] = useState(false);
  const [activeChildKey, setActiveChildKey] = useState<string | null>(null);

  const [yearKey, setYearKey] = useState<string | null>(null);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRow[]>([]);
  const [demands, setDemands] = useState<FeeDemand[]>([]);
  const [receipts, setReceipts] = useState<FeeReceipt[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [childLoading, setChildLoading] = useState(false);

  // Linked children + active academic year + school events (not child-specific)
  useEffect(() => {
    Promise.allSettled([apiFetch("/api/Parent/children"), apiFetch("/api/Parent/academic-years")])
      .then(([c, y]) => {
        if (c.status === "fulfilled") {
          const list: Child[] = c.value ?? [];
          setChildren(list);
          setActiveChildKey(list[0]?.studentKey ?? null);
        } else {
          setChildrenError(true);
        }
        if (y.status === "fulfilled") {
          const years: AcademicYear[] = y.value;
          setYearKey((years.find((x) => x.status === "Active") ?? years[0])?.academicYearKey ?? null);
        }
      })
      .finally(() => setChildrenLoading(false));

    const rangeStart = new Date();
    rangeStart.setDate(rangeStart.getDate() - 30);
    const rangeEnd = new Date();
    rangeEnd.setDate(rangeEnd.getDate() + 60);
    apiFetch(`/api/SchoolEvent?rangeStart=${rangeStart.toISOString()}&rangeEnd=${rangeEnd.toISOString()}`)
      .then((e: SchoolEvent[]) => setEvents(e))
      .catch(() => {});
  }, []);

  // Everything scoped to the selected child
  useEffect(() => {
    if (!activeChildKey) return;
    setChildLoading(true);
    setSummary(null);
    setRecentAttendance([]);
    setDemands([]);
    setReceipts([]);

    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 14);
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    Promise.allSettled([
      yearKey
        ? apiFetch(`/api/Parent/children/${activeChildKey}/attendance/summary?academicYearId=${yearKey}`)
        : Promise.resolve(null),
      apiFetch(`/api/Parent/children/${activeChildKey}/attendance?fromDate=${iso(from)}&toDate=${iso(to)}`),
      apiFetch(`/api/Parent/children/${activeChildKey}/fee-demands`),
      apiFetch(`/api/Parent/children/${activeChildKey}/fee-receipts`),
    ])
      .then(([s, a, d, r]) => {
        if (s.status === "fulfilled") setSummary(s.value);
        if (a.status === "fulfilled") {
          const rows: AttendanceRow[] = a.value;
          setRecentAttendance(
            [...rows].sort((x, y) => y.attendanceDate.localeCompare(x.attendanceDate)).slice(0, 7),
          );
        }
        if (d.status === "fulfilled") setDemands(d.value);
        if (r.status === "fulfilled") setReceipts(r.value);
      })
      .finally(() => setChildLoading(false));
  }, [activeChildKey, yearKey]);

  const activeChild = children.find((c) => c.studentKey === activeChildKey) ?? null;

  const dues = useMemo(() => {
    const open = demands.filter((d) => d.balanceAmount > 0);
    const now = new Date();
    const total = open.reduce((s, d) => s + d.balanceAmount, 0);
    const overdue = open.filter((d) => new Date(d.dueDate) < now).reduce((s, d) => s + d.balanceAmount, 0);
    const next = [...open].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] ?? null;
    return { open, total, overdue, next };
  }, [demands]);

  const recentReceipts = receipts
    .filter((r) => r.status !== "CANCELLED")
    .sort((a, b) => b.receiptDate.localeCompare(a.receiptDate))
    .slice(0, 4);

  const now = new Date();
  const notices = events
    .filter((e) => new Date(e.startDate) <= now)
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .slice(0, 4);
  const upcomingEvents = events
    .filter((e) => new Date(e.startDate) > now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 4);

  const attendancePercent = summary?.attendancePercent ?? null;
  const belowRequired =
    attendancePercent != null && summary != null && attendancePercent < summary.requiredPercent;

  const attendanceTone = belowRequired ? "text-destructive" : "text-success";
  const ringPercent = Math.max(0, Math.min(100, Number(attendancePercent ?? 0)));

  return (
    <div className="-m-1 rounded-2xl bg-gradient-to-b from-primary/[0.07] via-primary/[0.03] to-transparent p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {greeting()}, <span className="text-primary">{user?.userName ?? "there"}</span>! 👋
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Here's how your child is doing at school.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
          <CalendarClock className="h-3.5 w-3.5 text-primary" />
          {now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
        </div>
      </div>

      {childrenLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>
      ) : children.length === 0 ? (
        <EmptyState
          icon={AlertCircle}
          title="No children linked to your account"
          message={
            childrenError
              ? "We couldn't load your children right now. Please try again later."
              : "Please contact the school office to link your child to this login."
          }
          className="rounded-2xl border border-border bg-card p-8 shadow-sm"
        />
      ) : (
        <>
          {/* Child selector */}
          <div className="-mx-1 mb-5 flex gap-2.5 overflow-x-auto px-1 pb-1">
            {children.map((c) => {
              const selected = c.studentKey === activeChildKey;
              return (
                <button
                  key={c.studentKey}
                  type="button"
                  onClick={() => setActiveChildKey(c.studentKey)}
                  aria-pressed={selected}
                  className={cn(
                    "flex shrink-0 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200",
                    selected
                      ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25"
                      : "border-border bg-card text-foreground shadow-sm hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
                  )}
                >
                  <StudentAvatar
                    photoUrl={c.photoUrl}
                    gender={c.gender}
                    studentName={c.studentName}
                    className={cn("h-10 w-10", selected && "ring-2 ring-white/70")}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-tight">{c.studentName}</span>
                    <span
                      className={cn(
                        "mt-0.5 block text-xs",
                        selected ? "text-primary-foreground/80" : "text-muted-foreground",
                      )}
                    >
                      {[c.className, c.sectionLabel].filter(Boolean).join(" - ") || c.admissionNumber}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Student overview */}
          {activeChild && (
            <Card className="mb-5 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                <StudentAvatar
                  photoUrl={activeChild.photoUrl}
                  gender={activeChild.gender}
                  studentName={activeChild.studentName}
                  className="h-16 w-16 ring-4 ring-primary/15 sm:h-[72px] sm:w-[72px]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-bold leading-tight">{activeChild.studentName}</h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" /> Active Student
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {[activeChild.className, activeChild.sectionLabel].filter(Boolean).join(" - ") ||
                      "Class not assigned"}
                    {activeChild.academicYearName ? ` · ${activeChild.academicYearName}` : ""}
                  </p>
                </div>
                <Link
                  to="/parent-report-cards"
                  className="shrink-0 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  View Results →
                </Link>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2.5 border-t border-border pt-4 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  ["Admission No.", activeChild.admissionNumber],
                  ["Roll No.", activeChild.rollNumber],
                  ["Gender", activeChild.gender],
                  ["Date of Birth", activeChild.dateOfBirth ? fmtDate(activeChild.dateOfBirth) : null],
                  ["Blood Group", activeChild.bloodGroup],
                  ["Relationship", activeChild.relationshipType ? relLabel(activeChild.relationshipType) : null],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-lg bg-muted/50 px-3 py-2">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
                    <dd className="mt-0.5 truncate text-sm font-semibold">{value || "—"}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}

          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Attendance */}
            <Card className="flex items-center gap-4 bg-success/[0.06] p-4 sm:p-5">
              <div className="relative h-20 w-20 shrink-0">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3.5" className="stroke-muted" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray={`${ringPercent} 100`}
                    pathLength={100}
                    className={cn("transition-all duration-700", belowRequired ? "stroke-destructive" : "stroke-success")}
                  />
                </svg>
                <CalendarCheck className={cn("absolute inset-0 m-auto h-6 w-6", attendanceTone)} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attendance</div>
                <div className={cn("font-display text-3xl font-bold leading-tight", attendancePercent != null && attendanceTone)}>
                  {childLoading ? "…" : attendancePercent != null ? `${attendancePercent}%` : "No data"}
                </div>
                {summary ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    <span className="font-medium text-success">{summary.presentEquivalentDays} present</span> ·{" "}
                    <span className="font-medium text-destructive">{summary.absentDays} absent</span> ·{" "}
                    <span className="font-medium text-[oklch(0.45_0.12_65)]">{summary.lateDays} late</span>
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-muted-foreground">No attendance recorded yet</div>
                )}
                {belowRequired && summary && (
                  <div className="mt-1 text-xs font-medium text-destructive">Below required {summary.requiredPercent}%</div>
                )}
              </div>
            </Card>

            {/* Fees due */}
            <Card className="flex items-center gap-4 bg-warning/[0.08] p-4 sm:p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warning/25 text-[oklch(0.45_0.12_65)]">
                <Wallet className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fees Due</div>
                <div className="font-display text-3xl font-bold leading-tight">
                  {childLoading ? "…" : inr(dues.total)}
                </div>
                {dues.overdue > 0 ? (
                  <div className="mt-1 text-xs font-medium text-destructive">{inr(dues.overdue)} overdue</div>
                ) : dues.total === 0 ? (
                  <div className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" /> No outstanding fees
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-muted-foreground">No overdue fees</div>
                )}
              </div>
            </Card>

            {/* Next due date */}
            <Card className="flex items-center gap-4 bg-info/[0.07] p-4 sm:p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-info/20 text-info">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next Due Date</div>
                <div className="font-display text-3xl font-bold leading-tight">
                  {dues.next ? fmtDate(dues.next.dueDate) : "—"}
                </div>
                <div className="mt-1 truncate text-xs text-muted-foreground">
                  {dues.next ? dues.next.feeHeadName : "No upcoming due date"}
                </div>
              </div>
            </Card>
          </div>

          {/* Attendance warning */}
          {belowRequired && summary && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-destructive/25 bg-destructive/[0.07] p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <AlertCircle className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-destructive">Attendance needs attention</div>
                <div className="text-sm text-muted-foreground">
                  {activeChild?.studentName}'s attendance is {attendancePercent}%, below the required{" "}
                  {summary.requiredPercent}%.
                </div>
              </div>
              <Link
                to="/student-attendance-calendar"
                className="shrink-0 rounded-lg border border-destructive/30 bg-card px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
              >
                View Attendance →
              </Link>
            </div>
          )}

          {/* Activity */}
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="flex flex-col p-4 sm:p-5">
              <SectionHeader
                icon={CalendarCheck}
                title="Recent Attendance"
                action={
                  <Link to="/student-attendance-calendar" className="text-xs font-semibold text-primary hover:underline">
                    View all
                  </Link>
                }
              />
              {recentAttendance.length === 0 ? (
                childLoading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
                ) : (
                  <EmptyState
                    icon={CalendarCheck}
                    title="No attendance yet"
                    message="Attendance will appear here once it's marked."
                  />
                )
              ) : (
                <div className="space-y-1.5">
                  {recentAttendance.map((a) => {
                    const d = new Date(a.attendanceDate);
                    return (
                      <div
                        key={a.studentAttendanceKey}
                        className="flex items-center justify-between rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted/60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 flex-col items-center justify-center rounded-lg bg-muted text-[10px] font-semibold leading-none text-muted-foreground">
                            <span className="text-sm text-foreground">{d.getDate()}</span>
                            {d.toLocaleDateString(undefined, { month: "short" })}
                          </div>
                          <span className="font-medium">{d.toLocaleDateString(undefined, { weekday: "long" })}</span>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            ATTENDANCE_STYLES[a.status.toUpperCase()] ?? "bg-muted text-muted-foreground",
                          )}
                        >
                          {a.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              <Link
                to="/student-attendance-calendar"
                className="mt-auto inline-block pt-3 text-xs font-semibold text-primary hover:underline"
              >
                View full calendar →
              </Link>
            </Card>

            <Card className="flex flex-col p-4 sm:p-5">
              <SectionHeader
                icon={Wallet}
                title="Pending Fees"
                action={
                  dues.open.length > 0 ? (
                    <span className="text-xs font-medium text-muted-foreground">{dues.open.length} pending</span>
                  ) : undefined
                }
              />
              {dues.open.length === 0 ? (
                childLoading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
                ) : (
                  <EmptyState
                    icon={CheckCircle2}
                    tone="success"
                    title="All fees are paid"
                    message="You're all caught up with payments."
                  />
                )
              ) : (
                <div className="space-y-2">
                  {dues.open.slice(0, 5).map((d) => {
                    const overdue = new Date(d.dueDate) < now;
                    return (
                      <div
                        key={d.feeDemandKey}
                        className="flex items-start justify-between gap-2 rounded-lg border border-border px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{d.feeHeadName}</div>
                          <div className="text-xs text-muted-foreground">
                            {d.installmentLabel ? `${d.installmentLabel} · ` : ""}
                            {overdue ? "Overdue since" : "Due"} {fmtDate(d.dueDate)}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-bold">{inr(d.balanceAmount)}</div>
                          {overdue && (
                            <span className="text-[10px] font-semibold uppercase text-destructive">Overdue</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {recentReceipts.length > 0 && (
                <div className="mt-4 border-t border-border pt-3">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Recent payments
                  </div>
                  {recentReceipts.map((r) => (
                    <div key={r.feeReceiptKey} className="flex justify-between py-1 text-xs">
                      <span className="text-muted-foreground">
                        {r.receiptNumber} · {fmtDate(r.receiptDate)}
                      </span>
                      <span className="font-semibold text-success">{inr(r.totalAmount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="flex flex-col p-4 sm:p-5 md:col-span-2 lg:col-span-1">
              <SectionHeader
                icon={Bell}
                title="Recent Notices"
                action={
                  noticeBanners.length === 0 && notices.length > 0 ? (
                    <span className="text-xs font-medium text-muted-foreground">{notices.length} recent</span>
                  ) : undefined
                }
              />
              {noticeBanners.length > 0 ? (
                <NoticeCarousel banners={noticeBanners} className="-mx-4 -mb-4 rounded-b-2xl sm:-mx-5 sm:-mb-5" />
              ) : notices.length === 0 ? (
                <EmptyState icon={Bell} title="No recent notices" message="School announcements will show up here." />
              ) : (
                <div className="space-y-1.5">
                  {notices.map((e) => (
                    <div
                      key={e.schoolEventKey}
                      className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Bell className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{e.title}</div>
                        {e.description && (
                          <div className="truncate text-xs text-muted-foreground">{e.description}</div>
                        )}
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {new Date(e.startDate).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Upcoming events */}
          <Card className="mt-6 p-4 sm:p-5">
            <SectionHeader icon={CalendarDays} title="Upcoming Events" />
            {upcomingEvents.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No upcoming events"
                message="New school events will be listed here."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {upcomingEvents.map((e) => {
                  const d = new Date(e.startDate);
                  return (
                    <div
                      key={e.schoolEventKey}
                      className="flex gap-3 rounded-xl border border-border p-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <span className="font-display text-lg font-bold leading-none">{d.getDate()}</span>
                        <span className="text-[10px] font-semibold uppercase">
                          {d.toLocaleDateString(undefined, { month: "short" })}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            EVENT_CATEGORY_STYLES[e.category],
                          )}
                        >
                          {e.category}
                        </span>
                        <div className="mt-1 truncate text-sm font-semibold">{e.title}</div>
                        {e.description && (
                          <div className="truncate text-xs text-muted-foreground">{e.description}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card shadow-sm", className)}>{children}</div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 font-display text-base font-bold">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </h2>
      {action}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  message,
  tone = "muted",
  className,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
  tone?: "muted" | "success";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-6 text-center", className)}>
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full",
          tone === "success" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="mt-2.5 text-sm font-semibold">{title}</div>
      <div className="mt-0.5 max-w-xs text-xs text-muted-foreground">{message}</div>
    </div>
  );
}
