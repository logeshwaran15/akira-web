import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, IconTile } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Save, Loader2, Users, CheckCircle2, AlertTriangle, Lock } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAcademicYear } from "@/hooks/use-academic-year";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/marks-entry")({
  head: () => ({
    meta: [
      { title: "Marks Entry — Akira School ERP" },
      { name: "description", content: "Enter student marks per subject and exam, with pass/fail highlighting and bulk save." },
    ],
  }),
  component: MarksEntryPage,
});

type ExamType = { examTypeKey: string; examTypeName: string; isActive: boolean };
type SchoolClass = { schoolClassKey: string; className: string };
type Subject = { subjectKey: string; subjectName: string };
type StudentOption = { studentKey: string; studentName: string; rollNumber: string; schoolClassKey: string };
type ExamConfig = { examConfigKey: string; examTypeKey: string; schoolClassKey: string; subjectKey: string; maxMarks: number; minPassMarks: number; hasPractical: boolean; practicalMaxMarks: number };

type MarkRow = {
  markKey: string;
  examConfigKey: string;
  studentKey: string;
  theoryMarks: number | null;
  practicalMarks: number | null;
  isAbsent: boolean;
  isLocked: boolean;
};

function MarksEntryPage() {
  const { selectedYearKey: yearKey } = useAcademicYear();
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [configs, setConfigs] = useState<ExamConfig[]>([]);
  const [marks, setMarks] = useState<MarkRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [examTypeKey, setExamTypeKey] = useState("");
  const [classKey, setClassKey] = useState("");
  const [subjectKey, setSubjectKey] = useState("");

  const [draftMarks, setDraftMarks] = useState<Record<string, { theory: string; practical: string; absent: boolean }>>({});
  const [saving, setSaving] = useState(false);
  const [lockTarget, setLockTarget] = useState<"lock" | "unlock" | null>(null);

  const loadLookups = () => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/ExamType").catch(() => []),
      apiFetch("/api/SchoolClass").catch(() => []),
      apiFetch("/api/Subject").catch(() => []),
      apiFetch("/api/ExamConfiguration").catch(() => []),
    ])
      .then(([et, sc, sub, cfg]) => {
        setExamTypes(et);
        setClasses(sc);
        setSubjects(sub);
        setConfigs(cfg);
        if (!examTypeKey && et.length > 0) setExamTypeKey(et[0].examTypeKey);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load marks entry data"))
      .finally(() => setLoading(false));
  };

  useEffect(loadLookups, []);

  const config = configs.find((c) => c.examTypeKey === examTypeKey && c.schoolClassKey === classKey && c.subjectKey === subjectKey);

  // Students are scoped to the selected class + academic year via the real
  // /api/Student filters, rather than filtering a full unscoped list
  // client-side.
  useEffect(() => {
    if (!classKey || !yearKey) {
      setStudents([]);
      return;
    }
    apiFetch(`/api/Student?academicYearId=${yearKey}&classId=${classKey}&status=ENROLLED`)
      .then((d: StudentOption[]) => setStudents(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load students"));
  }, [classKey, yearKey]);

  const classStudents = useMemo(() =>
    [...students].sort((a: any, b: any) => (a.rollNumber ?? "").localeCompare(b.rollNumber ?? "", undefined, { numeric: true })),
  [students]);

  // Marks are scoped to the resolved exam configuration via the real
  // /api/ExamMark endpoint.
  useEffect(() => {
    if (!config) {
      setMarks([]);
      return;
    }
    apiFetch(`/api/ExamMark?examConfigId=${config.examConfigKey}`)
      .then((d: MarkRow[]) => setMarks(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load marks"));
  }, [config?.examConfigKey]);

  useEffect(() => {
    if (!config) {
      setDraftMarks({});
      return;
    }
    const next: Record<string, { theory: string; practical: string; absent: boolean }> = {};
    classStudents.forEach((s: any) => {
      const existing = marks.find((m) => m.studentKey === s.studentKey);
      next[s.studentKey] = {
        theory: existing?.theoryMarks != null ? String(existing.theoryMarks) : "",
        practical: existing?.practicalMarks != null ? String(existing.practicalMarks) : "",
        absent: existing?.isAbsent ?? false,
      };
    });
    setDraftMarks(next);
  }, [config?.examConfigKey, classStudents.length, marks]);

  const isLockedForClass = config ? marks.some((m) => m.examConfigKey === config.examConfigKey && m.isLocked) : false;

  const setStudentMark = (studentKey: string, field: "theory" | "practical", value: string) => {
    setDraftMarks((prev) => ({ ...prev, [studentKey]: { ...prev[studentKey], [field]: value } }));
  };

  const toggleAbsent = (studentKey: string) => {
    setDraftMarks((prev) => ({ ...prev, [studentKey]: { ...prev[studentKey], absent: !prev[studentKey]?.absent, theory: "", practical: "" } }));
  };

  const validate = (): string | null => {
    if (!config) return "Select exam, class and subject.";
    for (const s of classStudents as any[]) {
      const d = draftMarks[s.studentKey];
      if (!d || d.absent) continue;
      const theory = Number(d.theory);
      if (d.theory === "" || Number.isNaN(theory)) return `Enter theory marks for ${s.studentName} or mark absent.`;
      if (theory < 0 || theory > config.maxMarks) return `${s.studentName}: theory marks must be between 0 and ${config.maxMarks}.`;
      if (config.hasPractical) {
        const practical = Number(d.practical);
        if (d.practical === "" || Number.isNaN(practical)) return `Enter practical marks for ${s.studentName}.`;
        if (practical < 0 || practical > config.practicalMaxMarks) return `${s.studentName}: practical marks must be between 0 and ${config.practicalMaxMarks}.`;
      }
    }
    return null;
  };

  const saveAll = async () => {
    const error = validate();
    if (error) return toast.error(error);
    if (!config) return;

    setSaving(true);
    try {
      const payload = {
        examConfigKey: config.examConfigKey,
        marks: (classStudents as any[]).map((s) => {
          const d = draftMarks[s.studentKey];
          return {
            studentKey: s.studentKey,
            theoryMarks: d.absent ? null : Number(d.theory),
            practicalMarks: d.absent || !config.hasPractical ? null : Number(d.practical),
            isAbsent: d.absent,
          };
        }),
      };
      await apiFetch("/api/ExamMark/bulk-save", { method: "POST", body: JSON.stringify(payload) });
      toast.success(`Marks saved for ${classStudents.length} student${classStudents.length === 1 ? "" : "s"}`);
      apiFetch(`/api/ExamMark?examConfigId=${config.examConfigKey}`).then((d: MarkRow[]) => setMarks(d)).catch(() => {});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save marks");
    } finally {
      setSaving(false);
    }
  };

  const doLockToggle = async () => {
    if (!config) return;
    const targetState = lockTarget === "lock";
    try {
      await apiFetch("/api/ExamMark/lock", {
        method: "POST",
        body: JSON.stringify({ examConfigKey: config.examConfigKey, isLocked: targetState }),
      });
      toast.success(targetState ? "Marks locked for verification" : "Marks unlocked for editing");
      setLockTarget(null);
      apiFetch(`/api/ExamMark?examConfigId=${config.examConfigKey}`).then((d: MarkRow[]) => setMarks(d)).catch(() => {});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update lock status");
    }
  };

  const totalFor = (studentKey: string) => {
    const d = draftMarks[studentKey];
    if (!d || d.absent) return null;
    const theory = Number(d.theory) || 0;
    const practical = config?.hasPractical ? Number(d.practical) || 0 : 0;
    return theory + practical;
  };

  const isPass = (studentKey: string) => {
    const total = totalFor(studentKey);
    if (total === null || !config) return null;
    return total >= config.minPassMarks;
  };

  const enteredCount = classStudents.filter((s: any) => {
    const d = draftMarks[s.studentKey];
    return d && (d.absent || d.theory !== "");
  }).length;

  const passCount = classStudents.filter((s: any) => isPass(s.studentKey) === true).length;
  const failCount = classStudents.filter((s: any) => isPass(s.studentKey) === false).length;

  return (
    <div>
      <PageHeader
        title="Marks Entry"
        actions={
          config && classStudents.length > 0 ? (
            <>
              <Button
                variant={isLockedForClass ? "outline" : "secondary"}
                className="h-10 gap-1.5 rounded-md"
                onClick={() => setLockTarget(isLockedForClass ? "unlock" : "lock")}
              >
                <Lock className="h-4 w-4" /> {isLockedForClass ? "Unlock" : "Lock for Verification"}
              </Button>
              <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={saveAll} disabled={saving || isLockedForClass}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save All
              </Button>
            </>
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
          Select an exam, class and subject to begin entering marks.
        </div>
      ) : !config ? (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-[oklch(0.45_0.12_65)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>No exam configuration found for this exam type, class and subject. Set one up in Exam Configuration first.</span>
        </div>
      ) : classStudents.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No students found in this class.
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex items-center gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
              <IconTile icon={Users} tone="primary" size="sm" />
              <div>
                <div className="text-xs text-muted-foreground">Students</div>
                <div className="font-display text-lg font-semibold">{classStudents.length}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
              <IconTile icon={CheckCircle2} tone="info" size="sm" />
              <div>
                <div className="text-xs text-muted-foreground">Entered</div>
                <div className="font-display text-lg font-semibold">{enteredCount}/{classStudents.length}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
              <IconTile icon={CheckCircle2} tone="success" size="sm" />
              <div>
                <div className="text-xs text-muted-foreground">Passing</div>
                <div className="font-display text-lg font-semibold">{passCount}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
              <IconTile icon={AlertTriangle} tone="destructive" size="sm" />
              <div>
                <div className="text-xs text-muted-foreground">Failing</div>
                <div className="font-display text-lg font-semibold">{failCount}</div>
              </div>
            </div>
          </div>

          {isLockedForClass && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-info/30 bg-info/10 px-4 py-2.5 text-sm text-info">
              <Lock className="h-4 w-4 shrink-0" /> Marks are locked for verification. Unlock to make further edits.
            </div>
          )}

          <div className="rounded-md border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Roll</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead className="w-28">Theory (/{config.maxMarks})</TableHead>
                    {config.hasPractical && <TableHead className="w-28">Practical (/{config.practicalMaxMarks})</TableHead>}
                    <TableHead className="w-20">Total</TableHead>
                    <TableHead className="w-24">Result</TableHead>
                    <TableHead className="w-20 text-center">Absent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classStudents.map((s: any) => {
                    const d = draftMarks[s.studentKey];
                    const total = totalFor(s.studentKey);
                    const pass = isPass(s.studentKey);
                    return (
                      <TableRow key={s.studentKey} className={cn(d?.absent && "bg-muted/40")}>
                        <TableCell className="text-muted-foreground">{s.rollNumber}</TableCell>
                        <TableCell className="font-medium">{s.studentName}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={config.maxMarks}
                            value={d?.theory ?? ""}
                            disabled={d?.absent || isLockedForClass}
                            onChange={(e) => setStudentMark(s.studentKey, "theory", e.target.value)}
                            className="h-9 w-20 rounded-md"
                          />
                        </TableCell>
                        {config.hasPractical && (
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={config.practicalMaxMarks}
                              value={d?.practical ?? ""}
                              disabled={d?.absent || isLockedForClass}
                              onChange={(e) => setStudentMark(s.studentKey, "practical", e.target.value)}
                              className="h-9 w-20 rounded-md"
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">{total ?? "—"}</TableCell>
                        <TableCell>
                          {d?.absent ? (
                            <Badge className="rounded-md border-0 bg-muted text-muted-foreground">Absent</Badge>
                          ) : pass === null ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : pass ? (
                            <Badge className="rounded-md border-0 bg-success/15 text-success">Pass</Badge>
                          ) : (
                            <Badge className="rounded-md border-0 bg-destructive/15 text-destructive">Fail</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={d?.absent ?? false}
                            disabled={isLockedForClass}
                            onChange={() => toggleAbsent(s.studentKey)}
                            className="h-4 w-4 rounded"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Sticky mobile save bar */}
          <div className="sticky bottom-0 mt-4 flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3 shadow-md sm:hidden">
            <span className="text-xs text-muted-foreground">{enteredCount}/{classStudents.length} entered</span>
            <Button className="h-10 gap-1.5 rounded-md" onClick={saveAll} disabled={saving || isLockedForClass}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save All
            </Button>
          </div>
        </>
      )}

      <AlertDialog open={!!lockTarget} onOpenChange={(v) => !v && setLockTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{lockTarget === "lock" ? "Lock marks for verification?" : "Unlock marks?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {lockTarget === "lock"
                ? "Once locked, marks cannot be edited until a coordinator unlocks them. This signals the marks are ready for review."
                : "Marks will become editable again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); doLockToggle(); }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
