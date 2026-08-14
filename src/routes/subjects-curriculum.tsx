import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Pencil, Trash2, Sparkles, BookOpen, ListTree } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/subjects-curriculum")({
  head: () => ({
    meta: [
      { title: "Subjects & Curriculum — Akira School ERP" },
      { name: "description", content: "Manage your subject master and class-subject curriculum mapping." },
    ],
  }),
  component: SubjectsCurriculumPage,
});

type Subject = {
  subjectKey: string; subjectName: string; subjectCode: string | null; subjectType: string;
  languageType: string | null; hasTheory: boolean; hasPractical: boolean; mediumOfInstruction: string | null;
  defaultWeeklyPeriods: number; maxMarksTheory: number; maxMarksPractical: number; passMarks: number; isActive: boolean;
};

type SubjectDraft = {
  subjectKey: string; subjectName: string; subjectCode: string; subjectType: string; languageType: string;
  hasTheory: boolean; hasPractical: boolean; mediumOfInstruction: string; defaultWeeklyPeriods: number;
  maxMarksTheory: number; maxMarksPractical: number; passMarks: number;
};

type Board = { boardKey: string; boardCode: string; boardName: string };
type SchoolClass = { schoolClassKey: string; className: string };
type Stream = { streamKey: string; streamName: string };
type ElectiveGroup = {
  electiveGroupKey: string; groupName: string; streamKey: string | null; streamName: string | null;
  boardKey: string | null; boardName: string | null; boardCode: string | null;
};
type Mapping = {
  classSubjectMappingKey: string; subjectKey: string; subjectName: string; subjectCode: string | null; subjectType: string;
  isCompulsory: boolean; maxMarks: number; passMarks: number; weeklyPeriods: number; showOnReportCard: boolean;
  streamKey: string | null; streamName: string | null; electiveGroupKey: string | null; electiveGroupName: string | null;
  requiresDoublePeriod: boolean;
};

const SUBJECT_TYPES = ["LANGUAGE", "CORE", "ELECTIVE", "ACTIVITY", "VOCATIONAL"];
const LANGUAGE_TYPES = ["FIRST", "SECOND", "THIRD", "FOURTH"];

const emptySubject: SubjectDraft = {
  subjectKey: "", subjectName: "", subjectCode: "", subjectType: "CORE", languageType: "",
  hasTheory: true, hasPractical: false, mediumOfInstruction: "", defaultWeeklyPeriods: 5,
  maxMarksTheory: 100, maxMarksPractical: 0, passMarks: 33,
};

function SubjectsCurriculumPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [boards, setBoards] = useState<Board[]>([]);
  const [seedBoardCode, setSeedBoardCode] = useState("");
  const [seeding, setSeeding] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [draft, setDraft] = useState<SubjectDraft>(emptySubject);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [curriculumClassKey, setCurriculumClassKey] = useState("");
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [mappingsLoading, setMappingsLoading] = useState(false);
  const [groups, setGroups] = useState<ElectiveGroup[]>([]);

  const [mapOpen, setMapOpen] = useState(false);
  const [mapSubjectKey, setMapSubjectKey] = useState("");
  const [mapCompulsory, setMapCompulsory] = useState(true);
  const [mapStreamKey, setMapStreamKey] = useState("");
  const [mapGroupKey, setMapGroupKey] = useState("");
  const [mapDoublePeriod, setMapDoublePeriod] = useState(false);
  const [mapSaving, setMapSaving] = useState(false);
  const [deleteMappingTarget, setDeleteMappingTarget] = useState<Mapping | null>(null);

  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupStreamKey, setGroupStreamKey] = useState("");
  const [groupBoardKey, setGroupBoardKey] = useState("");
  const [groupSaving, setGroupSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/Subject"),
      apiFetch("/api/Board"),
      apiFetch("/api/SchoolClass"),
      apiFetch("/api/Stream"),
    ])
      .then(([s, b, c, st]) => {
        setSubjects(s);
        setBoards(b);
        setClasses(c);
        setStreams(st);
        if (c.length > 0 && !curriculumClassKey) setCurriculumClassKey(c[0].schoolClassKey);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load subjects"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const loadCurriculum = (schoolClassKey: string) => {
    if (!schoolClassKey) return;
    setMappingsLoading(true);
    Promise.all([
      apiFetch(`/api/ClassSubjectMapping?schoolClassId=${schoolClassKey}`),
      apiFetch(`/api/ElectiveGroup?schoolClassId=${schoolClassKey}`),
    ])
      .then(([m, g]) => { setMappings(m); setGroups(g); })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load curriculum"))
      .finally(() => setMappingsLoading(false));
  };

  useEffect(() => { if (curriculumClassKey) loadCurriculum(curriculumClassKey); }, [curriculumClassKey]);

  const seedDefaults = async () => {
    if (!seedBoardCode) return;
    setSeeding(true);
    try {
      const data = await apiFetch("/api/Subject/seed-defaults", { method: "POST", body: JSON.stringify({ boardCode: seedBoardCode }) });
      setSubjects(data);
      toast.success("Default subjects added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to seed default subjects");
    } finally {
      setSeeding(false);
    }
  };

  const openNew = () => { setEditing(null); setDraft(emptySubject); setOpen(true); };
  const openEdit = (s: Subject) => {
    setEditing(s);
    setDraft({
      subjectKey: s.subjectKey, subjectName: s.subjectName, subjectCode: s.subjectCode ?? "",
      subjectType: s.subjectType, languageType: s.languageType ?? "", hasTheory: s.hasTheory, hasPractical: s.hasPractical,
      mediumOfInstruction: s.mediumOfInstruction ?? "", defaultWeeklyPeriods: s.defaultWeeklyPeriods,
      maxMarksTheory: s.maxMarksTheory, maxMarksPractical: s.maxMarksPractical, passMarks: s.passMarks,
    });
    setOpen(true);
  };

  const saveSubject = async () => {
    setSaving(true);
    try {
      const body = {
        subjectName: draft.subjectName,
        subjectCode: draft.subjectCode || null,
        subjectType: draft.subjectType,
        languageType: draft.subjectType === "LANGUAGE" ? (draft.languageType || null) : null,
        hasTheory: draft.hasTheory,
        hasPractical: draft.hasPractical,
        mediumOfInstruction: draft.mediumOfInstruction || null,
        defaultWeeklyPeriods: draft.defaultWeeklyPeriods,
        maxMarksTheory: draft.maxMarksTheory,
        maxMarksPractical: draft.hasPractical ? draft.maxMarksPractical : 0,
        passMarks: draft.passMarks,
      };

      if (editing) {
        await apiFetch(`/api/Subject/${editing.subjectKey}`, {
          method: "PUT",
          body: JSON.stringify({ subjectKey: editing.subjectKey, ...body, isActive: true }),
        });
        toast.success("Subject updated");
      } else {
        await apiFetch("/api/Subject", { method: "POST", body: JSON.stringify(body) });
        toast.success("Subject created");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save subject");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteSubject = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/Subject/${deleteTarget.subjectKey}`, { method: "DELETE" });
      toast.success("Subject deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete subject");
    }
  };

  const unmappedSubjects = subjects.filter((s) => !mappings.some((m) => m.subjectKey === s.subjectKey));

  const openMapDialog = () => {
    setMapSubjectKey(""); setMapCompulsory(true); setMapStreamKey(""); setMapGroupKey(""); setMapDoublePeriod(false);
    setMapOpen(true);
  };

  const saveMapping = async () => {
    if (!mapSubjectKey) return;
    setMapSaving(true);
    try {
      await apiFetch("/api/ClassSubjectMapping", {
        method: "POST",
        body: JSON.stringify({
          schoolClassKey: curriculumClassKey,
          subjectKey: mapSubjectKey,
          isCompulsory: mapCompulsory,
          showOnReportCard: true,
          streamKey: mapStreamKey || null,
          electiveGroupKey: mapGroupKey || null,
          requiresDoublePeriod: mapDoublePeriod,
        }),
      });
      toast.success("Subject mapped to class");
      setMapOpen(false);
      loadCurriculum(curriculumClassKey);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to map subject");
    } finally {
      setMapSaving(false);
    }
  };

  const confirmDeleteMapping = async () => {
    if (!deleteMappingTarget) return;
    try {
      await apiFetch(`/api/ClassSubjectMapping/${deleteMappingTarget.classSubjectMappingKey}`, { method: "DELETE" });
      toast.success("Mapping removed");
      setDeleteMappingTarget(null);
      loadCurriculum(curriculumClassKey);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove mapping");
    }
  };

  const saveGroup = async () => {
    if (!groupName) return;
    setGroupSaving(true);
    try {
      await apiFetch("/api/ElectiveGroup", {
        method: "POST",
        body: JSON.stringify({ schoolClassKey: curriculumClassKey, groupName, streamKey: groupStreamKey || null, boardKey: groupBoardKey || null }),
      });
      toast.success("Elective group created");
      setGroupOpen(false);
      setGroupName(""); setGroupStreamKey(""); setGroupBoardKey("");
      loadCurriculum(curriculumClassKey);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create elective group");
    } finally {
      setGroupSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Subjects & Curriculum" breadcrumbs={[{ label: "School Setup" }, { label: "Subjects & Curriculum" }]} />

      {/* Subject Master */}
      <div className="rounded-md border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-semibold">Subject Master</h2>
          </div>
          <div className="flex items-center gap-2">
            <Select value={seedBoardCode} onValueChange={setSeedBoardCode}>
              <SelectTrigger className="h-9 w-[220px] rounded-md"><SelectValue placeholder="Seed defaults for board..." /></SelectTrigger>
              <SelectContent>
                {boards.map((b) => <SelectItem key={b.boardKey} value={b.boardCode}>{b.boardName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-9 gap-1.5 rounded-md" onClick={seedDefaults} disabled={seeding || !seedBoardCode}>
              <Sparkles className="h-3.5 w-3.5" /> {seeding ? "Seeding..." : "Seed"}
            </Button>
            <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={openNew}>
              <Plus className="h-3.5 w-3.5" /> New Subject
            </Button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Theory / Practical</TableHead>
              <TableHead>Periods/wk</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">Loading...</TableCell></TableRow>
            ) : subjects.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">No subjects yet.</TableCell></TableRow>
            ) : (
              subjects.map((s) => (
                <TableRow key={s.subjectKey}>
                  <TableCell>
                    <div className="font-medium">{s.subjectName}</div>
                    {s.subjectCode && <div className="font-mono text-xs text-muted-foreground">{s.subjectCode}</div>}
                  </TableCell>
                  <TableCell><Badge variant="outline" className="rounded-md">{s.subjectType}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.hasTheory ? `Theory: ${s.maxMarksTheory}` : ""}{s.hasPractical ? ` · Practical: ${s.maxMarksPractical}` : ""}
                  </TableCell>
                  <TableCell>{s.defaultWeeklyPeriods}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive" onClick={() => setDeleteTarget(s)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Curriculum mapping */}
      <div className="mt-6 rounded-md border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <ListTree className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-semibold">Curriculum — Class-Subject Mapping</h2>
          </div>
          <div className="flex items-center gap-2">
            <Select value={curriculumClassKey} onValueChange={setCurriculumClassKey}>
              <SelectTrigger className="h-9 w-[200px] rounded-md"><SelectValue placeholder="Choose a class" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>{c.className}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-9 gap-1.5 rounded-md" onClick={() => setGroupOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Elective Group
            </Button>
            <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={openMapDialog} disabled={!curriculumClassKey || unmappedSubjects.length === 0}>
              <Plus className="h-3.5 w-3.5" /> Map Subject
            </Button>
          </div>
        </div>

        {groups.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-border p-3">
            {groups.map((g) => (
              <Badge key={g.electiveGroupKey} variant="outline" className="rounded-md">
                {g.groupName}{g.streamName ? ` (${g.streamName})` : ""}{g.boardCode ? ` · ${g.boardCode}` : ""}
              </Badge>
            ))}
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Compulsory</TableHead>
              <TableHead>Marks</TableHead>
              <TableHead>Periods/wk</TableHead>
              <TableHead>Stream</TableHead>
              <TableHead>Elective Group</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappingsLoading ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">Loading...</TableCell></TableRow>
            ) : mappings.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">No subjects mapped to this class yet.</TableCell></TableRow>
            ) : (
              mappings.map((m) => (
                <TableRow key={m.classSubjectMappingKey}>
                  <TableCell className="font-medium">{m.subjectName}</TableCell>
                  <TableCell>
                    <Badge className={cn("rounded-md border-0", m.isCompulsory ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                      {m.isCompulsory ? "Compulsory" : "Elective"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.maxMarks} (pass {m.passMarks})</TableCell>
                  <TableCell>
                    {m.weeklyPeriods}
                    {m.requiresDoublePeriod && <Badge variant="outline" className="ml-2 rounded-md text-[10px]">Double Period</Badge>}
                  </TableCell>
                  <TableCell>{m.streamName ?? "—"}</TableCell>
                  <TableCell>{m.electiveGroupName ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive" onClick={() => setDeleteMappingTarget(m)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Subject create/edit */}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Subject" : "New Subject"}
        submitLabel={editing ? "Save Changes" : "Create Subject"}
        onSubmit={saveSubject}
        submitting={saving}
        size="lg"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label required>Subject Name</Label>
            <Input value={draft.subjectName} onChange={(e) => setDraft({ ...draft, subjectName: e.target.value })} className="rounded-md" required />
          </div>
          <div className="space-y-1.5">
            <Label>Subject Code</Label>
            <Input value={draft.subjectCode} onChange={(e) => setDraft({ ...draft, subjectCode: e.target.value })} placeholder="041" className="rounded-md" />
          </div>
          <div className="space-y-1.5">
            <Label required>Subject Type</Label>
            <Select value={draft.subjectType} onValueChange={(v) => setDraft({ ...draft, subjectType: v })}>
              <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUBJECT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {draft.subjectType === "LANGUAGE" && (
            <div className="space-y-1.5">
              <Label>Language Type</Label>
              <Select value={draft.languageType || "none"} onValueChange={(v) => setDraft({ ...draft, languageType: v === "none" ? "" : v })}>
                <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {LANGUAGE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Medium of Instruction</Label>
            <Select value={draft.mediumOfInstruction || "none"} onValueChange={(v) => setDraft({ ...draft, mediumOfInstruction: v === "none" ? "" : v })}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="Tamil">Tamil</SelectItem>
                <SelectItem value="English">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label required>Weekly Periods</Label>
            <Input type="number" min={0} value={draft.defaultWeeklyPeriods} onChange={(e) => setDraft({ ...draft, defaultWeeklyPeriods: Number(e.target.value) })} className="rounded-md" required />
          </div>
          <div className="flex items-center gap-4 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={draft.hasTheory} onCheckedChange={(v) => setDraft({ ...draft, hasTheory: !!v })} /> Has Theory
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={draft.hasPractical} onCheckedChange={(v) => setDraft({ ...draft, hasPractical: !!v })} /> Has Practical
            </label>
          </div>
          <div className="space-y-1.5">
            <Label required>Max Marks (Theory)</Label>
            <Input type="number" min={0} value={draft.maxMarksTheory} onChange={(e) => setDraft({ ...draft, maxMarksTheory: Number(e.target.value) })} className="rounded-md" required />
          </div>
          {draft.hasPractical && (
            <div className="space-y-1.5">
              <Label required>Max Marks (Practical)</Label>
              <Input type="number" min={0} value={draft.maxMarksPractical} onChange={(e) => setDraft({ ...draft, maxMarksPractical: Number(e.target.value) })} className="rounded-md" required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label required>Pass Marks</Label>
            <Input type="number" min={0} value={draft.passMarks} onChange={(e) => setDraft({ ...draft, passMarks: Number(e.target.value) })} className="rounded-md" required />
          </div>
        </div>
      </FormDialog>

      {/* Map subject to class dialog */}
      <FormDialog
        open={mapOpen}
        onOpenChange={setMapOpen}
        title="Map Subject to Class"
        submitLabel="Map"
        onSubmit={saveMapping}
        submitting={mapSaving}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Subject</Label>
            <Select value={mapSubjectKey} onValueChange={setMapSubjectKey}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose a subject" /></SelectTrigger>
              <SelectContent>
                {unmappedSubjects.map((s) => <SelectItem key={s.subjectKey} value={s.subjectKey}>{s.subjectName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={mapCompulsory} onCheckedChange={(v) => setMapCompulsory(!!v)} /> Compulsory
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={mapDoublePeriod} onCheckedChange={(v) => setMapDoublePeriod(!!v)} /> Requires Double Period (lab)
            </label>
          </div>
          <div className="space-y-1.5">
            <Label>Stream (senior secondary only)</Label>
            <Select value={mapStreamKey || "none"} onValueChange={(v) => setMapStreamKey(v === "none" ? "" : v)}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {streams.map((s) => <SelectItem key={s.streamKey} value={s.streamKey}>{s.streamName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {groups.length > 0 && (
            <div className="space-y-1.5">
              <Label>Elective Group</Label>
              <Select value={mapGroupKey || "none"} onValueChange={(v) => setMapGroupKey(v === "none" ? "" : v)}>
                <SelectTrigger className="rounded-md"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {groups.map((g) => <SelectItem key={g.electiveGroupKey} value={g.electiveGroupKey}>{g.groupName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </FormDialog>

      {/* New elective group dialog */}
      <FormDialog
        open={groupOpen}
        onOpenChange={setGroupOpen}
        title="New Elective Group"
        description='e.g. "5th Subject Choice" for CBSE Class XI Science.'
        submitLabel="Create"
        onSubmit={saveGroup}
        submitting={groupSaving}
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Group Name</Label>
            <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="5th Subject Choice" className="rounded-md" required />
          </div>
          <div className="space-y-1.5">
            <Label>Board</Label>
            <Select value={groupBoardKey || "none"} onValueChange={(v) => setGroupBoardKey(v === "none" ? "" : v)}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="None — applies to any board" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None — applies to any board</SelectItem>
                {boards.map((b) => <SelectItem key={b.boardKey} value={b.boardKey}>{b.boardName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Stream</Label>
            <Select value={groupStreamKey || "none"} onValueChange={(v) => setGroupStreamKey(v === "none" ? "" : v)}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {streams.map((s) => <SelectItem key={s.streamKey} value={s.streamKey}>{s.streamName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.subjectName}"?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone. It must not be mapped to any class.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); confirmDeleteSubject(); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteMappingTarget} onOpenChange={(v) => !v && setDeleteMappingTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{deleteMappingTarget?.subjectName}" from this class?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); confirmDeleteMapping(); }}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
