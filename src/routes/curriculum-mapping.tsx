import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
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
import {
  Search, Plus, Pencil, Trash2, ChevronRight, BookOpen, Layers, FileText, Target,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/curriculum-mapping")({
  head: () => ({
    meta: [
      { title: "Curriculum Mapping — Akira School ERP" },
      { name: "description", content: "Map every subject to its units, chapters, and learning outcomes." },
    ],
  }),
  component: CurriculumMappingPage,
});

type SchoolClass = { schoolClassKey: string; className: string };
type Subject = { subjectKey: string; subjectName: string };
type Curriculum = {
  curriculumKey: string; schoolClassKey: string; className: string;
  subjectKey: string; subjectName: string; curriculumName: string | null; isActive: boolean;
};
type Unit = { curriculumUnitKey: string; curriculumKey: string; unitName: string; unitOrder: number; estimatedPeriods: number | null; isActive: boolean };
type Chapter = { curriculumChapterKey: string; curriculumUnitKey: string; chapterName: string; chapterOrder: number; isActive: boolean };
type Outcome = { curriculumLearningOutcomeKey: string; curriculumChapterKey: string; outcomeText: string; sortOrder: number; isActive: boolean };

function CurriculumMappingPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [items, setItems] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");

  const [expandedCurriculum, setExpandedCurriculum] = useState<Set<string>>(new Set());
  const [units, setUnits] = useState<Record<string, Unit[]>>({});
  const [expandedUnit, setExpandedUnit] = useState<Set<string>>(new Set());
  const [chapters, setChapters] = useState<Record<string, Chapter[]>>({});
  const [expandedChapter, setExpandedChapter] = useState<Set<string>>(new Set());
  const [outcomes, setOutcomes] = useState<Record<string, Outcome[]>>({});

  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [curriculumDraft, setCurriculumDraft] = useState({ schoolClassKey: "", subjectKey: "", curriculumName: "" });
  const [savingCurriculum, setSavingCurriculum] = useState(false);
  const [deleteCurriculumTarget, setDeleteCurriculumTarget] = useState<Curriculum | null>(null);

  const [unitDialog, setUnitDialog] = useState<{ curriculumKey: string; editing: Unit | null } | null>(null);
  const [unitDraft, setUnitDraft] = useState({ unitName: "", unitOrder: "0", estimatedPeriods: "" });
  const [savingUnit, setSavingUnit] = useState(false);
  const [deleteUnitTarget, setDeleteUnitTarget] = useState<{ curriculumKey: string; unit: Unit } | null>(null);

  const [chapterDialog, setChapterDialog] = useState<{ curriculumUnitKey: string; editing: Chapter | null } | null>(null);
  const [chapterDraft, setChapterDraft] = useState({ chapterName: "", chapterOrder: "0" });
  const [savingChapter, setSavingChapter] = useState(false);
  const [deleteChapterTarget, setDeleteChapterTarget] = useState<{ curriculumUnitKey: string; chapter: Chapter } | null>(null);

  const [outcomeDialog, setOutcomeDialog] = useState<{ curriculumChapterKey: string; editing: Outcome | null } | null>(null);
  const [outcomeDraft, setOutcomeDraft] = useState({ outcomeText: "", sortOrder: "0" });
  const [savingOutcome, setSavingOutcome] = useState(false);
  const [deleteOutcomeTarget, setDeleteOutcomeTarget] = useState<{ curriculumChapterKey: string; outcome: Outcome } | null>(null);

  useEffect(() => {
    Promise.all([apiFetch("/api/SchoolClass"), apiFetch("/api/Subject")])
      .then(([c, s]) => {
        setClasses(c);
        setSubjects(s);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load setup data"));
  }, []);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (classFilter !== "all") params.set("schoolClassId", classFilter);
    if (subjectFilter !== "all") params.set("subjectId", subjectFilter);
    if (search.trim()) params.set("search", search.trim());
    apiFetch(`/api/Curriculum?${params.toString()}`)
      .then((d: Curriculum[]) => setItems(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load curriculum map"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [classFilter, subjectFilter]);
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // ---- Curriculum CRUD ----

  const openNewCurriculum = () => {
    setCurriculumDraft({ schoolClassKey: "", subjectKey: "", curriculumName: "" });
    setCurriculumOpen(true);
  };

  const saveCurriculum = async () => {
    if (!curriculumDraft.schoolClassKey || !curriculumDraft.subjectKey) {
      toast.error("Choose a class and subject.");
      return;
    }
    setSavingCurriculum(true);
    try {
      await apiFetch("/api/Curriculum", {
        method: "POST",
        body: JSON.stringify({
          schoolClassKey: curriculumDraft.schoolClassKey,
          subjectKey: curriculumDraft.subjectKey,
          curriculumName: curriculumDraft.curriculumName || null,
        }),
      });
      toast.success("Curriculum map created");
      setCurriculumOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create curriculum map");
    } finally {
      setSavingCurriculum(false);
    }
  };

  const confirmDeleteCurriculum = async () => {
    if (!deleteCurriculumTarget) return;
    try {
      await apiFetch(`/api/Curriculum/${deleteCurriculumTarget.curriculumKey}`, { method: "DELETE" });
      toast.success("Curriculum map removed");
      setDeleteCurriculumTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove curriculum map");
    }
  };

  // ---- Expand / lazy load ----

  const toggleCurriculum = (c: Curriculum) => {
    setExpandedCurriculum((prev) => {
      const next = new Set(prev);
      if (next.has(c.curriculumKey)) {
        next.delete(c.curriculumKey);
      } else {
        next.add(c.curriculumKey);
        if (!units[c.curriculumKey]) {
          apiFetch(`/api/Curriculum/${c.curriculumKey}/units`)
            .then((d: Unit[]) => setUnits((prev2) => ({ ...prev2, [c.curriculumKey]: d })))
            .catch(() => {});
        }
      }
      return next;
    });
  };

  const toggleUnit = (u: Unit) => {
    setExpandedUnit((prev) => {
      const next = new Set(prev);
      if (next.has(u.curriculumUnitKey)) {
        next.delete(u.curriculumUnitKey);
      } else {
        next.add(u.curriculumUnitKey);
        if (!chapters[u.curriculumUnitKey]) {
          apiFetch(`/api/Curriculum/units/${u.curriculumUnitKey}/chapters`)
            .then((d: Chapter[]) => setChapters((prev2) => ({ ...prev2, [u.curriculumUnitKey]: d })))
            .catch(() => {});
        }
      }
      return next;
    });
  };

  const toggleChapter = (c: Chapter) => {
    setExpandedChapter((prev) => {
      const next = new Set(prev);
      if (next.has(c.curriculumChapterKey)) {
        next.delete(c.curriculumChapterKey);
      } else {
        next.add(c.curriculumChapterKey);
        if (!outcomes[c.curriculumChapterKey]) {
          apiFetch(`/api/Curriculum/chapters/${c.curriculumChapterKey}/outcomes`)
            .then((d: Outcome[]) => setOutcomes((prev2) => ({ ...prev2, [c.curriculumChapterKey]: d })))
            .catch(() => {});
        }
      }
      return next;
    });
  };

  const reloadUnits = (curriculumKey: string) => {
    apiFetch(`/api/Curriculum/${curriculumKey}/units`)
      .then((d: Unit[]) => setUnits((prev) => ({ ...prev, [curriculumKey]: d })))
      .catch(() => {});
  };
  const reloadChapters = (curriculumUnitKey: string) => {
    apiFetch(`/api/Curriculum/units/${curriculumUnitKey}/chapters`)
      .then((d: Chapter[]) => setChapters((prev) => ({ ...prev, [curriculumUnitKey]: d })))
      .catch(() => {});
  };
  const reloadOutcomes = (curriculumChapterKey: string) => {
    apiFetch(`/api/Curriculum/chapters/${curriculumChapterKey}/outcomes`)
      .then((d: Outcome[]) => setOutcomes((prev) => ({ ...prev, [curriculumChapterKey]: d })))
      .catch(() => {});
  };

  // ---- Unit CRUD ----

  const openNewUnit = (curriculumKey: string) => {
    setUnitDraft({ unitName: "", unitOrder: String((units[curriculumKey]?.length ?? 0) + 1), estimatedPeriods: "" });
    setUnitDialog({ curriculumKey, editing: null });
  };
  const openEditUnit = (curriculumKey: string, u: Unit) => {
    setUnitDraft({ unitName: u.unitName, unitOrder: String(u.unitOrder), estimatedPeriods: u.estimatedPeriods != null ? String(u.estimatedPeriods) : "" });
    setUnitDialog({ curriculumKey, editing: u });
  };
  const saveUnit = async () => {
    if (!unitDialog || !unitDraft.unitName.trim()) {
      toast.error("Unit name is required.");
      return;
    }
    setSavingUnit(true);
    try {
      const body = {
        unitName: unitDraft.unitName.trim(),
        unitOrder: Number(unitDraft.unitOrder) || 0,
        estimatedPeriods: unitDraft.estimatedPeriods === "" ? null : Number(unitDraft.estimatedPeriods),
      };
      if (unitDialog.editing) {
        await apiFetch(`/api/Curriculum/units/${unitDialog.editing.curriculumUnitKey}`, {
          method: "PUT",
          body: JSON.stringify({ curriculumUnitKey: unitDialog.editing.curriculumUnitKey, ...body }),
        });
        toast.success("Unit updated");
      } else {
        await apiFetch("/api/Curriculum/units", {
          method: "POST",
          body: JSON.stringify({ curriculumKey: unitDialog.curriculumKey, ...body }),
        });
        toast.success("Unit added");
      }
      reloadUnits(unitDialog.curriculumKey);
      setUnitDialog(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save unit");
    } finally {
      setSavingUnit(false);
    }
  };
  const confirmDeleteUnit = async () => {
    if (!deleteUnitTarget) return;
    try {
      await apiFetch(`/api/Curriculum/units/${deleteUnitTarget.unit.curriculumUnitKey}`, { method: "DELETE" });
      toast.success("Unit removed");
      reloadUnits(deleteUnitTarget.curriculumKey);
      setDeleteUnitTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove unit");
    }
  };

  // ---- Chapter CRUD ----

  const openNewChapter = (curriculumUnitKey: string) => {
    setChapterDraft({ chapterName: "", chapterOrder: String((chapters[curriculumUnitKey]?.length ?? 0) + 1) });
    setChapterDialog({ curriculumUnitKey, editing: null });
  };
  const openEditChapter = (curriculumUnitKey: string, c: Chapter) => {
    setChapterDraft({ chapterName: c.chapterName, chapterOrder: String(c.chapterOrder) });
    setChapterDialog({ curriculumUnitKey, editing: c });
  };
  const saveChapter = async () => {
    if (!chapterDialog || !chapterDraft.chapterName.trim()) {
      toast.error("Chapter name is required.");
      return;
    }
    setSavingChapter(true);
    try {
      const body = { chapterName: chapterDraft.chapterName.trim(), chapterOrder: Number(chapterDraft.chapterOrder) || 0 };
      if (chapterDialog.editing) {
        await apiFetch(`/api/Curriculum/chapters/${chapterDialog.editing.curriculumChapterKey}`, {
          method: "PUT",
          body: JSON.stringify({ curriculumChapterKey: chapterDialog.editing.curriculumChapterKey, ...body }),
        });
        toast.success("Chapter updated");
      } else {
        await apiFetch("/api/Curriculum/chapters", {
          method: "POST",
          body: JSON.stringify({ curriculumUnitKey: chapterDialog.curriculumUnitKey, ...body }),
        });
        toast.success("Chapter added");
      }
      reloadChapters(chapterDialog.curriculumUnitKey);
      setChapterDialog(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save chapter");
    } finally {
      setSavingChapter(false);
    }
  };
  const confirmDeleteChapter = async () => {
    if (!deleteChapterTarget) return;
    try {
      await apiFetch(`/api/Curriculum/chapters/${deleteChapterTarget.chapter.curriculumChapterKey}`, { method: "DELETE" });
      toast.success("Chapter removed");
      reloadChapters(deleteChapterTarget.curriculumUnitKey);
      setDeleteChapterTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove chapter");
    }
  };

  // ---- Outcome CRUD ----

  const openNewOutcome = (curriculumChapterKey: string) => {
    setOutcomeDraft({ outcomeText: "", sortOrder: String((outcomes[curriculumChapterKey]?.length ?? 0) + 1) });
    setOutcomeDialog({ curriculumChapterKey, editing: null });
  };
  const openEditOutcome = (curriculumChapterKey: string, o: Outcome) => {
    setOutcomeDraft({ outcomeText: o.outcomeText, sortOrder: String(o.sortOrder) });
    setOutcomeDialog({ curriculumChapterKey, editing: o });
  };
  const saveOutcome = async () => {
    if (!outcomeDialog || !outcomeDraft.outcomeText.trim()) {
      toast.error("Learning outcome text is required.");
      return;
    }
    setSavingOutcome(true);
    try {
      const body = { outcomeText: outcomeDraft.outcomeText.trim(), sortOrder: Number(outcomeDraft.sortOrder) || 0 };
      if (outcomeDialog.editing) {
        await apiFetch(`/api/Curriculum/outcomes/${outcomeDialog.editing.curriculumLearningOutcomeKey}`, {
          method: "PUT",
          body: JSON.stringify({ curriculumLearningOutcomeKey: outcomeDialog.editing.curriculumLearningOutcomeKey, ...body }),
        });
        toast.success("Learning outcome updated");
      } else {
        await apiFetch("/api/Curriculum/outcomes", {
          method: "POST",
          body: JSON.stringify({ curriculumChapterKey: outcomeDialog.curriculumChapterKey, ...body }),
        });
        toast.success("Learning outcome added");
      }
      reloadOutcomes(outcomeDialog.curriculumChapterKey);
      setOutcomeDialog(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save learning outcome");
    } finally {
      setSavingOutcome(false);
    }
  };
  const confirmDeleteOutcome = async () => {
    if (!deleteOutcomeTarget) return;
    try {
      await apiFetch(`/api/Curriculum/outcomes/${deleteOutcomeTarget.outcome.curriculumLearningOutcomeKey}`, { method: "DELETE" });
      toast.success("Learning outcome removed");
      reloadOutcomes(deleteOutcomeTarget.curriculumChapterKey);
      setDeleteOutcomeTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove learning outcome");
    }
  };

  return (
    <div>
      <PageHeader
        title="Curriculum Mapping"
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNewCurriculum}>
            <Plus className="h-4 w-4" /> Map Subject
          </Button>
        }
      />

      <div className="mb-4 rounded-md border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subject, class, or curriculum name..." className="h-9 rounded-md pl-8" />
          </div>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="h-9 w-[160px] rounded-md"><SelectValue placeholder="All Classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((c) => <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>{c.className}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="h-9 w-[160px] rounded-md"><SelectValue placeholder="All Subjects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((s) => <SelectItem key={s.subjectKey} value={s.subjectKey}>{s.subjectName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-md border border-border bg-card p-12 text-center text-sm text-muted-foreground shadow-sm">Loading...</div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-12 text-center text-sm text-muted-foreground shadow-sm">
          No curriculum maps yet. Click "Map Subject" to start.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((c) => {
            const isOpen = expandedCurriculum.has(c.curriculumKey);
            const unitList = units[c.curriculumKey] ?? [];
            return (
              <div key={c.curriculumKey} className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
                <div className="flex items-center gap-3 p-4">
                  <button type="button" onClick={() => toggleCurriculum(c)} className="flex flex-1 items-center gap-3 text-left">
                    <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">{c.subjectName} <span className="text-muted-foreground">— {c.className}</span></div>
                      {c.curriculumName && <div className="text-xs text-muted-foreground">{c.curriculumName}</div>}
                    </div>
                  </button>
                  <Badge className={cn("rounded-md border-0 px-2 py-0.5 text-xs font-medium", c.isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                    {c.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive" onClick={() => setDeleteCurriculumTarget(c)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {isOpen && (
                  <div className="border-t border-border bg-secondary/20 p-4 pl-12">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <Layers className="h-3.5 w-3.5" /> Units
                      </h3>
                      <Button size="sm" variant="outline" className="h-7 gap-1 rounded-md text-xs" onClick={() => openNewUnit(c.curriculumKey)}>
                        <Plus className="h-3 w-3" /> Add Unit
                      </Button>
                    </div>

                    {unitList.length === 0 ? (
                      <p className="py-2 text-xs text-muted-foreground">No units yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {unitList.map((u) => {
                          const unitOpen = expandedUnit.has(u.curriculumUnitKey);
                          const chapterList = chapters[u.curriculumUnitKey] ?? [];
                          return (
                            <div key={u.curriculumUnitKey} className="overflow-hidden rounded-md border border-border bg-card">
                              <div className="flex items-center gap-2 p-3">
                                <button type="button" onClick={() => toggleUnit(u)} className="flex flex-1 items-center gap-2 text-left">
                                  <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", unitOpen && "rotate-90")} />
                                  <span className="text-sm font-medium">{u.unitName}</span>
                                  {u.estimatedPeriods != null && <span className="text-xs text-muted-foreground">({u.estimatedPeriods} periods)</span>}
                                </button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => openEditUnit(c.curriculumKey, u)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-destructive" onClick={() => setDeleteUnitTarget({ curriculumKey: c.curriculumKey, unit: u })}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>

                              {unitOpen && (
                                <div className="border-t border-border bg-secondary/20 p-3 pl-9">
                                  <div className="mb-2 flex items-center justify-between">
                                    <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      <FileText className="h-3 w-3" /> Chapters
                                    </h4>
                                    <Button size="sm" variant="outline" className="h-6 gap-1 rounded-md text-[11px]" onClick={() => openNewChapter(u.curriculumUnitKey)}>
                                      <Plus className="h-3 w-3" /> Add Chapter
                                    </Button>
                                  </div>

                                  {chapterList.length === 0 ? (
                                    <p className="py-1.5 text-[11px] text-muted-foreground">No chapters yet.</p>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {chapterList.map((ch) => {
                                        const chapterOpen = expandedChapter.has(ch.curriculumChapterKey);
                                        const outcomeList = outcomes[ch.curriculumChapterKey] ?? [];
                                        return (
                                          <div key={ch.curriculumChapterKey} className="overflow-hidden rounded-md border border-border bg-card">
                                            <div className="flex items-center gap-2 p-2.5">
                                              <button type="button" onClick={() => toggleChapter(ch)} className="flex flex-1 items-center gap-2 text-left">
                                                <ChevronRight className={cn("h-3 w-3 shrink-0 text-muted-foreground transition-transform", chapterOpen && "rotate-90")} />
                                                <span className="text-xs font-medium">{ch.chapterName}</span>
                                              </button>
                                              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" onClick={() => openEditChapter(u.curriculumUnitKey, ch)}>
                                                <Pencil className="h-2.5 w-2.5" />
                                              </Button>
                                              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-destructive" onClick={() => setDeleteChapterTarget({ curriculumUnitKey: u.curriculumUnitKey, chapter: ch })}>
                                                <Trash2 className="h-2.5 w-2.5" />
                                              </Button>
                                            </div>

                                            {chapterOpen && (
                                              <div className="border-t border-border bg-secondary/20 p-2.5 pl-8">
                                                <div className="mb-1.5 flex items-center justify-between">
                                                  <h5 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                    <Target className="h-3 w-3" /> Learning Outcomes
                                                  </h5>
                                                  <Button size="sm" variant="outline" className="h-6 gap-1 rounded-md text-[10px]" onClick={() => openNewOutcome(ch.curriculumChapterKey)}>
                                                    <Plus className="h-2.5 w-2.5" /> Add Outcome
                                                  </Button>
                                                </div>
                                                {outcomeList.length === 0 ? (
                                                  <p className="py-1 text-[10px] text-muted-foreground">No learning outcomes yet.</p>
                                                ) : (
                                                  <ul className="space-y-1">
                                                    {outcomeList.map((o) => (
                                                      <li key={o.curriculumLearningOutcomeKey} className="flex items-center justify-between gap-2 rounded-md bg-card px-2.5 py-1.5 text-xs">
                                                        <span>{o.outcomeText}</span>
                                                        <div className="flex shrink-0 items-center gap-1">
                                                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" onClick={() => openEditOutcome(ch.curriculumChapterKey, o)}>
                                                            <Pencil className="h-2.5 w-2.5" />
                                                          </Button>
                                                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-destructive" onClick={() => setDeleteOutcomeTarget({ curriculumChapterKey: ch.curriculumChapterKey, outcome: o })}>
                                                            <Trash2 className="h-2.5 w-2.5" />
                                                          </Button>
                                                        </div>
                                                      </li>
                                                    ))}
                                                  </ul>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Map Subject dialog */}
      <FormDialog
        open={curriculumOpen}
        onOpenChange={setCurriculumOpen}
        title="Map Subject to Curriculum"
        description="Pick the class and subject to build a unit/chapter/outcome structure for."
        submitLabel="Create"
        onSubmit={saveCurriculum}
        submitting={savingCurriculum}
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Class</Label>
            <Select value={curriculumDraft.schoolClassKey} onValueChange={(v) => setCurriculumDraft({ ...curriculumDraft, schoolClassKey: v })}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose a class" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>{c.className}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label required>Subject</Label>
            <Select value={curriculumDraft.subjectKey} onValueChange={(v) => setCurriculumDraft({ ...curriculumDraft, subjectKey: v })}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose a subject" /></SelectTrigger>
              <SelectContent>
                {subjects.map((s) => <SelectItem key={s.subjectKey} value={s.subjectKey}>{s.subjectName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Curriculum Name (optional)</Label>
            <Input value={curriculumDraft.curriculumName} onChange={(e) => setCurriculumDraft({ ...curriculumDraft, curriculumName: e.target.value })} placeholder="e.g. NCERT Science - Grade 8" className="rounded-md" />
          </div>
        </div>
      </FormDialog>

      {/* Unit dialog */}
      <FormDialog
        open={!!unitDialog}
        onOpenChange={(v) => !v && setUnitDialog(null)}
        title={unitDialog?.editing ? "Edit Unit" : "Add Unit"}
        submitLabel={unitDialog?.editing ? "Save Changes" : "Add"}
        onSubmit={saveUnit}
        submitting={savingUnit}
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Unit Name</Label>
            <Input value={unitDraft.unitName} onChange={(e) => setUnitDraft({ ...unitDraft, unitName: e.target.value })} placeholder="Unit 1: Motion" className="rounded-md" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Sort Order</Label>
              <Input type="number" value={unitDraft.unitOrder} onChange={(e) => setUnitDraft({ ...unitDraft, unitOrder: e.target.value })} className="rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Label>Estimated Periods</Label>
              <Input type="number" min={0} value={unitDraft.estimatedPeriods} onChange={(e) => setUnitDraft({ ...unitDraft, estimatedPeriods: e.target.value })} placeholder="Optional" className="rounded-md" />
            </div>
          </div>
        </div>
      </FormDialog>

      {/* Chapter dialog */}
      <FormDialog
        open={!!chapterDialog}
        onOpenChange={(v) => !v && setChapterDialog(null)}
        title={chapterDialog?.editing ? "Edit Chapter" : "Add Chapter"}
        submitLabel={chapterDialog?.editing ? "Save Changes" : "Add"}
        onSubmit={saveChapter}
        submitting={savingChapter}
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Chapter Name</Label>
            <Input value={chapterDraft.chapterName} onChange={(e) => setChapterDraft({ ...chapterDraft, chapterName: e.target.value })} placeholder="Chapter 1.1: Speed and Velocity" className="rounded-md" required />
          </div>
          <div className="space-y-1.5">
            <Label>Sort Order</Label>
            <Input type="number" value={chapterDraft.chapterOrder} onChange={(e) => setChapterDraft({ ...chapterDraft, chapterOrder: e.target.value })} className="rounded-md" />
          </div>
        </div>
      </FormDialog>

      {/* Outcome dialog */}
      <FormDialog
        open={!!outcomeDialog}
        onOpenChange={(v) => !v && setOutcomeDialog(null)}
        title={outcomeDialog?.editing ? "Edit Learning Outcome" : "Add Learning Outcome"}
        submitLabel={outcomeDialog?.editing ? "Save Changes" : "Add"}
        onSubmit={saveOutcome}
        submitting={savingOutcome}
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Learning Outcome</Label>
            <Input value={outcomeDraft.outcomeText} onChange={(e) => setOutcomeDraft({ ...outcomeDraft, outcomeText: e.target.value })} placeholder="Students can calculate average speed from distance and time" className="rounded-md" required />
          </div>
          <div className="space-y-1.5">
            <Label>Sort Order</Label>
            <Input type="number" value={outcomeDraft.sortOrder} onChange={(e) => setOutcomeDraft({ ...outcomeDraft, sortOrder: e.target.value })} className="rounded-md" />
          </div>
        </div>
      </FormDialog>

      {/* Delete confirmations */}
      <AlertDialog open={!!deleteCurriculumTarget} onOpenChange={(v) => !v && setDeleteCurriculumTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove curriculum map for "{deleteCurriculumTarget?.subjectName} — {deleteCurriculumTarget?.className}"?</AlertDialogTitle>
            <AlertDialogDescription>This removes the whole unit/chapter/outcome structure underneath it. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); confirmDeleteCurriculum(); }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteUnitTarget} onOpenChange={(v) => !v && setDeleteUnitTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove unit "{deleteUnitTarget?.unit.unitName}"?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); confirmDeleteUnit(); }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteChapterTarget} onOpenChange={(v) => !v && setDeleteChapterTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove chapter "{deleteChapterTarget?.chapter.chapterName}"?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); confirmDeleteChapter(); }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteOutcomeTarget} onOpenChange={(v) => !v && setDeleteOutcomeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this learning outcome?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); confirmDeleteOutcome(); }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
