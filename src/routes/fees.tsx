import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { StatCard } from "@/components/erp/StatCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wallet, Users, TrendingDown, ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/fees")({
  head: () => ({
    meta: [
      { title: "Fee Collection — Akira School ERP" },
      {
        name: "description",
        content: "Class-wise outstanding fee dues and quick access to student fee accounts.",
      },
    ],
  }),
  component: FeesPage,
});

type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type SchoolClass = { schoolClassKey: string; className: string };

type OutstandingRow = {
  studentKey: string;
  admissionNumber: string;
  studentName: string;
  className: string | null;
  sectionLabel: string | null;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  oldestDueDate: string | null;
};

function FeesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<OutstandingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [yearFilter, setYearFilter] = useState<string>("");
  const [classFilter, setClassFilter] = useState<string>("all");

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
  }, []);

  useEffect(() => {
    if (!yearFilter) return;
    setLoading(true);
    const params = new URLSearchParams({ academicYearId: yearFilter });
    if (classFilter !== "all") params.set("classId", classFilter);
    apiFetch(`/api/Fee/outstanding?${params.toString()}`)
      .then((d: OutstandingRow[]) => setRows(d))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load outstanding dues"),
      )
      .finally(() => setLoading(false));
  }, [yearFilter, classFilter]);

  const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0);
  const totalBilled = rows.reduce((s, r) => s + r.totalBilled, 0);

  const columns: Column<OutstandingRow>[] = [
    {
      key: "admissionNumber",
      header: "Admission #",
      sortable: true,
      accessor: (r) => <span className="font-mono text-sm font-medium">{r.admissionNumber}</span>,
    },
    {
      key: "studentName",
      header: "Student",
      sortable: true,
      accessor: (r) => (
        <div>
          <div className="font-medium">{r.studentName}</div>
          <div className="text-xs text-muted-foreground">
            {r.className ?? "—"}
            {r.sectionLabel ? ` · ${r.sectionLabel}` : ""}
          </div>
        </div>
      ),
    },
    {
      key: "totalBilled",
      header: "Billed",
      sortable: true,
      accessor: (r) => `₹${r.totalBilled.toFixed(2)}`,
    },
    {
      key: "totalPaid",
      header: "Paid",
      sortable: true,
      accessor: (r) => <span className="text-success">₹{r.totalPaid.toFixed(2)}</span>,
    },
    {
      key: "outstanding",
      header: "Outstanding",
      sortable: true,
      accessor: (r) => (
        <span className="font-semibold text-destructive">₹{r.outstanding.toFixed(2)}</span>
      ),
    },
    {
      key: "oldestDueDate",
      header: "Oldest Due",
      sortable: true,
      accessor: (r) => r.oldestDueDate?.slice(0, 10) ?? "—",
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (r) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-md"
          onClick={() => navigate({ to: "/student-detail", search: { id: r.studentKey } })}
        >
          Collect <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Fee Collection"
        breadcrumbs={[{ label: "Fees" }]}
        actions={
          <div className="flex items-center gap-2">
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="h-10 w-40 rounded-md">
                <SelectValue placeholder="All classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>
                    {c.className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="h-10 w-36 rounded-md">
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
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Billed"
          value={`₹${totalBilled.toFixed(2)}`}
          icon={Wallet}
          tone="primary"
        />
        <StatCard label="Students with Dues" value={String(rows.length)} icon={Users} tone="info" />
        <StatCard
          label="Total Outstanding"
          value={`₹${totalOutstanding.toFixed(2)}`}
          icon={TrendingDown}
          tone="destructive"
        />
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.studentKey}
        storageKey="fee-collection"
        searchPlaceholder="Search by student name or admission number..."
        searchFields={(r) => `${r.studentName} ${r.admissionNumber}`}
        emptyMessage={
          loading
            ? "Loading outstanding dues..."
            : "No outstanding dues for this filter — all clear."
        }
      />
    </div>
  );
}
