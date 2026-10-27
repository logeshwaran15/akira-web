import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/erp/PageHeader";
import { StatCard } from "@/components/erp/StatCard";
import { InfoAlert } from "@/components/erp/InfoAlert";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, School, TrendingUp, Users2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/attendance-analytics")({
  head: () => ({
    meta: [
      { title: "Attendance Analytics — Akira School ERP" },
      {
        name: "description",
        content: "Class and school-wide attendance trends and chronic-absentee watch-list.",
      },
    ],
  }),
  component: AttendanceAnalyticsPage,
});

type AcademicYear = { academicYearKey: string; yearName: string; status: string };

type ClassSummaryRow = {
  schoolClassKey: string;
  className: string;
  totalMarkedDays: number;
  presentEquivalentDays: number;
  attendancePercent: number;
};

type MonthlyTrendRow = {
  yearNumber: number;
  monthNumber: number;
  monthName: string;
  totalMarks: number;
  attendancePercent: number;
};

type ChronicAbsenteeRow = {
  studentKey: string;
  admissionNumber: string;
  studentName: string;
  className: string | null;
  sectionLabel: string | null;
  totalMarkedDays: number;
  presentEquivalentDays: number;
  attendancePercent: number;
};

const THRESHOLD_OPTIONS = [60, 65, 70, 75, 80, 85, 90];

function AttendanceAnalyticsPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearKey, setYearKey] = useState("");
  const [threshold, setThreshold] = useState(75);

  const [classSummary, setClassSummary] = useState<ClassSummaryRow[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendRow[]>([]);
  const [absentees, setAbsentees] = useState<ChronicAbsenteeRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch("/api/AcademicYear")
      .then((y: AcademicYear[]) => {
        setYears(y);
        const active = y.find((x) => x.status === "Active");
        setYearKey(active?.academicYearKey ?? y[0]?.academicYearKey ?? "");
      })
      .catch(() => {});
  }, []);

  const load = () => {
    if (!yearKey) return;
    setLoading(true);
    Promise.all([
      apiFetch(`/api/StudentAttendance/analytics/class-summary?academicYearId=${yearKey}`),
      apiFetch(`/api/StudentAttendance/analytics/monthly-trend?academicYearId=${yearKey}`),
      apiFetch(
        `/api/StudentAttendance/analytics/chronic-absentees?academicYearId=${yearKey}&thresholdPercent=${threshold}`,
      ),
    ])
      .then(([cs, mt, ca]: [ClassSummaryRow[], MonthlyTrendRow[], ChronicAbsenteeRow[]]) => {
        setClassSummary(cs);
        setMonthlyTrend(mt);
        setAbsentees(ca);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load analytics"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [yearKey, threshold]);

  const schoolWidePercent = useMemo(() => {
    const totalDays = classSummary.reduce((sum, c) => sum + c.totalMarkedDays, 0);
    const totalPresent = classSummary.reduce((sum, c) => sum + c.presentEquivalentDays, 0);
    return totalDays === 0 ? null : Math.round((totalPresent * 100) / totalDays);
  }, [classSummary]);

  const worstClass = useMemo(() => {
    if (classSummary.length === 0) return null;
    return [...classSummary].sort((a, b) => a.attendancePercent - b.attendancePercent)[0];
  }, [classSummary]);

  const chartData = classSummary.map((c) => ({
    name: c.className,
    percent: c.attendancePercent,
    belowThreshold: c.attendancePercent < threshold,
  }));

  const trendData = monthlyTrend.map((t) => ({
    name: `${t.monthName.slice(0, 3)} ${t.yearNumber}`,
    percent: t.attendancePercent,
  }));

  const columns: Column<ChronicAbsenteeRow>[] = [
    {
      key: "studentName",
      header: "Student",
      sortable: true,
      accessor: (r) => (
        <div>
          <div className="text-sm font-medium">{r.studentName}</div>
          <div className="font-mono text-xs text-muted-foreground">{r.admissionNumber}</div>
        </div>
      ),
    },
    {
      key: "className",
      header: "Class",
      sortable: true,
      accessor: (r) => `${r.className ?? "—"}${r.sectionLabel ? ` - ${r.sectionLabel}` : ""}`,
    },
    {
      key: "attendancePercent",
      header: "Attendance %",
      sortable: true,
      accessor: (r) => (
        <Badge className="rounded-md border-0 bg-destructive/15 text-destructive">
          {r.attendancePercent.toFixed(1)}%
        </Badge>
      ),
    },
    {
      key: "totalMarkedDays",
      header: "Marked Days",
      sortable: true,
      className: "text-muted-foreground",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Attendance Analytics"
        breadcrumbs={[{ label: "Attendance" }, { label: "Analytics" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={yearKey} onValueChange={setYearKey}>
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
            <Select value={String(threshold)} onValueChange={(v) => setThreshold(Number(v))}>
              <SelectTrigger className="h-10 w-40 rounded-md">
                <SelectValue placeholder="Threshold" />
              </SelectTrigger>
              <SelectContent>
                {THRESHOLD_OPTIONS.map((t) => (
                  <SelectItem key={t} value={String(t)}>
                    Below {t}% = at risk
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="School-wide Attendance"
          value={schoolWidePercent == null ? "—" : `${schoolWidePercent}%`}
          icon={TrendingUp}
          tone="primary"
        />
        <StatCard
          label="Most Attendance-Troubled Class"
          value={worstClass ? `${worstClass.className} (${worstClass.attendancePercent.toFixed(1)}%)` : "—"}
          icon={School}
          tone="warning"
        />
        <StatCard
          label="Students At Risk"
          value={String(absentees.length)}
          icon={AlertTriangle}
          tone="destructive"
        />
      </div>

      {!yearKey ? (
        <InfoAlert tone="info" title="Loading academic year...">
          Analytics will appear once the current academic year is resolved.
        </InfoAlert>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <School className="h-4 w-4 text-muted-foreground" /> Class-wise Attendance %
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="percent" radius={[4, 4, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.belowThreshold ? "var(--destructive)" : "var(--primary)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="h-4 w-4 text-muted-foreground" /> Monthly Attendance Trend
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Line type="monotone" dataKey="percent" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Users2 className="h-4 w-4 text-muted-foreground" /> Chronic Absentee Watch-List
            </div>
            <DataTable
              data={absentees}
              columns={columns}
              rowKey={(r) => r.studentKey}
              searchPlaceholder="Search by name or admission number..."
              searchFields={(r) => `${r.studentName} ${r.admissionNumber}`}
              emptyMessage={loading ? "Loading..." : "No students below the selected threshold."}
              storageKey="attendance-analytics-absentees"
            />
          </div>
        </div>
      )}
    </div>
  );
}
