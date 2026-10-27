import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Pencil, Trash2, CalendarClock, Lock, LockOpen, Clock, MapPin, User2,
  Search, BookOpen, ListChecks, CalendarRange, Building2,
  ChevronLeft, ChevronRight, type LucideIcon,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useFormatDate } from "@/hooks/use-tenant-setting";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/exam-timetable-builder")({
  head: () => ({
    meta: [
      { title: "Exam Timetable Builder — Akira School ERP" },
      { name: "description", content: "Schedule exam dates, time slots, rooms and invigilators per class and subject." },
    ],
  }),
  component: ExamTimetableBuilderPage,
});

type ExamType = { examTypeKey: string; examTypeName: string; isActive: boolean };
type SchoolClass = { schoolClassKey: string; className: string };
type Subject = { subjectKey: string; subjectName: string };
type StaffOption = { staffProfileKey: string; userName: string };

type TimetableEntry = {
  timetableEntryKey: string;
  examTypeKey: string;
  schoolClassKey: string;
  subjectKey: string;
  examDate: string;
  startTime: string;
  endTime: string;
  roomName: string | null;
  invigilatorKey: string | null;
  invigilatorName: string | null;
  isPublished: boolean;
};

const emptyDraft = {
  schoolClassKey: "", subjectKey: "", examDate: "", startTime: "09:00", endTime: "11:00",
  roomName: "", invigilatorKey: "",
};

const PAGE_SIZE = 10;

// Icon-tile palette, hashed per subject so each subject keeps a stable
// color across the list. `bg`/`text`/`ring` stay a subtle tint for the
// mobile card's icon tile; `pill` is the same hue as a solid, shined badge
// for the table's subject chip, matching the status badge treatment.
const SUBJECT_PALETTE = [
  { bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-600 dark:text-rose-400", ring: "ring-rose-200 dark:ring-rose-900", pill: "bg-rose-600 dark:bg-rose-500" },
  { bg: "bg-sky-50 dark:bg-sky-950/40", text: "text-sky-600 dark:text-sky-400", ring: "ring-sky-200 dark:ring-sky-900", pill: "bg-sky-600 dark:bg-sky-500" },
  { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-200 dark:ring-emerald-900", pill: "bg-emerald-600 dark:bg-emerald-500" },
  { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-600 dark:text-amber-400", ring: "ring-amber-200 dark:ring-amber-900", pill: "bg-amber-600 dark:bg-amber-500" },
  { bg: "bg-violet-50 dark:bg-violet-950/40", text: "text-violet-600 dark:text-violet-400", ring: "ring-violet-200 dark:ring-violet-900", pill: "bg-violet-600 dark:bg-violet-500" },
  { bg: "bg-cyan-50 dark:bg-cyan-950/40", text: "text-cyan-600 dark:text-cyan-400", ring: "ring-cyan-200 dark:ring-cyan-900", pill: "bg-cyan-600 dark:bg-cyan-500" },
  { bg: "bg-orange-50 dark:bg-orange-950/40", text: "text-orange-600 dark:text-orange-400", ring: "ring-orange-200 dark:ring-orange-900", pill: "bg-orange-600 dark:bg-orange-500" },
  { bg: "bg-indigo-50 dark:bg-indigo-950/40", text: "text-indigo-600 dark:text-indigo-400", ring: "ring-indigo-200 dark:ring-indigo-900", pill: "bg-indigo-600 dark:bg-indigo-500" },
];

const SUBJECT_PILL_SHINE = "text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)]";

function paletteFor(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return SUBJECT_PALETTE[hash % SUBJECT_PALETTE.length];
}

// Short weekday for the schedule table's Day column, read straight off the
// exam date rather than stored separately -- there's only one source of truth.
function dayOfWeek(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

// Status is derived from what the record actually has (isPublished + exam
// date vs today) rather than a stored workflow field, since that field
// doesn't exist on ExamTimetableEntry.
type StatusLabel = "Draft" | "Completed" | "Ongoing" | "Scheduled";
// Solid, saturated badges with a soft top-light "shine" highlight (a subtle
// inset gradient) instead of flat pastel tints -- reads as a punchier status
// chip at a glance while staying legible in both themes.
const STATUS_STYLES: Record<StatusLabel, string> = {
  Draft: "bg-slate-600 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)] dark:bg-slate-500",
  Completed: "bg-[#178750] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)] dark:bg-[#1FA05F]",
  Ongoing: "bg-[#B45C00] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)] dark:bg-[#D6790A]",
  Scheduled: "bg-[#0D6FAE] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)] dark:bg-[#1382CC]",
};

function statusFor(entry: TimetableEntry): { label: StatusLabel; className: string } {
  const today = new Date().toISOString().slice(0, 10);
  let label: StatusLabel;
  if (!entry.isPublished) label = "Draft";
  else if (entry.examDate < today) label = "Completed";
  else if (entry.examDate === today) label = "Ongoing";
  else label = "Scheduled";
  return { label, className: STATUS_STYLES[label] };
}

// Pure display helper for the duration preview in the dialog -- purely
// derived from the two time inputs already in `draft`, no new field.
function durationLabel(start: string, end: string): string | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const minutes = (eh * 60 + em) - (sh * 60 + sm);
  if (minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
}

// Compact chevron-style stat segments with a visible gap between each --
// same treatment as Question Bank's KPI strip. Desktop draws an arrow
// point via clip-path; stacked vertically on mobile since the interlocking
// shape only reads correctly in one horizontal row.
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
        "relative flex min-h-[64px] flex-1 items-center gap-3 px-4 py-3 text-white shadow-sm sm:min-h-[68px]",
        colorClass,
        "rounded-md",
        position === "first" && "sm:[clip-path:polygon(0_0,calc(100%-13px)_0,100%_50%,calc(100%-13px)_100%,0_100%)]",
        position === "middle" && "sm:[clip-path:polygon(0_0,calc(100%-13px)_0,100%_50%,calc(100%-13px)_100%,0_100%,13px_50%)]",
        position === "last" && "sm:[clip-path:polygon(0_0,100%_0,100%_100%,0_100%,13px_50%)]",
      )}
    >
      <Icon className="h-5 w-5 shrink-0 opacity-90" />
      <div className="flex min-w-0 flex-col justify-center">
        <div className="text-xs font-medium leading-tight text-white/80">{label}</div>
        <div className="mt-1 whitespace-nowrap font-display text-xl font-extrabold leading-none tabular-nums sm:text-2xl">
          {value}
        </div>
      </div>
    </div>
  );
}

