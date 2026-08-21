import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/erp/DataTable";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Pencil, CheckCircle2, ClipboardCheck, NotebookPen } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useFormatDate } from "@/hooks/use-tenant-setting";

export const Route = createFileRoute("/lesson-plans")({
  head: () => ({
    meta: [
      { title: "Lesson Plan Builder — Akira School ERP" },
      { name: "description", content: "Plan lessons tied to the curriculum map, never free-floating notes." },
    ],
  }),
  component: LessonPlansPage,
});

type UserOption = { akiraUserKey: string; userName: string };
type SchoolClass = { schoolClassKey: string; className: string };
type SectionOption = { sectionKey: string; sectionLabel: string };
type Subject = { subjectKey: string; subjectName: string };
type Curriculum = { curriculumKey: string; schoolClassKey: string; subjectKey: string };
type Unit = { curriculumUnitKey: string; unitName: string };
type Chapter = { curriculumChapterKey: string; curriculumUnitKey: string; chapterName: string };
type AcademicYear = { academicYearKey: string; status: string };
type LessonPlan = {
  lessonPlanKey: string; teacherUserKey: string; teacherName: string | null;
  subjectKey: string; subjectName: string | null; sectionKey: string; sectionLabel: string | null;
  className: string | null; planDate: string; objectives: string | null; status: string; chapterCount: number;
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground" },
  APPROVED: { label: "Approved", className: "bg-info/15 text-info" },
  CONDUCTED: { label: "Conducted", className: "bg-success/15 text-success" },
};

