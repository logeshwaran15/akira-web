import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { PageHeader } from "@/components/erp/PageHeader";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Wallet, AlertTriangle, TrendingUp, PieChart as PieChartIcon,
  Users2, RotateCcw, Phone, Receipt,
  type LucideIcon,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/fee-dashboard")({
  head: () => ({
    meta: [
      { title: "Fee Dashboard — Akira School ERP" },
      { name: "description", content: "Monitor collections, outstanding fees, payments and financial activity." },
    ],
  }),
  component: FeeDashboardPage,
});

// ---------- Types (mirror the existing /api/FeePayment/dashboard response, unchanged) ----------

type AcademicYear = { academicYearKey: string; yearName: string; status: string };

type TrendPoint = { date: string; amountCollected: number; paymentCount: number };
type ClassOutstanding = { schoolClassKey: string; className: string; netPayable: number; totalPaid: number; outstanding: number; studentCount: number };
type ModeBreakup = { paymentMode: string; amountCollected: number; paymentCount: number };
type Defaulter = {
  studentFeeAssignmentKey: string; studentKey: string; studentName: string; admissionNumber: string;
  photoUrl: string | null; mobileNumber: string | null; className: string; sectionLabel: string | null;
  netPayable: number; totalPaid: number; balance: number;
};

type FeeDashboard = {
  collectionTrend: TrendPoint[];
  classOutstanding: ClassOutstanding[];
  modeBreakup: ModeBreakup[];
  defaulters: Defaulter[];
  totalAdjustmentFines: number;
  totalAdjustmentConcessions: number;
  totalRefunds: number;
};

// Validated categorical palette (fixed hue order, colorblind-safe -- see dataviz skill).
const MODE_COLORS: Record<string, string> = {
  CASH: "#178750",
  UPI: "#0D6FAE",
  BANK_TRANSFER: "#B45C00",
  CARD: "#8B3FD9",
  CHEQUE: "#C2410C",
  ONLINE: "#0891B2",
};

const MODE_LABELS: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  ONLINE: "Online Payment",
};

const TREND_OPTIONS = [7, 14, 30, 60, 90];

const currency = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const currencyCompact = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 });

const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const formatDateLong = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// ---------- Small presentational pieces ----------

type KpiTone = "orange" | "success" | "destructive" | "warning" | "purple";

const KPI_TONE_STYLES: Record<KpiTone, { card: string; icon: string; value: string; subtitle: string }> = {
  orange: { card: "bg-gradient-to-br from-primary to-primary/85", icon: "bg-white/20 text-white", value: "text-white", subtitle: "text-white/80" },
  success: { card: "bg-gradient-to-br from-success to-success/85", icon: "bg-white/20 text-white", value: "text-white", subtitle: "text-white/80" },
  destructive: { card: "bg-gradient-to-br from-destructive to-destructive/85", icon: "bg-white/20 text-white", value: "text-white", subtitle: "text-white/80" },
  warning: { card: "bg-gradient-to-br from-warning to-warning/85", icon: "bg-white/20 text-white", value: "text-white", subtitle: "text-white/80" },
  purple: { card: "bg-gradient-to-br from-[oklch(0.55_0.2_300)] to-[oklch(0.5_0.2_300)]", icon: "bg-white/20 text-white", value: "text-white", subtitle: "text-white/80" },
};