function ExamTimetableBuilderPage() {
  const formatDate = useFormatDate();
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [examTypeKey, setExamTypeKey] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusLabel | "all">("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TimetableEntry | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TimetableEntry | null>(null);
  const [publishTarget, setPublishTarget] = useState<"publish" | "unpublish" | null>(null);

  const loadLookups = () => {
    Promise.all([
      apiFetch("/api/ExamType").catch(() => []),
      apiFetch("/api/SchoolClass").catch(() => []),
      apiFetch("/api/Subject").catch(() => []),
      apiFetch("/api/StaffProfile").catch(() => []),
    ]).then(([et, sc, sub, stf]) => {
      setExamTypes(et);
      setClasses(sc);
      setSubjects(sub);
      setStaff(stf);
      if (!examTypeKey && et.length > 0) setExamTypeKey(et[0].examTypeKey);
    });
  };

  const loadEntries = (examTypeId: string) => {
    if (!examTypeId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    apiFetch(`/api/ExamTimetableEntry?examTypeId=${examTypeId}`)
      .then((d: TimetableEntry[]) => setEntries(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load timetable"))
      .finally(() => setLoading(false));
  };

  useEffect(loadLookups, []);
  useEffect(() => loadEntries(examTypeKey), [examTypeKey]);

  const className = (k: string) => classes.find((c: any) => c.schoolClassKey === k)?.className ?? "—";
  const subjectName = (k: string) => subjects.find((s: any) => s.subjectKey === k)?.subjectName ?? "—";
  const examTypeName = examTypes.find((e) => e.examTypeKey === examTypeKey)?.examTypeName ?? "";

  // Status counts computed over the full loaded set (post class/search
  // filter is applied separately below) so the KPI cards and quick chips
  // reflect "this exam's schedule", not just the currently narrowed view.
  const baseFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .filter((e) => !classFilter || e.schoolClassKey === classFilter)
      .filter((e) => !q || `${subjectName(e.subjectKey)} ${className(e.schoolClassKey)} ${e.roomName ?? ""}`.toLowerCase().includes(q));
  }, [entries, classFilter, query, subjects, classes]);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusLabel, number> = { Draft: 0, Scheduled: 0, Ongoing: 0, Completed: 0 };
    baseFiltered.forEach((e) => { counts[statusFor(e).label]++; });
    return counts;
  }, [baseFiltered]);

  const filtered = useMemo(() => {
    const list = statusFilter === "all" ? baseFiltered : baseFiltered.filter((e) => statusFor(e).label === statusFilter);
    return [...list].sort((a, b) => a.examDate.localeCompare(b.examDate) || a.startTime.localeCompare(b.startTime));
  }, [baseFiltered, statusFilter]);

  // Reset to page 1 whenever the underlying result set changes shape, so
  // the user never lands on a now-empty trailing page after filtering.
  useEffect(() => setPage(1), [examTypeKey, classFilter, statusFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedEntries = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const anyPublished = filtered.some((e) => e.isPublished);
  const allPublished = filtered.length > 0 && filtered.every((e) => e.isPublished);

  const openNew = () => {
    setEditing(null);
    setDraft({ ...emptyDraft, schoolClassKey: classFilter || classes[0]?.schoolClassKey || "" });
    setOpen(true);
  };

  const openEdit = (e: TimetableEntry) => {
    setEditing(e);
    setDraft({
      schoolClassKey: e.schoolClassKey, subjectKey: e.subjectKey, examDate: e.examDate,
      startTime: e.startTime.slice(0, 5), endTime: e.endTime.slice(0, 5),
      roomName: e.roomName ?? "", invigilatorKey: e.invigilatorKey ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.schoolClassKey) return toast.error("Select a class.");
    if (!draft.subjectKey) return toast.error("Select a subject.");
    if (!draft.examDate) return toast.error("Exam date is required.");
    if (draft.startTime >= draft.endTime) return toast.error("End time must be after start time.");

    setSaving(true);
    try {
      const payload = {
        schoolClassKey: draft.schoolClassKey, subjectKey: draft.subjectKey, examDate: draft.examDate,
        startTime: `${draft.startTime}:00`, endTime: `${draft.endTime}:00`,
        roomName: draft.roomName || null, invigilatorKey: draft.invigilatorKey || null,
      };
      if (editing) {
        await apiFetch(`/api/ExamTimetableEntry/${editing.timetableEntryKey}`, {
          method: "PUT",
          body: JSON.stringify({ timetableEntryKey: editing.timetableEntryKey, ...payload }),
        });
        toast.success("Timetable entry updated");
      } else {
        await apiFetch("/api/ExamTimetableEntry", {
          method: "POST",
          body: JSON.stringify({ ...payload, examTypeKey }),
        });
        toast.success("Timetable entry added");
      }
      setOpen(false);
      loadEntries(examTypeKey);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save timetable entry");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/ExamTimetableEntry/${deleteTarget.timetableEntryKey}`, { method: "DELETE" });
      toast.success("Timetable entry removed");
      setDeleteTarget(null);
      loadEntries(examTypeKey);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove timetable entry");
    }
  };

  const doPublishToggle = async () => {
    const targetState = publishTarget === "publish";
    try {
      await apiFetch("/api/ExamTimetableEntry/publish", {
        method: "POST",
        body: JSON.stringify({ examTypeKey, schoolClassKey: classFilter || null, isPublished: targetState }),
      });
      toast.success(targetState ? "Timetable published" : "Timetable unpublished");
      setPublishTarget(null);
      loadEntries(examTypeKey);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update publish status");
    }
  };

  const duration = durationLabel(draft.startTime, draft.endTime);
  const totalCount = statusCounts.Draft + statusCounts.Scheduled + statusCounts.Ongoing + statusCounts.Completed;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mx-auto max-w-[1400px]">
        {/* Header */}
        <div className="mb-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <span>Academic</span>
          <span>/</span>
          <span className="font-medium text-foreground">Exam Timetable</span>
        </div>
        <PageHeader
          title="Exam Timetable Builder"
          actions={
            <>
              {filtered.length > 0 && (
                <Button
                  variant="outline"
                  className={cn(
                    "h-10 gap-1.5 rounded-md border-[#1597E5]/30 text-[#1597E5] hover:bg-[#1597E5]/5 hover:text-[#1597E5]",
                    allPublished && "border-[#22A861]/30 text-[#22A861] hover:bg-[#22A861]/5 hover:text-[#22A861]",
                  )}
                  onClick={() => setPublishTarget(allPublished ? "unpublish" : "publish")}
                >
                  {allPublished ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  {allPublished ? "Unpublish" : "Publish Timetable"}
                </Button>
              )}
              <Button
                className="h-10 gap-1.5 rounded-md bg-[#FF6B35] text-white shadow-sm hover:bg-[#FF6B35]/90"
                onClick={openNew}
                disabled={!examTypeKey}
              >
                <Plus className="h-4 w-4" /> Add Exam Schedule
              </Button>
            </>
          }
        />
        <p className="-mt-4 mb-5 text-sm text-muted-foreground">
          Schedule exam dates, time slots, rooms and invigilators per class and subject.
        </p>

        {/* KPI chevrons -- same treatment as Question Bank's stat strip */}
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
          <ChevronStat icon={ListChecks} label="Total Exams" value={totalCount} colorClass="bg-primary" position="first" />
          <ChevronStat icon={CalendarRange} label="Scheduled" value={statusCounts.Scheduled} colorClass="bg-info" position="middle" />
          <ChevronStat icon={Clock} label="Ongoing" value={statusCounts.Ongoing} colorClass="bg-warning" position="middle" />
          <ChevronStat icon={CalendarClock} label="Completed" value={statusCounts.Completed} colorClass="bg-success" position="middle" />
          <ChevronStat icon={Pencil} label="Draft" value={statusCounts.Draft} colorClass="bg-muted-foreground/70" position="last" />
        </div>

        {/* Toolbar */}
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-[#E2E8F0] bg-white p-2.5 shadow-sm dark:border-border dark:bg-card">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search subject, class, room..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-[#1597E5]"
            />
          </div>
          <Select value={examTypeKey} onValueChange={setExamTypeKey}>
            <SelectTrigger className="h-9 w-full rounded-md sm:w-[180px]"><SelectValue placeholder="Exam Type" /></SelectTrigger>
            <SelectContent>
              {examTypes.map((e) => <SelectItem key={e.examTypeKey} value={e.examTypeKey}>{e.examTypeName}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={classFilter || "all"} onValueChange={(v) => setClassFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="h-9 w-full rounded-md sm:w-[150px]"><SelectValue placeholder="All Classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((c: any) => <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>{c.className}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusLabel | "all")}>
            <SelectTrigger className="h-9 w-full rounded-md sm:w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Scheduled">Scheduled</SelectItem>
              <SelectItem value="Ongoing">Ongoing</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          {anyPublished && (
            <Badge className="gap-1 rounded-md border-0 bg-[#22A861]/12 text-[#178750] font-semibold ml-auto">
              <Lock className="h-3 w-3" /> {allPublished ? "Published" : "Partially published"}
            </Badge>
          )}
        </div>

        {/* Quick status chips */}
        {baseFiltered.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Quick:</span>
            {(Object.keys(STATUS_STYLES) as StatusLabel[]).map((label) => {
              const count = statusCounts[label];
              if (count === 0) return null;
              const active = statusFilter === label;
              return (
                <button
                  key={label}
                  onClick={() => setStatusFilter(active ? "all" : label)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition-shadow",
                    STATUS_STYLES[label],
                    active && "ring-2 ring-offset-1 ring-[#1597E5]/40",
                  )}
                >
                  {label} <span className="opacity-80">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Main list */}
        {!examTypeKey && !loading ? (
          <div className="rounded-md border border-dashed border-[#E2E8F0] bg-white p-10 text-center text-sm text-muted-foreground dark:bg-card">
            Set up an exam type in Exam Type Master first.
          </div>
        ) : loading ? (
          <div className="divide-y divide-border rounded-md border border-[#E2E8F0] bg-white shadow-sm dark:border-border dark:bg-card">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="h-9 w-9 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-md border border-dashed border-[#E2E8F0] bg-white p-12 text-center dark:bg-card">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#1597E5]/10 text-[#1597E5]">
              <CalendarClock className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium">No exam slots found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {baseFiltered.length === 0
                ? `No exam schedule created yet for ${examTypeName || "this exam"}.`
                : "No slots match the current filters — try clearing search or status."}
            </p>
            {baseFiltered.length === 0 && (
              <Button className="mt-4 h-9 gap-1.5 rounded-md bg-[#FF6B35] text-white hover:bg-[#FF6B35]/90" onClick={openNew}>
                <Plus className="h-3.5 w-3.5" /> Add Exam Schedule
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-[#E2E8F0] bg-white shadow-sm dark:border-border dark:bg-card">
            {/* Desktop / tablet: plain numbered schedule table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground dark:border-border dark:bg-muted/30">
                    <th className="w-12 px-4 py-2.5">#</th>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Day</th>
                    <th className="px-3 py-2.5">Time</th>
                    <th className="px-3 py-2.5">Subject</th>
                    <th className="px-3 py-2.5">Class / Section</th>
                    <th className="px-3 py-2.5">Room</th>
                    <th className="px-3 py-2.5">Invigilator</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="w-20 px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedEntries.map((e, i) => {
                    const status = statusFor(e);
                    const palette = paletteFor(e.subjectKey);
                    return (
                      <tr key={e.timetableEntryKey} className="border-b border-border last:border-0 hover:bg-[#F8FAFC] dark:hover:bg-muted/20">
                        <td className="px-4 py-3 text-muted-foreground">{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                        <td className="px-3 py-3 whitespace-nowrap">{formatDate(e.examDate)}</td>
                        <td className="px-3 py-3 text-muted-foreground">{dayOfWeek(e.examDate)}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                          {e.startTime.slice(0, 5)} - {e.endTime.slice(0, 5)}
                        </td>
                        <td className="px-3 py-3">
                          <span className={cn("inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold", palette.pill, SUBJECT_PILL_SHINE)}>
                            {subjectName(e.subjectKey)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{className(e.schoolClassKey)}</td>
                        <td className="px-3 py-3 text-muted-foreground">{e.roomName ?? "—"}</td>
                        <td className="px-3 py-3 text-muted-foreground">{e.invigilatorName ?? "Unassigned"}</td>
                        <td className="px-3 py-3">
                          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", status.className)}>{status.label}</span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="inline-flex items-center gap-0.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-[#1597E5] hover:bg-[#1597E5]/10 hover:text-[#1597E5]" onClick={() => openEdit(e)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit schedule</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(e)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete schedule</TooltipContent>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: compact card list -- the table's columns don't fit a phone */}
            <div className="flex flex-col gap-2.5 p-2.5 lg:hidden">
              {pagedEntries.map((e, i) => {
                const status = statusFor(e);
                const palette = paletteFor(e.subjectKey);
                return (
                  <div key={e.timetableEntryKey} className="rounded-md border border-[#E2E8F0] bg-white p-3.5 dark:border-border dark:bg-card">
                    <div className="flex items-start gap-3">
                      <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md ring-1", palette.bg, palette.text, palette.ring)}>
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">#{(currentPage - 1) * PAGE_SIZE + i + 1}</span>
                          <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold", palette.pill, SUBJECT_PILL_SHINE)}>
                            {subjectName(e.subjectKey)}
                          </span>
                          <Badge variant="outline" className="rounded-md border-[#E2E8F0] text-[11px]">{className(e.schoolClassKey)}</Badge>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarClock className="h-3 w-3" /> {formatDate(e.examDate)} · {dayOfWeek(e.examDate)}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {e.startTime.slice(0, 5)}–{e.endTime.slice(0, 5)}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {e.roomName ?? "Not assigned"}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <User2 className="h-3 w-3" /> {e.invigilatorName ?? "Unassigned"}
                        </div>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", status.className)}>{status.label}</span>
                          <div className="flex items-center gap-0.5">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-[#1597E5] hover:bg-[#1597E5]/10 hover:text-[#1597E5]" onClick={() => openEdit(e)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(e)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] px-4 py-3 text-sm text-muted-foreground dark:border-border">
              <span>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} exam
                {filtered.length === 1 ? "" : "s"}
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
                      className={cn("h-8 w-8 rounded-md", p === currentPage && "bg-[#FF6B35] hover:bg-[#FF6B35]/90")}
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

        <FormDialog
          open={open}
          onOpenChange={setOpen}
          title={editing ? "Edit Exam Schedule" : "Add Exam Schedule"}
          submitLabel={editing ? "Save Changes" : "Add"}
          onSubmit={save}
          submitting={saving}
          size="md"
        >
          <div className="space-y-5">
            {/* Section: Exam Information */}
            <div>
              <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <ListChecks className="h-3.5 w-3.5" /> Exam Information
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label required>Class</Label>
                  <Select value={draft.schoolClassKey} onValueChange={(v) => setDraft({ ...draft, schoolClassKey: v })}>
                    <SelectTrigger className="rounded-md"><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c: any) => <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>{c.className}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label required>Subject</Label>
                  <Select value={draft.subjectKey} onValueChange={(v) => setDraft({ ...draft, subjectKey: v })}>
                    <SelectTrigger className="rounded-md"><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s: any) => <SelectItem key={s.subjectKey} value={s.subjectKey}>{s.subjectName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Section: Schedule */}
            <div>
              <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <CalendarRange className="h-3.5 w-3.5" /> Schedule
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label required>Exam Date</Label>
                  <DatePicker value={draft.examDate} onChange={(v) => setDraft({ ...draft, examDate: v })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label required>Start Time</Label>
                    <Input type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} className="rounded-md" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label required>End Time</Label>
                    <Input type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} className="rounded-md" required />
                  </div>
                </div>
                {duration && (
                  <div className="flex items-center gap-1.5 rounded-md bg-[#1597E5]/8 px-3 py-2 text-xs font-medium text-[#0D6FAE]">
                    <Clock className="h-3.5 w-3.5" /> Duration: {duration}
                  </div>
                )}
              </div>
            </div>

            {/* Section: Venue & Invigilator */}
            <div>
              <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" /> Venue &amp; Invigilator
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Room</Label>
                  <Input value={draft.roomName} onChange={(e) => setDraft({ ...draft, roomName: e.target.value })} placeholder="Room 101" className="rounded-md" />
                </div>
                <div className="space-y-1.5">
                  <Label>Invigilator</Label>
                  <Select value={draft.invigilatorKey || "none"} onValueChange={(v) => setDraft({ ...draft, invigilatorKey: v === "none" ? "" : v })}>
                    <SelectTrigger className="rounded-md"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {staff.map((s: any) => <SelectItem key={s.staffProfileKey} value={s.staffProfileKey}>{s.userName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </FormDialog>

        <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this exam slot?</AlertDialogTitle>
              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); confirmDelete(); }}>
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!publishTarget} onOpenChange={(v) => !v && setPublishTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{publishTarget === "publish" ? "Publish this timetable?" : "Unpublish this timetable?"}</AlertDialogTitle>
              <AlertDialogDescription>
                {publishTarget === "publish"
                  ? "Students and staff will be able to see exam dates, times and rooms once published."
                  : "This will hide the timetable from students and staff until republished."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => { e.preventDefault(); doPublishToggle(); }}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
