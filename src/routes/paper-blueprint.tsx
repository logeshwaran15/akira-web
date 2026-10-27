import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Trash2, Pencil, ListChecks, Clock, Layers, CheckCircle2, AlertTriangle, Loader2, GripVertical,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/paper-blueprint")({
  head: () => ({
    meta: [
      { title: "Paper Blueprint Setup — Akira School ERP" },
      { name: "description", content: "Define reusable paper patterns: section-wise question counts and marks drawn from the Question Bank." },
    ],
  }),
  component: PaperBlueprintPage,
});

type ExamType = { examTypeKey: string; examTypeName: string };
type Subject = { subjectKey: string; subjectName: string };
type SchoolClass = { schoolClassKey: string; className: string };
type QuestionType = "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER" | "LONG_ANSWER" | "FILL_BLANK" | "MATCH";
type Difficulty = "EASY" | "MEDIUM" | "HARD";

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "MCQ", label: "Multiple Choice" },
  { value: "TRUE_FALSE", label: "True / False" },
  { value: "SHORT_ANSWER", label: "Short Answer" },
  { value: "LONG_ANSWER", label: "Long Answer" },
  { value: "FILL_BLANK", label: "Fill in the Blank" },
  { value: "MATCH", label: "Match the Following" },
];

type Section = {
  sectionKey?: string;
  sectionLabel: string;
  questionType: QuestionType;
  difficultyLevel: Difficulty | "";
  questionCount: number;
  marksPerQuestion: number;
  sortOrder: number;
};

type Blueprint = {
  blueprintKey: string;
  blueprintName: string;
  examTypeKey: string | null;
  examTypeName: string | null;
  subjectKey: string;
  subjectName: string;
  schoolClassKey: string | null;
  className: string | null;
  durationMinutes: number | null;
  instructions: string | null;
  isActive: boolean;
  totalQuestions: number;
  totalMarks: number;
  createdOn: string;
};

type AvailabilityRow = {
  sectionKey: string;
  sectionLabel: string;
  questionType: QuestionType;
  difficultyLevel: Difficulty | null;
  required: number;
  available: number;
  isSufficient: boolean;
};

const emptySection = (sortOrder: number): Section => ({
  sectionLabel: `Section ${String.fromCharCode(65 + sortOrder)}`,
  questionType: "MCQ", difficultyLevel: "", questionCount: 5, marksPerQuestion: 1, sortOrder,
});

const emptyDraft = {
  blueprintName: "", examTypeKey: "", subjectKey: "", schoolClassKey: "",
  durationMinutes: "", instructions: "", isActive: true,
};

