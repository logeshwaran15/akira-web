import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { StatCard } from "@/components/erp/StatCard";
import { InfoAlert } from "@/components/erp/InfoAlert";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { CalendarCheck, CheckCheck, School, Users2, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAcademicYear } from "@/hooks/use-academic-year";

export const Route = createFileRoute("/class-attendance-overview")({
  head: () => ({
    meta: [
      { title: "Class Attendance Overview — Akira School ERP" },
      {
        name: "description",
        content: "School-wide, section-by-section attendance snapshot for a chosen date.",
      },
    ],
  }),
  component: ClassAttendanceOverviewPage,
});

type DailySummaryRow = {
  sectionKey: string;
  sectionLabel: string;
  className: string;
  totalStudents: number;
  markedCount: number;
  presentCount: number;
  absentCount: number;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

function ClassAttendanceOverviewPage() {
  const { selectedYearKey } = useAcademicYear();
  const [date, setDate] = useState(todayIso());
  const [rows, setRows] = useState<DailySummaryRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedYearKey || !date) return;
    setLoading(true);
    apiFetch(`/api/StudentAttendance/daily-summary?academicYearId=${selectedYearKey}&date=${date}`)
      .then((d: DailySummaryRow[]) => setRows(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load attendance overview"))
      .finally(() => setLoading(false));
  }, [selectedYearKey, date]);

  const totals = useMemo(() => {
    const totalStudents = rows.reduce((sum, r) => sum + r.totalStudents, 0);
    const markedCount = rows.reduce((sum, r) => sum + r.markedCount, 0);
    const presentCount = rows.reduce((sum, r) => sum + r.presentCount, 0);
    const absentCount = rows.reduce((sum, r) => sum + r.absentCount, 0);
    const attendancePercent = markedCount === 0 ? null : Math.round((presentCount * 100) / markedCount);
    const pendingSections = rows.filter((r) => r.markedCount < r.totalStudents).length;
    return { totalStudents, markedCount, presentCount, absentCount, attendancePercent, pendingSections };
  }, [rows]);

  const columns: Column<DailySummaryRow>[] = [
    {
      key: "className",
      header: "Class",
      sortable: true,
      accessor: (r) => (
        <div className="text-sm font-medium">
          {r.className} - {r.sectionLabel}
        </div>
      ),
    },
    {
      key: "totalStudents",
      header: "Strength",
      sortable: true,
      className: "text-muted-foreground",
    },
    {
      key: "markedCount",
      header: "Marked",
      sortable: true,
      accessor: (r) =>
        r.markedCount === r.totalStudents ? (
          <Badge className="rounded-md border-0 bg-success/15 text-success">
            {r.markedCount}/{r.totalStudents}
          </Badge>
        ) : (
          <Badge className="rounded-md border-0 bg-warning/20 text-[oklch(0.45_0.12_65)]">
            {r.markedCount}/{r.totalStudents}
          </Badge>
        ),
    },
    {
      key: "presentCount",
      header: "Present",
      sortable: true,
      accessor: (r) => <span className="text-success">{r.presentCount}</span>,
    },
    {
      key: "absentCount",
      header: "Absent",
      sortable: true,
      accessor: (r) => <span className="text-destructive">{r.absentCount}</span>,
    },
    {
      key: "attendancePercent",
      header: "Attendance %",
      sortable: true,
      sortValue: (r) => (r.markedCount === 0 ? -1 : Math.round((r.presentCount * 100) / r.markedCount)),
      accessor: (r) =>
        r.markedCount === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          `${Math.round((r.presentCount * 100) / r.markedCount)}%`
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Class Attendance Overview"
        breadcrumbs={[{ label: "Attendance" }, { label: "Overview" }]}
        actions={
          <DatePicker
            className="h-10 w-40"
            value={date}
            onChange={(v) => setDate(v)}
            max={todayIso()}
          />
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="School-wide Attendance"
          value={totals.attendancePercent == null ? "—" : `${totals.attendancePercent}%`}
          icon={CheckCheck}
          tone="primary"
        />
        <StatCard label="Total Students" value={String(totals.totalStudents)} icon={Users2} tone="info" />
        <StatCard label="Present Today" value={String(totals.presentCount)} icon={School} tone="success" />
        <StatCard
          label="Sections Pending"
          value={String(totals.pendingSections)}
          icon={AlertTriangle}
          tone={totals.pendingSections > 0 ? "warning" : "success"}
        />
      </div>

      {!selectedYearKey ? (
        <InfoAlert tone="info" title="Loading academic year...">
          The overview will appear once the current academic year is resolved.
        </InfoAlert>
      ) : rows.length === 0 && !loading ? (
        <InfoAlert tone="info" title="No sections found">
          No section attendance data is available for {date}.
        </InfoAlert>
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          rowKey={(r) => r.sectionKey}
          searchPlaceholder="Search by class or section..."
          searchFields={(r) => `${r.className} ${r.sectionLabel}`}
          emptyMessage={loading ? "Loading..." : "No sections found."}
          storageKey="class-attendance-overview"
        />
      )}

      {rows.some((r) => r.markedCount < r.totalStudents) && (
        <div className="mt-4">
          <InfoAlert tone="warning" title="Some sections haven't finished marking attendance">
            <div className="flex items-center gap-1.5">
              <CalendarCheck className="h-3.5 w-3.5" />
              Follow up with class teachers for sections still showing a partial marked count.
            </div>
          </InfoAlert>
        </div>
      )}
    </div>
  );
}
