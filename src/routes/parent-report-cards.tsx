import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Award, Download, FileText, Percent, Trophy, XCircle } from "lucide-react";
import { PageHeader } from "@/components/erp/PageHeader";
import { StudentAvatar } from "@/components/erp/StudentAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageLoader } from "@/components/PageLoader";
import { API_BASE_URL, apiFetch } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/parent-report-cards")({
  head: () => ({
    meta: [
      { title: "Report Cards — Akira School ERP" },
      { name: "description", content: "Published exam results and report cards for your child." },
    ],
  }),
  component: ParentReportCardsPage,
});

// Backed by the PARENT-only /api/Parent/children/{id}/results endpoints (read-only).
// The API only returns exams the school has published.
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
  category: string | null;
  schoolClassKey: string;
  className: string | null;
  academicYearKey: string;
  academicYearName: string | null;
  subjectCount: number;
  subjectsFailed: number;
  totalMarksObtained: number;
  totalMaxMarks: number;
  overallPercentage: number | null;
  publishedOn: string | null;
};
type SubjectRow = {
  subjectName: string;
  totalMarks: number | null;
  maxMarks: number;
  percentage: number | null;
  gradeLabel: string | null;
  isPass: boolean;
  isAbsent: boolean;
};
type ReportCard = {
  studentName: string;
  admissionNumber: string;
  rollNumber: string;
  className: string;
  examTypeName: string;
  subjects: SubjectRow[];
  totalMarksObtained: number;
  totalMaxMarks: number;
  overallPercentage: number | null;
  overallPass: boolean;
  subjectsFailed: number;
  rank: number | null;
  rankOutOf: number;
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";
const num = (n: number | null | undefined) => (n == null ? "—" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 }));
const resultKey = (r: ResultSummary) => `${r.examTypeKey}:${r.schoolClassKey}`;

