import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle, CheckCircle2, ChevronRight, UserX, Gauge, TrendingDown, NotebookPen, UserCog,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/academic-coordinator-dashboard")({
  head: () => ({
    meta: [
      { title: "Academic Coordinator Dashboard — Akira School ERP" },
      { name: "description", content: "One glance at every academic gap that needs attention today." },
    ],
  }),
  component: AcademicCoordinatorDashboardPage,
});

type AcademicYear = { academicYearKey: string; status: string };
type ClassTeacherRow = { sectionKey: string; className: string; sectionLabel: string; classTeacherUserKey: string | null };
type Workload = { akiraUserKey: string; userName: string; maxWeeklyPeriods: number; assignedWeeklyPeriods: number };
type SyllabusRow = { curriculumKey: string; className: string; subjectName: string; isBehindSchedule: boolean; totalChapters: number };
type LessonPlanRow = { lessonPlanKey: string; teacherName: string | null; className: string | null; sectionLabel: string | null; subjectName: string | null; planDate: string; status: string };
type SubstituteRow = { substituteTeacherPoolKey: string };

type FlaggedItem = { label: string; detail: string; to: string; tone: "destructive" | "warning" };

function AcademicCoordinatorDashboardPage() {
  const [activeYearKey, setActiveYearKey] = useState("");
  const [loading, setLoading] = useState(true);

  const [classTeacherRows, setClassTeacherRows] = useState<ClassTeacherRow[]>([]);
  const [workload, setWorkload] = useState<Workload[]>([]);
  const [syllabus, setSyllabus] = useState<SyllabusRow[]>([]);
  const [draftPlans, setDraftPlans] = useState<LessonPlanRow[]>([]);
  const [substitutes, setSubstitutes] = useState<SubstituteRow[]>([]);

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
      apiFetch("/api/SubstituteTeacherPool"),
    ]).then(([ct, wl, syl, lp, sub]) => {
      if (ct.status === "fulfilled") setClassTeacherRows(ct.value);
      if (wl.status === "fulfilled") setWorkload(wl.value);
      if (syl.status === "fulfilled") setSyllabus(syl.value);
      if (lp.status === "fulfilled") setDraftPlans(lp.value);
      if (sub.status === "fulfilled") setSubstitutes(sub.value);
      setLoading(false);
    });
  }, [activeYearKey]);

  const unassignedSections = classTeacherRows.filter((r) => !r.classTeacherUserKey);
  const overloadedTeachers = workload.filter((w) => w.assignedWeeklyPeriods > w.maxWeeklyPeriods);
  const behindSubjects = syllabus.filter((s) => s.isBehindSchedule && s.totalChapters > 0);
  const overdueDraftPlans = draftPlans.filter((p) => new Date(p.planDate) < new Date());

  const flagged: FlaggedItem[] = [
    ...unassignedSections.map((r) => ({
      label: `${r.className} - ${r.sectionLabel} has no class teacher`,
      detail: "Class Teacher Allocation",
      to: "/class-teacher-allocation",
      tone: "destructive" as const,
    })),
    ...overloadedTeachers.map((w) => ({
      label: `${w.userName} is overloaded (${w.assignedWeeklyPeriods}/${w.maxWeeklyPeriods} periods/week)`,
      detail: "Teacher Workload",
      to: "/teacher-workload",
      tone: "destructive" as const,
    })),
    ...behindSubjects.map((s) => ({
      label: `${s.subjectName} — ${s.className} is behind on syllabus`,
      detail: "Syllabus Tracker",
      to: "/syllabus-tracker",
      tone: "warning" as const,
    })),
    ...overdueDraftPlans.map((p) => ({
      label: `${p.teacherName ?? "A lesson"} plan for ${p.className} - ${p.sectionLabel} / ${p.subjectName} is still a draft past its date`,
      detail: "Lesson Plans",
      to: "/lesson-plans",
      tone: "warning" as const,
    })),
    ...(substitutes.length === 0
      ? [{ label: "No substitute teachers configured yet", detail: "Substitute Teacher Pool", to: "/substitute-teacher-pool", tone: "warning" as const }]
      : []),
  ];

  const cards = [
    { label: "Unassigned Class Sections", value: unassignedSections.length, icon: UserX, to: "/class-teacher-allocation", tone: "destructive" as const },
    { label: "Overloaded Teachers", value: overloadedTeachers.length, icon: Gauge, to: "/teacher-workload", tone: "destructive" as const },
    { label: "Subjects Behind Schedule", value: behindSubjects.length, icon: TrendingDown, to: "/syllabus-tracker", tone: "warning" as const },
    { label: "Overdue Draft Lesson Plans", value: overdueDraftPlans.length, icon: NotebookPen, to: "/lesson-plans", tone: "warning" as const },
    { label: "Substitute Pool Entries", value: substitutes.length, icon: UserCog, to: "/substitute-teacher-pool", tone: substitutes.length === 0 ? "warning" as const : "success" as const },
  ];

  const toneStyles: Record<string, string> = {
    destructive: "border-destructive/20 bg-destructive/[0.06] text-destructive",
    warning: "border-warning/30 bg-warning/[0.08] text-[oklch(0.45_0.12_65)]",
    success: "border-success/20 bg-success/[0.06] text-success",
  };

  return (
    <div>
      <PageHeader title="Academic Coordinator Dashboard" />

      {!activeYearKey && !loading && (
        <div className="mb-4 rounded-md border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-[oklch(0.45_0.12_65)]">
          No active academic year — activate one on the Academic Years page first.
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="block">
            <div className={`h-full rounded-md border p-4 shadow-sm transition-shadow hover:shadow-md ${toneStyles[c.tone]}`}>
              <div className="flex items-center justify-between">
                <c.icon className="h-5 w-5" />
                <ChevronRight className="h-4 w-4 opacity-50" />
              </div>
              <div className="mt-2 font-display text-2xl font-bold text-foreground">{loading ? "—" : c.value}</div>
              <div className="text-xs font-medium">{c.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-md border border-border bg-card shadow-sm">
        <div className="border-b border-border p-4">
          <h2 className="font-display text-base font-semibold">Flagged Items</h2>
          <p className="text-xs text-muted-foreground">Every item here is clickable — it takes you straight to the screen that fixes it.</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Issue</TableHead>
              <TableHead>Area</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={3} className="h-24 text-center text-sm text-muted-foreground">Loading...</TableCell></TableRow>
            ) : flagged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-sm text-muted-foreground">
                  <div className="flex flex-col items-center gap-1.5">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    Nothing flagged. Everything looks on track.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              flagged.map((f, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{f.label}</TableCell>
                  <TableCell>
                    <Badge className={`gap-1 rounded-md border-0 px-2 py-0.5 text-xs font-medium ${f.tone === "destructive" ? "bg-destructive/15 text-destructive" : "bg-warning/25 text-[oklch(0.45_0.12_65)]"}`}>
                      <AlertTriangle className="h-3 w-3" /> {f.detail}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={f.to} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                      Fix <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
