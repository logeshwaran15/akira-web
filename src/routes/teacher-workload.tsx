import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Gauge } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/teacher-workload")({
  head: () => ({
    meta: [
      { title: "Teacher Workload Dashboard — Akira School ERP" },
      { name: "description", content: "Live view of every teacher's weekly period load versus their configured maximum." },
    ],
  }),
  component: TeacherWorkloadPage,
});

type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type Workload = {
  akiraUserKey: string;
  userName: string;
  maxWeeklyPeriods: number;
  assignedWeeklyPeriods: number;
  allocationCount: number;
};

function TeacherWorkloadPage() {
  const [activeYearKey, setActiveYearKey] = useState("");
  const [workload, setWorkload] = useState<Workload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/AcademicYear")
      .then((y: AcademicYear[]) => {
        const active = y.find((year) => year.status === "Active");
        setActiveYearKey(active?.academicYearKey ?? "");
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load academic years"));
  }, []);

  useEffect(() => {
    if (!activeYearKey) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiFetch(`/api/SubjectAllocation/workload?academicYearId=${activeYearKey}`)
      .then((d: Workload[]) => setWorkload(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load teacher workload"))
      .finally(() => setLoading(false));
  }, [activeYearKey]);

  const overloadedCount = workload.filter((w) => w.assignedWeeklyPeriods > w.maxWeeklyPeriods).length;
  const totalPeriods = workload.reduce((sum, w) => sum + w.assignedWeeklyPeriods, 0);

  const sorted = [...workload].sort((a, b) => (b.assignedWeeklyPeriods - b.maxWeeklyPeriods) - (a.assignedWeeklyPeriods - a.maxWeeklyPeriods));

  return (
    <div>
      <PageHeader title="Teacher Workload Dashboard" />

      {!activeYearKey && !loading && (
        <div className="mb-4 rounded-md border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-[oklch(0.45_0.12_65)]">
          No active academic year — workload is scoped to the active academic year.
        </div>
      )}

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-primary/20 bg-primary/[0.06] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold">{workload.length}</div>
              <div className="text-sm font-medium text-foreground/90">Teachers with Allocations</div>
            </div>
          </div>
        </div>
        <div className="rounded-md border border-destructive/20 bg-destructive/[0.06] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-destructive/15 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold">{overloadedCount}</div>
              <div className="text-sm font-medium text-foreground/90">Overloaded</div>
            </div>
          </div>
        </div>
        <div className="rounded-md border border-info/20 bg-info/[0.06] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-info/15 text-info">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold">{totalPeriods}</div>
              <div className="text-sm font-medium text-foreground/90">Total Periods/Week Assigned</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card shadow-sm">
        <div className="border-b border-border p-4">
          <p className="text-xs text-muted-foreground">
            Recomputed live from active Subject Teacher Allocations. Substitute-coverage periods aren't counted here.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Teacher</TableHead>
              <TableHead>Subjects Assigned</TableHead>
              <TableHead>Assigned / Max</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">Loading...</TableCell></TableRow>
            ) : sorted.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">No subject allocations yet.</TableCell></TableRow>
            ) : (
              sorted.map((w) => {
                const overloaded = w.assignedWeeklyPeriods > w.maxWeeklyPeriods;
                const pct = w.maxWeeklyPeriods > 0 ? Math.min(100, Math.round((w.assignedWeeklyPeriods / w.maxWeeklyPeriods) * 100)) : 0;
                return (
                  <TableRow key={w.akiraUserKey}>
                    <TableCell className="font-medium">{w.userName}</TableCell>
                    <TableCell>{w.allocationCount}</TableCell>
                    <TableCell>
                      <div className="min-w-[140px]">
                        <div className="text-sm">{w.assignedWeeklyPeriods} / {w.maxWeeklyPeriods}</div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className={cn("h-full rounded-full", overloaded ? "bg-destructive" : "bg-primary")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {overloaded ? (
                        <Badge className="gap-1 rounded-md border-0 bg-destructive/15 text-destructive">
                          <AlertTriangle className="h-3 w-3" /> Overloaded
                        </Badge>
                      ) : (
                        <Badge className="rounded-md border-0 bg-success/15 text-success">OK</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