function ParentReportCardsPage() {
  const { user, loading: userLoading } = useCurrentUser();

  const [children, setChildren] = useState<Child[]>([]);
  const [childKey, setChildKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [results, setResults] = useState<ResultSummary[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [yearKey, setYearKey] = useState("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const [card, setCard] = useState<ReportCard | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

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
    setResultsLoading(true);
    setResults([]);
    setSelectedKey(null);
    setCard(null);
    setYearKey("all");
    apiFetch(`/api/Parent/children/${childKey}/results`)
      .then((list: ResultSummary[]) => {
        setResults(list ?? []);
        if (list?.length) setSelectedKey(resultKey(list[0]));
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load results"))
      .finally(() => setResultsLoading(false));
  }, [childKey]);

  const selected = results.find((r) => resultKey(r) === selectedKey) ?? null;

  useEffect(() => {
    if (!childKey || !selected) {
      setCard(null);
      return;
    }
    setCardLoading(true);
    apiFetch(`/api/Parent/children/${childKey}/results/${selected.examTypeKey}?classId=${selected.schoolClassKey}`)
      .then((c: ReportCard) => setCard(c))
      .catch((err) => {
        setCard(null);
        toast.error(err instanceof Error ? err.message : "Failed to load the report card");
      })
      .finally(() => setCardLoading(false));
  }, [childKey, selected?.examTypeKey, selected?.schoolClassKey]);

  const downloadPdf = async () => {
    if (!childKey || !selected) return;
    setDownloading(true);
    try {
      const token = localStorage.getItem("akira_token");
      const res = await fetch(
        `${API_BASE_URL}/api/Parent/children/${childKey}/results/${selected.examTypeKey}/pdf?classId=${selected.schoolClassKey}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined },
      );
      if (!res.ok) throw new Error("Could not download the report card");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `ReportCard-${selected.examTypeName}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download the report card");
    } finally {
      setDownloading(false);
    }
  };

  if (userLoading) return <PageLoader />;
  // Parent-only page; everyone else uses the admin result screens.
  if (user && user.roleCode !== "PARENT") return <Navigate to="/dashboard" replace />;

  const years = results.reduce<{ key: string; name: string }[]>((acc, r) => {
    if (!acc.some((y) => y.key === r.academicYearKey)) {
      acc.push({ key: r.academicYearKey, name: r.academicYearName ?? "Unknown year" });
    }
    return acc;
  }, []);
  const visible = yearKey === "all" ? results : results.filter((r) => r.academicYearKey === yearKey);

  return (
    <div>
      <PageHeader
        title="Report Cards"
        actions={
          years.length > 1 ? (
            <Select value={yearKey} onValueChange={setYearKey}>
              <SelectTrigger className="h-10 w-44 rounded-md"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All academic years</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y.key} value={y.key}>{y.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : undefined
        }
      />

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>
      ) : children.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
          No children are linked to your account. Please contact the school office.
        </div>
      ) : (
        <>
          {/* Child tabs */}
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

          {resultsLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading results...</div>
          ) : results.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
              <div className="mt-2 text-sm font-semibold">No results published yet</div>
              <div className="text-xs text-muted-foreground">
                Results will appear here as soon as the school publishes them.
              </div>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
              {/* Exam list */}
              <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
                {visible.map((r) => {
                  const active = resultKey(r) === selectedKey;
                  return (
                    <button
                      key={resultKey(r)}
                      type="button"
                      onClick={() => setSelectedKey(resultKey(r))}
                      aria-pressed={active}
                      className={cn(
                        "min-w-[220px] shrink-0 rounded-xl border p-3.5 text-left transition-all lg:min-w-0",
                        active
                          ? "border-primary bg-primary/[0.06] shadow-sm"
                          : "border-border bg-card hover:border-primary/40 hover:shadow-md",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-semibold leading-tight">{r.examTypeName}</div>
                        <Badge variant={r.subjectsFailed === 0 ? "success" : "destructive"}>
                          {r.subjectsFailed === 0 ? "Pass" : "Fail"}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {[r.className, r.academicYearName].filter(Boolean).join(" · ")}
                      </div>
                      <div className="mt-2 flex items-baseline justify-between text-xs text-muted-foreground">
                        <span>Published {fmtDate(r.publishedOn)}</span>
                        <span className="font-display text-base font-bold text-foreground">
                          {r.overallPercentage != null ? `${num(r.overallPercentage)}%` : "—"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Report card */}
              <div className="min-w-0">
                {cardLoading ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">Loading report card...</div>
                ) : !card || !selected ? (
                  <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
                    Select an exam to view the report card.
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <Summary icon={Award} label="Total Marks" value={`${num(card.totalMarksObtained)} / ${num(card.totalMaxMarks)}`} tone="bg-info/10 text-info" />
                      <Summary icon={Percent} label="Percentage" value={card.overallPercentage != null ? `${num(card.overallPercentage)}%` : "—"} tone="bg-success/10 text-success" />
                      <Summary
                        icon={Trophy}
                        label="Class Rank"
                        value={card.rank != null ? `${card.rank} / ${card.rankOutOf}` : "—"}
                        tone="bg-warning/15 text-[oklch(0.45_0.12_65)]"
                      />
                      <Summary
                        icon={card.overallPass ? Award : XCircle}
                        label="Result"
                        value={card.overallPass ? "Pass" : "Needs attention"}
                        tone={card.overallPass ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}
                        note={card.subjectsFailed > 0 ? `${card.subjectsFailed} subject(s) below pass mark` : undefined}
                      />
                    </div>

                    <section className="mt-5 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                        <h2 className="font-display text-base font-bold">
                          {card.examTypeName}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">{card.className}</span>
                        </h2>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 rounded-md"
                          disabled={downloading}
                          onClick={downloadPdf}
                        >
                          <Download className="h-3.5 w-3.5" />
                          {downloading ? "..." : "Download PDF"}
                        </Button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[520px] text-sm">
                          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                              <th className="px-4 py-2.5 font-semibold">Subject</th>
                              <th className="px-4 py-2.5 text-right font-semibold">Marks</th>
                              <th className="px-4 py-2.5 text-right font-semibold">Max</th>
                              <th className="px-4 py-2.5 text-right font-semibold">%</th>
                              <th className="px-4 py-2.5 font-semibold">Grade</th>
                              <th className="px-4 py-2.5 font-semibold">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {card.subjects.map((s) => (
                              <tr key={s.subjectName} className="hover:bg-muted/30">
                                <td className="px-4 py-2.5 font-medium">{s.subjectName}</td>
                                <td className="px-4 py-2.5 text-right">{s.isAbsent ? "—" : num(s.totalMarks)}</td>
                                <td className="px-4 py-2.5 text-right text-muted-foreground">{num(s.maxMarks)}</td>
                                <td className="px-4 py-2.5 text-right">{s.isAbsent ? "—" : num(s.percentage)}</td>
                                <td className="px-4 py-2.5 font-semibold">{s.gradeLabel ?? "—"}</td>
                                <td className="px-4 py-2.5">
                                  {s.isAbsent ? (
                                    <Badge variant="secondary">Absent</Badge>
                                  ) : (
                                    <Badge variant={s.isPass ? "success" : "destructive"}>{s.isPass ? "Pass" : "Fail"}</Badge>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Summary({
  icon: Icon, label, value, tone, note,
}: {
  icon: typeof Award;
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
        <div className="font-display text-xl font-bold leading-tight">{value}</div>
        {note && <div className="text-xs text-destructive">{note}</div>}
      </div>
    </div>
  );
}
