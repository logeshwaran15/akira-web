import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Target, Users2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/learning-outcomes")({
  head: () => ({
    meta: [
      { title: "Learning Outcome Tracker — Akira School ERP" },
      { name: "description", content: "Track whether students actually mastered material, not just whether it was covered." },
    ],
  }),
  component: LearningOutcomesPage,
});

type AcademicYear = { academicYearKey: string; status: string };
type SchoolClass = { schoolClassKey: string; className: string };
type SectionOption = { sectionKey: string; sectionLabel: string };
type Subject = { subjectKey: string; subjectName: string };
type Curriculum = { curriculumKey: string; schoolClassKey: string; subjectKey: string };
type Unit = { curriculumUnitKey: string; unitName: string };
type Chapter = { curriculumChapterKey: string; curriculumUnitKey: string; chapterName: string };
type MatrixRow = {
  studentKey: string; studentName: string; curriculumLearningOutcomeKey: string;
  outcomeText: string; masteryStatus: string; evidence: string | null;
};
type Summary = { curriculumLearningOutcomeKey: string; outcomeText: string; rosterCount: number; masteredCount: number; masteredPercent: number };

const STATUS_OPTIONS = [
  { value: "NOT_STARTED", label: "Not Started", className: "bg-muted text-muted-foreground" },
  { value: "IN_PROGRESS", label: "In Progress", className: "bg-warning/25 text-[oklch(0.45_0.12_65)]" },
  { value: "MASTERED", label: "Mastered", className: "bg-success/15 text-success" },
];

