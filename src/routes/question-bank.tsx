import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Search, SlidersHorizontal, Pencil, Trash2, Send, CheckCircle2, XCircle,
  Clock, FileQuestion, Layers, BookOpen, Tag, MoreVertical, Eye, Archive, ArchiveRestore,
  Upload, Download, X, type LucideIcon,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/question-bank")({
  head: () => ({
    meta: [
      { title: "Question Bank — Akira School ERP" },
      { name: "description", content: "Create, organize, review and manage reusable examination questions." },
    ],
  }),
  component: QuestionBankPage,
});

type Subject = { subjectKey: string; subjectName: string };
type SchoolClass = { schoolClassKey: string; className: string };

type QuestionStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
type QuestionType = "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER" | "LONG_ANSWER" | "FILL_BLANK" | "MATCH";
type Difficulty = "EASY" | "MEDIUM" | "HARD";

type Question = {
  questionKey: string;
  subjectKey: string;
  subjectName: string;
  schoolClassKey: string | null;
  className: string | null;
  chapterName: string | null;
  topicName: string | null;
  questionText: string;
  questionType: QuestionType;
  difficultyLevel: Difficulty;
  bloomLevel: string | null;
  marks: number;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  correctOption: string | null;
  modelAnswer: string | null;
  tags: string | null;
  status: QuestionStatus;
  reviewRemarks: string | null;
  usageCount: number;
  isActive: boolean;
  createdOn: string;
};

type Summary = {
  totalQuestions: number;
  draftCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
};

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "MCQ", label: "Multiple Choice" },
  { value: "TRUE_FALSE", label: "True / False" },
  { value: "SHORT_ANSWER", label: "Short Answer" },
  { value: "LONG_ANSWER", label: "Long Answer" },
  { value: "FILL_BLANK", label: "Fill in the Blank" },
  { value: "MATCH", label: "Match the Following" },
];

const BLOOM_LEVELS = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  EASY: "bg-success text-success-foreground",
  MEDIUM: "bg-warning text-warning-foreground",
  HARD: "bg-destructive text-destructive-foreground",
};

const STATUS_STYLES: Record<QuestionStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PENDING_APPROVAL: "bg-warning text-warning-foreground",
  APPROVED: "bg-success text-success-foreground",
  REJECTED: "bg-destructive text-destructive-foreground",
};

const STATUS_LABELS: Record<QuestionStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const PAGE_SIZE = 12;

// Bulk import maps 1:1 onto CreateQuestionRequest -- same fields the Add
// Question form already sends to POST /api/Question, just spread across CSV
// columns instead of a form. This header list is also what the downloadable
// template uses, so a filled-in template always parses back cleanly.
const IMPORT_CSV_HEADERS = [
  "subjectName", "className", "chapterName", "topicName", "questionText", "questionType",
  "difficultyLevel", "bloomLevel", "marks", "optionA", "optionB", "optionC", "optionD",
  "correctOption", "modelAnswer", "tags",
] as const;

const IMPORT_TEMPLATE_ROWS = [
  {
    subjectName: "Mathematics", className: "", chapterName: "Number Systems", topicName: "Prime Numbers",
    questionText: "Which of the following is a prime number?", questionType: "MCQ", difficultyLevel: "EASY", bloomLevel: "Remember",
    marks: "1", optionA: "4", optionB: "6", optionC: "7", optionD: "9", correctOption: "C", modelAnswer: "", tags: "maths, numbers",
  },
  {
    subjectName: "Science", className: "", chapterName: "Cell Structure", topicName: "Organelles",
    questionText: "Name the organelle known as the powerhouse of the cell.", questionType: "SHORT_ANSWER", difficultyLevel: "EASY", bloomLevel: "Understand",
    marks: "2", optionA: "", optionB: "", optionC: "", optionD: "", correctOption: "", modelAnswer: "Mitochondria", tags: "biology, cell",
  },
];

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildImportTemplateCsv(): string {
  const header = IMPORT_CSV_HEADERS.join(",");
  const rows = IMPORT_TEMPLATE_ROWS.map((row) =>
    IMPORT_CSV_HEADERS.map((h) => csvEscape((row as Record<string, string>)[h] ?? "")).join(","),
  );
  return [header, ...rows].join("\n");
}

// Minimal CSV parser: handles quoted fields with embedded commas/newlines,
// which is enough for the template's shape without pulling in a library.
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "", row: string[] = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) { row.push(field); if (row.some((f) => f.trim() !== "")) rows.push(row); }

  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => { obj[h] = (r[i] ?? "").trim(); });
    return obj;
  });
}

