import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { InfoAlert } from "@/components/erp/InfoAlert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BarChart3, BookOpenCheck, ListChecks, Lock, Save, Trophy } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PageLoader } from "@/components/erp/Spinner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/exam-detail")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : "",
  }),
  head: () => ({
    meta: [
      { title: "Exam — Akira School ERP" },
      {
        name: "description",
        content: "Subject schedule, marks entry and results for one examination.",
      },
    ],
  }),
  component: ExamDetailPage,
});

type Exam = {
  examKey: string;
  examName: string;
  academicYearName: string;
  examTypeName: string;
  className: string;
  startDate: string;
  endDate: string;
  status: string;
};
type SubjectSchedule = {
  examSubjectScheduleKey: string;
  subjectKey: string;
  subjectName: string;
  maxTheoryMarks: number;
  passMarks: number;
  hasPractical: boolean;
  maxPracticalMarks: number | null;
  marksEnteredCount: number;
};
type MarkRow = {
  studentEnrollmentKey: string;
  studentKey: string;
  admissionNumber: string;
  studentName: string;
  rollNumber: string | null;
  sectionLabel: string | null;
  examMarkKey: string | null;
  theoryMarksObtained: number | null;
  practicalMarksObtained: number | null;
  isAbsent: boolean;
  remarks: string | null;
  maxTheoryMarks: number;
  maxPracticalMarks: number | null;
  hasPractical: boolean;
};
type ResultRow = {
  examResultKey: string;
  studentKey: string;
  admissionNumber: string;
  studentName: string;
  totalMaxMarks: number;
  totalObtained: number;
  percentage: number;
  overallGrade: string | null;
  failedSubjectCount: number;
  resultStatus: string;
  classRank: number | null;
};
type ExamSummary = {
  totalStudents: number;
  passCount: number;
  supplementaryCount: number;
  detainedCount: number;
  averagePercentage: number | null;
  highestPercentage: number | null;
};
type ReportCardHeader = {
  examName: string;
  startDate: string;
  endDate: string;
  className: string;
  admissionNumber: string;
  studentName: string;
  totalMaxMarks: number | null;
  totalObtained: number | null;
  percentage: number | null;
  overallGrade: string | null;
  resultStatus: string | null;
  classRank: number | null;
};
type ReportCardSubject = {
  subjectName: string;
  maxTheoryMarks: number;
  maxPracticalMarks: number | null;
  passMarks: number;
  theoryMarksObtained: number | null;
  practicalMarksObtained: number | null;
  isAbsent: boolean;
  subjectTotal: number;
};

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "bg-muted text-muted-foreground",
  ONGOING: "bg-info/15 text-info",
  COMPLETED: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  PUBLISHED: "bg-success/15 text-success",
};
const RESULT_STYLES: Record<string, string> = {
  PASS: "bg-success/15 text-success",
  SUPPLEMENTARY: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  DETAINED: "bg-destructive/15 text-destructive",
};

