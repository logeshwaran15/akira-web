import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, AlertTriangle, Users2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/subject-allocation")({
  head: () => ({
    meta: [
      { title: "Subject Allocation — Akira School ERP" },
      {
        name: "description",
        content: "Assign teachers to class-section subjects and monitor weekly workload.",
      },
    ],
  }),
  component: SubjectAllocationPage,
});

type UserOption = { akiraUserKey: string; userName: string; roleCode: string };
type SchoolClass = { schoolClassKey: string; className: string };
type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type SectionOption = { sectionKey: string; sectionLabel: string };
type AllocationRow = {
  subjectKey: string;
  subjectName: string;
  weeklyPeriods: number;
  subjectAllocationKey: string | null;
  akiraUserKey: string | null;
  teacherName: string | null;
};
type Workload = {
  akiraUserKey: string;
  userName: string;
  maxWeeklyPeriods: number;
  assignedWeeklyPeriods: number;
  allocationCount: number;
};

function SubjectAllocationPage() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [activeYearKey, setActiveYearKey] = useState("");
  const [classKey, setClassKey] = useState("");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [sectionKey, setSectionKey] = useState("");
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [allocLoading, setAllocLoading] = useState(false);
  const [workload, setWorkload] = useState<Workload[]>([]);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/User"),
      apiFetch("/api/SchoolClass"),
      apiFetch("/api/AcademicYear"),
    ])
      .then(([u, c, y]) => {
        setUsers((u as UserOption[]).filter((user) => user.roleCode === "TEACHER"));
        setClasses(c);
        setYears(y);
        const active = (y as AcademicYear[]).find((year) => year.status === "Active");
        setActiveYearKey(active?.academicYearKey ?? "");
      })
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load subject allocation data"),
      );
  }, []);

  const loadWorkload = () => {
    if (!activeYearKey) return;
    apiFetch(`/api/SubjectAllocation/workload?academicYearId=${activeYearKey}`)
      .then((d: Workload[]) => setWorkload(d))
      .catch(() => {});
  };

  useEffect(loadWorkload, [activeYearKey]);

  useEffect(() => {
    if (!classKey) {
      setSections([]);
      setSectionKey("");
      return;
    }
    apiFetch(`/api/Section?schoolClassId=${classKey}&academicYearId=${activeYearKey}`)
      .then((d: SectionOption[]) => {
        setSections(d);
        setSectionKey(d[0]?.sectionKey ?? "");
      })
      .catch(() => {});
  }, [classKey, activeYearKey]);

  const loadAllocations = () => {
    if (!sectionKey) {
      setAllocations([]);
      return;
    }
    setAllocLoading(true);
    apiFetch(`/api/SubjectAllocation?sectionId=${sectionKey}`)
      .then((d: AllocationRow[]) => setAllocations(d))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load subject allocation"),
      )
      .finally(() => setAllocLoading(false));
  };

  useEffect(loadAllocations, [sectionKey]);

  const assignTeacher = async (subjectKey: string, akiraUserKey: string) => {
    if (!sectionKey || !activeYearKey) return;
    try {
      await apiFetch("/api/SubjectAllocation/assign", {
        method: "POST",
        body: JSON.stringify({
          sectionKey,
          subjectKey,
          akiraUserKey,
          academicYearKey: activeYearKey,
        }),
      });
      toast.success("Teacher assigned");
      loadAllocations();
      loadWorkload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign teacher");
    }
  };

  const allocationColumns: Column<AllocationRow>[] = [
    { key: "subjectName", header: "Subject", sortable: true, accessor: (a) => <span className="font-medium">{a.subjectName}</span> },
    { key: "weeklyPeriods", header: "Periods/wk", sortable: true, accessor: (a) => a.weeklyPeriods },
    {
      key: "teacher",
      header: "Teacher",
      accessor: (a) => (
        <Select
          value={a.akiraUserKey ?? "none"}
          onValueChange={(v) => assignTeacher(a.subjectKey, v)}
        >
          <SelectTrigger className="h-9 w-[220px] rounded-md">
            <SelectValue placeholder="Assign teacher" />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.akiraUserKey} value={u.akiraUserKey}>
                {u.userName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
  ];

  const workloadColumns: Column<Workload>[] = [
    { key: "userName", header: "Teacher", sortable: true, accessor: (w) => <span className="font-medium">{w.userName}</span> },
    { key: "assignedWeeklyPeriods", header: "Assigned", sortable: true, accessor: (w) => w.assignedWeeklyPeriods },
    { key: "maxWeeklyPeriods", header: "Max", sortable: true, accessor: (w) => w.maxWeeklyPeriods },
    {
      key: "status",
      header: "Status",
      accessor: (w) => {
        const overloaded = w.assignedWeeklyPeriods > w.maxWeeklyPeriods;
        return overloaded ? (
          <Badge className="gap-1 rounded-md border-0 bg-destructive/15 text-destructive">
            <AlertTriangle className="h-3 w-3" /> Overloaded
          </Badge>
        ) : (
          <Badge className="rounded-md border-0 bg-success/15 text-success">OK</Badge>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Subject Allocation"
        breadcrumbs={[{ label: "Staff" }, { label: "Subject Allocation" }]}
      />

      {!activeYearKey && (
        <div className="mb-4 rounded-md border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-[oklch(0.45_0.12_65)]">
          No active academic year — subject allocation and workload need one activated first.
        </div>
      )}

      <Tabs defaultValue="allocation">
        <TabsList>
          <TabsTrigger value="allocation" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" /> Class-wise Allocation
          </TabsTrigger>
          <TabsTrigger value="workload" className="gap-1.5">
            <Users2 className="h-3.5 w-3.5" /> Teacher Workload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="allocation">
          <div className="rounded-md border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <h2 className="font-display text-base font-semibold">Class-wise Allocation</h2>
              </div>
              <div className="flex items-center gap-2">
                <Select value={classKey} onValueChange={setClassKey}>
                  <SelectTrigger className="h-9 w-[180px] rounded-md">
                    <SelectValue placeholder="Choose class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>
                        {c.className}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sectionKey} onValueChange={setSectionKey}>
                  <SelectTrigger className="h-9 w-[140px] rounded-md">
                    <SelectValue placeholder="Section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((s) => (
                      <SelectItem key={s.sectionKey} value={s.sectionKey}>
                        {s.sectionLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DataTable
              data={allocations}
              columns={allocationColumns}
              rowKey={(a) => a.subjectKey}
              searchPlaceholder="Search subjects..."
              searchFields={(a) => `${a.subjectName} ${a.teacherName ?? ""}`}
              emptyMessage={
                allocLoading
                  ? "Loading..."
                  : !sectionKey
                    ? "Choose a class and section."
                    : "No subjects mapped to this class yet."
              }
              storageKey="subject-allocation-class"
            />
          </div>
        </TabsContent>

        <TabsContent value="workload">
          <div className="rounded-md border border-border bg-card shadow-sm">
            <div className="border-b border-border p-4">
              <h2 className="font-display text-base font-semibold">Teacher Workload</h2>
              <p className="text-xs text-muted-foreground">
                Total periods/week assigned this academic year vs. configured maximum.
              </p>
            </div>
            <DataTable
              data={workload}
              columns={workloadColumns}
              rowKey={(w) => w.akiraUserKey}
              searchPlaceholder="Search teachers..."
              searchFields={(w) => w.userName}
              emptyMessage="No workload data yet."
              storageKey="subject-allocation-workload"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