// Compact chevron-style stat segments with a visible gap between each --
// same treatment as Result Processing's KPI strip. Desktop draws an arrow
// point via clip-path; stacked vertically on mobile since the interlocking
// shape only reads correctly in one horizontal row.
function ChevronStat({
  icon: Icon, label, value, colorClass, position, compactValue,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  colorClass: string;
  position: "first" | "middle" | "last";
  compactValue?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-[56px] flex-1 items-center gap-2.5 px-3.5 py-2.5 text-white shadow-sm sm:min-h-[60px]",
        colorClass,
        "rounded-md",
        position === "first" && "sm:[clip-path:polygon(0_0,calc(100%-13px)_0,100%_50%,calc(100%-13px)_100%,0_100%)]",
        position === "middle" && "sm:[clip-path:polygon(0_0,calc(100%-13px)_0,100%_50%,calc(100%-13px)_100%,0_100%,13px_50%)]",
        position === "last" && "sm:[clip-path:polygon(0_0,100%_0,100%_100%,0_100%,13px_50%)]",
      )}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-90" />
      <div className="min-w-0">
        <div className="text-[10.5px] font-medium leading-tight text-white/80">{label}</div>
        <div className={cn("mt-0.5 whitespace-nowrap font-display font-bold leading-tight tabular-nums", compactValue ? "text-xs sm:text-sm" : "text-base sm:text-lg")}>
          {value}
        </div>
      </div>
    </div>
  );
}

function DifficultyBadge({ level }: { level: Difficulty }) {
  return <Badge className={cn("rounded-md border-0 px-1.5 py-0 text-[10px] font-semibold leading-4", DIFFICULTY_STYLES[level])}>{level}</Badge>;
}

function StatusBadge({ status }: { status: QuestionStatus }) {
  return <Badge className={cn("rounded-md border-0 px-1.5 py-0 text-[10px] font-semibold leading-4", STATUS_STYLES[status])}>{STATUS_LABELS[status]}</Badge>;
}

