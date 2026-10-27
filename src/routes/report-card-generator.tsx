import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Download, Eye, AlertTriangle, CheckCircle2, Loader2, Printer, GraduationCap, FileText,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { useFormatDate } from "@/hooks/use-tenant-setting";
import { cn } from "@/lib/utils";

// Grade badge colors, hashed roughly by first letter so higher grades read
// as more positive (A -> green, B -> blue, C/D -> amber, E/F -> red) without
// needing a lookup table tied to any specific grading scheme's labels.
function gradeBadgeClass(grade: string) {
  const first = grade.trim().charAt(0).toUpperCase();
  if (first === "A") return "bg-[#DDF5E7] text-[#166534]";
  if (first === "B") return "bg-[#EEF5FC] text-[#0B2A55]";
  if (first === "C" || first === "D") return "bg-[#FFF3E8] text-[#9A4A00]";
  return "bg-[#FDE8E8] text-[#B91C1C]";
}

export const Route = createFileRoute("/report-card-generator")({
  head: () => ({
    meta: [
      { title: "Report Card Generator — Akira School ERP" },
      { name: "description", content: "Generate and print per-student report cards from processed exam results." },
    ],
  }),
  component: ReportCardGeneratorPage,
});

type ExamType = { examTypeKey: string; examTypeName: string };
type SchoolClass = { schoolClassKey: string; className: string };

type ReadinessRow = {
  studentKey: string;
  studentName: string;
  rollNumber: string;
  subjectsConfigured: number;
  subjectsProcessed: number;
  isReady: boolean;
};

type SubjectRow = {
  subjectName: string;
  totalMarks: number | null;
  maxMarks: number;
  percentage: number | null;
  gradeLabel: string | null;
  isPass: boolean;
  isAbsent: boolean;
};

type ReportCard = {
  studentKey: string;
  studentName: string;
  admissionNumber: string;
  rollNumber: string;
  className: string;
  examTypeName: string;
  schoolName: string;
  subjects: SubjectRow[];
  totalMarksObtained: number;
  totalMaxMarks: number;
  overallPercentage: number | null;
  overallPass: boolean;
  subjectsFailed: number;
  rank: number | null;
  rankOutOf: number;
};

// --- Report card document sub-components -----------------------------------
// Presentational only; every value comes from the ReportCard the caller
// already fetched via GET /api/ReportCard. Nothing here fabricates data --
// fields the API doesn't provide (photo, parents, remarks, signatures) are
// either omitted or shown as an unfilled placeholder line, never invented text.

