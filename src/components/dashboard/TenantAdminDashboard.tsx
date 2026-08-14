import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Users,
  GraduationCap,
  CalendarCheck,
  ClipboardList,
  Wallet,
  CalendarDays,
  UserPlus,
  UserCog,
  CalendarPlus,
  Receipt,
  FileBarChart2,
  MessageSquare,
  Trophy,
  BarChart3,
  Bell,
  CalendarClock,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { StatCard } from "@/components/erp/StatCard";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";

type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type Student = {
  studentKey: string;
  studentName: string;
  admissionDate: string;
  studentStatus: string;
  className: string | null;
};
type StaffRow = { staffProfileKey: string; designation: string; isActive: boolean };
type DailySummary = {
  sectionKey: string;
  className: string;
  totalStudents: number;
  markedCount: number;
  presentCount: number;
};
type ExamRow = {
  examKey: string;
  examName: string;
  className: string | null;
  startDate: string;
  endDate: string;
};
type ExamSummary = { averagePercentage: number | null };
type FeeReceipt = { totalAmount: number; status: string };
type FeeOutstandingRow = { outstanding: number; oldestDueDate: string | null };
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

const TONE_ICON_BG: Record<string, string> = {
  primary: "bg-primary/15 text-primary",
  info: "bg-info/15 text-info",
  success: "bg-success/15 text-success",
  purple: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
  teal: "bg-[oklch(0.55_0.1_200)]/15 text-[oklch(0.4_0.12_200)]",
  warning: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
};

const RANK_STYLES = [
  "bg-primary/15 text-primary",
  "bg-info/15 text-info",
  "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
  "bg-[oklch(0.55_0.1_200)]/15 text-[oklch(0.4_0.12_200)]",
];

