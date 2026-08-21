import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { AlertTriangle, ClipboardCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/subject-distribution-tracker")({
  head: () => ({
    meta: [
      { title: "Subject Distribution Tracker — Akira School ERP" },
      { name: "description", content: "Required weekly periods vs. what's actually been placed in the Timetable Builder, per class-section." },
    ],
  }),
  component: SubjectDistributionTrackerPage,
});

type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type SchoolClass = { schoolClassKey: string; className: string };
type SectionOption = { sectionKey: string; sectionLabel: string };
type DistributionRow = {
  subjectKey: string; subjectName: string;
  weeklyPeriodsRequired: number; allocatedPeriods: number; balancePeriods: number;
};

function SubjectDistributionTrackerPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearKey, setYearKey] = useState("");
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classKey, setClassKey] = useState("");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [sectionKey, setSectionKey] = useState("");
  const [rows, setRows] = useState<DistributionRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([apiFetch("/api/AcademicYear"), apiFetch("/api/SchoolClass")])
      .then(([y, c]) => {
        setYears(y);
        setClasses(c);
        const active = (y as AcademicYear[]).find((yy) => yy.status === "Active") ?? y[0];
        if (active) setYearKey(active.academicYearKey);
        if (c.length > 0) setClassKey(c[0].schoolClassKey);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load filters"));
  }, []);

  useEffect(() => {
    if (!classKey || !yearKey) { setSections([]); return; }
    apiFetch(`/api/Section?schoolClassId=${classKey}&academicYearId=${yearKey}`)
      .then((d: SectionOption[]) => { setSections(d); setSectionKey(d[0]?.sectionKey ?? ""); })
      .catch(() => setSections([]));
  }, [classKey, yearKey]);

  const load = () => {
    if (!sectionKey || !yearKey) { setRows([]); return; }
    setLoading(true);
    apiFetch(`/api/Timetable/subject-distribution/${sectionKey}?academicYearId=${yearKey}`)
      .then((d: DistributionRow[]) => setRows(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load subject distribution"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [sectionKey, yearKey]);

  const shortfallCount = rows.filter((r) => r.balancePeriods > 0).length;
  const overCount = rows.filter((r) => r.balancePeriods < 0).length;

  const columns: Column<DistributionRow>[] = [
    { key: "subjectName", header: "Subject", sortable: true, accessor: (r) => <span className="font-medium">{r.subjectName}</span> },
    { key: "weeklyPeriodsRequired", header: "Required / wk", sortable: true, accessor: (r) => r.weeklyPeriodsRequired },
    { key: "allocatedPeriods", header: "Placed in Builder", sortable: true, accessor: (r) => r.allocatedPeriods },
    {
      key: "balancePeriods",
      header: "Balance",
      sortable: true,
      accessor: (r) =>
        r.balancePeriods === 0 ? (
          <Badge className="rounded-md border-0 bg-success/15 text-success">On target</Badge>
        ) : r.balancePeriods > 0 ? (
          <Badge className="gap-1 rounded-md border-0 bg-warning/25 text-[oklch(0.45_0.12_65)]">
            <AlertTriangle className="h-3 w-3" /> Short {r.balancePeriods}
          </Badge>
        ) : (
          <Badge className="gap-1 rounded-md border-0 bg-destructive/15 text-destructive">
            <AlertTriangle className="h-3 w-3" /> Over by {Math.abs(r.balancePeriods)}
          </Badge>
        ),
    },
  ];

  return (
    <div>
      <PageHeader title="Subject Distribution Tracker" breadcrumbs={[{ label: "Academics" }, { label: "Subject Distribution Tracker" }]} />

      <div className="mb-4 flex items-start gap-2 rounded-md border border-info/30 bg-info/10 px-4 py-2.5 text-sm text-info">
        <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Compares each subject's required weekly periods (from Subject Teacher Allocation) against what's actually
          been placed in the Timetable Builder — catch a shortfall here, before publishing, not weeks into the term.
        </span>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Academic Year</Label>
          <Select value={yearKey} onValueChange={setYearKey}>
            <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose year" /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y.academicYearKey} value={y.academicYearKey}>{y.yearName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Class</Label>
          <Select value={classKey} onValueChange={setClassKey}>
            <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose class" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>{c.className}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Section</Label>
          <Select value={sectionKey} onValueChange={setSectionKey}>
            <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose section" /></SelectTrigger>
            <SelectContent>
              {sections.map((s) => <SelectItem key={s.sectionKey} value={s.sectionKey}>{s.sectionLabel}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <Badge className={cn("rounded-md border-0", shortfallCount === 0 ? "bg-success/15 text-success" : "bg-warning/25 text-[oklch(0.45_0.12_65)]")}>
            {shortfallCount === 0 ? "All subjects on target" : `${shortfallCount} subject(s) short`}
          </Badge>
          {overCount > 0 && <Badge className="rounded-md border-0 bg-destructive/15 text-destructive">{overCount} over-scheduled</Badge>}
        </div>
      )}

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.subjectKey}
        searchPlaceholder="Search subjects..."
        searchFields={(r) => r.subjectName}
        emptyMessage={loading ? "Loading..." : !sectionKey ? "Choose a class and section." : "No subjects mapped to this class yet."}
        storageKey="subject-distribution-tracker"
      />
    </div>
  );
}
