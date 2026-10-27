import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ClipboardList, BookOpen } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAcademicYear } from "@/hooks/use-academic-year";

export const Route = createFileRoute("/exam-configuration")({
  head: () => ({
    meta: [
      { title: "Exam Configuration — Akira School ERP" },
      { name: "description", content: "Map exam types to classes and subjects with max/min marks and grading scheme." },
    ],
  }),
  component: ExamConfigurationPage,
});

type ExamType = { examTypeKey: string; examTypeName: string; examTypeCode: string; isActive: boolean };
type GradingScheme = { gradingSchemeKey: string; schemeName: string; isActive: boolean };
type SchoolClass = { schoolClassKey: string; className: string };
type Subject = { subjectKey: string; subjectName: string };

type ExamConfig = {
  examConfigKey: string;
  examTypeKey: string;
  schoolClassKey: string;
  subjectKey: string;
  academicYearKey: string;
  maxMarks: number;
  minPassMarks: number;
  hasPractical: boolean;
  practicalMaxMarks: number;
  gradingSchemeKey: string;
};

const emptyDraft = {
  examTypeKey: "", schoolClassKey: "", subjectKey: "", maxMarks: 100, minPassMarks: 33,
  hasPractical: false, practicalMaxMarks: 0, gradingSchemeKey: "",
};

