import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { InfoAlert } from "@/components/erp/InfoAlert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet } from "lucide-react";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/emis-export")({
  head: () => ({
    meta: [
      { title: "EMIS Compliance Export — Akira School ERP" },
      {
        name: "description",
        content: "Generate monthly attendance statistics for EMIS government submission.",
      },
    ],
  }),
  component: EmisExportPage,
});

type AcademicYear = { academicYearKey: string; yearName: string; status: string };

type ValidationRow = {
  schoolClassKey: string;
  className: string;
  expectedWorkingDays: number;
  submittedDays: number;
  isComplete: boolean;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function EmisExportPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearKey, setYearKey] = useState("");

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const [validation, setValidation] = useState<ValidationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

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
    apiFetch(
      `/api/StudentAttendance/emis/validation?academicYearId=${yearKey}&year=${selectedYear}&month=${selectedMonth}`,
    )
      .then((d: ValidationRow[]) => setValidation(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load validation"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [yearKey, selectedYear, selectedMonth]);

  const incompleteClasses = validation.filter((v) => !v.isComplete);
  const canExport = validation.length > 0 && incompleteClasses.length === 0;

  const generateExport = async () => {
    if (!yearKey || !canExport) return;
    setExporting(true);
    try {
      const token = localStorage.getItem("akira_token");
      const params = new URLSearchParams({
        academicYearId: yearKey,
        year: String(selectedYear),
        month: String(selectedMonth),
      });
      const res = await fetch(
        `${API_BASE_URL}/api/StudentAttendance/emis/export?${params.toString()}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || `Export failed with status ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `emis-attendance-${selectedYear}-${String(selectedMonth).padStart(2, "0")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("EMIS export generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate export");
    } finally {
      setExporting(false);
    }
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div>
      <PageHeader
        title="EMIS Compliance Export"
        breadcrumbs={[{ label: "Attendance" }, { label: "EMIS Export" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger className="h-10 w-40 rounded-md">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((m, idx) => (
                  <SelectItem key={m} value={String(idx + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="h-10 w-28 rounded-md">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-10 gap-1.5 rounded-md"
              onClick={generateExport}
              disabled={!canExport || exporting || loading}
              title={!canExport ? "Every class must have complete attendance for this month first" : undefined}
            >
              <Download className="h-3.5 w-3.5" />
              {exporting ? "Generating..." : "Generate Export"}
            </Button>
          </div>
        }
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Checking attendance completeness...</p>
      ) : validation.length === 0 ? (
        <InfoAlert tone="info" title="No classes found">
          There are no active classes to validate for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.
        </InfoAlert>
      ) : incompleteClasses.length > 0 ? (
        <InfoAlert tone="warning" title={`${incompleteClasses.length} class(es) have incomplete attendance`}>
          Export is blocked until every class has attendance marked for all working days in{" "}
          {MONTH_NAMES[selectedMonth - 1]} {selectedYear}. Complete the gaps below, then return here.
        </InfoAlert>
      ) : (
        <InfoAlert tone="success" title="All classes complete — ready to export">
          Every active class has full attendance for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.
        </InfoAlert>
      )}

      <div className="mt-4 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm font-semibold">
            Pre-Export Validation — {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class</TableHead>
              <TableHead>Expected Working Days</TableHead>
              <TableHead>Days Submitted</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validation.map((v) => (
              <TableRow key={v.schoolClassKey}>
                <TableCell className="text-sm font-medium">{v.className}</TableCell>
                <TableCell className="text-muted-foreground">{v.expectedWorkingDays}</TableCell>
                <TableCell className={cn(!v.isComplete && "font-medium text-destructive")}>
                  {v.submittedDays}
                </TableCell>
                <TableCell>
                  {v.isComplete ? (
                    <Badge className="gap-1 rounded-md border-0 bg-success/15 text-success">
                      <CheckCircle2 className="h-3 w-3" /> Complete
                    </Badge>
                  ) : (
                    <Badge className="gap-1 rounded-md border-0 bg-destructive/15 text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      Missing {v.expectedWorkingDays - v.submittedDays} day(s)
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
