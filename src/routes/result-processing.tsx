import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  RefreshCw, Loader2, Users, CheckCircle2, XCircle, TrendingUp, AlertTriangle, Trophy,
  type LucideIcon,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

// Compact chevron-style stat segments with a visible gap between each,
// rather than edge-to-edge -- each stage a solid color with an arrow point
// via clip-path. Stacked vertically on mobile since the arrow shape only
// reads correctly in a single horizontal row.
function ChevronStat({
  icon: Icon, label, value, colorClass, position,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  colorClass: string;
  position: "first" | "middle" | "last";
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-[52px] flex-1 items-center gap-2 px-3.5 py-2 text-white shadow-sm sm:min-h-[56px]",
        colorClass,
        "rounded-md",
        // Desktop: chevron shape via clip-path. A visible gap comes from
        // the parent's `gap-3`, so no negative margins needed here.
        position === "first" && "sm:[clip-path:polygon(0_0,calc(100%-12px)_0,100%_50%,calc(100%-12px)_100%,0_100%)]",
        position === "middle" && "sm:[clip-path:polygon(0_0,calc(100%-12px)_0,100%_50%,calc(100%-12px)_100%,0_100%,12px_50%)]",
        position === "last" && "sm:[clip-path:polygon(0_0,100%_0,100%_100%,0_100%,12px_50%)]",
      )}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-90" />
      <div className="min-w-0">
        <div className="text-[10px] font-medium leading-tight text-white/80">{label}</div>
        <div className="font-display text-sm font-bold leading-tight">{value}</div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/result-processing")({
  head: () => ({
    meta: [
      { title: "Result Processing — Akira School ERP" },
      { name: "description", content: "Compute totals, percentage, grade and class rank from approved marks." },
    ],
  }),
  component: ResultProcessingPage,
});

type ExamType = { examTypeKey: string; examTypeName: string };
type SchoolClass = { schoolClassKey: string; className: string };
type Subject = { subjectKey: string; subjectName: string };
type ExamConfig = { examConfigKey: string; examTypeKey: string; schoolClassKey: string; subjectKey: string; maxMarks: number; minPassMarks: number };
type StudentOption = { studentKey: string; studentName: string; rollNumber: string };

type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED" | "NOT_SUBMITTED";

type ResultRow = {
  resultKey: string;
  examConfigKey: string;
  studentKey: string;
  totalMarks: number | null;
  maxMarks: number;
  percentage: number | null;
  gradeLabel: string | null;
  isPass: boolean;
  isAbsent: boolean;
  classRank: number | null;
  processedOn: string;
};

type ResultSummary = {
  totalStudents: number;
  passCount: number;
  failCount: number;
  absentCount: number;
  classAveragePercentage: number | null;
  highestPercentage: number | null;
  lowestPercentage: number | null;
  isProcessed: boolean;
  processedOn: string | null;
};