function LessonPlansPage() {
  const formatDate = useFormatDate();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeYearKey, setActiveYearKey] = useState("");
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const [teacherFilter, setTeacherFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LessonPlan | null>(null);
  const [draft, setDraft] = useState({
    teacherUserKey: "", schoolClassKey: "", sectionKey: "", subjectKey: "",
    planDate: "", objectives: "", chapterKeys: [] as string[],
  });
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [chaptersByUnit, setChaptersByUnit] = useState<Record<string, Chapter[]>>({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<LessonPlan | null>(null);

  useEffect(() => {
    Promise.all([apiFetch("/api/User"), apiFetch("/api/SchoolClass"), apiFetch("/api/Subject"), apiFetch("/api/AcademicYear")])
      .then(([u, c, s, y]) => {
        setUsers(u);
        setClasses(c);
        setSubjects(s);
        const active = (y as AcademicYear[]).find((year) => year.status === "Active");
        setActiveYearKey(active?.academicYearKey ?? "");
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load setup data"));
  }, []);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (teacherFilter !== "all") params.set("teacherId", teacherFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    apiFetch(`/api/LessonPlan?${params.toString()}`)
      .then((d: LessonPlan[]) => setPlans(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load lesson plans"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [teacherFilter, statusFilter]);

  // Load sections when class changes in the dialog
  useEffect(() => {
    if (!draft.schoolClassKey || !activeYearKey) {
      setSections([]);
      return;
    }
    apiFetch(`/api/Section?schoolClassId=${draft.schoolClassKey}&academicYearId=${activeYearKey}`)
      .then((d: SectionOption[]) => setSections(d))
      .catch(() => setSections([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.schoolClassKey, activeYearKey]);

  // Load the curriculum tree (units + chapters) for the chosen class+subject
  useEffect(() => {
    if (!draft.schoolClassKey || !draft.subjectKey) {
      setUnits([]);
      setChaptersByUnit({});
      return;
    }
    apiFetch(`/api/Curriculum?schoolClassId=${draft.schoolClassKey}&subjectId=${draft.subjectKey}`)
      .then(async (curricula: Curriculum[]) => {
        const curriculum = curricula[0];
        if (!curriculum) {
          setUnits([]);
          setChaptersByUnit({});
          return;
        }
        const unitList: Unit[] = await apiFetch(`/api/Curriculum/${curriculum.curriculumKey}/units`);
        setUnits(unitList);
        const chapterEntries = await Promise.all(
          unitList.map(async (u) => [u.curriculumUnitKey, await apiFetch(`/api/Curriculum/units/${u.curriculumUnitKey}/chapters`)] as const),
        );
        setChaptersByUnit(Object.fromEntries(chapterEntries));
      })
      .catch(() => {
        setUnits([]);
        setChaptersByUnit({});
      });
  }, [draft.schoolClassKey, draft.subjectKey]);

  const openNew = () => {
    setEditing(null);
    setDraft({ teacherUserKey: "", schoolClassKey: "", sectionKey: "", subjectKey: "", planDate: "", objectives: "", chapterKeys: [] });
    setOpen(true);
  };

  const openEdit = async (p: LessonPlan) => {
    setEditing(p);
    const cls = classes.find((c) => c.className === p.className);
    const chapters: { curriculumChapterKey: string }[] = await apiFetch(`/api/LessonPlan/${p.lessonPlanKey}/chapters`);
    setDraft({
      teacherUserKey: p.teacherUserKey,
      schoolClassKey: cls?.schoolClassKey ?? "",
      sectionKey: p.sectionKey,
      subjectKey: p.subjectKey,
      planDate: p.planDate.slice(0, 10),
      objectives: p.objectives ?? "",
      chapterKeys: chapters.map((c) => c.curriculumChapterKey),
    });
    setOpen(true);
  };

  const toggleChapter = (key: string) => {
    setDraft((prev) => ({
      ...prev,
      chapterKeys: prev.chapterKeys.includes(key) ? prev.chapterKeys.filter((k) => k !== key) : [...prev.chapterKeys, key],
    }));
  };

  const save = async () => {
    if (!draft.teacherUserKey || !draft.sectionKey || !draft.subjectKey || !draft.planDate) {
      toast.error("Teacher, section, subject and plan date are required.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        teacherUserKey: draft.teacherUserKey,
        subjectKey: draft.subjectKey,
        sectionKey: draft.sectionKey,
        planDate: draft.planDate,
        objectives: draft.objectives || null,
        chapterKeys: draft.chapterKeys,
      };
      if (editing) {
        await apiFetch(`/api/LessonPlan/${editing.lessonPlanKey}`, {
          method: "PUT",
          body: JSON.stringify({ lessonPlanKey: editing.lessonPlanKey, ...body }),
        });
        toast.success("Lesson plan updated");
      } else {
        await apiFetch("/api/LessonPlan", { method: "POST", body: JSON.stringify(body) });
        toast.success("Lesson plan created");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save lesson plan");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (p: LessonPlan, status: string) => {
    try {
      await apiFetch(`/api/LessonPlan/${p.lessonPlanKey}/status`, {
        method: "PUT",
        body: JSON.stringify({ lessonPlanKey: p.lessonPlanKey, status }),
      });
      toast.success(status === "APPROVED" ? "Lesson plan approved" : "Marked as conducted");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/LessonPlan/${deleteTarget.lessonPlanKey}`, { method: "DELETE" });
      toast.success("Lesson plan removed");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove lesson plan");
    }
  };

  const columns: Column<LessonPlan>[] = [
    { key: "planDate", header: "Date", sortable: true, accessor: (p) => formatDate(p.planDate) },
    { key: "teacherName", header: "Teacher", sortable: true, accessor: (p) => <span className="font-medium">{p.teacherName ?? "—"}</span> },
    {
      key: "className",
      header: "Class / Subject",
      sortable: true,
      sortValue: (p) => `${p.className ?? ""} ${p.sectionLabel ?? ""} ${p.subjectName ?? ""}`,
      accessor: (p) => `${p.className} - ${p.sectionLabel} / ${p.subjectName}`,
    },
    { key: "chapterCount", header: "Chapters", sortable: true, accessor: (p) => p.chapterCount },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (p) => {
        const meta = STATUS_META[p.status] ?? STATUS_META.DRAFT;
        return <Badge className={cn("rounded-md border-0 px-2 py-0.5 text-xs font-medium", meta.className)}>{meta.label}</Badge>;
      },
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      accessor: (p) => (
        <div className="flex items-center justify-end gap-1">
          {p.status === "DRAFT" && (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-info" title="Approve" onClick={() => setStatus(p, "APPROVED")}>
              <ClipboardCheck className="h-3.5 w-3.5" />
            </Button>
          )}
          {p.status === "APPROVED" && (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-success" title="Mark conducted" onClick={() => setStatus(p, "CONDUCTED")}>
              <CheckCircle2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {p.status !== "CONDUCTED" && (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => openEdit(p)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive" onClick={() => setDeleteTarget(p)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Lesson Plan Builder"
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> New Lesson Plan
          </Button>
        }
      />

      <div className="mb-4 flex items-start gap-2 rounded-md border border-info/30 bg-info/10 px-4 py-2.5 text-sm text-info">
        <NotebookPen className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Every lesson plan links to at least one curriculum chapter before it can be approved or marked conducted — that link is what feeds the Syllabus Completion Tracker.</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={teacherFilter} onValueChange={setTeacherFilter}>
          <SelectTrigger className="h-9 w-[180px] rounded-md"><SelectValue placeholder="All Teachers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teachers</SelectItem>
            {users.map((u) => <SelectItem key={u.akiraUserKey} value={u.akiraUserKey}>{u.userName}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[160px] rounded-md"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="CONDUCTED">Conducted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={plans}
        columns={columns}
        rowKey={(p) => p.lessonPlanKey}
        searchPlaceholder="Search lesson plans..."
        searchFields={(p) => `${p.teacherName ?? ""} ${p.className ?? ""} ${p.sectionLabel ?? ""} ${p.subjectName ?? ""}`}
        emptyMessage={loading ? "Loading..." : "No lesson plans yet."}
        storageKey="lesson-plans"
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Lesson Plan" : "New Lesson Plan"}
        submitLabel={editing ? "Save Changes" : "Create"}
        onSubmit={save}
        submitting={saving}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label required>Teacher</Label>
              <Select value={draft.teacherUserKey} onValueChange={(v) => setDraft({ ...draft, teacherUserKey: v })}>
                <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose a teacher" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => <SelectItem key={u.akiraUserKey} value={u.akiraUserKey}>{u.userName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label required>Plan Date</Label>
              <DatePicker value={draft.planDate} onChange={(v) => setDraft({ ...draft, planDate: v })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label required>Class</Label>
              <Select value={draft.schoolClassKey} onValueChange={(v) => setDraft({ ...draft, schoolClassKey: v, sectionKey: "", chapterKeys: [] })}>
                <SelectTrigger className="rounded-md"><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>{c.className}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label required>Section</Label>
              <Select value={draft.sectionKey} onValueChange={(v) => setDraft({ ...draft, sectionKey: v })} disabled={!draft.schoolClassKey}>
                <SelectTrigger className="rounded-md"><SelectValue placeholder="Section" /></SelectTrigger>
                <SelectContent>
                  {sections.map((s) => <SelectItem key={s.sectionKey} value={s.sectionKey}>{s.sectionLabel}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label required>Subject</Label>
              <Select value={draft.subjectKey} onValueChange={(v) => setDraft({ ...draft, subjectKey: v, chapterKeys: [] })}>
                <SelectTrigger className="rounded-md"><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => <SelectItem key={s.subjectKey} value={s.subjectKey}>{s.subjectName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Objectives</Label>
            <Textarea value={draft.objectives} onChange={(e) => setDraft({ ...draft, objectives: e.target.value })} rows={3} className="rounded-md" placeholder="What should students be able to do after this lesson?" />
          </div>
          <div className="space-y-1.5">
            <Label>Curriculum Chapters Covered</Label>
            {!draft.schoolClassKey || !draft.subjectKey ? (
              <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                Choose a class and subject to see its curriculum chapters (from Curriculum Mapping).
              </p>
            ) : units.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                No curriculum map found for this class/subject yet — build one on the Curriculum Mapping page first.
              </p>
            ) : (
              <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border border-border p-3">
                {units.map((u) => (
                  <div key={u.curriculumUnitKey}>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{u.unitName}</div>
                    <div className="space-y-1">
                      {(chaptersByUnit[u.curriculumUnitKey] ?? []).map((c) => (
                        <label key={c.curriculumChapterKey} className="flex items-center gap-2 text-sm">
                          <Checkbox checked={draft.chapterKeys.includes(c.curriculumChapterKey)} onCheckedChange={() => toggleChapter(c.curriculumChapterKey)} />
                          {c.chapterName}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this lesson plan?</AlertDialogTitle>
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