function ExamConfigurationPage() {
  const { selectedYearKey: yearKey } = useAcademicYear();
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [gradingSchemes, setGradingSchemes] = useState<GradingScheme[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [configs, setConfigs] = useState<ExamConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const [classFilter, setClassFilter] = useState("");
  const [examTypeFilter, setExamTypeFilter] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExamConfig | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExamConfig | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/ExamType").catch(() => []),
      apiFetch("/api/GradingScheme").catch(() => []),
      apiFetch("/api/SchoolClass").catch(() => []),
      apiFetch("/api/Subject").catch(() => []),
      apiFetch("/api/ExamConfiguration").catch(() => []),
    ])
      .then(([et, gs, sc, sub, cfg]) => {
        setExamTypes(et);
        setGradingSchemes(gs);
        setClasses(sc);
        setSubjects(sub);
        setConfigs(cfg);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load exam configuration"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const examTypeName = (k: string) => examTypes.find((e) => e.examTypeKey === k)?.examTypeName ?? "—";
  const className = (k: string) => classes.find((c: any) => c.schoolClassKey === k)?.className ?? "—";
  const subjectName = (k: string) => subjects.find((s: any) => s.subjectKey === k)?.subjectName ?? "—";
  const schemeName = (k: string) => gradingSchemes.find((g) => g.gradingSchemeKey === k)?.schemeName ?? "Default";

  const filtered = useMemo(() => configs.filter((c) =>
    (!classFilter || c.schoolClassKey === classFilter) &&
    (!examTypeFilter || c.examTypeKey === examTypeFilter) &&
    (!yearKey || c.academicYearKey === yearKey),
  ), [configs, classFilter, examTypeFilter, yearKey]);

  const openNew = () => {
    setEditing(null);
    setDraft({ ...emptyDraft, examTypeKey: examTypeFilter || examTypes[0]?.examTypeKey || "", schoolClassKey: classFilter || classes[0]?.schoolClassKey || "" });
    setOpen(true);
  };

  const openEdit = (c: ExamConfig) => {
    setEditing(c);
    setDraft({
      examTypeKey: c.examTypeKey, schoolClassKey: c.schoolClassKey, subjectKey: c.subjectKey,
      maxMarks: c.maxMarks, minPassMarks: c.minPassMarks, hasPractical: c.hasPractical,
      practicalMaxMarks: c.practicalMaxMarks, gradingSchemeKey: c.gradingSchemeKey,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.examTypeKey) return toast.error("Select an exam type.");
    if (!draft.schoolClassKey) return toast.error("Select a class.");
    if (!draft.subjectKey) return toast.error("Select a subject.");
    if (!yearKey) return toast.error("Select an academic year first.");
    if (draft.minPassMarks > draft.maxMarks) return toast.error("Pass marks cannot exceed max marks.");

    const duplicate = configs.some((c) =>
      c.examConfigKey !== editing?.examConfigKey &&
      c.examTypeKey === draft.examTypeKey && c.schoolClassKey === draft.schoolClassKey && c.subjectKey === draft.subjectKey &&
      c.academicYearKey === yearKey,
    );
    if (duplicate) return toast.error("A configuration already exists for this exam type, class and subject.");

    setSaving(true);
    try {
      const payload = { ...draft, gradingSchemeKey: draft.gradingSchemeKey || null };
      if (editing) {
        await apiFetch(`/api/ExamConfiguration/${editing.examConfigKey}`, {
          method: "PUT",
          body: JSON.stringify({ examConfigKey: editing.examConfigKey, ...payload }),
        });
        toast.success("Exam configuration updated");
      } else {
        await apiFetch("/api/ExamConfiguration", {
          method: "POST",
          body: JSON.stringify({ ...payload, academicYearKey: yearKey }),
        });
        toast.success("Exam configuration created");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save exam configuration");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/ExamConfiguration/${deleteTarget.examConfigKey}`, { method: "DELETE" });
      toast.success("Exam configuration removed");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove exam configuration");
    }
  };

  const columns: Column<ExamConfig>[] = [
    { key: "examType", header: "Exam Type", sortValue: (c) => examTypeName(c.examTypeKey), accessor: (c) => <span className="font-medium">{examTypeName(c.examTypeKey)}</span> },
    { key: "class", header: "Class", sortValue: (c) => className(c.schoolClassKey), accessor: (c) => className(c.schoolClassKey) },
    { key: "subject", header: "Subject", sortValue: (c) => subjectName(c.subjectKey), accessor: (c) => subjectName(c.subjectKey) },
    {
      key: "marks", header: "Marks (Max / Pass)",
      accessor: (c) => (
        <div className="flex items-center gap-1.5">
          <Badge className="rounded-md border-0 bg-primary text-primary-foreground font-semibold">{c.maxMarks}</Badge>
          <span className="text-muted-foreground">/</span>
          <Badge className="rounded-md border-0 bg-success text-success-foreground font-semibold">{c.minPassMarks}</Badge>
          {c.hasPractical && <Badge className="ml-1 rounded-md border-0 bg-info text-info-foreground font-semibold">+{c.practicalMaxMarks} practical</Badge>}
        </div>
      ),
    },
    { key: "scheme", header: "Grading Scheme", className: "hidden md:table-cell", accessor: (c) => <span className="text-muted-foreground">{schemeName(c.gradingSchemeKey)}</span> },
    {
      key: "actions", header: "", className: "text-right",
      accessor: (c) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-purple-600 hover:text-purple-700" onClick={() => openEdit(c)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive" onClick={() => setDeleteTarget(c)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const noPrerequisites = !loading && examTypes.length === 0;

  return (
    <div>
      <PageHeader
        title="Exam Configuration"
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew} disabled={noPrerequisites}>
            <Plus className="h-4 w-4" /> Add Configuration
          </Button>
        }
      />

      {noPrerequisites && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-[oklch(0.45_0.12_65)]">
          <ClipboardList className="mt-0.5 h-4 w-4 shrink-0" />
          <span>No exam types found. Set up exam types in Exam Type Master before creating configurations.</span>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:max-w-md">
        <div className="flex items-center gap-2.5 rounded-md border border-[#FF6B35]/30 border-l-4 border-l-[#FF6B35] bg-[#FF6B35]/[0.06] px-3 py-2 shadow-sm">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#FF6B35] text-white shadow-sm">
            <ClipboardList className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] leading-tight text-muted-foreground">Configurations</div>
            <div className="font-display text-base font-semibold leading-tight text-[#FF6B35]">{configs.length}</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-md border border-[#1597E5]/30 border-l-4 border-l-[#1597E5] bg-[#1597E5]/[0.06] px-3 py-2 shadow-sm">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#1597E5] text-white shadow-sm">
            <BookOpen className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] leading-tight text-muted-foreground">Subjects</div>
            <div className="font-display text-base font-semibold leading-tight text-[#1597E5]">{new Set(configs.map((c) => c.subjectKey)).size}</div>
          </div>
        </div>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        rowKey={(c) => c.examConfigKey}
        searchable={false}
        storageKey="exam-configuration"
        emptyMessage={loading ? "Loading..." : "No exam configurations yet."}
        toolbar={
          <>
            <Select value={examTypeFilter || "all"} onValueChange={(v) => setExamTypeFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="h-9 w-[160px] rounded-md"><SelectValue placeholder="All Exam Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exam Types</SelectItem>
                {examTypes.map((e) => <SelectItem key={e.examTypeKey} value={e.examTypeKey}>{e.examTypeName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={classFilter || "all"} onValueChange={(v) => setClassFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="h-9 w-[140px] rounded-md"><SelectValue placeholder="All Classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((c: any) => <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>{c.className}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Exam Configuration" : "Add Exam Configuration"}
        submitLabel={editing ? "Save Changes" : "Create"}
        onSubmit={save}
        submitting={saving}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label required>Exam Type</Label>
              <Select value={draft.examTypeKey} onValueChange={(v) => setDraft({ ...draft, examTypeKey: v })}>
                <SelectTrigger className="rounded-md"><SelectValue placeholder="Select exam type" /></SelectTrigger>
                <SelectContent>
                  {examTypes.filter((e) => e.isActive).map((e) => <SelectItem key={e.examTypeKey} value={e.examTypeKey}>{e.examTypeName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label required>Class</Label>
              <Select value={draft.schoolClassKey} onValueChange={(v) => setDraft({ ...draft, schoolClassKey: v })}>
                <SelectTrigger className="rounded-md"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c: any) => <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>{c.className}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label required>Max Marks</Label>
              <Input type="number" min={1} value={draft.maxMarks} onChange={(e) => setDraft({ ...draft, maxMarks: Number(e.target.value) })} className="rounded-md" required />
            </div>
            <div className="space-y-1.5">
              <Label required>Min Pass Marks</Label>
              <Input type="number" min={0} value={draft.minPassMarks} onChange={(e) => setDraft({ ...draft, minPassMarks: Number(e.target.value) })} className="rounded-md" required />
            </div>
          </div>
          <label className="flex items-center justify-between rounded-md border border-border p-3">
            <div className="text-sm font-medium">Has separate practical component</div>
            <input type="checkbox" checked={draft.hasPractical} onChange={(e) => setDraft({ ...draft, hasPractical: e.target.checked })} className="h-4 w-4 rounded" />
          </label>
          {draft.hasPractical && (
            <div className="space-y-1.5">
              <Label required>Practical Max Marks</Label>
              <Input type="number" min={0} value={draft.practicalMaxMarks} onChange={(e) => setDraft({ ...draft, practicalMaxMarks: Number(e.target.value) })} className="rounded-md" required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Grading Scheme (optional override)</Label>
            <Select value={draft.gradingSchemeKey || "default"} onValueChange={(v) => setDraft({ ...draft, gradingSchemeKey: v === "default" ? "" : v })}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Use default scheme" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Use default scheme</SelectItem>
                {gradingSchemes.map((g) => <SelectItem key={g.gradingSchemeKey} value={g.gradingSchemeKey}>{g.schemeName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this exam configuration?</AlertDialogTitle>
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
    </div>
  );
}
