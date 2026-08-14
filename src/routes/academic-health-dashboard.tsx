import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import {
  ShieldCheck, ShieldAlert, ShieldX, ChevronRight, UserX, Gauge, TrendingDown, NotebookPen,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/academic-health-dashboard")({
  head: () => ({
    meta: [
      { title: "Academic Health Dashboard — Akira School ERP" },
      { name: "description", content: "Is the school healthy? A 10-second strategic view for leadership." },
    ],
  }),
  component: AcademicHealthDashboardPage,
});

// Reuses the exact same underlying data sources and thresholds as the
// Academic Coordinator Dashboard -- never a second, separately-computed
// version of the same numbers (Academic Management spec, Screen 18).

type AcademicYear = { academicYearKey: string; status: string };
type ClassTeacherRow = { classTeacherUserKey: string | null };
type Workload = { assignedWeeklyPeriods: number; maxWeeklyPeriods: number };
type SyllabusRow = { isBehindSchedule: boolean; totalChapters: number; actualPercent: number };
type LessonPlanRow = { planDate: string };

function AcademicHealthDashboardPage() {
  const [activeYearKey, setActiveYearKey] = useState("");
  const [loading, setLoading] = useState(true);

  const [unassignedCount, setUnassignedCount] = useState(0);
  const [overloadedCount, setOverloadedCount] = useState(0);
  const [behindCount, setBehindCount] = useState(0);
  const [avgActual, setAvgActual] = useState(0);
  const [overdueDraftCount, setOverdueDraftCount] = useState(0);

  useEffect(() => {
    apiFetch("/api/AcademicYear")
      .then((y: AcademicYear[]) => setActiveYearKey(y.find((year) => year.status === "Active")?.academicYearKey ?? ""))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load academic years"));
  }, []);

  useEffect(() => {
    if (!activeYearKey) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.allSettled([
      apiFetch(`/api/ClassTeacherAllocation?academicYearId=${activeYearKey}`),
      apiFetch(`/api/SubjectAllocation/workload?academicYearId=${activeYearKey}`),
      apiFetch(`/api/SyllabusProgress?academicYearId=${activeYearKey}`),
      apiFetch("/api/LessonPlan?status=DRAFT"),
    ]).then(([ct, wl, syl, lp]) => {
      if (ct.status === "fulfilled") {
        setUnassignedCount((ct.value as ClassTeacherRow[]).filter((r) => !r.classTeacherUserKey).length);
      }
      if (wl.status === "fulfilled") {
        setOverloadedCount((wl.value as Workload[]).filter((w) => w.assignedWeeklyPeriods > w.maxWeeklyPeriods).length);
      }
      if (syl.status === "fulfilled") {
        const rows = (syl.value as SyllabusRow[]).filter((s) => s.totalChapters > 0);
        setBehindCount(rows.filter((s) => s.isBehindSchedule).length);
        setAvgActual(rows.length > 0 ? Math.round(rows.reduce((sum, s) => sum + s.actualPercent, 0) / rows.length) : 0);
      }
      if (lp.status === "fulfilled") {
        setOverdueDraftCount((lp.value as LessonPlanRow[]).filter((p) => new Date(p.planDate) < new Date()).length);
      }
      setLoading(false);
    });
  }, [activeYearKey]);

  const totalFlags = unassignedCount + overloadedCount + behindCount + overdueDraftCount;
  const health: "healthy" | "attention" | "critical" =
    totalFlags === 0 ? "healthy" : totalFlags <= 3 ? "attention" : "critical";

  const healthMeta = {
    healthy: { label: "Healthy", icon: ShieldCheck, className: "bg-success/10 border-success/30 text-success" },
    attention: { label: "Needs Attention", icon: ShieldAlert, className: "bg-warning/10 border-warning/30 text-[oklch(0.45_0.12_65)]" },
    critical: { label: "Critical", icon: ShieldX, className: "bg-destructive/10 border-destructive/30 text-destructive" },
  }[health];

  const metrics = [
    { label: "Unassigned Class Sections", value: unassignedCount, icon: UserX, ok: unassignedCount === 0 },
    { label: "Overloaded Teachers", value: overloadedCount, icon: Gauge, ok: overloadedCount === 0 },
    { label: "Subjects Behind Schedule", value: behindCount, icon: TrendingDown, ok: behindCount === 0 },
    { label: "Overdue Draft Lesson Plans", value: overdueDraftCount, icon: NotebookPen, ok: overdueDraftCount === 0 },
  ];

  return (
    <div>
      <PageHeader title="Academic Health Dashboard" />

      {!activeYearKey && !loading && (
        <div className="mb-4 rounded-md border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-[oklch(0.45_0.12_65)]">
          No active academic year — activate one on the Academic Years page first.
        </div>
      )}

      <div className={cn("mb-6 flex flex-col items-center gap-3 rounded-md border p-10 text-center shadow-sm", healthMeta.className)}>
        <healthMeta.icon className="h-12 w-12" />
        <div className="font-display text-3xl font-bold text-foreground">{loading ? "Checking..." : healthMeta.label}</div>
        <p className="max-w-md text-sm text-muted-foreground">
          {loading
            ? "Pulling the latest numbers from Structure, People, and Curriculum."
            : totalFlags === 0
              ? "No open issues across class allocation, teacher workload, syllabus pace, or lesson planning."
              : `${totalFlags} item${totalFlags === 1 ? "" : "s"} need attention across class allocation, teacher workload, syllabus pace, or lesson planning.`}
        </p>
        <div className="mt-2 flex items-center gap-4">
          <div className="text-center">
            <div className="font-display text-2xl font-bold text-foreground">{loading ? "—" : `${avgActual}%`}</div>
            <div className="text-xs text-muted-foreground">Avg. Syllabus Coverage</div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className={cn("rounded-md border p-4 shadow-sm", m.ok ? "border-success/20 bg-success/[0.06]" : "border-destructive/20 bg-destructive/[0.06]")}>
            <div className="flex items-center justify-between">
              <m.icon className={cn("h-5 w-5", m.ok ? "text-success" : "text-destructive")} />
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-foreground">{loading ? "—" : m.value}</div>
            <div className="text-xs font-medium text-muted-foreground">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold">Need the details?</h2>
            <p className="text-xs text-muted-foreground">Every flagged item, with a direct link to fix it, lives on the Coordinator Dashboard.</p>
          </div>
          <Link to="/academic-coordinator-dashboard" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Open Coordinator Dashboard <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
