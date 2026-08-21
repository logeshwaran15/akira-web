import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { AlertTriangle, TrendingUp, CalendarClock } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/syllabus-tracker")({
  head: () => ({
    meta: [
      { title: "Syllabus Completion Tracker — Akira School ERP" },
      { name: "description", content: "Auto-computed planned-vs-actual syllabus coverage, per class and subject." },
    ],
  }),
  component: SyllabusTrackerPage,
});

type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type SchoolClass = { schoolClassKey: string; className: string };
type Subject = { subjectKey: string; subjectName: string };
type Progress = {
  curriculumKey: string; className: string; subjectName: string;
  totalChapters: number; conductedChapters: number; actualPercent: number; plannedPercent: number; isBehindSchedule: boolean;
};

function SyllabusTrackerPage() {
  const [activeYearKey, setActiveYearKey] = useState("");
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [rows, setRows] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (!activeYearKey) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ academicYearId: activeYearKey });
    if (classFilter !== "all") params.set("schoolClassId", classFilter);
    if (subjectFilter !== "all") params.set("subjectId", subjectFilter);
    apiFetch(`/api/SyllabusProgress?${params.toString()}`)
      .then((d: Progress[]) => setRows(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load syllabus progress"))
      .finally(() => setLoading(false));
  }, [activeYearKey, classFilter, subjectFilter]);

  const behindCount = rows.filter((r) => r.isBehindSchedule).length;
  const avgActual = rows.length > 0 ? Math.round(rows.reduce((sum, r) => sum + r.actualPercent, 0) / rows.length) : 0;
  const plannedPercent = rows.length > 0 ? Math.round(rows[0].plannedPercent) : 0;

  const columns: Column<Progress>[] = [
    { key: "className", header: "Class", sortable: true, accessor: (r) => <span className="font-medium">{r.className}</span> },
    { key: "subjectName", header: "Subject", sortable: true, accessor: (r) => r.subjectName },
    {
      key: "conductedChapters",
      header: "Chapters Covered",
      sortable: true,
      sortValue: (r) => r.conductedChapters,
      accessor: (r) => `${r.conductedChapters} / ${r.totalChapters}`,
    },
    {
      key: "actualPercent",
      header: "Actual vs Planned",
      sortable: true,
      sortValue: (r) => r.actualPercent,
      accessor: (r) => (
        <div className="min-w-[180px]">
          <div className="text-sm">{Math.round(r.actualPercent)}% actual vs {Math.round(r.plannedPercent)}% expected</div>
          <div className="relative mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn("h-full rounded-full", r.isBehindSchedule ? "bg-destructive" : "bg-primary")}
              style={{ width: `${Math.min(100, r.actualPercent)}%` }}
            />
            <div
              className="absolute top-0 h-full w-0.5 bg-foreground/50"
              style={{ left: `${Math.min(100, r.plannedPercent)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      accessor: (r) =>
        r.totalChapters === 0 ? (
          <Badge className="rounded-md border-0 bg-muted text-muted-foreground">No chapters mapped</Badge>
        ) : r.isBehindSchedule ? (
          <Badge className="gap-1 rounded-md border-0 bg-destructive/15 text-destructive">
            <AlertTriangle className="h-3 w-3" /> Behind Schedule
          </Badge>
        ) : (
          <Badge className="rounded-md border-0 bg-success/15 text-success">On Track</Badge>
        ),
    },
  ];

  return (
    <div>
      <PageHeader title="Syllabus Completion Tracker" />

      {!activeYearKey && !loading && (
        <div className="mb-4 rounded-md border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-[oklch(0.45_0.12_65)]">
          No active academic year — syllabus progress is scoped to the active academic year.
        </div>
      )}

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-info/20 bg-info/[0.06] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-info/15 text-info">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold">{plannedPercent}%</div>
              <div className="text-sm font-medium text-foreground/90">Expected by Today</div>
              <div className="text-xs text-muted-foreground">Based on the academic year calendar</div>
            </div>
          </div>
        </div>
        <div className="rounded-md border border-primary/20 bg-primary/[0.06] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold">{avgActual}%</div>
              <div className="text-sm font-medium text-foreground/90">Average Actual Coverage</div>
              <div className="text-xs text-muted-foreground">Across all tracked subjects</div>
            </div>
          </div>
        </div>
        <div className="rounded-md border border-destructive/20 bg-destructive/[0.06] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-destructive/15 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold">{behindCount}</div>
              <div className="text-sm font-medium text-foreground/90">Behind Schedule</div>
              <div className="text-xs text-muted-foreground">More than 10 points under plan</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="h-9 w-[180px] rounded-md"><SelectValue placeholder="All Classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map((c) => <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>{c.className}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="h-9 w-[180px] rounded-md"><SelectValue placeholder="All Subjects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map((s) => <SelectItem key={s.subjectKey} value={s.subjectKey}>{s.subjectName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border border-border bg-card shadow-sm">
        <div className="border-b border-border p-4">
          <p className="text-xs text-muted-foreground">
            Actual = distinct curriculum chapters marked "Conducted" on a Lesson Plan. Planned = how far through the academic year we are today. Nothing here is typed in by hand.
          </p>
        </div>
        <DataTable
          data={rows}
          columns={columns}
          rowKey={(r) => r.curriculumKey}
          searchPlaceholder="Search class or subject..."
          searchFields={(r) => `${r.className} ${r.subjectName}`}
          emptyMessage={loading ? "Loading..." : "No curriculum maps found. Build one on the Curriculum Mapping page first."}
          storageKey="syllabus-tracker"
        />
      </div>
    </div>
  );
}