function ResultProcessingPage() {
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [configs, setConfigs] = useState<ExamConfig[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [summary, setSummary] = useState<ResultSummary | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("NOT_SUBMITTED");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [examTypeKey, setExamTypeKey] = useState("");
  const [classKey, setClassKey] = useState("");
  const [subjectKey, setSubjectKey] = useState("");

  const loadLookups = () => {
    Promise.all([
      apiFetch("/api/ExamType").catch(() => []),
      apiFetch("/api/SchoolClass").catch(() => []),
      apiFetch("/api/Subject").catch(() => []),
      apiFetch("/api/ExamConfiguration").catch(() => []),
    ]).then(([et, sc, sub, cfg]) => {
      setExamTypes(et);
      setClasses(sc);
      setSubjects(sub);
      setConfigs(cfg);
      if (!examTypeKey && et.length > 0) setExamTypeKey(et[0].examTypeKey);
    });
  };

  useEffect(loadLookups, []);

  const config = configs.find((c) => c.examTypeKey === examTypeKey && c.schoolClassKey === classKey && c.subjectKey === subjectKey);

  const loadForConfig = (cfg: ExamConfig | undefined) => {
    if (!cfg) {
      setResults([]);
      setSummary(null);
      setVerificationStatus("NOT_SUBMITTED");
      setStudents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      apiFetch(`/api/ExamResult?examConfigId=${cfg.examConfigKey}`).catch(() => []),
      apiFetch(`/api/ExamResult/summary?examConfigId=${cfg.examConfigKey}`).catch(() => null),
      apiFetch(`/api/ExamMarkVerification/queue?examTypeId=${cfg.examTypeKey}`).catch(() => []),
      apiFetch("/api/Student").catch(() => []),
    ]).then(([res, sum, queue, stu]) => {
      setResults(res);
      setSummary(sum);
      setStudents(stu);
      const match = (queue as any[]).find((q) => q.examConfigKey === cfg.examConfigKey);
      setVerificationStatus(match ? match.status : "NOT_SUBMITTED");
    }).finally(() => setLoading(false));
  };

  useEffect(() => loadForConfig(config), [config?.examConfigKey]);

  const studentName = (k: string) => (students as any[]).find((s) => s.studentKey === k)?.studentName ?? "—";
  const rollNumber = (k: string) => (students as any[]).find((s) => s.studentKey === k)?.rollNumber ?? "";

  const sortedResults = useMemo(() =>
    [...results].sort((a, b) => (a.classRank ?? Infinity) - (b.classRank ?? Infinity) || rollNumber(a.studentKey).localeCompare(rollNumber(b.studentKey), undefined, { numeric: true })),
  [results, students]);

  const totalPages = Math.max(1, Math.ceil(sortedResults.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedResults = sortedResults.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => setPage(1), [config?.examConfigKey]);

  const doProcess = async () => {
    if (!config) return;
    setProcessing(true);
    try {
      await apiFetch("/api/ExamResult/process", { method: "POST", body: JSON.stringify({ examConfigKey: config.examConfigKey }) });
      toast.success("Results processed successfully");
      setConfirmOpen(false);
      loadForConfig(config);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to process results");
    } finally {
      setProcessing(false);
    }
  };

  const className = (k: string) => classes.find((c: any) => c.schoolClassKey === k)?.className ?? "—";
  const subjectName = (k: string) => subjects.find((s: any) => s.subjectKey === k)?.subjectName ?? "—";

  const canProcess = verificationStatus === "APPROVED";

  return (
    <div>
      <PageHeader
        title="Result Processing"
        actions={
          config && canProcess ? (
            <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={() => setConfirmOpen(true)} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {summary?.isProcessed ? "Re-process Results" : "Process Results"}
            </Button>
          ) : undefined
        }
      />

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
        <Select value={subjectKey} onValueChange={setSubjectKey}>
          <SelectTrigger className="h-9 w-full rounded-md sm:w-[180px]"><SelectValue placeholder="Select subject" /></SelectTrigger>
          <SelectContent>
            {subjects.map((s: any) => <SelectItem key={s.subjectKey} value={s.subjectKey}>{s.subjectName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!classKey || !subjectKey ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Select an exam, class and subject to view or process results.
        </div>
      ) : !config ? (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-[oklch(0.45_0.12_65)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>No exam configuration found for this exam type, class and subject.</span>
        </div>
      ) : !canProcess ? (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-[oklch(0.45_0.12_65)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {verificationStatus === "NOT_SUBMITTED" && "Marks for this class/subject haven't been submitted for verification yet."}
            {verificationStatus === "PENDING" && "Marks are awaiting approval in Marks Verification."}
            {verificationStatus === "REJECTED" && "Marks were rejected in Marks Verification and must be corrected and re-approved first."}
            {" "}Results cannot be processed until marks are approved.
          </span>
        </div>
      ) : loading ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Loading...</div>
      ) : !summary?.isProcessed ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Marks are approved. Click "Process Results" to compute grades, pass/fail and class rank.
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
            <ChevronStat
              icon={Users}
              label="Students"
              value={summary.totalStudents}
              colorClass="bg-primary"
              position="first"
            />
            <ChevronStat
              icon={CheckCircle2}
              label="Pass"
              value={summary.passCount}
              colorClass="bg-success"
              position="middle"
            />
            <ChevronStat
              icon={XCircle}
              label="Fail"
              value={summary.failCount}
              colorClass="bg-destructive"
              position="middle"
            />
            <ChevronStat
              icon={TrendingUp}
              label="Class Average"
              value={summary.classAveragePercentage != null ? `${summary.classAveragePercentage.toFixed(1)}%` : "—"}
              colorClass="bg-info"
              position="last"
            />
          </div>

          <div className="rounded-md border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead className="w-16">Roll</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedResults.map((r) => (
                    <TableRow key={r.resultKey} className={cn(r.isAbsent && "bg-muted/40")}>
                      <TableCell>
                        {r.classRank === 1 ? (
                          <Badge className="gap-1 rounded-md border-0 bg-warning text-warning-foreground font-semibold">
                            <Trophy className="h-3 w-3" /> 1
                          </Badge>
                        ) : (
                          r.classRank ?? "—"
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{rollNumber(r.studentKey)}</TableCell>
                      <TableCell className="font-medium">{studentName(r.studentKey)}</TableCell>
                      <TableCell>{r.isAbsent ? "—" : `${r.totalMarks} / ${r.maxMarks}`}</TableCell>
                      <TableCell className="font-medium">{r.isAbsent ? "—" : `${r.percentage}%`}</TableCell>
                      <TableCell>
                        {r.gradeLabel ? (
                          <Badge className="rounded-md border-0 bg-primary text-primary-foreground font-semibold">{r.gradeLabel}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.isAbsent ? (
                          <Badge className="rounded-md border-0 bg-destructive text-destructive-foreground font-semibold">Absent</Badge>
                        ) : r.isPass ? (
                          <Badge className="rounded-md border-0 bg-success text-success-foreground font-semibold">Pass</Badge>
                        ) : (
                          <Badge className="rounded-md border-0 bg-destructive text-destructive-foreground font-semibold">Fail</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {sortedResults.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
                <span className="text-xs text-muted-foreground">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sortedResults.length)} of {sortedResults.length} student{sortedResults.length === 1 ? "" : "s"}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 rounded-md" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <span className="px-2 text-xs">{currentPage} / {totalPages}</span>
                  <Button variant="outline" size="sm" className="h-8 rounded-md" disabled={currentPage >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{summary?.isProcessed ? "Re-process results?" : "Process results?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {summary?.isProcessed
                ? "This recomputes totals, grades and rank from the current approved marks, replacing the existing results."
                : `This computes totals, percentage, grade and class rank for ${subjectName(subjectKey)} · ${className(classKey)} from the approved marks.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); doProcess(); }}>
              {summary?.isProcessed ? "Re-process" : "Process"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