const todayIso = () => new Date().toISOString().slice(0, 10);
const startOfMonthIso = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const startOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // back to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function TenantAdminDashboard() {
  const { user } = useCurrentUser();

  const [years, setYears] = useState<AcademicYear[]>([]);
  const activeYearKey = years.find((y) => y.status === "Active")?.academicYearKey ?? years[0]?.academicYearKey;

  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [weeklyAttendance, setWeeklyAttendance] = useState<{ day: string; date: string; percent: number | null }[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [classAverages, setClassAverages] = useState<{ className: string; averagePercentage: number }[]>([]);
  const [monthlyCollected, setMonthlyCollected] = useState<number | null>(null);
  const [outstanding, setOutstanding] = useState<{ pending: number; overdue: number } | null>(null);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Static-ish reference data: academic years, student directory, staff directory
  useEffect(() => {
    Promise.allSettled([
      apiFetch("/api/AcademicYear"),
      apiFetch("/api/Student?status=ENROLLED"),
      apiFetch("/api/StaffProfile"),
    ])
      .then(([y, s, st]) => {
        if (y.status === "fulfilled") setYears(y.value);
        if (s.status === "fulfilled") setStudents(s.value);
        if (st.status === "fulfilled") setStaff(st.value);
      })
      .finally(() => setLoading(false));
  }, []);

  // Fee collected this month (independent of academic year selection)
  useEffect(() => {
    apiFetch(`/api/Fee/receipts?fromDate=${startOfMonthIso()}&toDate=${todayIso()}`)
      .then((r: FeeReceipt[]) => {
        const total = r.filter((x) => x.status !== "CANCELLED").reduce((sum, x) => sum + x.totalAmount, 0);
        setMonthlyCollected(total);
      })
      .catch(() => setMonthlyCollected(0));
  }, []);

  // Recent notices + upcoming events (School calendar, +/- window around today)
  useEffect(() => {
    const rangeStart = new Date();
    rangeStart.setDate(rangeStart.getDate() - 30);
    const rangeEnd = new Date();
    rangeEnd.setDate(rangeEnd.getDate() + 60);
    apiFetch(`/api/SchoolEvent?rangeStart=${rangeStart.toISOString()}&rangeEnd=${rangeEnd.toISOString()}`)
      .then((e: SchoolEvent[]) => setEvents(e))
      .catch(() => {});
  }, []);

  // Everything scoped to the active academic year: attendance, exams, fee outstanding
  useEffect(() => {
    if (!activeYearKey) return;

    const monday = startOfWeek(new Date());
    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = todayIso();
    const weekDates = dayLabels
      .map((label, i) => {
        const d = new Date(monday);
        d.setDate(d.getDate() + i);
        return { label, date: isoDate(d) };
      })
      .filter((d) => d.date <= today);

    Promise.allSettled(
      weekDates.map((d) =>
        apiFetch(`/api/StudentAttendance/daily-summary?academicYearId=${activeYearKey}&date=${d.date}`),
      ),
    ).then((results) => {
      const series = weekDates.map((d, i) => {
        const res = results[i];
        if (res.status !== "fulfilled") return { day: d.label, date: d.date, percent: null };
        const rows: DailySummary[] = res.value;
        const totalMarked = rows.reduce((s, r) => s + r.markedCount, 0);
        const totalPresent = rows.reduce((s, r) => s + r.presentCount, 0);
        return {
          day: d.label,
          date: d.date,
          percent: totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 1000) / 10 : null,
        };
      });
      setWeeklyAttendance(series);
    });

    apiFetch(`/api/Exam?academicYearId=${activeYearKey}`)
      .then(async (e: ExamRow[]) => {
        setExams(e);
        if (e.length === 0) {
          setClassAverages([]);
          return;
        }
        const summaries = await Promise.allSettled(
          e.map((exam) => apiFetch(`/api/Exam/${exam.examKey}/summary`) as Promise<ExamSummary>),
        );
        const byClass = new Map<string, { total: number; count: number }>();
        e.forEach((exam, i) => {
          const res = summaries[i];
          if (res.status !== "fulfilled" || res.value.averagePercentage == null) return;
          const key = exam.className ?? "Unknown";
          const bucket = byClass.get(key) ?? { total: 0, count: 0 };
          bucket.total += res.value.averagePercentage;
          bucket.count += 1;
          byClass.set(key, bucket);
        });
        const ranked = Array.from(byClass.entries())
          .map(([className, { total, count }]) => ({ className, averagePercentage: total / count }))
          .sort((a, b) => b.averagePercentage - a.averagePercentage)
          .slice(0, 4);
        setClassAverages(ranked);
      })
      .catch(() => {});

    apiFetch(`/api/Fee/outstanding?academicYearId=${activeYearKey}`)
      .then((rows: FeeOutstandingRow[]) => {
        const today2 = new Date();
        let pending = 0;
        let overdue = 0;
        rows.forEach((r) => {
          if (r.oldestDueDate && new Date(r.oldestDueDate) < today2) overdue += r.outstanding;
          else pending += r.outstanding;
        });
        setOutstanding({ pending, overdue });
      })
      .catch(() => setOutstanding({ pending: 0, overdue: 0 }));
  }, [activeYearKey]);

  const admittedThisMonth = useMemo(() => {
    const start = startOfMonthIso();
    return students.filter((s) => s.admissionDate?.slice(0, 10) >= start).length;
  }, [students]);

  const teacherCount = useMemo(
    () => staff.filter((s) => /PGT|TGT|PRT/i.test(s.designation)).length,
    [staff],
  );

  const studentsByClass = useMemo(() => {
    const counts = new Map<string, number>();
    students.forEach((s) => {
      const key = s.className ?? "Unassigned";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries()).map(([className, count]) => ({ className, count }));
  }, [students]);

  const todayPercent = weeklyAttendance.find((d) => d.date === todayIso())?.percent ?? null;

  const examsThisWeek = useMemo(() => {
    const monday = startOfWeek(new Date());
    const saturday = new Date(monday);
    saturday.setDate(saturday.getDate() + 5);
    return exams.filter((e) => new Date(e.startDate) <= saturday && new Date(e.endDate) >= monday).length;
  }, [exams]);

  const now = new Date();
  const recentNotices = events
    .filter((e) => new Date(e.startDate) <= now)
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .slice(0, 4);
  const upcomingEvents = events
    .filter((e) => new Date(e.startDate) > now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 4);

  const feeDonutData = [
    { name: "Collected", value: monthlyCollected ?? 0, color: "oklch(0.72 0.18 145)" },
    { name: "Pending", value: outstanding?.pending ?? 0, color: "oklch(0.82 0.16 85)" },
    { name: "Overdue", value: outstanding?.overdue ?? 0, color: "oklch(0.6 0.22 27)" },
  ];
  const feeDonutTotal = feeDonutData.reduce((s, d) => s + d.value, 0);

  const quickActions = [
    { label: "Add Student", to: "/student-add", icon: UserPlus, tone: "primary" },
    { label: "Add Staff", to: "/staff-setup", icon: UserCog, tone: "info" },
    { label: "Create Event", to: "/school-calendar", icon: CalendarPlus, tone: "success" },
    { label: "Collect Fees", to: "/fees", icon: Receipt, tone: "warning" },
    { label: "Generate Report", to: "/reports", icon: FileBarChart2, tone: "purple" },
    { label: "Communication", to: "/communication-settings", icon: MessageSquare, tone: "teal" },
  ] as const;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {greeting()}, {user?.roleName ?? user?.userName ?? "there"}! 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's what's happening in your school today.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium shadow-sm">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          {now.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric", weekday: "long" })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total Students"
          value={loading ? "…" : String(students.length)}
          delta={admittedThisMonth > 0 ? { value: `+${admittedThisMonth} this month`, direction: "up" } : undefined}
          icon={Users}
          tone="primary"
        />
        <StatCard
          label="Total Teachers"
          value={loading ? "…" : String(teacherCount)}
          delta={{ value: `${staff.length} total staff`, direction: "up" }}
          icon={GraduationCap}
          tone="info"
        />
        <StatCard
          label="Attendance Today"
          value={todayPercent != null ? `${todayPercent}%` : "No data"}
          icon={CalendarCheck}
          tone="success"
        />
        <StatCard
          label="Exams Scheduled"
          value={String(examsThisWeek)}
          delta={{ value: "this week", direction: "up" }}
          icon={ClipboardList}
          tone="purple"
        />
        <StatCard
          label="Fee Collection"
          value={monthlyCollected != null ? `₹${(monthlyCollected / 1000).toFixed(1)}K` : "…"}
          delta={{ value: "this month", direction: "up" }}
          icon={Wallet}
          tone="warning"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-md border border-border bg-card p-5 shadow-sm lg:col-span-1">
          <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold">
            <CalendarCheck className="h-4 w-4 text-primary" /> Attendance Overview
          </h2>
          <div className="h-56 w-full">
            {weeklyAttendance.every((d) => d.percent == null) ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                No attendance marked this week yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyAttendance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.008 260)" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} stroke="oklch(0.5 0.02 260)" />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    stroke="oklch(0.5 0.02 260)"
                    domain={[0, 100]}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.008 260)", fontSize: 12 }}
                    formatter={(v: number) => [`${v}%`, "Attendance"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="percent"
                    stroke="oklch(0.72 0.18 42)"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "oklch(0.72 0.18 42)" }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-5 shadow-sm lg:col-span-1">
          <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold">
            <Wallet className="h-4 w-4 text-primary" /> Fee Collection Overview
          </h2>
          {feeDonutTotal === 0 ? (
            <div className="flex h-56 items-center justify-center text-center text-sm text-muted-foreground">
              No fee transactions recorded yet.
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={feeDonutData} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={2}>
                      {feeDonutData.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2.5 text-sm">
                {feeDonutData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">₹{(d.value / 1000).toFixed(1)}K</div>
                      <div className="text-[11px] text-muted-foreground">
                        ({feeDonutTotal > 0 ? Math.round((d.value / feeDonutTotal) * 100) : 0}%)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-md border border-border bg-card p-5 shadow-sm lg:col-span-1">
          <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold">
            <Bell className="h-4 w-4 text-primary" /> Recent Notices
          </h2>
          {recentNotices.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No recent notices.</div>
          ) : (
            <div className="space-y-3">
              {recentNotices.map((e) => (
                <div key={e.schoolEventKey} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{e.title}</div>
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
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-md border border-border bg-card p-5 shadow-sm lg:col-span-1">
          <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold">
            <BarChart3 className="h-4 w-4 text-primary" /> Students by Class
          </h2>
          <div className="h-64 w-full">
            {studentsByClass.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {loading ? "Loading..." : "No students yet."}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studentsByClass} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.008 260)" vertical={false} />
                  <XAxis
                    dataKey="className"
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                    stroke="oklch(0.5 0.02 260)"
                    angle={-35}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="oklch(0.5 0.02 260)" allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "oklch(0.965 0.008 90)" }}
                    contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.008 260)", fontSize: 12 }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={32} fill="oklch(0.72 0.18 42)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-5 shadow-sm lg:col-span-1">
          <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold">
            <Trophy className="h-4 w-4 text-primary" /> Top Performing Classes
          </h2>
          {classAverages.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No exam results yet — scores appear here once exams are marked.
            </div>
          ) : (
            <div className="space-y-4">
              {classAverages.map((c, i) => (
                <div key={c.className} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      RANK_STYLES[i % RANK_STYLES.length],
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{c.className}</div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(100, c.averagePercentage)}%` }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">{c.averagePercentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-md border border-border bg-card p-5 shadow-sm lg:col-span-1">
          <h2 className="mb-4 font-display text-base font-bold">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-2.5">
            {quickActions.map((a) => (
              <Link
                key={a.label}
                to={a.to}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-md p-3 text-center text-xs font-medium transition-transform hover:-translate-y-0.5",
                  TONE_ICON_BG[a.tone],
                )}
              >
                <a.icon className="h-5 w-5" />
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-md border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold">
          <CalendarDays className="h-4 w-4 text-primary" /> Upcoming Events
        </h2>
        {upcomingEvents.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No upcoming events scheduled.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {upcomingEvents.map((e) => (
              <div key={e.schoolEventKey} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                      EVENT_CATEGORY_STYLES[e.category],
                    )}
                  >
                    {e.category}
                  </span>
                </div>
                <div className="mt-2 text-sm font-medium">{e.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(e.startDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(e.startDate).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} –{" "}
                  {new Date(e.endDate).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
