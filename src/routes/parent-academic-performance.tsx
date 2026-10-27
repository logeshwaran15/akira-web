import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Minus, TrendingDown, TrendingUp, Trophy, Percent } from "lucide-react";
import { PageHeader } from "@/components/erp/PageHeader";
import { StudentAvatar } from "@/components/erp/StudentAvatar";
import { PageLoader } from "@/components/PageLoader";
import { apiFetch } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/parent-academic-performance")({
  head: () => ({
    meta: [
      { title: "Academic Performance — Akira School ERP" },
      { name: "description", content: "Exam-by-exam trends and subject strengths for your child." },
    ],
  }),
  component: ParentAcademicPerformancePage,
});

// Built from the PARENT-only results endpoints (published exams only): the exam list,
// then one report card per exam.
type Child = {
  studentKey: string;
  studentName: string;
  className: string | null;
  sectionLabel: string | null;
  gender: string | null;
  photoUrl: string | null;
};
type ResultSummary = {
  examTypeKey: string;
  examTypeName: string;
  schoolClassKey: string;
  academicYearName: string | null;
  overallPercentage: number | null;
  publishedOn: string | null;
};
type SubjectRow = {
  subjectName: string;
  percentage: number | null;
  isPass: boolean;
  isAbsent: boolean;
};
type ReportCard = {
  overallPercentage: number | null;
  rank: number | null;
  rankOutOf: number;
  subjects: SubjectRow[];
};
type Exam = ResultSummary & { card: ReportCard | null };

const num = (n: number | null | undefined) => (n == null ? "—" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 1 }));

// Marks band for the subject × exam grid.
const band = (p: number | null) =>
  p == null ? "text-muted-foreground"
    : p >= 75 ? "bg-success/15 text-success"
    : p >= 40 ? "bg-warning/25 text-[oklch(0.45_0.12_65)]"
    : "bg-destructive/15 text-destructive";