function LearningOutcomesPage() {
  const [activeYearKey, setActiveYearKey] = useState("");
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [schoolClassKey, setSchoolClassKey] = useState("");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [sectionKey, setSectionKey] = useState("");
  const [subjectKey, setSubjectKey] = useState("");
  const [units, setUnits] = useState<Unit[]>([]);
  const [chaptersByUnit, setChaptersByUnit] = useState<Record<string, Chapter[]>>({});
  const [chapterKey, setChapterKey] = useState("");

  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([apiFetch("/api/AcademicYear"), apiFetch("/api/SchoolClass"), apiFetch("/api/Subject")])
      .then(([y, c, s]) => {
        const active = (y as AcademicYear[]).find((year) => year.status === "Active");
        setActiveYearKey(active?.academicYearKey ?? "");
        setClasses(c);
        setSubjects(s);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load setup data"));
  }, []);

  useEffect(() => {
    if (!schoolClassKey || !activeYearKey) {
      setSections([]);
      setSectionKey("");
      return;
    }
    apiFetch(`/api/Section?schoolClassId=${schoolClassKey}&academicYearId=${activeYearKey}`)
      .then((d: SectionOption[]) => {
        setSections(d);
        setSectionKey(d[0]?.sectionKey ?? "");
      })
      .catch(() => setSections([]));
  }, [schoolClassKey, activeYearKey]);

  useEffect(() => {
    setChapterKey("");
    setUnits([]);
    setChaptersByUnit({});
    if (!schoolClassKey || !subjectKey) return;
    apiFetch(`/api/Curriculum?schoolClassId=${schoolClassKey}&subjectId=${subjectKey}`)
      .then(async (curricula: Curriculum[]) => {
        const curriculum = curricula[0];
        if (!curriculum) return;
        const unitList: Unit[] = await apiFetch(`/api/Curriculum/${curriculum.curriculumKey}/units`);
        setUnits(unitList);
        const entries = await Promise.all(
          unitList.map(async (u) => [u.curriculumUnitKey, await apiFetch(`/api/Curriculum/units/${u.curriculumUnitKey}/chapters`)] as const),
        );
        setChaptersByUnit(Object.fromEntries(entries));
      })
      .catch(() => {});
  }, [schoolClassKey, subjectKey]);

  const loadData = () => {
    if (!chapterKey || !sectionKey) {
      setMatrix([]);
      setSummary([]);
      return;
    }
    setLoading(true);
    Promise.all([
      apiFetch(`/api/LearningOutcome/matrix?chapterId=${chapterKey}&sectionId=${sectionKey}`),
      apiFetch(`/api/LearningOutcome/summary?chapterId=${chapterKey}&sectionId=${sectionKey}`),
    ])
      .then(([m, s]) => {
        setMatrix(m);
        setSummary(s);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load learning outcomes"))
      .finally(() => setLoading(false));
  };

  useEffect(loadData, [chapterKey, sectionKey]);

  const setStatus = async (row: MatrixRow, status: string) => {
    setMatrix((prev) =>
      prev.map((r) => (r.studentKey === row.studentKey && r.curriculumLearningOutcomeKey === row.curriculumLearningOutcomeKey ? { ...r, masteryStatus: status } : r)),
    );
    try {
      await apiFetch("/api/LearningOutcome", {
        method: "POST",
        body: JSON.stringify({
          studentKey: row.studentKey,
          curriculumLearningOutcomeKey: row.curriculumLearningOutcomeKey,
          masteryStatus: status,
          evidence: row.evidence,
        }),
      });
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update mastery status");
    }
  };

  const outcomeKeys = [...new Set(matrix.map((r) => r.curriculumLearningOutcomeKey))];
  const students = [...new Map(matrix.map((r) => [r.studentKey, r.studentName])).entries()]
    .map(([studentKey, studentName]) => ({ studentKey, studentName }));

  const matrixColumns: Column<{ studentKey: string; studentName: string }>[] = [
    {
      key: "studentName",
      header: "Student",
      sortable: true,
      className: "sticky left-0 bg-card",
      accessor: (s) => <span className="font-medium">{s.studentName}</span>,
    },
    ...outcomeKeys.map((ok) => ({
      key: ok,
      header: matrix.find((r) => r.curriculumLearningOutcomeKey === ok)?.outcomeText ?? ok,
      className: "min-w-[200px]",
      accessor: (s: { studentKey: string; studentName: string }) => {
        const row = matrix.find((r) => r.studentKey === s.studentKey && r.curriculumLearningOutcomeKey === ok);
        if (!row) return null;
        const meta = STATUS_OPTIONS.find((o) => o.value === row.masteryStatus) ?? STATUS_OPTIONS[0];
        return (
          <Select value={row.masteryStatus} onValueChange={(v) => setStatus(row, v)}>
            <SelectTrigger className="h-8 w-[150px] rounded-md">
              <SelectValue>
                <Badge className={cn("rounded-md border-0 px-2 py-0.5 text-xs font-medium", meta.className)}>{meta.label}</Badge>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      },
    })),
  ];

  return (
    <div>
      <PageHeader title="Learning Outcome Tracker" />

      <div className="mb-4 flex items-start gap-2 rounded-md border border-info/30 bg-info/10 px-4 py-2.5 text-sm text-info">
        <Target className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Tracks whether each student actually mastered a learning outcome — not just whether the chapter was marked conducted.</span>
      </div>

      <div className="mb-4 rounded-md border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={schoolClassKey} onValueChange={setSchoolClassKey}>
            <SelectTrigger className="h-9 w-[160px] rounded-md"><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>{classes.map((c) => <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>{c.className}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={sectionKey} onValueChange={setSectionKey} disabled={!schoolClassKey}>
            <SelectTrigger className="h-9 w-[140px] rounded-md"><SelectValue placeholder="Section" /></SelectTrigger>
            <SelectContent>{sections.map((s) => <SelectItem key={s.sectionKey} value={s.sectionKey}>{s.sectionLabel}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={subjectKey} onValueChange={setSubjectKey}>
            <SelectTrigger className="h-9 w-[160px] rounded-md"><SelectValue placeholder="Subject" /></SelectTrigger>
            <SelectContent>{subjects.map((s) => <SelectItem key={s.subjectKey} value={s.subjectKey}>{s.subjectName}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={chapterKey} onValueChange={setChapterKey} disabled={units.length === 0}>
            <SelectTrigger className="h-9 w-[220px] rounded-md"><SelectValue placeholder="Chapter" /></SelectTrigger>
            <SelectContent>
              {units.map((u) => (
                <SelectGroup key={u.curriculumUnitKey}>
                  <SelectLabel>{u.unitName}</SelectLabel>
                  {(chaptersByUnit[u.curriculumUnitKey] ?? []).map((c) => (
                    <SelectItem key={c.curriculumChapterKey} value={c.curriculumChapterKey}>{c.chapterName}</SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!chapterKey || !sectionKey ? (
        <div className="rounded-md border border-border bg-card p-12 text-center text-sm text-muted-foreground shadow-sm">
          Choose a class, section, subject, and chapter to see its learning outcomes.
        </div>
      ) : loading ? (
        <div className="rounded-md border border-border bg-card p-12 text-center text-sm text-muted-foreground shadow-sm">Loading...</div>
      ) : outcomeKeys.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-12 text-center text-sm text-muted-foreground shadow-sm">
          No learning outcomes mapped for this chapter yet — add some on the Curriculum Mapping page.
        </div>
      ) : (
        <>
          {summary.length > 0 && (
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {summary.map((s) => (
                <div key={s.curriculumLearningOutcomeKey} className="rounded-md border border-border bg-card p-3 shadow-sm">
                  <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users2 className="h-3 w-3" /> {s.masteredCount} / {s.rosterCount} mastered
                  </div>
                  <p className="mb-2 text-sm font-medium">{s.outcomeText}</p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-success" style={{ width: `${Math.round(s.masteredPercent)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <DataTable
            data={students}
            columns={matrixColumns}
            rowKey={(s) => s.studentKey}
            searchPlaceholder="Search students..."
            searchFields={(s) => s.studentName}
            emptyMessage={loading ? "Loading..." : "No students found."}
            storageKey="learning-outcomes"
          />
        </>
      )}
    </div>
  );
}