function PaperBlueprintPage() {
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);

  const [subjectFilter, setSubjectFilter] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Blueprint | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [sections, setSections] = useState<Section[]>([emptySection(0)]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Blueprint | null>(null);

  const [availabilityFor, setAvailabilityFor] = useState<Blueprint | null>(null);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/ExamType").catch(() => []),
      apiFetch("/api/Subject").catch(() => []),
      apiFetch("/api/SchoolClass").catch(() => []),
      apiFetch("/api/PaperBlueprint").catch(() => []),
    ])
      .then(([et, sub, sc, bp]) => {
        setExamTypes(et);
        setSubjects(sub);
        setClasses(sc);
        setBlueprints(bp);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load paper blueprints"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => blueprints.filter((b) => !subjectFilter || b.subjectKey === subjectFilter), [blueprints, subjectFilter]);

  const openNew = () => {
    setEditing(null);
    setDraft({ ...emptyDraft, subjectKey: subjectFilter || subjects[0]?.subjectKey || "" });
    setSections([emptySection(0)]);
    setOpen(true);
  };

  const openEdit = async (b: Blueprint) => {
    setEditing(b);
    setDraft({
      blueprintName: b.blueprintName, examTypeKey: b.examTypeKey ?? "", subjectKey: b.subjectKey, schoolClassKey: b.schoolClassKey ?? "",
      durationMinutes: b.durationMinutes != null ? String(b.durationMinutes) : "", instructions: b.instructions ?? "", isActive: b.isActive,
    });
    setOpen(true);
    try {
      const secs: any[] = await apiFetch(`/api/PaperBlueprint/${b.blueprintKey}/sections`);
      setSections(secs.length > 0
        ? secs.map((s) => ({
            sectionKey: s.sectionKey, sectionLabel: s.sectionLabel, questionType: s.questionType,
            difficultyLevel: s.difficultyLevel ?? "", questionCount: s.questionCount, marksPerQuestion: s.marksPerQuestion, sortOrder: s.sortOrder,
          }))
        : [emptySection(0)]);
    } catch {
      setSections([emptySection(0)]);
    }
  };

  const addSection = () => setSections((prev) => [...prev, emptySection(prev.length)]);
  const removeSection = (idx: number) => setSections((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, sortOrder: i })));
  const updateSection = (idx: number, patch: Partial<Section>) => setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const totalQuestions = sections.reduce((sum, s) => sum + (s.questionCount || 0), 0);
  const totalMarks = sections.reduce((sum, s) => sum + (s.questionCount || 0) * (s.marksPerQuestion || 0), 0);

  const save = async () => {
    if (!draft.blueprintName.trim()) return toast.error("Blueprint name is required.");
    if (!draft.subjectKey) return toast.error("Select a subject.");
    if (sections.length === 0) return toast.error("Add at least one section.");
    for (const s of sections) {
      if (!s.sectionLabel.trim()) return toast.error("Every section needs a label.");
      if (s.questionCount <= 0) return toast.error(`"${s.sectionLabel}": question count must be greater than 0.`);
      if (s.marksPerQuestion <= 0) return toast.error(`"${s.sectionLabel}": marks per question must be greater than 0.`);
    }

    setSaving(true);
    try {
      const payload = {
        blueprintName: draft.blueprintName,
        examTypeKey: draft.examTypeKey || null,
        subjectKey: draft.subjectKey,
        schoolClassKey: draft.schoolClassKey || null,
        durationMinutes: draft.durationMinutes ? Number(draft.durationMinutes) : null,
        instructions: draft.instructions || null,
        isActive: draft.isActive,
        sections: sections.map((s) => ({
          sectionKey: s.sectionKey ?? null,
          sectionLabel: s.sectionLabel,
          questionType: s.questionType,
          difficultyLevel: s.difficultyLevel || null,
          questionCount: s.questionCount,
          marksPerQuestion: s.marksPerQuestion,
          sortOrder: s.sortOrder,
        })),
      };
      if (editing) {
        await apiFetch(`/api/PaperBlueprint/${editing.blueprintKey}`, { method: "PUT", body: JSON.stringify({ blueprintKey: editing.blueprintKey, ...payload }) });
        toast.success("Blueprint updated");
      } else {
        await apiFetch("/api/PaperBlueprint", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Blueprint created");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save blueprint");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/PaperBlueprint/${deleteTarget.blueprintKey}`, { method: "DELETE" });
      toast.success("Blueprint removed");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove blueprint");
    }
  };

  const openAvailability = (b: Blueprint) => {
    setAvailabilityFor(b);
    setAvailabilityLoading(true);
    apiFetch(`/api/PaperBlueprint/${b.blueprintKey}/availability`)
      .then((d: AvailabilityRow[]) => setAvailability(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to check availability"))
      .finally(() => setAvailabilityLoading(false));
  };

  return (
    <div>
      <PageHeader
        title="Paper Blueprint Setup"
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew} disabled={subjects.length === 0}>
            <Plus className="h-4 w-4" /> New Blueprint
          </Button>
        }
      />
      <p className="-mt-4 mb-5 text-sm text-muted-foreground">
        Define how many questions of each type and difficulty a paper should draw from the Question Bank, and how many marks each carries.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={subjectFilter || "all"} onValueChange={(v) => setSubjectFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="h-9 w-full rounded-md sm:w-[180px]"><SelectValue placeholder="All Subjects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map((s: any) => <SelectItem key={s.subjectKey} value={s.subjectKey}>{s.subjectName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Loading...</div>
      ) : subjects.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No subjects found. Set up subjects before creating a blueprint.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {blueprints.length === 0 ? "No paper blueprints yet. Click \"New Blueprint\" to create one." : "No blueprints match this filter."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((b) => (
            <div key={b.blueprintKey} className="rounded-md border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{b.blueprintName}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    <span>{b.subjectName}</span>
                    {b.examTypeName && <><span>·</span><span>{b.examTypeName}</span></>}
                    {b.className && <><span>·</span><span>{b.className}</span></>}
                  </div>
                </div>
                {!b.isActive && <Badge className="rounded-md border-0 bg-muted text-muted-foreground">Inactive</Badge>}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-md bg-muted/50 py-1.5">
                  <div className="flex items-center justify-center gap-1 font-semibold text-foreground"><Layers className="h-3 w-3" /> {b.totalQuestions}</div>
                  <div className="text-muted-foreground">Questions</div>
                </div>
                <div className="rounded-md bg-primary/10 py-1.5">
                  <div className="font-semibold text-primary">{b.totalMarks}</div>
                  <div className="text-muted-foreground">Marks</div>
                </div>
                <div className="rounded-md bg-muted/50 py-1.5">
                  <div className="flex items-center justify-center gap-1 font-semibold text-foreground">
                    <Clock className="h-3 w-3" /> {b.durationMinutes ?? "—"}
                  </div>
                  <div className="text-muted-foreground">Minutes</div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-md" onClick={() => openAvailability(b)}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Check Availability
                </Button>
                <Button size="sm" variant="ghost" className="h-8 gap-1.5 rounded-md text-purple-600 hover:text-purple-700" onClick={() => openEdit(b)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="ghost" className="ml-auto h-8 w-8 rounded-md p-0 text-destructive" onClick={() => setDeleteTarget(b)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / edit dialog */}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Blueprint" : "New Blueprint"}
        submitLabel={editing ? "Save Changes" : "Create Blueprint"}
        onSubmit={save}
        submitting={saving}
        size="xl"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label required>Blueprint Name</Label>
              <Input value={draft.blueprintName} onChange={(e) => setDraft({ ...draft, blueprintName: e.target.value })} placeholder="e.g. Mid-Term Science Paper Pattern" className="rounded-md" />
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
            <div className="space-y-1.5">
              <Label>Exam Type (optional)</Label>
              <Select value={draft.examTypeKey || "none"} onValueChange={(v) => setDraft({ ...draft, examTypeKey: v === "none" ? "" : v })}>
                <SelectTrigger className="rounded-md"><SelectValue placeholder="Any exam" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Any exam</SelectItem>
                  {examTypes.map((e) => <SelectItem key={e.examTypeKey} value={e.examTypeKey}>{e.examTypeName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Class (optional)</Label>
              <Select value={draft.schoolClassKey || "none"} onValueChange={(v) => setDraft({ ...draft, schoolClassKey: v === "none" ? "" : v })}>
                <SelectTrigger className="rounded-md"><SelectValue placeholder="Any class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Any class</SelectItem>
                  {classes.map((c: any) => <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>{c.className}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Duration (minutes)</Label>
              <Input type="number" min={1} value={draft.durationMinutes} onChange={(e) => setDraft({ ...draft, durationMinutes: e.target.value })} placeholder="e.g. 90" className="rounded-md" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Instructions (optional)</Label>
            <Textarea value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} placeholder="General instructions printed on the paper" className="rounded-md" rows={2} />
          </div>

          {/* Sections builder */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Sections</Label>
              <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 rounded-md" onClick={addSection}>
                <Plus className="h-3.5 w-3.5" /> Add Section
              </Button>
            </div>
            <div className="space-y-2">
              {sections.map((s, idx) => (
                <div key={idx} className="rounded-md border border-border p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1.4fr_1.2fr_1fr_0.8fr_0.8fr_auto] sm:items-end">
                    <div className="hidden pb-2 text-muted-foreground sm:block">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Section Label</Label>
                      <Input value={s.sectionLabel} onChange={(e) => updateSection(idx, { sectionLabel: e.target.value })} className="h-9 rounded-md" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Question Type</Label>
                      <Select value={s.questionType} onValueChange={(v) => updateSection(idx, { questionType: v as QuestionType })}>
                        <SelectTrigger className="h-9 rounded-md"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {QUESTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Difficulty</Label>
                      <Select value={s.difficultyLevel || "any"} onValueChange={(v) => updateSection(idx, { difficultyLevel: v === "any" ? "" : (v as Difficulty) })}>
                        <SelectTrigger className="h-9 rounded-md"><SelectValue placeholder="Any" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="EASY">Easy</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HARD">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Count</Label>
                      <Input type="number" min={1} value={s.questionCount} onChange={(e) => updateSection(idx, { questionCount: Number(e.target.value) })} className="h-9 rounded-md" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Marks Each</Label>
                      <Input type="number" min={0.5} step="0.5" value={s.marksPerQuestion} onChange={(e) => updateSection(idx, { marksPerQuestion: Number(e.target.value) })} className="h-9 rounded-md" />
                    </div>
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="h-9 w-9 rounded-md text-destructive"
                      onClick={() => removeSection(idx)}
                      disabled={sections.length === 1}
                      title="Remove section"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="mt-1.5 text-right text-[11px] text-muted-foreground">
                    Subtotal: {s.questionCount || 0} × {s.marksPerQuestion || 0} = {(s.questionCount || 0) * (s.marksPerQuestion || 0)} marks
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
            <span className="text-sm font-medium">Paper Total</span>
            <span className="font-display text-base font-semibold">{totalQuestions} questions · {totalMarks} marks</span>
          </div>

          <label className="flex items-center justify-between rounded-md border border-border p-3">
            <div className="text-sm font-medium">Active</div>
            <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} className="h-4 w-4 rounded" aria-label="Active" />
          </label>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{deleteTarget?.blueprintName}"?</AlertDialogTitle>
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

      {/* Availability check dialog */}
      <FormDialog
        open={!!availabilityFor}
        onOpenChange={(v) => !v && setAvailabilityFor(null)}
        title={`Question Availability — ${availabilityFor?.blueprintName ?? ""}`}
        submitLabel="Close"
        cancelLabel="Close"
        onSubmit={() => setAvailabilityFor(null)}
        size="md"
      >
        {availabilityLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking...
          </div>
        ) : availability.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No sections to check.</div>
        ) : (
          <div className="space-y-2">
            {availability.map((a) => (
              <div key={a.sectionKey} className={cn("flex items-center justify-between rounded-md border p-3 text-sm", a.isSufficient ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5")}>
                <div>
                  <div className="font-medium">{a.sectionLabel}</div>
                  <div className="text-xs text-muted-foreground">
                    {QUESTION_TYPES.find((t) => t.value === a.questionType)?.label ?? a.questionType}
                    {a.difficultyLevel ? ` · ${a.difficultyLevel}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("font-semibold", a.isSufficient ? "text-success" : "text-destructive")}>{a.available} / {a.required}</span>
                  {a.isSufficient ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}
                </div>
              </div>
            ))}
            {availability.some((a) => !a.isSufficient) && (
              <p className="text-xs text-muted-foreground">
                Some sections don't have enough approved questions yet — add more to the Question Bank or adjust the blueprint.
              </p>
            )}
          </div>
        )}
      </FormDialog>
    </div>
  );
}
