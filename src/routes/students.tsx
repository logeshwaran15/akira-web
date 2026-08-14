import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, History, Loader2, Upload, Users } from "lucide-react";
import { apiFetch, apiUpload, API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";
import { StudentAvatar } from "@/components/erp/StudentAvatar";

export const Route = createFileRoute("/students")({
  head: () => ({
    meta: [
      { title: "Students — Akira School ERP" },
      {
        name: "description",
        content: "The permanent student directory — identity, current enrollment, and guardians.",
      },
    ],
  }),
  component: StudentsPage,
});

type Student = {
  studentKey: string;
  admissionNumber: string;
  admissionDate: string;
  studentName: string;
  gender: string | null;
  dateOfBirth: string;
  bloodGroup: string | null;
  photoUrl: string | null;
  studentStatus: string;
  communityCategory: string | null;
  rteStatus: boolean;
  minorityStatus: boolean;
  economicallyWeakerSection: boolean;
  disabilityCategory: string;
  academicYearName: string | null;
  className: string | null;
  sectionLabel: string | null;
  rollNumber: string | null;
  primaryGuardianName: string | null;
  primaryGuardianMobile: string | null;
};

type SchoolClass = { schoolClassKey: string; className: string };

type BulkImportRowResult = {
  rowNumber: number;
  studentName: string;
  success: boolean;
  message: string | null;
  admissionNumber: string | null;
};
type BulkImportSummary = {
  totalRows: number;
  successCount: number;
  failureCount: number;
  rows: BulkImportRowResult[];
};

const STATUS_STYLES: Record<string, string> = {
  ENROLLED: "bg-success/15 text-success",
  PROMOTED: "bg-info/15 text-info",
  PASSED_OUT: "bg-[oklch(0.55_0.1_200)]/15 text-[oklch(0.4_0.12_200)]",
  TRANSFERRED_OUT: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  DROPPED: "bg-destructive/15 text-destructive",
  DECEASED: "bg-muted text-muted-foreground",
};

function StudentsPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ENROLLED");
  const [classFilter, setClassFilter] = useState<string>("all");

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<BulkImportSummary | null>(null);
  const [templateDownloading, setTemplateDownloading] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (classFilter !== "all") params.set("classId", classFilter);
    apiFetch(`/api/Student?${params.toString()}`)
      .then((d: Student[]) => setStudents(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load students"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter, classFilter]);

  useEffect(() => {
    apiFetch("/api/SchoolClass")
      .then((c: SchoolClass[]) => setClasses(c))
      .catch(() => {});
  }, []);

  const downloadTemplate = async () => {
    setTemplateDownloading(true);
    try {
      const token = localStorage.getItem("akira_token");
      const res = await fetch(`${API_BASE_URL}/api/Student/bulk-import/template`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to download template");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "student-bulk-import-template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download template");
    } finally {
      setTemplateDownloading(false);
    }
  };

  const uploadImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Only .xlsx files are supported.");
      return;
    }
    setImporting(true);
    setImportSummary(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const summary: BulkImportSummary = await apiUpload("/api/Student/bulk-import", formData);
      setImportSummary(summary);
      if (summary.successCount > 0) {
        toast.success(`Imported ${summary.successCount} of ${summary.totalRows} students`);
        load();
      } else {
        toast.error("No students were imported — check the errors below.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const columns: Column<Student>[] = [
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
        <div className="flex items-center gap-2.5">
          <StudentAvatar
            photoUrl={r.photoUrl}
            gender={r.gender}
            studentName={r.studentName}
            className="h-8 w-8"
          />
          <div>
            <div className="font-medium">{r.studentName}</div>
            <div className="text-xs text-muted-foreground">
              {r.dateOfBirth?.slice(0, 10)} · {r.gender ?? "—"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "className",
      header: "Class",
      sortable: true,
      accessor: (r) => (
        <div>
          <div className="text-sm">
            {r.className ?? "—"}
            {r.sectionLabel ? ` · ${r.sectionLabel}` : ""}
          </div>
          <div className="text-xs text-muted-foreground">
            {r.academicYearName ?? "—"}
            {r.rollNumber ? ` · Roll ${r.rollNumber}` : ""}
          </div>
        </div>
      ),
    },
    {
      key: "primaryGuardianName",
      header: "Primary Guardian",
      accessor: (r) =>
        r.primaryGuardianName ? (
          <div>
            <div className="text-sm">{r.primaryGuardianName}</div>
            <div className="font-mono text-xs text-muted-foreground">
              {r.primaryGuardianMobile ?? ""}
            </div>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: "flags",
      header: "Flags",
      accessor: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.communityCategory && (
            <Badge className="rounded-md border-0 bg-[oklch(0.55_0.1_200)]/15 px-1.5 py-0 text-[10px] font-medium text-[oklch(0.4_0.12_200)]">
              {r.communityCategory}
            </Badge>
          )}
          {r.rteStatus && (
            <Badge className="rounded-md border-0 bg-[oklch(0.75_0.17_300)]/15 px-1.5 py-0 text-[10px] font-medium text-[oklch(0.55_0.2_300)]">
              RTE
            </Badge>
          )}
          {r.economicallyWeakerSection && (
            <Badge className="rounded-md border-0 bg-info/15 px-1.5 py-0 text-[10px] font-medium text-info">
              EWS
            </Badge>
          )}
          {r.disabilityCategory !== "NONE" && (
            <Badge className="rounded-md border-0 bg-warning/25 px-1.5 py-0 text-[10px] font-medium text-[oklch(0.45_0.12_65)]">
              {r.disabilityCategory}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "studentStatus",
      header: "Status",
      sortable: true,
      accessor: (r) => (
        <Badge
          className={cn(
            "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
            STATUS_STYLES[r.studentStatus],
          )}
        >
          {r.studentStatus.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (r) => (
        <Button
          size="sm"
          className="h-8 gap-1.5 rounded-md"
          onClick={() => navigate({ to: "/student-life-development", search: { sid: r.studentKey } })}
        >
          <History className="h-3.5 w-3.5" /> Full History View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Students"
        breadcrumbs={[{ label: "Academics" }, { label: "Students" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-10 gap-1.5 rounded-md"
              onClick={() => { setImportOpen(true); setImportSummary(null); }}
            >
              <Upload className="h-3.5 w-3.5" /> Bulk Import
            </Button>
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-40 rounded-md">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ENROLLED">Enrolled</SelectItem>
                <SelectItem value="PROMOTED">Promoted</SelectItem>
                <SelectItem value="TRANSFERRED_OUT">Transferred Out</SelectItem>
                <SelectItem value="DROPPED">Dropped</SelectItem>
                <SelectItem value="PASSED_OUT">Passed Out</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <DataTable
        data={students}
        columns={columns}
        rowKey={(r) => r.studentKey}
        selectable
        storageKey="students-directory"
        searchPlaceholder="Search by name, admission number, or guardian..."
        searchFields={(r) => `${r.studentName} ${r.admissionNumber} ${r.primaryGuardianName ?? ""}`}
        dateField={(r) => r.admissionDate}
        dateFilterLabel="Admission Date"
        emptyMessage={
          loading
            ? "Loading students..."
            : "No students found. Students are created from a confirmed admission application."
        }
      />

      {!loading && students.length === 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          <Users className="h-5 w-5 shrink-0" />
          Student records are created by enrolling a confirmed (ENROLLED) admission application —
          see Admissions → Applications.
        </div>
      )}

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-2xl rounded-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Bulk Import Students</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Download the template, fill in one row per student (Academic Year, Board, Class and Section must
              match names already configured in Academics), then upload it here.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 gap-1.5 rounded-md"
                disabled={templateDownloading}
                onClick={downloadTemplate}
              >
                {templateDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Download Template
              </Button>

              <Label
                htmlFor="bulk-import-file"
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {importing ? "Importing..." : "Upload & Import"}
              </Label>
              <input
                id="bulk-import-file"
                type="file"
                accept=".xlsx"
                className="hidden"
                disabled={importing}
                onChange={uploadImportFile}
              />
            </div>

            {importSummary && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Badge className="rounded-md border-0 bg-success/15 px-2 py-0.5 text-success">
                    {importSummary.successCount} created
                  </Badge>
                  {importSummary.failureCount > 0 && (
                    <Badge className="rounded-md border-0 bg-destructive/15 px-2 py-0.5 text-destructive">
                      {importSummary.failureCount} failed
                    </Badge>
                  )}
                  <span className="text-muted-foreground">of {importSummary.totalRows} rows</span>
                </div>
                <div className="max-h-64 overflow-y-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2">Row</th>
                        <th className="px-3 py-2">Student</th>
                        <th className="px-3 py-2">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importSummary.rows.map((r) => (
                        <tr key={r.rowNumber} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 text-muted-foreground">{r.rowNumber}</td>
                          <td className="px-3 py-2 font-medium">{r.studentName}</td>
                          <td className={cn("px-3 py-2", r.success ? "text-success" : "text-destructive")}>
                            {r.success ? `Created — ${r.admissionNumber}` : r.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