function FeeKpiCard({
  label, value, icon: Icon, tone, subtitle,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: KpiTone;
  subtitle: ReactNode;
}) {
  const s = KPI_TONE_STYLES[tone];
  return (
    <div className={cn(
      "flex min-h-[100px] flex-col justify-between gap-2 rounded-md border border-white/10 p-3 shadow-sm transition-all duration-200 hover:-translate-y-px hover:shadow-md",
      s.card,
    )}>
      <div className="flex items-center gap-2">
        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", s.icon)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className={cn("text-xs font-semibold leading-tight", s.value)}>{label}</span>
      </div>
      <div className="text-center">
        <div className={cn("font-display text-3xl font-extrabold leading-none tracking-tight", s.value)}>{value}</div>
        <div className={cn("mt-1.5 truncate text-[11px] font-medium leading-tight", s.subtitle)}>{subtitle}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <div className="text-sm font-semibold">{title}</div>
      <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

function SectionCard({ title, icon: Icon, action, children, className }: { title: string; icon: LucideIcon; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 shadow-sm", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" /> {title}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ClassProgressBar({ pct }: { pct: number }) {
  if (pct >= 80) return <Progress value={pct} className="h-1.5 bg-muted [&>div]:bg-success" />;
  if (pct >= 60) return <Progress value={pct} className="h-1.5 bg-muted [&>div]:bg-warning" />;
  return <Progress value={pct} className="h-1.5 bg-muted [&>div]:bg-destructive" />;
}

// ---------- Page ----------

function FeeDashboardPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearKey, setYearKey] = useState("");
  const [trendDays, setTrendDays] = useState(14);
  const [showAllClasses, setShowAllClasses] = useState(false);

  const [dashboard, setDashboard] = useState<FeeDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/AcademicYear")
      .then((y: AcademicYear[]) => {
        setYears(y ?? []);
        const active = (y ?? []).find((x) => x.status.toUpperCase() === "ACTIVE");
        setYearKey(active?.academicYearKey ?? y?.[0]?.academicYearKey ?? "");
      })
      .catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (yearKey) params.set("academicYearId", yearKey);
    params.set("trendDays", String(trendDays));
    apiFetch(`/api/FeePayment/dashboard?${params.toString()}`)
      .then((d: FeeDashboard) => setDashboard(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load fee dashboard"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [yearKey, trendDays]);

  const trendData = useMemo(
    () => (dashboard?.collectionTrend ?? []).map((t) => ({ name: formatDate(t.date), fullDate: formatDateLong(t.date), amount: t.amountCollected, count: t.paymentCount })),
    [dashboard],
  );

  const modeData = useMemo(
    () => (dashboard?.modeBreakup ?? []).map((m) => ({
      name: MODE_LABELS[m.paymentMode] ?? m.paymentMode,
      value: m.amountCollected,
      count: m.paymentCount,
      color: MODE_COLORS[m.paymentMode] ?? "var(--muted-foreground)",
    })),
    [dashboard],
  );

  // ---- Derived totals -- every value here is computed from the real API payload, nothing invented. ----
  const totalBilled = dashboard?.classOutstanding.reduce((s, c) => s + c.netPayable, 0) ?? 0;
  const totalCollectedAllTime = dashboard?.classOutstanding.reduce((s, c) => s + c.totalPaid, 0) ?? 0;
  const totalOutstanding = dashboard?.classOutstanding.reduce((s, c) => s + c.outstanding, 0) ?? 0;
  const totalCollectedInRange = dashboard?.collectionTrend.reduce((s, t) => s + t.amountCollected, 0) ?? 0;
  const totalPaymentsInRange = dashboard?.collectionTrend.reduce((s, t) => s + t.paymentCount, 0) ?? 0;
  const collectedPct = totalBilled > 0 ? Math.round((totalCollectedAllTime / totalBilled) * 100) : 0;
  const modeTotalAmount = modeData.reduce((s, m) => s + m.value, 0);

  const visibleClasses = showAllClasses ? (dashboard?.classOutstanding ?? []) : (dashboard?.classOutstanding ?? []).slice(0, 5);

  const defaulterColumns: Column<Defaulter>[] = [
    {
      key: "studentName", header: "Student", sortable: true,
      accessor: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 border border-border">
            <AvatarImage src={r.photoUrl ?? undefined} alt={r.studentName} />
            <AvatarFallback className="text-xs font-semibold">{initials(r.studentName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{r.studentName}</div>
            <div className="text-xs text-muted-foreground">{r.admissionNumber} &middot; {r.className}{r.sectionLabel ? ` ${r.sectionLabel}` : ""}</div>
          </div>
        </div>
      ),
    },
    {
      key: "netPayable", header: "Net Payable", sortable: true,
      sortValue: (r) => r.netPayable,
      accessor: (r) => <span>{currency(r.netPayable)}</span>,
    },
    {
      key: "totalPaid", header: "Paid", sortable: true,
      sortValue: (r) => r.totalPaid,
      accessor: (r) => <span className="font-medium text-success">{currency(r.totalPaid)}</span>,
    },
    {
      key: "balance", header: "Outstanding", sortable: true,
      sortValue: (r) => r.balance,
      accessor: (r) => <span className="font-semibold text-destructive">{currency(r.balance)}</span>,
    },
    {
      key: "mobileNumber", header: "Contact",
      accessor: (r) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          {r.mobileNumber && <Phone className="h-3 w-3" />} {r.mobileNumber ?? "—"}
        </span>
      ),
    },
  ];

  return (
    <div>
      {/* ---------- Header + filters ---------- */}
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          title="Fee Dashboard"
        />
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center lg:mt-0.5">
          <Select value={yearKey} onValueChange={setYearKey}>
            <SelectTrigger className="h-9 w-full rounded-md sm:w-[150px]"><SelectValue placeholder="Academic Year" /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y.academicYearKey} value={y.academicYearKey}>{y.yearName}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(trendDays)} onValueChange={(v) => setTrendDays(Number(v))}>
            <SelectTrigger className="h-9 w-full rounded-md sm:w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TREND_OPTIONS.map((d) => <SelectItem key={d} value={String(d)}>Last {d} days</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ---------- KPI row ---------- */}
      {loading || !dashboard ? (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[100px] rounded-md" />)}
        </div>
      ) : (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <FeeKpiCard
            label="Total Fee Billed" value={currencyCompact(totalBilled)} icon={Receipt} tone="orange"
            subtitle={`Across ${dashboard.classOutstanding.reduce((s, c) => s + c.studentCount, 0)} students`}
          />
          <FeeKpiCard
            label="Total Collected" value={currencyCompact(totalCollectedAllTime)} icon={Wallet} tone="success"
            subtitle={`${collectedPct}% of total billed`}
          />
          <FeeKpiCard
            label="Outstanding" value={currencyCompact(totalOutstanding)} icon={AlertTriangle} tone="destructive"
            subtitle={`${totalBilled > 0 ? Math.round((totalOutstanding / totalBilled) * 100) : 0}% of total billed`}
          />
          <FeeKpiCard
            label="Defaulters" value={String(dashboard.defaulters.length)} icon={Users2} tone="warning"
            subtitle="Students with a balance due"
          />
          <FeeKpiCard
            label="Refunds" value={currencyCompact(dashboard.totalRefunds)} icon={RotateCcw} tone="purple"
            subtitle="Total refunded to date"
          />
        </div>
      )}

      {/* ---------- Collection Trend + Collection Status / Quick Actions ---------- */}
      {loading || !dashboard ? (
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Skeleton className="h-[340px] rounded-xl" />
          <Skeleton className="h-[340px] rounded-xl" />
        </div>
      ) : (
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <SectionCard title="Collection Trend" icon={TrendingUp}>
            <div className="-mt-2 mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Daily collection performance over the last {trendDays} days
              </p>
              <div className="flex items-center gap-4 rounded-lg bg-primary/[0.06] px-3 py-1.5">
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Collected</div>
                  <div className="font-display text-sm font-bold text-primary">{currency(totalCollectedInRange)}</div>
                </div>
                <div className="h-6 w-px bg-border" />
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Payments</div>
                  <div className="font-display text-sm font-bold text-primary">{totalPaymentsInRange}</div>
                </div>
              </div>
            </div>
            {trendData.every((t) => t.amount === 0) ? (
              <EmptyState
                icon={Wallet}
                title="No payments yet"
                description="There are no fee payments recorded for the selected period."
                action={<Link to="/fee-collection"><Button size="sm" variant="outline" className="mt-1 rounded-md">View Fee Collection</Button></Link>}
              />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="feeTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="55%" stopColor="var(--primary)" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={trendDays > 30 ? Math.floor(trendDays / 10) : 0} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => currencyCompact(v)} width={64} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ stroke: "var(--primary)", strokeWidth: 1, strokeDasharray: "4 4" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as (typeof trendData)[number];
                      return (
                        <div className="rounded-lg border border-border bg-popover p-3 text-xs shadow-lg">
                          <div className="font-semibold">{p.fullDate}</div>
                          <div className="mt-1.5 flex items-center gap-1.5 text-muted-foreground">
                            <span className="h-2 w-2 rounded-full bg-primary" />
                            Collected: <span className="font-semibold text-foreground">{currency(p.amount)}</span>
                          </div>
                          <div className="mt-0.5 text-muted-foreground">Payments: <span className="font-semibold text-foreground">{p.count}</span></div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone" dataKey="amount" name="Collected" stroke="var(--primary)" strokeWidth={2.5}
                    fill="url(#feeTrendFill)" dot={false}
                    activeDot={{ r: 5, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </SectionCard>

          <SectionCard title="Collection Status" icon={PieChartIcon}>
            {totalBilled === 0 ? (
              <EmptyState icon={PieChartIcon} title="No fee assignments found" description="Assign a fee structure to students to see collection status." />
            ) : (
              <div className="flex flex-col items-center">
                <div className="relative">
                  <ResponsiveContainer width={220} height={220}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Collected", value: totalCollectedAllTime, color: "var(--success)" },
                          { name: "Outstanding", value: totalOutstanding, color: "var(--destructive)" },
                        ]}
                        dataKey="value" nameKey="name" innerRadius={76} outerRadius={100} paddingAngle={2} startAngle={90} endAngle={-270}
                      >
                        <Cell fill="var(--success)" stroke="var(--card)" strokeWidth={2} />
                        <Cell fill="var(--destructive)" stroke="var(--card)" strokeWidth={2} />
                      </Pie>
                      <Tooltip formatter={(v: number) => currency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <div className="font-display text-3xl font-bold">{collectedPct}%</div>
                    <div className="text-xs text-muted-foreground">Collected</div>
                  </div>
                </div>
                <div className="mt-3 w-full space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-success" /> Collected</span>
                    <span className="font-medium">{currency(totalCollectedAllTime)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Outstanding</span>
                    <span className="font-medium">{currency(totalOutstanding)}</span>
                  </div>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ---------- Payment Mode Breakup + Class-wise Collection ---------- */}
      {!loading && dashboard && (
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <SectionCard title="Payment Mode Breakup" icon={PieChartIcon}>
            {modeData.length === 0 ? (
              <EmptyState icon={PieChartIcon} title="No payment modes available" description="Payment-mode breakdown will appear once fees are collected." />
            ) : (
              <>
                <div className="relative mx-auto w-fit">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie data={modeData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={2}>
                        {modeData.map((d, i) => <Cell key={i} fill={d.color} stroke="var(--card)" strokeWidth={2} />)}
                      </Pie>
                      <Tooltip formatter={(v: number, _n, item) => [`${currency(v)} · ${item.payload.count} txns`, item.payload.name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <div className="font-display text-lg font-bold">{currencyCompact(modeTotalAmount)}</div>
                    <div className="text-[11px] text-muted-foreground">Collected</div>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {modeData.map((d, i) => {
                    const pct = modeTotalAmount > 0 ? (d.value / modeTotalAmount) * 100 : 0;
                    return (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                          {d.name}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{currency(d.value)}</span>
                          <span className="w-10 text-right text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </SectionCard>

          <SectionCard
            title="Class-wise Collection" icon={Users2}
            action={
              dashboard.classOutstanding.length > 5 && (
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => setShowAllClasses((v) => !v)}
                >
                  {showAllClasses ? "Show Less" : "View All →"}
                </button>
              )
            }
          >
            {dashboard.classOutstanding.length === 0 ? (
              <EmptyState icon={Users2} title="No fee assignments found" description="Assign fee structures to students to see class-wise collection." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="pb-2 pr-3">Class</th>
                      <th className="pb-2 pr-3">Billed</th>
                      <th className="pb-2 pr-3">Collected</th>
                      <th className="pb-2 pr-3">Outstanding</th>
                      <th className="pb-2 pr-3">Collection %</th>
                      <th className="w-28 pb-2">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleClasses.map((c) => {
                      const pct = c.netPayable > 0 ? Math.round((c.totalPaid / c.netPayable) * 100) : 0;
                      return (
                        <tr key={c.schoolClassKey} className="border-t border-border">
                          <td className="py-2 pr-3 font-medium">{c.className}</td>
                          <td className="py-2 pr-3">{currency(c.netPayable)}</td>
                          <td className="py-2 pr-3 text-success">{currency(c.totalPaid)}</td>
                          <td className="py-2 pr-3 font-medium text-destructive">{currency(c.outstanding)}</td>
                          <td className="py-2 pr-3 font-semibold">{pct}%</td>
                          <td className="py-2">
                            <ClassProgressBar pct={pct} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ---------- Recent Fee Transactions (no transaction-level API here -- honest empty state) ---------- */}
      <div className="mb-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <EmptyState
          icon={Receipt}
          title="Transaction details are available in Fee Collection"
          description="This dashboard summarizes totals only. Open Fee Collection to see and search individual payment receipts."
          action={<Link to="/fee-collection"><Button size="sm" className="mt-1 rounded-md">Open Fee Collection</Button></Link>}
        />
      </div>

      {/* ---------- Top Outstanding Students ---------- */}
      {!loading && dashboard && (
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" /> Top Outstanding Students
          </div>
          {dashboard.defaulters.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <EmptyState icon={Users2} title="No outstanding students" description="Every student with an active fee assignment is fully paid up." />
            </div>
          ) : (
            <DataTable
              data={dashboard.defaulters}
              columns={defaulterColumns}
              rowKey={(r) => r.studentFeeAssignmentKey}
              storageKey="fee-dashboard-defaulters"
              searchPlaceholder="Search student, admission no..."
              searchFields={(r) => `${r.studentName} ${r.admissionNumber}`}
              emptyMessage="No students with an outstanding balance."
            />
          )}
        </div>
      )}
    </div>
  );
}