function ExamDetailPage() {
  const { id } = Route.useSearch();

  const [exam, setExam] = useState<Exam | null>(null);
  const [subjects, setSubjects] = useState<SubjectSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const [markSheetFor, setMarkSheetFor] = useState<SubjectSchedule | null>(null);
  const [markRows, setMarkRows] = useState<MarkRow[]>([]);
  const [markLoading, setMarkLoading] = useState(false);
  const [markSaving, setMarkSaving] = useState(false);

  const [results, setResults] = useState<ResultRow[]>([]);
  const [summary, setSummary] = useState<ExamSummary | null>(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [reportCardFor, setReportCardFor] = useState<ResultRow | null>(null);
  const [reportHeader, setReportHeader] = useState<ReportCardHeader | null>(null);
  const [reportSubjects, setReportSubjects] = useState<ReportCardSubject[]>([]);

  const load = () => {
    if (!id) return;
    setLoading(true);
    apiFetch(`/api/Exam/${id}`)
      .then((d: { exam: Exam; subjects: SubjectSchedule[] }) => {
        setExam(d.exam);
        setSubjects(d.subjects);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load exam"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const loadResults = () => {
    if (!id) return;
    apiFetch(`/api/Exam/${id}/results`)
      .then((d: ResultRow[]) => setResults(d))
      .catch(() => {});
    apiFetch(`/api/Exam/${id}/summary`)
      .then((d: ExamSummary) => setSummary(d))
      .catch(() => {});
  };

  useEffect(loadResults, [id]);

  const openMarkSheet = (s: SubjectSchedule) => {
    setMarkSheetFor(s);
    setMarkLoading(true);
    apiFetch(`/api/Exam/subject-schedule/${s.examSubjectScheduleKey}/marks`)
      .then((d: MarkRow[]) => setMarkRows(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load mark sheet"))
      .finally(() => setMarkLoading(false));
  };

  const updateMarkRow = (studentKey: string, patch: Partial<MarkRow>) => {
    setMarkRows((rows) => rows.map((r) => (r.studentKey === studentKey ? { ...r, ...patch } : r)));
  };

  const saveMarks = async () => {
    if (!markSheetFor) return;
    setMarkSaving(true);
    try {
      const entries = markRows.map((r) => ({
        studentKey: r.studentKey,
        theoryMarksObtained: r.isAbsent ? null : r.theoryMarksObtained,
        practicalMarksObtained: r.isAbsent ? null : r.practicalMarksObtained,
        isAbsent: r.isAbsent,
        remarks: r.remarks,
      }));
      await apiFetch(`/api/Exam/subject-schedule/${markSheetFor.examSubjectScheduleKey}/marks`, {
        method: "POST",
        body: JSON.stringify({ entries }),
      });
      toast.success("Marks saved");
      setMarkSheetFor(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save marks");
    } finally {
      setMarkSaving(false);
    }
  };

  const generateResults = async () => {
    if (!id) return;
    setGenerating(true);
    try {
      const res: { resultsGenerated: number } = await apiFetch(`/api/Exam/${id}/generate-results`, {
        method: "POST",
      });
      toast.success(`Results generated for ${res.resultsGenerated} student(s)`);
      loadResults();
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate results");
    } finally {
      setGenerating(false);
    }
  };

  const publish = async () => {
    if (!id) return;
    setPublishing(true);
    try {
      await apiFetch(`/api/Exam/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "PUBLISHED" }),
      });
      toast.success("Exam published — direct mark edits are now locked behind correction requests");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish exam");
    } finally {
      setPublishing(false);
    }
  };

  const openReportCard = (r: ResultRow) => {
    if (!id) return;
    setReportCardFor(r);
    apiFetch(`/api/Exam/${id}/report-card/${r.studentKey}`)
      .then((d: { header: ReportCardHeader; subjects: ReportCardSubject[] }) => {
        setReportHeader(d.header);
        setReportSubjects(d.subjects);
      })
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load report card"),
      );
  };

  if (loading) {
    return <PageLoader label="Loading exam..." />;
  }
  if (!exam) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Exam not found.
      </div>
    );
  }

  const isPublished = exam.status === "PUBLISHED";

  return (
    <div>
      <PageHeader
        title={exam.examName}
        breadcrumbs={[{ label: "Examinations", to: "/examinations" }, { label: exam.examName }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-10 gap-1.5 rounded-md"
              onClick={generateResults}
              disabled={generating}
            >
              <BarChart3 className="h-4 w-4" /> {generating ? "Generating..." : "Generate Results"}
            </Button>
            {exam.status === "COMPLETED" && (
              <Button
                className="h-10 gap-1.5 rounded-md shadow-sm"
                onClick={publish}
                disabled={publishing}
              >
                <Lock className="h-4 w-4" /> {publishing ? "Publishing..." : "Publish"}
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
        <Badge
          className={cn(
            "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
            STATUS_STYLES[exam.status],
          )}
        >
          {exam.status}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {exam.examTypeName} · {exam.className} · {exam.academicYearName}
        </span>
        <span className="text-sm text-muted-foreground">
          {exam.startDate?.slice(0, 10)} → {exam.endDate?.slice(0, 10)}
        </span>
      </div>

      {isPublished && (
        <div className="mb-4">
          <InfoAlert tone="info" title="This exam is published">
            Marks are locked. Changes now require a mark correction request, reviewed under
            Examinations → Mark Corrections.
          </InfoAlert>
        </div>
      )}

      <Tabs defaultValue="subjects" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-80">
          <TabsTrigger value="subjects" className="gap-1.5">
            <BookOpenCheck className="h-3.5 w-3.5" /> Subjects
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-1.5">
            <Trophy className="h-3.5 w-3.5" /> Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subjects" className="pt-4">
          <div className="space-y-1.5">
            {subjects.map((s) => (
              <div
                key={s.examSubjectScheduleKey}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <div className="text-sm font-medium">{s.subjectName}</div>
                  <div className="text-xs text-muted-foreground">
                    Max {s.maxTheoryMarks}
                    {s.hasPractical ? ` + ${s.maxPracticalMarks} practical` : ""} · Pass{" "}
                    {s.passMarks}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {s.marksEnteredCount} entered
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 rounded-md"
                    onClick={() => openMarkSheet(s)}
                  >
                    <ListChecks className="h-3.5 w-3.5" />{" "}
                    {isPublished ? "View Marks" : "Enter Marks"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4 pt-4">
          {summary && summary.totalStudents > 0 && (
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">Pass</div>
                <div className="mt-1 text-lg font-semibold text-success">{summary.passCount}</div>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">Supplementary</div>
                <div className="mt-1 text-lg font-semibold text-[oklch(0.55_0.12_65)]">
                  {summary.supplementaryCount}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">Detained</div>
                <div className="mt-1 text-lg font-semibold text-destructive">
                  {summary.detainedCount}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">Average %</div>
                <div className="mt-1 text-lg font-semibold">
                  {summary.averagePercentage ?? "—"}%
                </div>
              </div>
            </div>
          )}

          {results.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No results generated yet. Enter marks for every subject, then click "Generate
              Results".
            </p>
          )}

          <div className="space-y-1.5">
            {results.map((r) => (
              <button
                key={r.examResultKey}
                onClick={() => openReportCard(r)}
                className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left hover:border-primary/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {r.classRank}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{r.studentName}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {r.admissionNumber}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm">
                    {r.totalObtained}/{r.totalMaxMarks} · {r.percentage}%
                  </span>
                  <Badge className="rounded-md border-0 bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {r.overallGrade}
                  </Badge>
                  <Badge
                    className={cn(
                      "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                      RESULT_STYLES[r.resultStatus],
                    )}
                  >
                    {r.resultStatus}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!markSheetFor} onOpenChange={(v) => !v && setMarkSheetFor(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Marks — {markSheetFor?.subjectName}</DialogTitle>
            <DialogDescription>
              Max {markSheetFor?.maxTheoryMarks}
              {markSheetFor?.hasPractical
                ? ` theory + ${markSheetFor?.maxPracticalMarks} practical`
                : ""}{" "}
              · Pass {markSheetFor?.passMarks}
            </DialogDescription>
          </DialogHeader>
          {markLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!markLoading && (
            <div className="space-y-1.5">
              {markRows.map((r) => (
                <div
                  key={r.studentKey}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-2.5"
                >
                  <div className="min-w-[9rem] flex-1">
                    <div className="text-sm font-medium">{r.studentName}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {r.admissionNumber}
                      {r.sectionLabel ? ` · ${r.sectionLabel}` : ""}
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Checkbox
                      checked={r.isAbsent}
                      onCheckedChange={(v) => updateMarkRow(r.studentKey, { isAbsent: !!v })}
                      disabled={isPublished}
                    />{" "}
                    Absent
                  </label>
                  {!r.isAbsent && (
                    <>
                      <Input
                        type="number"
                        placeholder="Theory"
                        className="h-8 w-20 rounded-md"
                        value={r.theoryMarksObtained ?? ""}
                        disabled={isPublished}
                        onChange={(e) =>
                          updateMarkRow(r.studentKey, {
                            theoryMarksObtained: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                      {r.hasPractical && (
                        <Input
                          type="number"
                          placeholder="Practical"
                          className="h-8 w-24 rounded-md"
                          value={r.practicalMarksObtained ?? ""}
                          disabled={isPublished}
                          onChange={(e) =>
                            updateMarkRow(r.studentKey, {
                              practicalMarksObtained: e.target.value
                                ? Number(e.target.value)
                                : null,
                            })
                          }
                        />
                      )}
                    </>
                  )}
                </div>
              ))}
              {markRows.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No active students enrolled in this class.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="rounded-md" onClick={() => setMarkSheetFor(null)}>
              Close
            </Button>
            {!isPublished && (
              <Button
                className="rounded-md"
                onClick={saveMarks}
                disabled={markSaving || markLoading}
              >
                <Save className="mr-1.5 h-3.5 w-3.5" /> {markSaving ? "Saving..." : "Save Marks"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reportCardFor} onOpenChange={(v) => !v && setReportCardFor(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Card — {reportHeader?.studentName}</DialogTitle>
            <DialogDescription>
              {reportHeader?.examName} · {reportHeader?.className}
            </DialogDescription>
          </DialogHeader>
          {reportHeader && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={cn(
                    "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                    reportHeader.resultStatus ? RESULT_STYLES[reportHeader.resultStatus] : "",
                  )}
                >
                  {reportHeader.resultStatus}
                </Badge>
                <Badge className="rounded-md border-0 bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  Grade {reportHeader.overallGrade}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Rank {reportHeader.classRank} · {reportHeader.totalObtained}/
                  {reportHeader.totalMaxMarks} · {reportHeader.percentage}%
                </span>
              </div>
              <div className="space-y-1">
                {reportSubjects.map((s) => (
                  <div
                    key={s.subjectName}
                    className="flex items-center justify-between border-b border-border py-1.5 text-sm"
                  >
                    <span>{s.subjectName}</span>
                    <span
                      className={cn(s.subjectTotal < s.passMarks && "font-medium text-destructive")}
                    >
                      {s.isAbsent
                        ? "Absent"
                        : `${s.subjectTotal}/${s.maxTheoryMarks + (s.maxPracticalMarks ?? 0)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