function ParentAcademicPerformancePage() {
  const { user, loading: userLoading } = useCurrentUser();

  const [children, setChildren] = useState<Child[]>([]);
  const [childKey, setChildKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [exams, setExams] = useState<Exam[]>([]);
  const [examsLoading, setExamsLoading] = useState(false);

  useEffect(() => {
    apiFetch("/api/Parent/children")
      .then((list: Child[]) => {
        setChildren(list ?? []);
        setChildKey(list?.[0]?.studentKey ?? null);
      })
      .catch(() => toast.error("Failed to load your children"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!childKey) return;
    let cancelled = false;
    setExamsLoading(true);
    setExams([]);
    (async () => {
      try {
        const list: ResultSummary[] = (await apiFetch(`/api/Parent/children/${childKey}/results`)) ?? [];
        const withCards = await Promise.all(
          list.map(async (r): Promise<Exam> => {
            try {
              const card: ReportCard = await apiFetch(
                `/api/Parent/children/${childKey}/results/${r.examTypeKey}?classId=${r.schoolClassKey}`,
              );
              return { ...r, card };
            } catch {
              return { ...r, card: null };
            }
          }),
        );
        // Oldest first so the chart and the trend arrows read left to right.
        withCards.sort((a, b) => (a.publishedOn ?? "").localeCompare(b.publishedOn ?? ""));
        if (!cancelled) setExams(withCards);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Failed to load performance");
      } finally {
        if (!cancelled) setExamsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [childKey]);

  const chartData = useMemo(
    () => exams.map((e) => ({ exam: e.examTypeName, percent: e.overallPercentage })),
    [exams],
  );

  // One row per subject, one column per exam; trend compares the last two scored exams.
  const subjectRows = useMemo(() => {
    const names = new Set<string>();
    for (const e of exams) for (const s of e.card?.subjects ?? []) names.add(s.subjectName);
    return [...names].sort().map((name) => {
      const scores = exams.map((e) => {
        const s = e.card?.subjects.find((x) => x.subjectName === name);
        return s && !s.isAbsent ? s.percentage : null;
      });
      const scored = scores.filter((p): p is number => p != null);
      const delta = scored.length >= 2 ? scored[scored.length - 1] - scored[scored.length - 2] : null;
      return { name, scores, delta };
    });
  }, [exams]);

  if (userLoading) return <PageLoader />;
  if (user && user.roleCode !== "PARENT") return <Navigate to="/dashboard" replace />;

  const latest = exams[exams.length - 1] ?? null;
  const strongest = [...subjectRows]
    .map((r) => ({ ...r, last: [...r.scores].reverse().find((p) => p != null) ?? null }))
    .filter((r) => r.last != null)
    .sort((a, b) => (b.last as number) - (a.last as number));

  return (
    <div>
      <PageHeader title="Academic Performance" />

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>
      ) : children.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
          No children are linked to your account. Please contact the school office.
        </div>
      ) : (
        <>
          <div className="-mx-1 mb-5 flex gap-2.5 overflow-x-auto px-1 pb-1">
            {children.map((c) => {
              const active = c.studentKey === childKey;
              return (
                <button
                  key={c.studentKey}
                  type="button"
                  onClick={() => setChildKey(c.studentKey)}
                  aria-pressed={active}
                  className={cn(
                    "flex shrink-0 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25"
                      : "border-border bg-card shadow-sm hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
                  )}
                >
                  <StudentAvatar photoUrl={c.photoUrl} gender={c.gender} studentName={c.studentName} className="h-9 w-9" />
                  <span>
                    <span className="block text-sm font-semibold leading-tight">{c.studentName}</span>
                    <span className={cn("block text-xs", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {[c.className, c.sectionLabel].filter(Boolean).join(" - ") || "—"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {examsLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading performance...</div>
          ) : exams.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
              <div className="text-sm font-semibold">No results published yet</div>
              <div className="text-xs text-muted-foreground">
                Performance trends will appear once the school publishes exam results.
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <Tile icon={Percent} label="Latest Score" value={latest?.overallPercentage != null ? `${num(latest.overallPercentage)}%` : "—"} note={latest?.examTypeName} tone="bg-success/10 text-success" />
                <Tile
                  icon={Trophy}
                  label="Latest Rank"
                  value={latest?.card?.rank != null ? `${latest.card.rank} / ${latest.card.rankOutOf}` : "—"}
                  tone="bg-warning/15 text-[oklch(0.45_0.12_65)]"
                />
                <Tile
                  icon={strongest[0] ? TrendingUp : Minus}
                  label="Strongest Subject"
                  value={strongest[0]?.name ?? "—"}
                  note={strongest[0] ? `${num(strongest[0].last)}%` : undefined}
                  tone="bg-info/10 text-info"
                />
              </div>

              <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <h2 className="mb-3 font-display text-base font-bold">Overall % by exam</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 16, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.008 260)" vertical={false} />
                      <XAxis dataKey="exam" tickLine={false} axisLine={false} fontSize={12} stroke="oklch(0.5 0.02 260)" />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="oklch(0.5 0.02 260)" domain={[0, 100]} unit="%" />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.008 260)", fontSize: 12 }}
                        formatter={(v: number) => [`${num(v)}%`, "Overall"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="percent"
                        stroke="oklch(0.72 0.18 42)"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="border-b border-border px-4 py-3">
                  <h2 className="font-display text-base font-bold">Subject-wise performance</h2>
                  <p className="text-xs text-muted-foreground">Percentage per exam; the arrow compares the last two exams.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Subject</th>
                        {exams.map((e) => (
                          <th key={`${e.examTypeKey}:${e.schoolClassKey}`} className="px-3 py-2.5 text-center font-semibold">
                            {e.examTypeName}
                          </th>
                        ))}
                        <th className="px-4 py-2.5 text-center font-semibold">Trend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {subjectRows.map((r) => (
                        <tr key={r.name} className="hover:bg-muted/30">
                          <td className="px-4 py-2.5 font-medium">{r.name}</td>
                          {r.scores.map((p, i) => (
                            <td key={i} className="px-3 py-2.5 text-center">
                              <span className={cn("inline-block min-w-[3.25rem] rounded-md px-2 py-0.5 text-xs font-semibold", band(p))}>
                                {p == null ? "—" : num(p)}
                              </span>
                            </td>
                          ))}
                          <td className="px-4 py-2.5 text-center">
                            {r.delta == null ? (
                              <Minus className="mx-auto h-4 w-4 text-muted-foreground" aria-label="Not enough data" />
                            ) : r.delta > 1 ? (
                              <TrendingUp className="mx-auto h-4 w-4 text-success" aria-label="Improving" />
                            ) : r.delta < -1 ? (
                              <TrendingDown className="mx-auto h-4 w-4 text-destructive" aria-label="Declining" />
                            ) : (
                              <Minus className="mx-auto h-4 w-4 text-muted-foreground" aria-label="Steady" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Tile({
  icon: Icon, label, value, tone, note,
}: {
  icon: typeof Percent;
  label: string;
  value: string;
  tone: string;
  note?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tone)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="truncate font-display text-xl font-bold leading-tight">{value}</div>
        {note && <div className="truncate text-xs text-muted-foreground">{note}</div>}
      </div>
    </div>
  );
}