function ReportCardHeader({ card, formatDate }: { card: ReportCard; formatDate: (d: string) => string }) {
  return (
    <div className="relative overflow-hidden">
      {/* School identity row */}
      <div className="flex items-center justify-between gap-3 border-b border-[#D7E1EC] bg-white px-5 py-4 sm:px-9">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#EEF5FC] text-[#0B2A55]">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-bold leading-tight text-[#102A43] sm:text-xl">{card.schoolName}</div>
          </div>
        </div>
        <div className="hidden shrink-0 text-right text-xs text-[#64748B] sm:block">
          <div className="font-semibold uppercase tracking-wide text-[#102A43]">{card.className}</div>
          <div className="mt-0.5">{formatDate(new Date().toISOString())}</div>
        </div>
      </div>

      {/* Hero banner: navy with an orange diagonal accent */}
      <div className="relative overflow-hidden bg-[#08203F] px-5 py-7 text-white sm:px-9 sm:py-9">
        {/* Decorative orange diagonal accent, print-safe (no gradients that vanish when printed) */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-40 bg-[#FF7A00] opacity-90 sm:block"
          style={{ clipPath: "polygon(45% 0, 100% 0, 100% 100%, 15% 100%)" }}
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1 bg-[#08203F] sm:block" style={{ right: "9.5rem" }} />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[32px] font-extrabold uppercase leading-none tracking-wide sm:text-[40px]">Report Card</div>
            <div className="mt-2.5 text-[11px] uppercase tracking-[0.2em] text-white/60">Academic Performance Record</div>
          </div>
          <div className="relative z-10 rounded-md bg-white/10 px-4 py-2.5 text-left backdrop-blur-sm sm:bg-transparent sm:text-right">
            <div className="text-sm font-semibold leading-tight">{card.examTypeName}</div>
            <div className="mt-0.5 text-[11px] text-white/80 sm:hidden">{formatDate(new Date().toISOString())}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentInformation({ card }: { card: ReportCard }) {
  const fields: { label: string; value: string }[] = [
    { label: "Student Name", value: card.studentName },
    { label: "Admission No", value: card.admissionNumber },
    { label: "Roll No", value: card.rollNumber },
    { label: "Class", value: card.className },
  ];

  return (
    <div className="flex gap-4 border-b border-[#D7E1EC] px-5 py-6 sm:px-9">
      {/* Photo not available from the API -- tasteful icon placeholder instead of fabricating one. */}
      <div className="hidden h-[104px] w-[92px] shrink-0 items-center justify-center rounded-[12px] bg-[#EEF5FC] text-[#0B2A55]/50 sm:flex">
        <GraduationCap className="h-9 w-9" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">Student Information</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          {fields.map((f) => (
            <div key={f.label}>
              <div className="text-[10px] uppercase tracking-wide text-[#64748B]">{f.label}</div>
              <div className="mt-0.5 truncate text-sm font-semibold text-[#102A43]">{f.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AcademicPerformanceTable({ card }: { card: ReportCard }) {
  return (
    <div className="border-b border-[#D7E1EC] px-5 py-6 sm:px-9">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">Academic Performance</div>
      <div className="overflow-x-auto rounded-md border border-[#D7E1EC]">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr className="bg-[#0B2A55] text-white">
              <th className="w-10 py-2.5 pl-3 pr-2 text-left text-[10px] font-semibold uppercase tracking-wide">#</th>
              <th className="py-2.5 pr-3 text-left text-[10px] font-semibold uppercase tracking-wide">Subject</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide">Marks</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide">Grade</th>
              <th className="py-2.5 pl-3 pr-3 text-center text-[10px] font-semibold uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {card.subjects.map((s, i) => (
              <tr key={i} className={cn("border-b border-[#D7E1EC] last:border-0", i % 2 === 1 && "bg-[#F7FAFD]")}>
                <td className="py-3 pl-3 pr-2 text-[#64748B]">{i + 1}</td>
                <td className="py-3 pr-3 font-medium text-[#102A43]">{s.subjectName}</td>
                <td className="px-3 py-3 text-right tabular-nums text-[#102A43]">{s.isAbsent ? "—" : `${s.totalMarks} / ${s.maxMarks}`}</td>
                <td className="px-3 py-3 text-center">
                  {s.isAbsent ? (
                    <span className="text-[#94A3B8]">—</span>
                  ) : s.gradeLabel ? (
                    <span className={cn("inline-block rounded px-2 py-0.5 text-[11px] font-semibold", gradeBadgeClass(s.gradeLabel))}>{s.gradeLabel}</span>
                  ) : (
                    <span className="text-[#94A3B8]">—</span>
                  )}
                </td>
                <td className="py-3 pl-3 pr-3 text-center">
                  {s.isAbsent ? (
                    <span className="inline-block rounded bg-[#FDE8E8] px-2 py-0.5 text-[11px] font-semibold text-[#B91C1C]">Absent</span>
                  ) : s.isPass ? (
                    <span className="inline-block rounded bg-[#DDF5E7] px-2 py-0.5 text-[11px] font-semibold text-[#166534]">Passed</span>
                  ) : (
                    <span className="inline-block rounded bg-[#FDE8E8] px-2 py-0.5 text-[11px] font-semibold text-[#B91C1C]">Failed</span>
                  )}
                </td>
              </tr>
            ))}
            {/* Total row -- visually stronger, computed from existing fields only */}
            <tr className="bg-[#EEF5FC] font-semibold text-[#102A43]">
              <td className="py-3 pl-3 pr-2" colSpan={2}>Total</td>
              <td className="px-3 py-3 text-right tabular-nums">{card.totalMarksObtained} / {card.totalMaxMarks}</td>
              <td className="px-3 py-3 text-center" colSpan={2}>
                {card.overallPercentage != null ? `${card.overallPercentage}%` : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PerformanceSummary({ card }: { card: ReportCard }) {
  const cells: { label: string; value: React.ReactNode }[] = [
    { label: "Total", value: `${card.totalMarksObtained} / ${card.totalMaxMarks}` },
    { label: "Percentage", value: card.overallPercentage != null ? `${card.overallPercentage}%` : "—" },
    { label: "Class Rank", value: card.rank != null ? `${String(card.rank).padStart(2, "0")} / ${card.rankOutOf}` : "—" },
    {
      label: "Result",
      value: (
        <span className={cn(
          "inline-block rounded px-2.5 py-0.5 text-xs font-semibold",
          card.overallPass ? "bg-[#DDF5E7] text-[#166534]" : "bg-[#FDE8E8] text-[#B91C1C]",
        )}>
          {card.overallPass ? "Passed" : "Failed"}
        </span>
      ),
    },
  ];

  return (
    <div className="border-b border-[#D7E1EC] px-5 py-6 sm:px-9">
      <div className="grid grid-cols-2 gap-3 rounded-md border border-[#D7E1EC] bg-[#F7FAFD] sm:grid-cols-4">
        {cells.map((c, i) => (
          <div
            key={c.label}
            className={cn(
              "px-4 py-4 text-center",
              i > 0 && "border-t border-[#D7E1EC] sm:border-t-0 sm:border-l",
            )}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">{c.label}</div>
            <div className="mt-1.5 text-lg font-bold text-[#102A43]">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultSummary({ card }: { card: ReportCard }) {
  const rows: { label: string; value: string }[] = [
    { label: "Overall Performance", value: card.overallPercentage != null ? `${card.overallPercentage}%` : "—" },
    { label: "Class Rank", value: card.rank != null ? `${String(card.rank).padStart(2, "0")} / ${card.rankOutOf}` : "—" },
    { label: "Subjects Failed", value: String(card.subjectsFailed) },
    { label: "Overall Result", value: card.overallPass ? "Passed" : "Failed" },
  ];

  return (
    <div className="border-b border-[#D7E1EC] px-5 py-6 sm:px-9">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">Result Summary</div>
      <div className="overflow-hidden rounded-md border border-[#D7E1EC]">
        {rows.map((r, i) => (
          <div
            key={r.label}
            className={cn(
              "flex items-center justify-between px-4 py-2.5 text-sm",
              i % 2 === 1 && "bg-[#F7FAFD]",
              i > 0 && "border-t border-[#D7E1EC]",
            )}
          >
            <span className="text-[#64748B]">{r.label}</span>
            <span className="font-semibold text-[#102A43]">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SignatureSection() {
  return (
    <div className="grid grid-cols-2 gap-8 px-5 pb-2 pt-10 sm:px-9">
      <div className="text-center">
        <div className="border-b border-[#102A43]/25 pb-10" />
        <div className="mt-2 text-xs font-medium text-[#64748B]">Class Teacher</div>
      </div>
      <div className="text-center">
        <div className="border-b border-[#102A43]/25 pb-10" />
        <div className="mt-2 text-xs font-medium text-[#64748B]">Principal</div>
      </div>
    </div>
  );
}

function ReportCardFooter({ card }: { card: ReportCard }) {
  return (
    <div className="flex flex-col items-center gap-2 border-t border-[#D7E1EC] px-5 py-5 text-center sm:px-9">
      <div className="flex items-center gap-2">
        <span className="h-3 w-0.5 bg-[#FF7A00]" />
        <span className="text-[11px] font-medium text-[#102A43]">Building Confident Learners for a Better Tomorrow</span>
      </div>
      <div className="text-[10px] uppercase tracking-wide text-[#94A3B8]">Report Card &bull; {card.examTypeName}</div>
    </div>
  );
}

function ReportCardGeneratorPage() {
  const formatDate = useFormatDate();
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [readiness, setReadiness] = useState<ReadinessRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [examTypeKey, setExamTypeKey] = useState("");
  const [classKey, setClassKey] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [previewStudent, setPreviewStudent] = useState<ReadinessRow | null>(null);
  const [previewCard, setPreviewCard] = useState<ReportCard | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const loadLookups = () => {
    Promise.all([
      apiFetch("/api/ExamType").catch(() => []),
      apiFetch("/api/SchoolClass").catch(() => []),
    ]).then(([et, sc]) => {
      setExamTypes(et);
      setClasses(sc);
      if (!examTypeKey && et.length > 0) setExamTypeKey(et[0].examTypeKey);
    });
  };

  useEffect(loadLookups, []);

  const loadReadiness = () => {
    if (!examTypeKey || !classKey) {
      setReadiness([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    apiFetch(`/api/ReportCard/readiness?examTypeId=${examTypeKey}&classId=${classKey}`)
      .then((d: ReadinessRow[]) => setReadiness(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load report card readiness"))
      .finally(() => setLoading(false));
  };

  useEffect(loadReadiness, [examTypeKey, classKey]);
  useEffect(() => setPage(1), [examTypeKey, classKey]);

  const readyCount = useMemo(() => readiness.filter((r) => r.isReady).length, [readiness]);
  const totalPages = Math.max(1, Math.ceil(readiness.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedReadiness = readiness.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openPreview = (row: ReadinessRow) => {
    setPreviewStudent(row);
    setPreviewCard(null);
    setPreviewLoading(true);
    apiFetch(`/api/ReportCard?examTypeId=${examTypeKey}&classId=${classKey}&studentId=${row.studentKey}`)
      .then((d: ReportCard) => setPreviewCard(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load report card"))
      .finally(() => setPreviewLoading(false));
  };

  const downloadPdf = async (row: ReadinessRow) => {
    setDownloadingKey(row.studentKey);
    try {
      const token = localStorage.getItem("akira_token");
      const res = await fetch(
        `${API_BASE_URL}/api/ReportCard/pdf?examTypeId=${examTypeKey}&classId=${classKey}&studentId=${row.studentKey}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ReportCard_${row.studentName.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download report card");
    } finally {
      setDownloadingKey(null);
    }
  };

  return (
    <div>
      <PageHeader title="Report Card Generator" />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={examTypeKey} onValueChange={setExamTypeKey}>
          <SelectTrigger className="h-9 w-full rounded-md sm:w-[200px]"><SelectValue placeholder="Select exam" /></SelectTrigger>
          <SelectContent>
            {examTypes.map((e) => <SelectItem key={e.examTypeKey} value={e.examTypeKey}>{e.examTypeName}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={classKey} onValueChange={setClassKey}>
          <SelectTrigger className="h-9 w-full rounded-md sm:w-[160px]"><SelectValue placeholder="Select class" /></SelectTrigger>
          <SelectContent>
            {classes.map((c: any) => <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>{c.className}</SelectItem>)}
          </SelectContent>
        </Select>
        {readiness.length > 0 && (
          <Badge className="rounded-md border-0 bg-info text-info-foreground font-semibold">
            {readyCount}/{readiness.length} ready
          </Badge>
        )}
      </div>

      {!examTypeKey || !classKey ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Select an exam and class to view report card readiness.
        </div>
      ) : loading ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Loading...</div>
      ) : readiness.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No enrolled students found for this class.
        </div>
      ) : (
        <div className="rounded-md border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Roll</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Subjects Processed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedReadiness.map((r) => (
                  <TableRow key={r.studentKey}>
                    <TableCell className="text-muted-foreground">{r.rollNumber}</TableCell>
                    <TableCell className="font-medium">{r.studentName}</TableCell>
                    <TableCell>{r.subjectsProcessed} / {r.subjectsConfigured}</TableCell>
                    <TableCell>
                      {r.isReady ? (
                        <Badge className="gap-1 rounded-md border-0 bg-success text-success-foreground font-semibold">
                          <CheckCircle2 className="h-3 w-3" /> Ready
                        </Badge>
                      ) : (
                        <Badge className="gap-1 rounded-md border-0 bg-warning text-warning-foreground font-semibold">
                          <AlertTriangle className="h-3 w-3" /> Incomplete
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 rounded-md text-info hover:bg-info/10 hover:text-info"
                          onClick={() => openPreview(r)}
                          disabled={!r.isReady}
                          title="Preview"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 rounded-md text-primary hover:bg-primary/10"
                          onClick={() => downloadPdf(r)}
                          disabled={!r.isReady || downloadingKey === r.studentKey}
                          title="Download PDF"
                        >
                          {downloadingKey === r.studentKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
            <span>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, readiness.length)} of {readiness.length} student
              {readiness.length === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-md"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => {
                const p = i + 1;
                return (
                  <Button
                    key={p}
                    variant={p === currentPage ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8 rounded-md"
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-md"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={!!previewStudent} onOpenChange={(v) => !v && setPreviewStudent(null)}>
        <DialogContent className="flex max-h-[92vh] w-[95vw] max-w-[1120px] flex-col gap-0 overflow-hidden rounded-xl border border-border bg-white p-0 shadow-xl print:max-h-none print:w-auto print:shadow-none">
          {/* Fixed header */}
          <DialogHeader className="flex-row items-center justify-between gap-2 border-b border-border bg-white px-5 py-3.5 print:hidden">
            <DialogTitle className="flex items-center gap-2 font-display text-sm font-semibold">
              <FileText className="h-4 w-4 text-primary" /> Report Card Preview
            </DialogTitle>
            {previewCard && (
              <Badge variant="outline" className="mr-6 rounded-md">
                {previewCard.examTypeName}
              </Badge>
            )}
          </DialogHeader>

          {previewLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>
          ) : !previewCard ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No data available.</div>
          ) : (
            <>
              {/* Scrollable document area */}
              <div className="flex-1 overflow-y-auto bg-[#EEF1F5] px-3 py-6 sm:px-8 print:overflow-visible print:bg-white print:p-0">
                {/* The "paper" -- A4-proportioned document, single source of truth for structure/spacing */}
                <div className="mx-auto max-w-[820px] overflow-hidden rounded-md border border-[#D7E1EC] bg-white shadow-md print:max-w-none print:rounded-none print:border-0 print:shadow-none">
                  <ReportCardHeader card={previewCard} formatDate={formatDate} />
                  <StudentInformation card={previewCard} />
                  <AcademicPerformanceTable card={previewCard} />
                  <PerformanceSummary card={previewCard} />
                  <ResultSummary card={previewCard} />
                  <SignatureSection />
                  <ReportCardFooter card={previewCard} />
                </div>
              </div>

              {/* Fixed bottom action bar */}
              <div className="flex items-center justify-end gap-2 border-t border-border bg-white px-5 py-3 print:hidden">
                <Button
                  variant="outline"
                  className="h-9 gap-1.5 rounded-md"
                  onClick={() => window.print()}
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </Button>
                <Button
                  className="h-9 gap-1.5 rounded-md"
                  onClick={() => previewStudent && downloadPdf(previewStudent)}
                  disabled={downloadingKey === previewStudent?.studentKey}
                >
                  {downloadingKey === previewStudent?.studentKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  Download PDF
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