function QuestionBankPage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
  const [submitTarget, setSubmitTarget] = useState<Question | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ q: Question; approve: boolean } | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState("");

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState<{ rows: Record<string, string>[]; errors: string[] }>({ rows: [], errors: [] });
  const [importing, setImporting] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/Subject").catch(() => []),
      apiFetch("/api/SchoolClass").catch(() => []),
      apiFetch("/api/Question").catch(() => []),
      apiFetch("/api/Question/summary").catch(() => null),
    ])
      .then(([sub, sc, q, sum]) => {
        setSubjects(sub);
        setClasses(sc);
        setQuestions(q);
        setSummary(sum);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load question bank"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);
  useEffect(() => setPage(1), [query, subjectFilter, statusFilter, difficultyFilter, typeFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return questions.filter((item) => {
      if (subjectFilter && item.subjectKey !== subjectFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (difficultyFilter !== "all" && item.difficultyLevel !== difficultyFilter) return false;
      if (typeFilter !== "all" && item.questionType !== typeFilter) return false;
      if (q) {
        const hay = `${item.questionText} ${item.chapterName ?? ""} ${item.topicName ?? ""} ${item.tags ?? ""} ${item.subjectName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [questions, query, subjectFilter, statusFilter, difficultyFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Selection is scoped to what's currently visible on the page, matching
  // the "select all visible" convention the bulk bar's copy promises.
  useEffect(() => setSelected(new Set()), [currentPage, query, subjectFilter, statusFilter, difficultyFilter, typeFilter]);

  const allPagedSelected = paged.length > 0 && paged.every((q) => selected.has(q.questionKey));
  const toggleSelectAll = () => {
    setSelected((prev) => {
      if (allPagedSelected) return new Set();
      const next = new Set(prev);
      paged.forEach((q) => next.add(q.questionKey));
      return next;
    });
  };
  const toggleSelectOne = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const activeFilters: { key: string; label: string; clear: () => void }[] = [
    ...(subjectFilter ? [{ key: "subject", label: `Subject: ${subjects.find((s: any) => s.subjectKey === subjectFilter)?.subjectName ?? ""}`, clear: () => setSubjectFilter("") }] : []),
    ...(statusFilter !== "all" ? [{ key: "status", label: `Status: ${STATUS_LABELS[statusFilter as QuestionStatus]}`, clear: () => setStatusFilter("all") }] : []),
    ...(difficultyFilter !== "all" ? [{ key: "difficulty", label: `Difficulty: ${difficultyFilter}`, clear: () => setDifficultyFilter("all") }] : []),
    ...(typeFilter !== "all" ? [{ key: "type", label: `Type: ${QUESTION_TYPES.find((t) => t.value === typeFilter)?.label ?? typeFilter}`, clear: () => setTypeFilter("all") }] : []),
  ];
  const activeFilterCount = activeFilters.length;
  const clearAllFilters = () => { setSubjectFilter(""); setStatusFilter("all"); setDifficultyFilter("all"); setTypeFilter("all"); };

  // Add/Edit now live on their own routed pages instead of a modal -- just
  // navigate there. Question Bank's own load() re-runs on return via the
  // route's focus (list is re-fetched whenever this page mounts).
  const openNew = () => navigate({ to: "/question-bank-add" });
  const openEdit = (q: Question) => {
    setPreviewQuestion(null);
    navigate({ to: "/question-bank-edit", search: { id: q.questionKey } });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/Question/${deleteTarget.questionKey}`, { method: "DELETE" });
      toast.success("Question removed");
      setDeleteTarget(null);
      setPreviewQuestion(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove question");
    }
  };

  const doSubmit = async () => {
    if (!submitTarget) return;
    try {
      await apiFetch("/api/Question/submit", { method: "POST", body: JSON.stringify({ questionKey: submitTarget.questionKey }) });
      toast.success("Submitted for approval");
      setSubmitTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit question");
    }
  };

  const doReview = async () => {
    if (!reviewTarget) return;
    if (!reviewTarget.approve && !reviewRemarks.trim()) return toast.error("Provide a reason for rejection.");
    try {
      await apiFetch("/api/Question/review", {
        method: "POST",
        body: JSON.stringify({ questionKey: reviewTarget.q.questionKey, approve: reviewTarget.approve, reviewRemarks }),
      });
      toast.success(reviewTarget.approve ? "Question approved" : "Question rejected");
      setReviewTarget(null);
      setReviewRemarks("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to review question");
    }
  };

  // Archive/Restore reuse the existing Update endpoint, flipping only
  // isActive -- no new API. Everything else on the record is preserved.
  const toggleActive = async (q: Question) => {
    try {
      await apiFetch(`/api/Question/${q.questionKey}`, {
        method: "PUT",
        body: JSON.stringify({
          questionKey: q.questionKey, subjectKey: q.subjectKey, schoolClassKey: q.schoolClassKey,
          chapterName: q.chapterName, topicName: q.topicName, questionText: q.questionText, questionType: q.questionType,
          difficultyLevel: q.difficultyLevel, bloomLevel: q.bloomLevel, marks: q.marks,
          optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD, correctOption: q.correctOption,
          modelAnswer: q.modelAnswer, tags: q.tags, isActive: !q.isActive,
        }),
      });
      toast.success(q.isActive ? "Question archived" : "Question restored");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update question");
    }
  };

  const FilterControls = (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Select value={subjectFilter || "all"} onValueChange={(v) => setSubjectFilter(v === "all" ? "" : v)}>
        <SelectTrigger className="h-9 w-full rounded-md sm:w-[170px]"><SelectValue placeholder="All Subjects" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Subjects</SelectItem>
          {subjects.map((s: any) => <SelectItem key={s.subjectKey} value={s.subjectKey}>{s.subjectName}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-9 w-full rounded-md sm:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="DRAFT">Draft</SelectItem>
          <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
          <SelectItem value="APPROVED">Approved</SelectItem>
          <SelectItem value="REJECTED">Rejected</SelectItem>
        </SelectContent>
      </Select>
      <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
        <SelectTrigger className="h-9 w-full rounded-md sm:w-[140px]"><SelectValue placeholder="Difficulty" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Difficulty</SelectItem>
          <SelectItem value="EASY">Easy</SelectItem>
          <SelectItem value="MEDIUM">Medium</SelectItem>
          <SelectItem value="HARD">Hard</SelectItem>
        </SelectContent>
      </Select>
      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="h-9 w-full rounded-md sm:w-[170px]"><SelectValue placeholder="Question Type" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {QUESTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
        </SelectContent>
      </Select>
      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" className="h-9 rounded-md text-muted-foreground" onClick={clearAllFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );

  const selectedQuestions = questions.filter((q) => selected.has(q.questionKey));
  const selectedCanSubmit = selectedQuestions.length > 0 && selectedQuestions.every((q) => q.status === "DRAFT" || q.status === "REJECTED");
  const selectedCanApprove = selectedQuestions.length > 0 && selectedQuestions.every((q) => q.status === "PENDING_APPROVAL");
  const selectedCanArchive = selectedQuestions.length > 0 && selectedQuestions.every((q) => q.isActive);

  const bulkSubmit = async () => {
    try {
      await Promise.all(selectedQuestions.map((q) => apiFetch("/api/Question/submit", { method: "POST", body: JSON.stringify({ questionKey: q.questionKey }) })));
      toast.success(`${selectedQuestions.length} question${selectedQuestions.length === 1 ? "" : "s"} submitted for approval`);
      setSelected(new Set());
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit selected questions");
    }
  };
  const bulkApprove = async () => {
    try {
      await Promise.all(selectedQuestions.map((q) => apiFetch("/api/Question/review", { method: "POST", body: JSON.stringify({ questionKey: q.questionKey, approve: true }) })));
      toast.success(`${selectedQuestions.length} question${selectedQuestions.length === 1 ? "" : "s"} approved`);
      setSelected(new Set());
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve selected questions");
    }
  };
  const bulkArchive = async () => {
    try {
      await Promise.all(selectedQuestions.map((q) => toggleActive(q)));
      setSelected(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive selected questions");
    }
  };
  const bulkDelete = async () => {
    try {
      await Promise.all(selectedQuestions.map((q) => apiFetch(`/api/Question/${q.questionKey}`, { method: "DELETE" })));
      toast.success(`${selectedQuestions.length} question${selectedQuestions.length === 1 ? "" : "s"} removed`);
      setSelected(new Set());
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete selected questions");
    }
  };

  const questionTypeLabel = (t: QuestionType) => QUESTION_TYPES.find((qt) => qt.value === t)?.label ?? t;

  const downloadImportTemplate = () => {
    const blob = new Blob([buildImportTemplateCsv()], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "question_bank_import_template.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const onImportFileSelected = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setImportText(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  // Validates each parsed row against the same rules Add Question already
  // enforces client-side, so a bad row is caught before hitting the API.
  useEffect(() => {
    if (!importText.trim()) {
      setImportPreview({ rows: [], errors: [] });
      return;
    }
    const rows = parseCsv(importText);
    const errors: string[] = [];
    rows.forEach((row, i) => {
      const lineNo = i + 2; // header is line 1
      if (!row.subjectName) errors.push(`Row ${lineNo}: subjectName is required.`);
      else if (!subjects.some((s: any) => s.subjectName.toLowerCase() === row.subjectName.toLowerCase())) errors.push(`Row ${lineNo}: subject "${row.subjectName}" not found.`);
      if (!row.questionText) errors.push(`Row ${lineNo}: questionText is required.`);
      if (row.questionType && !QUESTION_TYPES.some((t) => t.value === row.questionType)) errors.push(`Row ${lineNo}: unknown questionType "${row.questionType}".`);
      if ((row.questionType || "MCQ") === "MCQ") {
        if (!row.optionA || !row.optionB) errors.push(`Row ${lineNo}: MCQ needs optionA and optionB.`);
        if (!row.correctOption) errors.push(`Row ${lineNo}: MCQ needs correctOption (A/B/C/D).`);
      }
    });
    setImportPreview({ rows, errors });
  }, [importText, subjects]);

  const runImport = async () => {
    if (importPreview.rows.length === 0) return toast.error("Add rows to import first.");
    if (importPreview.errors.length > 0) return toast.error("Fix the errors below before importing.");

    setImporting(true);
    try {
      const payload = {
        questions: importPreview.rows.map((row) => {
          const subject = subjects.find((s: any) => s.subjectName.toLowerCase() === row.subjectName.toLowerCase());
          const schoolClass = row.className ? classes.find((c: any) => c.className.toLowerCase() === row.className.toLowerCase()) : undefined;
          return {
            subjectKey: subject?.subjectKey,
            schoolClassKey: schoolClass?.schoolClassKey ?? null,
            chapterName: row.chapterName || null,
            topicName: row.topicName || null,
            questionText: row.questionText,
            questionType: row.questionType || "MCQ",
            difficultyLevel: row.difficultyLevel || "MEDIUM",
            bloomLevel: row.bloomLevel || null,
            marks: Number(row.marks) || 1,
            optionA: row.optionA || null,
            optionB: row.optionB || null,
            optionC: row.optionC || null,
            optionD: row.optionD || null,
            correctOption: row.correctOption || null,
            modelAnswer: row.modelAnswer || null,
            tags: row.tags || null,
            isActive: true,
          };
        }),
      };
      const result = await apiFetch("/api/Question/bulk-import", { method: "POST", body: JSON.stringify(payload) });
      toast.success(`Imported ${result.imported} question${result.imported === 1 ? "" : "s"} as drafts`);
      setImportOpen(false);
      setImportText("");
      setImportPreview({ rows: [], errors: [] });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import questions");
    } finally {
      setImporting(false);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div>
        <PageHeader
          title="Question Bank"
          actions={
            <>
              <Button variant="outline" className="h-10 gap-1.5 rounded-md" onClick={() => setImportOpen(true)} disabled={subjects.length === 0}>
                <Upload className="h-4 w-4" /> Import Questions
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button variant="outline" className="h-10 gap-1.5 rounded-md" disabled title="Export is coming soon">
                      <Download className="h-4 w-4" /> Export
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Coming soon</TooltipContent>
              </Tooltip>
              <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew} disabled={subjects.length === 0}>
                <Plus className="h-4 w-4" /> Add Question
              </Button>
            </>
          }
        />
        <p className="-mt-4 mb-5 text-sm text-muted-foreground">
          Create, organize, review and manage reusable examination questions.
        </p>

        {/* KPI chevrons */}
        {loading ? (
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[52px] flex-1 rounded-md sm:h-[56px]" />)}
          </div>
        ) : summary && (
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
            <ChevronStat icon={FileQuestion} label="Total Questions" value={summary.totalQuestions} colorClass="bg-primary" position="first" />
            <ChevronStat icon={CheckCircle2} label="Approved" value={summary.approvedCount} colorClass="bg-success" position="middle" />
            <ChevronStat icon={Clock} label="Pending Review" value={summary.pendingCount} colorClass="bg-warning" position="middle" />
            <ChevronStat icon={XCircle} label="Rejected" value={summary.rejectedCount} colorClass="bg-destructive" position="middle" />
            <ChevronStat
              icon={Layers}
              label="Easy · Medium · Hard"
              value={`${summary.easyCount} · ${summary.mediumCount} · ${summary.hardCount}`}
              colorClass="bg-info"
              position="last"
              compactValue
            />
          </div>
        )}

        {/* Toolbar: search + filters (desktop inline, mobile sheet) */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search questions, chapters, topics, tags..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search questions"
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="hidden flex-wrap items-center gap-2 sm:flex">{FilterControls}</div>

          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-md sm:hidden">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
                {activeFilterCount > 0 && <Badge className="h-4 rounded-full border-0 bg-primary px-1.5 text-[10px] text-primary-foreground">{activeFilterCount}</Badge>}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-xl">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3 pb-4">{FilterControls}</div>
            </SheetContent>
          </Sheet>

          {filtered.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">{filtered.length} question{filtered.length === 1 ? "" : "s"}</span>
          )}
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {activeFilters.map((f) => (
              <button
                key={f.key}
                onClick={f.clear}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-foreground hover:bg-muted"
              >
                {f.label} <X className="h-3 w-3" />
              </button>
            ))}
            <button onClick={clearAllFilters} className="text-xs font-medium text-primary hover:underline">Clear all</button>
          </div>
        )}

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-2.5">
            <span className="text-sm font-medium">{selected.size} question{selected.size === 1 ? "" : "s"} selected</span>
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              {selectedCanSubmit && (
                <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-md" onClick={bulkSubmit}>
                  <Send className="h-3.5 w-3.5" /> Submit for Approval
                </Button>
              )}
              {selectedCanApprove && (
                <Button size="sm" variant="success" className="h-8 gap-1.5 rounded-md" onClick={bulkApprove}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                </Button>
              )}
              {selectedCanArchive && (
                <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-md" onClick={bulkArchive}>
                  <Archive className="h-3.5 w-3.5" /> Archive
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-md border-destructive text-destructive" onClick={bulkDelete}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
              <Button size="sm" variant="ghost" className="h-8 rounded-md" onClick={() => setSelected(new Set())}>Clear</Button>
            </div>
          </div>
        )}

        {/* Repository */}
        {loading ? (
          <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                <Skeleton className="h-4 w-4 rounded-sm" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : subjects.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-10 text-center">
            <BookOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No subjects found.</p>
            <p className="mt-1 text-xs text-muted-foreground">Set up subjects and curriculum before creating questions.</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-10 text-center">
            <FileQuestion className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No questions in your repository yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">Create your first question to start building the question bank.</p>
            <Button className="mt-4 h-9 gap-1.5 rounded-md" onClick={openNew}>
              <Plus className="h-3.5 w-3.5" /> Add Question
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-10 text-center">
            <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No questions match your current filters.</p>
            <Button variant="outline" className="mt-4 h-9 gap-1.5 rounded-md" onClick={clearAllFilters}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="rounded-md border border-border bg-card shadow-sm">
            {/* Desktop / tablet: repository table */}
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="w-10 px-4 py-2.5">
                        <Checkbox checked={allPagedSelected} onCheckedChange={toggleSelectAll} aria-label="Select all visible questions" />
                      </th>
                      <th className="px-3 py-2.5">Question</th>
                      <th className="px-3 py-2.5">Subject / Class</th>
                      <th className="px-3 py-2.5">Chapter / Topic</th>
                      <th className="px-3 py-2.5">Type</th>
                      <th className="px-3 py-2.5 text-center">Difficulty</th>
                      <th className="px-3 py-2.5 text-center">Marks</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Usage</th>
                      <th className="w-12 px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((q) => (
                      <tr
                        key={q.questionKey}
                        className={cn("cursor-pointer border-b border-border last:border-0 hover:bg-muted/30", !q.isActive && "opacity-60")}
                        onClick={() => setPreviewQuestion(q)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={selected.has(q.questionKey)} onCheckedChange={() => toggleSelectOne(q.questionKey)} aria-label={`Select question: ${q.questionText.slice(0, 40)}`} />
                        </td>
                        <td className="max-w-[280px] px-3 py-3">
                          <p className="line-clamp-2 font-medium text-foreground">{q.questionText}</p>
                          {!q.isActive && <span className="mt-0.5 inline-block text-[11px] text-muted-foreground">Archived</span>}
                        </td>
                        <td className="px-3 py-3">
                          <div>{q.subjectName}</div>
                          {q.className && <div className="text-xs text-muted-foreground">{q.className}</div>}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {q.chapterName || q.topicName ? (
                            <>
                              <div>{q.chapterName || "—"}</div>
                              {q.topicName && <div className="text-xs">{q.topicName}</div>}
                            </>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{questionTypeLabel(q.questionType)}</td>
                        <td className="px-3 py-3 text-center"><DifficultyBadge level={q.difficultyLevel} /></td>
                        <td className="px-3 py-3 text-center tabular-nums">{q.marks}</td>
                        <td className="px-3 py-3"><StatusBadge status={q.status} /></td>
                        <td className="px-3 py-3 text-muted-foreground">{q.usageCount > 0 ? `Used ${q.usageCount}×` : "—"}</td>
                        <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <QuestionActionsMenu
                            q={q}
                            onView={() => setPreviewQuestion(q)}
                            onEdit={() => openEdit(q)}
                            onSubmit={() => setSubmitTarget(q)}
                            onApprove={() => setReviewTarget({ q, approve: true })}
                            onReject={() => setReviewTarget({ q, approve: false })}
                            onToggleActive={() => toggleActive(q)}
                            onDelete={() => setDeleteTarget(q)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile: compact card list */}
            <div className="flex flex-col gap-2.5 p-2.5 md:hidden">
              {paged.map((q) => (
                <div
                  key={q.questionKey}
                  className={cn("rounded-md border border-border bg-background p-3.5", !q.isActive && "opacity-60")}
                  onClick={() => setPreviewQuestion(q)}
                >
                  <div className="flex items-start gap-2.5">
                    <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                      <Checkbox checked={selected.has(q.questionKey)} onCheckedChange={() => toggleSelectOne(q.questionKey)} aria-label={`Select question: ${q.questionText.slice(0, 40)}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge variant="outline" className="rounded-md text-[10px]">{q.subjectName}</Badge>
                        <DifficultyBadge level={q.difficultyLevel} />
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm font-medium">{q.questionText}</p>
                      <div className="mt-1.5 flex items-center justify-between">
                        <StatusBadge status={q.status} />
                        <div onClick={(e) => e.stopPropagation()}>
                          <QuestionActionsMenu
                            q={q}
                            onView={() => setPreviewQuestion(q)}
                            onEdit={() => openEdit(q)}
                            onSubmit={() => setSubmitTarget(q)}
                            onApprove={() => setReviewTarget({ q, approve: true })}
                            onReject={() => setReviewTarget({ q, approve: false })}
                            onToggleActive={() => toggleActive(q)}
                            onDelete={() => setDeleteTarget(q)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <span>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} question
                {filtered.length === 1 ? "" : "s"}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 rounded-md" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <span className="px-2 text-xs">{currentPage} / {totalPages}</span>
                <Button variant="outline" size="sm" className="h-8 rounded-md" disabled={currentPage >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </div>
        )}

        {/* Preview sheet */}
        <Sheet open={!!previewQuestion} onOpenChange={(v) => !v && setPreviewQuestion(null)}>
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
            {previewQuestion && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2 text-left">
                    <Eye className="h-4 w-4 text-primary" /> Question Preview
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-4 space-y-5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="rounded-md">{previewQuestion.subjectName}</Badge>
                    {previewQuestion.className && <Badge variant="outline" className="rounded-md">{previewQuestion.className}</Badge>}
                    {previewQuestion.chapterName && <Badge variant="outline" className="rounded-md">{previewQuestion.chapterName}</Badge>}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <DifficultyBadge level={previewQuestion.difficultyLevel} />
                    <Badge variant="outline" className="rounded-md">{previewQuestion.marks} mark{previewQuestion.marks === 1 ? "" : "s"}</Badge>
                    <StatusBadge status={previewQuestion.status} />
                    {!previewQuestion.isActive && <Badge variant="outline" className="rounded-md text-muted-foreground">Archived</Badge>}
                  </div>

                  <div>
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Question</div>
                    <p className="rounded-md border border-border bg-muted/20 p-3 text-sm">{previewQuestion.questionText}</p>
                  </div>

                  {previewQuestion.questionType === "MCQ" && (
                    <div>
                      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Options</div>
                      <div className="space-y-1.5">
                        {(["A", "B", "C", "D"] as const).map((opt) => {
                          const value = previewQuestion[`option${opt}` as "optionA" | "optionB" | "optionC" | "optionD"];
                          if (!value) return null;
                          const isCorrect = previewQuestion.correctOption === opt;
                          return (
                            <div key={opt} className={cn("flex items-center gap-2 rounded-md border px-3 py-2 text-sm", isCorrect ? "border-success/40 bg-success/10 font-medium text-success" : "border-border")}>
                              <span className="font-semibold">{opt}.</span> {value}
                              {isCorrect && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {previewQuestion.questionType === "TRUE_FALSE" && previewQuestion.correctOption && (
                    <div>
                      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Correct Answer</div>
                      <Badge className="rounded-md border-0 bg-success text-success-foreground">{previewQuestion.correctOption}</Badge>
                    </div>
                  )}

                  {previewQuestion.modelAnswer && (
                    <div>
                      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Model Answer</div>
                      <p className="rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground">{previewQuestion.modelAnswer}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Chapter</div>
                      <div className="mt-0.5 font-medium">{previewQuestion.chapterName || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Topic</div>
                      <div className="mt-0.5 font-medium">{previewQuestion.topicName || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Bloom's Level</div>
                      <div className="mt-0.5 font-medium">{previewQuestion.bloomLevel || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Usage</div>
                      <div className="mt-0.5 font-medium">{previewQuestion.usageCount > 0 ? `Used ${previewQuestion.usageCount} time${previewQuestion.usageCount === 1 ? "" : "s"}` : "Not used yet"}</div>
                    </div>
                  </div>

                  {previewQuestion.tags && (
                    <div>
                      <div className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <Tag className="h-3 w-3" /> Tags
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {previewQuestion.tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                          <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewQuestion.status === "REJECTED" && previewQuestion.reviewRemarks && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-destructive">Rejected — Reason</div>
                      <p className="mt-1 text-sm text-destructive">{previewQuestion.reviewRemarks}</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                  {previewQuestion.status === "PENDING_APPROVAL" ? (
                    <>
                      <Button size="sm" variant="success" className="h-9 gap-1.5 rounded-md" onClick={() => setReviewTarget({ q: previewQuestion, approve: true })}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-9 gap-1.5 rounded-md border-destructive text-destructive" onClick={() => setReviewTarget({ q: previewQuestion, approve: false })}>
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" className="h-9 gap-1.5 rounded-md" onClick={() => openEdit(previewQuestion)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit Question
                    </Button>
                  )}
                  <Button variant="ghost" className="h-9 rounded-md" onClick={() => setPreviewQuestion(null)}>Close</Button>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* Bulk import -- paste/upload CSV, preview + validate, then call the
            existing POST /api/Question/bulk-import (already built, unused
            until now). Imported rows land as Drafts, same as Add Question. */}
        <Dialog open={importOpen} onOpenChange={(v) => { setImportOpen(v); if (!v) { setImportText(""); setImportPreview({ rows: [], errors: [] }); } }}>
          <DialogContent className="max-h-[85vh] overflow-y-auto rounded-md sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-lg">Import Questions</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-md border border-info/30 bg-info/10 px-3 py-2.5 text-xs text-info">
                <FileQuestion className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Download the CSV template, fill in your questions, then paste the contents below or upload the file. Subject names must
                  match existing subjects exactly. Imported questions are added as <strong>Drafts</strong>.
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" className="h-9 gap-1.5 rounded-md" onClick={downloadImportTemplate}>
                  <Download className="h-3.5 w-3.5" /> Download CSV Template
                </Button>
                <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-input px-3 text-sm hover:bg-muted">
                  <Upload className="h-3.5 w-3.5" /> Upload CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onImportFileSelected(f); e.target.value = ""; }}
                  />
                </label>
              </div>

              <div className="space-y-1.5">
                <Label>Or paste CSV content</Label>
                <Textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="subjectName,className,chapterName,topicName,questionText,questionType,difficultyLevel,..."
                  className="rounded-md font-mono text-xs"
                  rows={6}
                />
              </div>

              {importText.trim() && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{importPreview.rows.length} row{importPreview.rows.length === 1 ? "" : "s"} detected</span>
                    {importPreview.errors.length > 0 && (
                      <span className="font-medium text-destructive">{importPreview.errors.length} error{importPreview.errors.length === 1 ? "" : "s"}</span>
                    )}
                  </div>

                  {importPreview.errors.length > 0 && (
                    <div className="max-h-32 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
                      {importPreview.errors.map((e, i) => <div key={i}>{e}</div>)}
                    </div>
                  )}

                  {importPreview.rows.length > 0 && (
                    <div className="max-h-48 overflow-auto rounded-md border border-border">
                      <table className="w-full min-w-[420px] border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/40 text-left font-semibold uppercase tracking-wide text-muted-foreground">
                            <th className="px-2.5 py-1.5">Subject</th>
                            <th className="px-2.5 py-1.5">Question</th>
                            <th className="px-2.5 py-1.5">Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.rows.slice(0, 8).map((r, i) => (
                            <tr key={i} className="border-b border-border last:border-0">
                              <td className="px-2.5 py-1.5">{r.subjectName || "—"}</td>
                              <td className="max-w-[220px] truncate px-2.5 py-1.5">{r.questionText || "—"}</td>
                              <td className="px-2.5 py-1.5">{r.questionType || "MCQ"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {importPreview.rows.length > 8 && (
                        <div className="border-t border-border px-2.5 py-1.5 text-center text-[11px] text-muted-foreground">
                          + {importPreview.rows.length - 8} more row{importPreview.rows.length - 8 === 1 ? "" : "s"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button type="button" variant="outline" className="rounded-md border-destructive text-destructive" onClick={() => setImportOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="success"
                className="rounded-md"
                onClick={runImport}
                disabled={importing || importPreview.rows.length === 0 || importPreview.errors.length > 0}
              >
                {importing ? "Importing..." : `Import ${importPreview.rows.length || ""} Question${importPreview.rows.length === 1 ? "" : "s"}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this question?</AlertDialogTitle>
              <AlertDialogDescription>This cannot be undone. Consider archiving instead if this question may be reused later.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); confirmDelete(); }}>
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!submitTarget} onOpenChange={(v) => !v && setSubmitTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit for approval?</AlertDialogTitle>
              <AlertDialogDescription>A coordinator will review this question before it can be used in a paper.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => { e.preventDefault(); doSubmit(); }}>Submit</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!reviewTarget} onOpenChange={(v) => { if (!v) { setReviewTarget(null); setReviewRemarks(""); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{reviewTarget?.approve ? "Approve this question?" : "Reject this question?"}</AlertDialogTitle>
              <AlertDialogDescription>
                {reviewTarget?.approve ? "Approved questions become available for paper generation." : "Provide a reason so the author can revise and resubmit."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-1.5">
              <Label required={!reviewTarget?.approve}>Remarks</Label>
              <Textarea value={reviewRemarks} onChange={(e) => setReviewRemarks(e.target.value)} placeholder={reviewTarget?.approve ? "Optional note" : "Reason for rejection"} className="rounded-md" rows={3} />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => { e.preventDefault(); doReview(); }}>
                {reviewTarget?.approve ? "Approve" : "Reject"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

function QuestionActionsMenu({
  q, onView, onEdit, onSubmit, onApprove, onReject, onToggleActive, onDelete,
}: {
  q: Question;
  onView: () => void;
  onEdit: () => void;
  onSubmit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" title="More actions" aria-label="More actions">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onView}>
          <Eye className="mr-2 h-3.5 w-3.5" /> View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
        </DropdownMenuItem>
        {(q.status === "DRAFT" || q.status === "REJECTED") && (
          <DropdownMenuItem onClick={onSubmit}>
            <Send className="mr-2 h-3.5 w-3.5" /> Submit for Approval
          </DropdownMenuItem>
        )}
        {q.status === "PENDING_APPROVAL" && (
          <>
            <DropdownMenuItem onClick={onApprove}>
              <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-success" /> Approve
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onReject}>
              <XCircle className="mr-2 h-3.5 w-3.5 text-destructive" /> Reject
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onToggleActive}>
          {q.isActive ? <Archive className="mr-2 h-3.5 w-3.5" /> : <ArchiveRestore className="mr-2 h-3.5 w-3.5" />}
          {q.isActive ? "Archive" : "Restore"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
