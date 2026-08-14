import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Blocks, Clock, Settings2, ShieldAlert, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/governance-dashboard")({
  head: () => ({
    meta: [
      { title: "Governance Dashboard — Akira School ERP" },
      { name: "description", content: "One glance at Departments, Period Structure and Academic Policy setup." },
    ],
  }),
  component: GovernanceDashboardPage,
});

type DepartmentRow = { departmentKey: string; departmentName: string; departmentCode: string; hodName: string | null; isActive: boolean };
type PolicyCategoryCount = { policyCategory: string; count: number };
type PolicyRow = { academicPolicyKey: string; policyCategory: string; policyKey: string; policyValue: string; effectiveDate: string };
type StagePeriodCount = { academicStageKey: string; stageName: string; periodCount: number };

type Summary = {
  departmentCount: number;
  departmentsWithoutHOD: number;
  departments: DepartmentRow[];
  policyCount: number;
  policiesByCategory: PolicyCategoryCount[];
  recentPolicies: PolicyRow[];
  stageCount: number;
  periodCount: number;
  periodsByStage: StagePeriodCount[];
};

function GovernanceDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/GovernanceDashboard")
      .then((d: Summary) => setSummary(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load governance dashboard"))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      label: "Departments",
      value: summary?.departmentCount ?? 0,
      icon: Blocks,
      to: "/departments",
      tone: "default" as const,
    },
    {
      label: "Departments Without HOD",
      value: summary?.departmentsWithoutHOD ?? 0,
      icon: ShieldAlert,
      to: "/departments",
      tone: (summary?.departmentsWithoutHOD ?? 0) > 0 ? ("warning" as const) : ("success" as const),
    },
    {
      label: "Period Structures Configured",
      value: summary?.stageCount ?? 0,
      icon: Clock,
      to: "/period-structure-setup",
      tone: (summary?.stageCount ?? 0) === 0 ? ("warning" as const) : ("success" as const),
    },
    {
      label: "Academic Policies",
      value: summary?.policyCount ?? 0,
      icon: Settings2,
      to: "/academic-policy-settings",
      tone: (summary?.policyCount ?? 0) === 0 ? ("warning" as const) : ("default" as const),
    },
  ];

  const toneStyles: Record<string, string> = {
    default: "border-border bg-card",
    warning: "border-warning/30 bg-warning/[0.08] text-[oklch(0.45_0.12_65)]",
    success: "border-success/20 bg-success/[0.06] text-success",
  };

  return (
    <div>
      <PageHeader title="Governance Dashboard" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="block">
            <div className={cn("h-full rounded-md border p-4 shadow-sm transition-shadow hover:shadow-md", toneStyles[c.tone])}>
              <div className="flex items-center justify-between">
                <c.icon className="h-5 w-5" />
                <ChevronRight className="h-4 w-4 opacity-50" />
              </div>
              <div className="mt-2 font-display text-2xl font-bold text-foreground">{loading ? "—" : c.value}</div>
              <div className="text-xs font-medium text-muted-foreground">{c.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-card shadow-sm">
          <div className="border-b border-border p-4">
            <h2 className="font-display text-base font-semibold">Departments</h2>
            <p className="text-xs text-muted-foreground">Head of Department coverage across the school.</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>HOD</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3} className="h-20 text-center text-sm text-muted-foreground">Loading...</TableCell></TableRow>
              ) : !summary || summary.departments.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="h-20 text-center text-sm text-muted-foreground">No departments yet.</TableCell></TableRow>
              ) : (
                summary.departments.map((d) => (
                  <TableRow key={d.departmentKey}>
                    <TableCell className="font-medium">
                      {d.departmentName} <span className="text-xs text-muted-foreground">({d.departmentCode})</span>
                    </TableCell>
                    <TableCell>
                      {d.hodName ?? <span className="text-muted-foreground">Unassigned</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className={cn("rounded-md border-0 px-2 py-0.5 text-xs font-medium", d.isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                        {d.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-md border border-border bg-card shadow-sm">
          <div className="border-b border-border p-4">
            <h2 className="font-display text-base font-semibold">Period Structure by Stage</h2>
            <p className="text-xs text-muted-foreground">Daily bell schedule coverage per academic stage.</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Periods</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={2} className="h-20 text-center text-sm text-muted-foreground">Loading...</TableCell></TableRow>
              ) : !summary || summary.periodsByStage.length === 0 ? (
                <TableRow><TableCell colSpan={2} className="h-20 text-center text-sm text-muted-foreground">No period structures configured yet.</TableCell></TableRow>
              ) : (
                summary.periodsByStage.map((s) => (
                  <TableRow key={s.academicStageKey}>
                    <TableCell className="font-medium">{s.stageName}</TableCell>
                    <TableCell className="text-right">{s.periodCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-md border border-border bg-card shadow-sm lg:col-span-2">
          <div className="border-b border-border p-4">
            <h2 className="font-display text-base font-semibold">Academic Policies</h2>
            <p className="text-xs text-muted-foreground">
              {summary && summary.policiesByCategory.length > 0
                ? summary.policiesByCategory.map((p) => `${p.policyCategory}: ${p.count}`).join(" · ")
                : "By category, most recently created first."}
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Value</TableHead>
                <TableHead className="text-right">Effective From</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="h-20 text-center text-sm text-muted-foreground">Loading...</TableCell></TableRow>
              ) : !summary || summary.recentPolicies.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-20 text-center text-sm text-muted-foreground">No academic policies configured yet.</TableCell></TableRow>
              ) : (
                summary.recentPolicies.map((p) => (
                  <TableRow key={p.academicPolicyKey}>
                    <TableCell>
                      <Badge className="rounded-md border-0 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {p.policyCategory}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{p.policyKey}</TableCell>
                    <TableCell>{p.policyValue}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Date(p.effectiveDate).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
