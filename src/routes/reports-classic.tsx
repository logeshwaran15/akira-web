import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import {
  CalendarCheck,
  Wallet,
  AlertCircle,
  GraduationCap,
  Users,
  Download,
  FunnelPlus,
  Wrench,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { exportToCsv } from "@/lib/csv";
import { useFormatDate } from "@/hooks/use-tenant-setting";
import { AdHocReportBuilder } from "@/components/erp/AdHocReportBuilder";

export const Route = createFileRoute("/reports-classic")({
  head: () => ({
    meta: [
      { title: "Classic Reports — Akira School ERP" },
      {
        name: "description",
        content: "Built-in canned reports across attendance, fees, examinations and admissions.",
      },
    ],
  }),
  component: ReportsPage,
});

type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type SchoolClass = { schoolClassKey: string; className: string };
type Section = { sectionKey: string; sectionLabel: string };
type Exam = { examKey: string; examName: string; className: string | null; status: string };

type AttendanceRow = {
  studentKey: string;
  admissionNumber: string;
  studentName: string;
  className: string | null;
  sectionLabel: string | null;
  rollNumber: string | null;
  totalMarkedDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  excusedDays: number;
  attendancePercent: number;
};

type FeeReceiptRow = {
  feeReceiptKey: string;
  receiptNumber: string;
  receiptDate: string;
  totalAmount: number;
  paymentMode: string;
  status: string;
  admissionNumber: string;
  studentName: string;
};

type FeeOutstandingRow = {
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

type ExamResultRow = {
  examResultKey: string;
  admissionNumber: string;
  studentName: string;
  totalMaxMarks: number;
  totalObtained: number;
  percentage: number;
  overallGrade: string | null;
  resultStatus: string;
  classRank: number | null;
};

type StudentMasterRow = {
  studentKey: string;
  admissionNumber: string;
  studentName: string;
  gender: string | null;
  className: string | null;
  sectionLabel: string | null;
  rollNumber: string | null;
  communityCategory: string | null;
  rteStatus: boolean;
  economicallyWeakerSection: boolean;
  disabilityCategory: string;
  primaryGuardianName: string | null;
  primaryGuardianMobile: string | null;
};

type FunnelCounts = {
  totalInquiries: number;
  totalApplications: number;
  totalSelected: number;
  totalWaitlisted: number;
  totalEnrolled: number;
};
type FunnelStage = { stage: string; status: string; recordCount: number };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function firstOfMonthIso() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function ReportsPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [yearFilter, setYearFilter] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");

  useEffect(() => {
    apiFetch("/api/AcademicYear")
      .then((y: AcademicYear[]) => {
        setAcademicYears(y);
        const active = y.find((x) => x.status === "Active") ?? y[0];
        if (active) setYearFilter(active.academicYearKey);
      })
      .catch(() => {});
    apiFetch("/api/SchoolClass")
      .then((c: SchoolClass[]) => setClasses(c))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setSectionFilter("all");
    setSections([]);
    if (classFilter === "all" || !yearFilter) return;
    apiFetch(`/api/Section?schoolClassId=${classFilter}&academicYearId=${yearFilter}`)
      .then((s: Section[]) => setSections(s))
      .catch(() => {});
  }, [classFilter, yearFilter]);

  const classOptions = classes.map((c) => ({ label: c.className, value: c.schoolClassKey }));

  return (
    <div>
      <PageHeader
        title="Classic Reports"
        breadcrumbs={[{ label: "Reports", to: "/reports" }, { label: "Classic Reports" }]}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-3 shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Scope
        </span>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="h-9 w-[160px] rounded-md">
            <SelectValue placeholder="Academic Year" />
          </SelectTrigger>
          <SelectContent>
            {academicYears.map((y) => (
              <SelectItem key={y.academicYearKey} value={y.academicYearKey}>
                {y.yearName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="h-9 w-[150px] rounded-md">
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classOptions.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sectionFilter}
          onValueChange={setSectionFilter}
          disabled={classFilter === "all"}
        >
          <SelectTrigger className="h-9 w-[150px] rounded-md">
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {sections.map((s) => (
              <SelectItem key={s.sectionKey} value={s.sectionKey}>
                {s.sectionLabel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          Applies to reports below that support class/section filtering.
        </span>
      </div>

      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="attendance" className="gap-1.5">
            <CalendarCheck className="h-3.5 w-3.5" /> Attendance
          </TabsTrigger>
          <TabsTrigger value="fee-collection" className="gap-1.5">
            <Wallet className="h-3.5 w-3.5" /> Fee Collection
          </TabsTrigger>
          <TabsTrigger value="fee-outstanding" className="gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" /> Fee Outstanding
          </TabsTrigger>
          <TabsTrigger value="exam" className="gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" /> Exam Performance
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Student Master
          </TabsTrigger>
          <TabsTrigger value="builder" className="gap-1.5">
            <Wrench className="h-3.5 w-3.5" /> Ad-hoc Builder
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance">
          <AttendanceReport
            academicYearKey={yearFilter}
            classKey={classFilter}
            sectionKey={sectionFilter}
          />
        </TabsContent>
        <TabsContent value="fee-collection">
          <FeeCollectionReport />
        </TabsContent>
        <TabsContent value="fee-outstanding">
          <FeeOutstandingReport academicYearKey={yearFilter} classKey={classFilter} />
        </TabsContent>
        <TabsContent value="exam">
          <ExamPerformanceReport academicYearKey={yearFilter} classKey={classFilter} />
        </TabsContent>
        <TabsContent value="students">
          <StudentMasterReport
            academicYearKey={yearFilter}
            classKey={classFilter}
            sectionKey={sectionFilter}
          />
        </TabsContent>
        <TabsContent value="builder">
          <AdHocReportBuilder
            academicYearKey={yearFilter}
            classKey={classFilter}
            sectionKey={sectionFilter}
          />
        </TabsContent>
      </Tabs>

      <div className="mt-6">
        <AdmissionFunnelReport academicYearKey={yearFilter} />
      </div>
    </div>
  );
}

function AttendanceReport({
  academicYearKey,
  classKey,
  sectionKey,
}: {
  academicYearKey: string;
  classKey: string;
  sectionKey: string;
}) {
  const [fromDate, setFromDate] = useState(firstOfMonthIso());
  const [toDate, setToDate] = useState(todayIso());
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    if (!academicYearKey) return;
    setLoading(true);
    const params = new URLSearchParams({ academicYearId: academicYearKey, fromDate, toDate });
    if (classKey !== "all") params.set("classId", classKey);
    if (sectionKey !== "all") params.set("sectionId", sectionKey);
    apiFetch(`/api/Report/attendance-summary?${params.toString()}`)
      .then((d: AttendanceRow[]) => setRows(d))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load attendance summary"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, [academicYearKey, classKey, sectionKey, fromDate, toDate]);

  const columns: Column<AttendanceRow>[] = [
    { key: "admissionNumber", header: "Adm No.", sortable: true },
    { key: "studentName", header: "Student", sortable: true },
    {
      key: "className",
      header: "Class",
      accessor: (r) => `${r.className ?? "—"}${r.sectionLabel ? ` · ${r.sectionLabel}` : ""}`,
    },
    { key: "rollNumber", header: "Roll" },
    { key: "totalMarkedDays", header: "Marked Days", sortable: true },
    { key: "presentDays", header: "Present" },
    { key: "absentDays", header: "Absent" },
    { key: "lateDays", header: "Late" },
    {
      key: "attendancePercent",
      header: "Attendance %",
      sortable: true,
      accessor: (r) => (
        <Badge
          className={`rounded-md border-0 ${r.attendancePercent < 75 ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"}`}
        >
          {r.attendancePercent}%
        </Badge>
      ),
    },
  ];

  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(r) => r.studentKey}
      searchPlaceholder="Search students..."
      emptyMessage={loading ? "Loading..." : "No attendance records in this range."}
      toolbar={
        <>
          <DatePicker
            value={fromDate}
            max={toDate}
            onChange={setFromDate}
            className="w-[150px]"
            placeholder="From"
          />
          <DatePicker
            value={toDate}
            min={fromDate}
            onChange={setToDate}
            className="w-[150px]"
            placeholder="To"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-md"
            onClick={() =>
              exportToCsv(
                "attendance-summary.csv",
                columns.map((c) => ({ key: c.key, header: c.header })),
                rows as unknown as Record<string, unknown>[],
              )
            }
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </>
      }
    />
  );
}

function FeeCollectionReport() {
  const formatDate = useFormatDate();
  const [fromDate, setFromDate] = useState(firstOfMonthIso());
  const [toDate, setToDate] = useState(todayIso());
  const [rows, setRows] = useState<FeeReceiptRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch(`/api/Fee/receipts?fromDate=${fromDate}&toDate=${toDate}`)
      .then((d: FeeReceiptRow[]) => setRows(d.filter((r) => r.status === "ACTIVE")))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load fee collection"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, [fromDate, toDate]);

  const totalCollected = rows.reduce((sum, r) => sum + r.totalAmount, 0);
  const byMode = Object.entries(
    rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.paymentMode] = (acc[r.paymentMode] ?? 0) + r.totalAmount;
      return acc;
    }, {}),
  );

  const columns: Column<FeeReceiptRow>[] = [
    { key: "receiptNumber", header: "Receipt No.", sortable: true },
    {
      key: "receiptDate",
      header: "Date",
      sortable: true,
      accessor: (r) => formatDate(r.receiptDate),
    },
    { key: "admissionNumber", header: "Adm No." },
    { key: "studentName", header: "Student", sortable: true },
    { key: "paymentMode", header: "Mode" },
    {
      key: "totalAmount",
      header: "Amount",
      sortable: true,
      accessor: (r) => `₹${r.totalAmount.toLocaleString("en-IN")}`,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-md border border-border bg-card p-4 shadow-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Total Collected
          </div>
          <div className="text-xl font-bold text-foreground">
            ₹{totalCollected.toLocaleString("en-IN")}
          </div>
        </div>
        {byMode.map(([mode, amt]) => (
          <div key={mode}>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {mode}
            </div>
            <div className="text-lg font-semibold text-foreground">
              ₹{amt.toLocaleString("en-IN")}
            </div>
          </div>
        ))}
      </div>
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.feeReceiptKey}
        searchPlaceholder="Search receipts..."
        emptyMessage={loading ? "Loading..." : "No fee collection in this range."}
        toolbar={
          <>
            <DatePicker
              value={fromDate}
              max={toDate}
              onChange={setFromDate}
              className="w-[150px]"
              placeholder="From"
            />
            <DatePicker
              value={toDate}
              min={fromDate}
              onChange={setToDate}
              className="w-[150px]"
              placeholder="To"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-md"
              onClick={() =>
                exportToCsv(
                  "fee-collection.csv",
                  columns.map((c) => ({ key: c.key, header: c.header })),
                  rows as unknown as Record<string, unknown>[],
                )
              }
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </>
        }
      />
    </div>
  );
}

function FeeOutstandingReport({
  academicYearKey,
  classKey,
}: {
  academicYearKey: string;
  classKey: string;
}) {
  const formatDate = useFormatDate();
  const [rows, setRows] = useState<FeeOutstandingRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    if (!academicYearKey) return;
    setLoading(true);
    const params = new URLSearchParams({ academicYearId: academicYearKey });
    if (classKey !== "all") params.set("classId", classKey);
    apiFetch(`/api/Fee/outstanding?${params.toString()}`)
      .then((d: FeeOutstandingRow[]) => setRows(d))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load outstanding report"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, [academicYearKey, classKey]);

  const totalOutstanding = rows.reduce((sum, r) => sum + r.outstanding, 0);

  const columns: Column<FeeOutstandingRow>[] = [
    { key: "admissionNumber", header: "Adm No." },
    { key: "studentName", header: "Student", sortable: true },
    {
      key: "className",
      header: "Class",
      accessor: (r) => `${r.className ?? "—"}${r.sectionLabel ? ` · ${r.sectionLabel}` : ""}`,
    },
    {
      key: "totalBilled",
      header: "Billed",
      accessor: (r) => `₹${r.totalBilled.toLocaleString("en-IN")}`,
    },
    {
      key: "totalPaid",
      header: "Paid",
      accessor: (r) => `₹${r.totalPaid.toLocaleString("en-IN")}`,
    },
    {
      key: "outstanding",
      header: "Outstanding",
      sortable: true,
      accessor: (r) => (
        <span className="font-semibold text-destructive">
          ₹{r.outstanding.toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "oldestDueDate",
      header: "Oldest Due",
      accessor: (r) => (r.oldestDueDate ? formatDate(r.oldestDueDate) : "—"),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-card p-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Total Outstanding
        </div>
        <div className="text-xl font-bold text-destructive">
          ₹{totalOutstanding.toLocaleString("en-IN")}
        </div>
      </div>
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.studentKey}
        searchPlaceholder="Search students..."
        emptyMessage={loading ? "Loading..." : "No outstanding dues."}
        toolbar={
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-md"
            onClick={() =>
              exportToCsv(
                "fee-outstanding.csv",
                columns.map((c) => ({ key: c.key, header: c.header })),
                rows as unknown as Record<string, unknown>[],
              )
            }
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        }
      />
    </div>
  );
}

function ExamPerformanceReport({
  academicYearKey,
  classKey,
}: {
  academicYearKey: string;
  classKey: string;
}) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [examKey, setExamKey] = useState("");
  const [rows, setRows] = useState<ExamResultRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!academicYearKey) return;
    const params = new URLSearchParams({ academicYearId: academicYearKey });
    if (classKey !== "all") params.set("classId", classKey);
    apiFetch(`/api/Exam?${params.toString()}`)
      .then((e: Exam[]) => {
        setExams(e);
        setExamKey(e.find((x) => x.status === "PUBLISHED")?.examKey ?? e[0]?.examKey ?? "");
      })
      .catch(() => {});
  }, [academicYearKey, classKey]);

  const load = () => {
    if (!examKey) {
      setRows([]);
      return;
    }
    setLoading(true);
    apiFetch(`/api/Exam/${examKey}/results`)
      .then((d: ExamResultRow[]) => setRows(d))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load exam results"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, [examKey]);

  const columns: Column<ExamResultRow>[] = [
    { key: "classRank", header: "Rank", sortable: true },
    { key: "admissionNumber", header: "Adm No." },
    { key: "studentName", header: "Student", sortable: true },
    {
      key: "totalObtained",
      header: "Marks",
      accessor: (r) => `${r.totalObtained} / ${r.totalMaxMarks}`,
    },
    { key: "percentage", header: "%", sortable: true, accessor: (r) => `${r.percentage}%` },
    { key: "overallGrade", header: "Grade" },
    {
      key: "resultStatus",
      header: "Result",
      accessor: (r) => (
        <Badge
          className={`rounded-md border-0 ${r.resultStatus === "PASS" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}
        >
          {r.resultStatus}
        </Badge>
      ),
    },
  ];

  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(r) => r.examResultKey}
      searchPlaceholder="Search students..."
      emptyMessage={loading ? "Loading..." : "No published results for this exam."}
      toolbar={
        <>
          <Select value={examKey} onValueChange={setExamKey}>
            <SelectTrigger className="h-9 w-[220px] rounded-md">
              <SelectValue placeholder="Select exam" />
            </SelectTrigger>
            <SelectContent>
              {exams.map((e) => (
                <SelectItem key={e.examKey} value={e.examKey}>
                  {e.examName} ({e.className})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-md"
            onClick={() =>
              exportToCsv(
                "exam-performance.csv",
                columns.map((c) => ({ key: c.key, header: c.header })),
                rows as unknown as Record<string, unknown>[],
              )
            }
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </>
      }
    />
  );
}

function StudentMasterReport({
  academicYearKey,
  classKey,
  sectionKey,
}: {
  academicYearKey: string;
  classKey: string;
  sectionKey: string;
}) {
  const [rows, setRows] = useState<StudentMasterRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (academicYearKey) params.set("academicYearId", academicYearKey);
    if (classKey !== "all") params.set("classId", classKey);
    if (sectionKey !== "all") params.set("sectionId", sectionKey);
    apiFetch(`/api/Student?${params.toString()}`)
      .then((d: StudentMasterRow[]) => setRows(d))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load student roll"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, [academicYearKey, classKey, sectionKey]);

  const columns: Column<StudentMasterRow>[] = [
    { key: "admissionNumber", header: "Adm No." },
    { key: "studentName", header: "Student", sortable: true },
    { key: "gender", header: "Gender" },
    {
      key: "className",
      header: "Class",
      accessor: (r) => `${r.className ?? "—"}${r.sectionLabel ? ` · ${r.sectionLabel}` : ""}`,
    },
    { key: "rollNumber", header: "Roll" },
    { key: "communityCategory", header: "Community" },
    { key: "rteStatus", header: "RTE", accessor: (r) => (r.rteStatus ? "Yes" : "—") },
    {
      key: "economicallyWeakerSection",
      header: "EWS",
      accessor: (r) => (r.economicallyWeakerSection ? "Yes" : "—"),
    },
    {
      key: "disabilityCategory",
      header: "Disability",
      accessor: (r) => (r.disabilityCategory === "NONE" ? "—" : r.disabilityCategory),
    },
    { key: "primaryGuardianName", header: "Guardian" },
    { key: "primaryGuardianMobile", header: "Mobile" },
  ];

  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(r) => r.studentKey}
      searchPlaceholder="Search students..."
      emptyMessage={loading ? "Loading..." : "No students found."}
      toolbar={
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 rounded-md"
          onClick={() =>
            exportToCsv(
              "student-master.csv",
              columns.map((c) => ({ key: c.key, header: c.header })),
              rows as unknown as Record<string, unknown>[],
            )
          }
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      }
    />
  );
}

function AdmissionFunnelReport({ academicYearKey }: { academicYearKey: string }) {
  const [counts, setCounts] = useState<FunnelCounts | null>(null);
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    if (!academicYearKey) return;
    setLoading(true);
    apiFetch(`/api/Report/admission-funnel?academicYearId=${academicYearKey}`)
      .then((d: { counts: FunnelCounts; stages: FunnelStage[] }) => {
        setCounts(d.counts);
        setStages(d.stages);
      })
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load admission funnel"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, [academicYearKey]);

  const conversionPercent =
    counts && counts.totalInquiries > 0
      ? Math.round((counts.totalEnrolled / counts.totalInquiries) * 1000) / 10
      : 0;

  return (
    <div className="rounded-md border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <FunnelPlus className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-display text-base font-semibold">Admission Funnel</h3>
      </div>
      {!counts ? (
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading..." : "No data for this academic year."}
        </p>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
            {[
              { label: "Inquiries", value: counts.totalInquiries },
              { label: "Applications", value: counts.totalApplications },
              { label: "Selected", value: counts.totalSelected },
              { label: "Waitlisted", value: counts.totalWaitlisted },
              { label: "Enrolled", value: counts.totalEnrolled },
            ].map((s) => (
              <div key={s.label} className="rounded-md border border-border p-3 text-center">
                <div className="text-2xl font-bold text-foreground">{s.value}</div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Inquiry → Enrollment conversion:{" "}
            <span className="font-semibold text-foreground">{conversionPercent}%</span>
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["INQUIRY", "APPLICATION"] as const).map((stage) => (
              <div key={stage} className="rounded-md border border-border p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {stage === "INQUIRY"
                    ? "Inquiry Status Breakdown"
                    : "Application Status Breakdown"}
                </div>
                <div className="space-y-1.5">
                  {stages
                    .filter((s) => s.stage === stage)
                    .map((s) => (
                      <div key={s.status} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{s.status.replace(/_/g, " ")}</span>
                        <span className="font-medium text-foreground">{s.recordCount}</span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
