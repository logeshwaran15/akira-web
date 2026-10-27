import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Wallet, CheckCircle2, AlertTriangle, Receipt, Undo2 } from "lucide-react";
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

export const Route = createFileRoute("/parent-fees")({
  head: () => ({
    meta: [
      { title: "Fees — Akira School ERP" },
      { name: "description", content: "Fee breakdown, payments and receipts for your child." },
    ],
  }),
  component: ParentFeesPage,
});

// Backed by the PARENT-only /api/Parent/children/{id}/fees endpoint (read-only).
type Child = {
  studentKey: string;
  studentName: string;
  className: string | null;
  sectionLabel: string | null;
  gender: string | null;
  photoUrl: string | null;
};
type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type FeeItem = {
  feeItemKey: string;
  feeHeadName: string;
  frequency: string;
  dueDate: string | null;
  originalAmount: number;
  discountAmount: number;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: "PAID" | "PENDING" | "OVERDUE";
};
type Assignment = {
  assignmentKey: string;
  academicYearKey: string;
  academicYearName: string;
  structureName: string;
  totalAmount: number;
  totalDiscount: number;
  netPayable: number;
  totalPaid: number;
  balance: number;
  overdueAmount: number;
  items: FeeItem[];
};
type Payment = {
  paymentKey: string;
  assignmentKey: string;
  receiptNumber: string;
  paymentDate: string;
  paymentMode: string;
  amountPaid: number;
  isReversed: boolean;
  feeHeads: string | null;
};
type Refund = {
  refundKey: string;
  voucherNumber: string;
  receiptNumber: string;
  refundDate: string;
  refundMode: string;
  refundAmount: number;
  reason: string;
  isVoided: boolean;
};
type Overview = { assignments: Assignment[]; payments: Payment[]; refunds: Refund[] };

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";
const label = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

const STATUS_VARIANT = { PAID: "success", PENDING: "warning", OVERDUE: "destructive" } as const;

function ParentFeesPage() {
  const { user, loading: userLoading } = useCurrentUser();

  const [children, setChildren] = useState<Child[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [childKey, setChildKey] = useState<string | null>(null);
  const [yearKey, setYearKey] = useState<string>("all");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [feesLoading, setFeesLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([apiFetch("/api/Parent/children"), apiFetch("/api/Parent/academic-years")])
      .then(([c, y]) => {
        if (c.status === "fulfilled") {
          const list: Child[] = c.value ?? [];
          setChildren(list);
          setChildKey(list[0]?.studentKey ?? null);
        } else {
          toast.error("Failed to load your children");
        }
        if (y.status === "fulfilled") setYears(y.value ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!childKey) return;
    setFeesLoading(true);
    const q = yearKey !== "all" ? `?academicYearId=${yearKey}` : "";
    apiFetch(`/api/Parent/children/${childKey}/fees${q}`)
      .then((o: Overview) => setOverview(o))
      .catch((err) => {
        setOverview(null);
        toast.error(err instanceof Error ? err.message : "Failed to load fees");
      })
      .finally(() => setFeesLoading(false));
  }, [childKey, yearKey]);

  const downloadReceipt = async (p: Payment) => {
    setDownloading(p.paymentKey);
    try {
      const token = localStorage.getItem("akira_token");
      const res = await fetch(
        `${API_BASE_URL}/api/Parent/children/${childKey}/fee-receipts/${p.paymentKey}/pdf`,
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined },
      );
      if (!res.ok) throw new Error("Could not download the receipt");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `Receipt-${p.receiptNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download the receipt");
    } finally {
      setDownloading(null);
    }
  };

  if (userLoading) return <PageLoader />;
  // Parent-only page; everyone else uses the admin fee screens.
  if (user && user.roleCode !== "PARENT") return <Navigate to="/dashboard" replace />;

  const assignments = overview?.assignments ?? [];
  const payments = overview?.payments ?? [];
  const refunds = overview?.refunds ?? [];
  const sum = (f: (a: Assignment) => number) => assignments.reduce((s, a) => s + f(a), 0);
  const totals = {
    net: sum((a) => a.netPayable),
    paid: sum((a) => a.totalPaid),
    balance: sum((a) => a.balance),
    overdue: sum((a) => a.overdueAmount),
  };
  const assignmentYear = (key: string) => assignments.find((a) => a.assignmentKey === key)?.academicYearName ?? "";

  return (
    <div>
      <PageHeader
        title="Fees"
        actions={
          <Select value={yearKey} onValueChange={setYearKey}>
            <SelectTrigger className="h-10 w-44 rounded-md"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All academic years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y.academicYearKey} value={y.academicYearKey}>{y.yearName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              const selected = c.studentKey === childKey;
              return (
                <button
                  key={c.studentKey}
                  type="button"
                  onClick={() => setChildKey(c.studentKey)}
                  aria-pressed={selected}
                  className={cn(
                    "flex shrink-0 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200",
                    selected
                      ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25"
                      : "border-border bg-card shadow-sm hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
                  )}
                >
                  <StudentAvatar
                    photoUrl={c.photoUrl}
                    gender={c.gender}
                    studentName={c.studentName}
                    className="h-9 w-9"
                  />
                  <span>
                    <span className="block text-sm font-semibold leading-tight">{c.studentName}</span>
                    <span className={cn("block text-xs", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {[c.className, c.sectionLabel].filter(Boolean).join(" - ") || "—"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Summary icon={Wallet} label="Total Fees" value={inr(totals.net)} tone="bg-info/10 text-info" />
            <Summary icon={CheckCircle2} label="Paid" value={inr(totals.paid)} tone="bg-success/10 text-success" />
            <Summary icon={Receipt} label="Balance Due" value={inr(totals.balance)} tone="bg-warning/15 text-[oklch(0.45_0.12_65)]" />
            <Summary
              icon={AlertTriangle}
              label="Overdue"
              value={inr(totals.overdue)}
              tone="bg-destructive/10 text-destructive"
              note={totals.overdue === 0 ? "Nothing overdue" : undefined}
            />
          </div>

          {feesLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading fees...</div>
          ) : assignments.length === 0 ? (
            <div className="mt-6 rounded-xl border border-border bg-card p-8 text-center shadow-sm">
              <Wallet className="mx-auto h-8 w-8 text-muted-foreground" />
              <div className="mt-2 text-sm font-semibold">No fees assigned yet</div>
              <div className="text-xs text-muted-foreground">
                Fees will appear here once the school assigns them for the selected year.
              </div>
            </div>
          ) : (
            <>
              {/* Breakdown, one block per academic year */}
              {assignments.map((a) => (
                <section key={a.assignmentKey} className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                    <h2 className="font-display text-base font-bold">
                      Fee Breakdown · {a.academicYearName}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">{a.structureName}</span>
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      Discount {inr(a.totalDiscount)} · Balance <b className="text-foreground">{inr(a.balance)}</b>
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-sm">
                      <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          {["Fee", "Frequency", "Due", "Amount", "Discount", "Net", "Paid", "Balance", "Status"].map((h, i) => (
                            <th key={h} className={cn("px-4 py-2.5 font-semibold", i >= 3 && i <= 7 && "text-right")}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {a.items.map((i) => (
                          <tr key={i.feeItemKey} className="hover:bg-muted/30">
                            <td className="px-4 py-2.5 font-medium">{i.feeHeadName}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{label(i.frequency)}</td>
                            <td className="px-4 py-2.5">{fmtDate(i.dueDate)}</td>
                            <td className="px-4 py-2.5 text-right">{inr(i.originalAmount)}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{inr(i.discountAmount)}</td>
                            <td className="px-4 py-2.5 text-right">{inr(i.netAmount)}</td>
                            <td className="px-4 py-2.5 text-right text-success">{inr(i.paidAmount)}</td>
                            <td className="px-4 py-2.5 text-right font-semibold">{inr(Math.max(i.balanceAmount, 0))}</td>
                            <td className="px-4 py-2.5"><Badge variant={STATUS_VARIANT[i.status]}>{label(i.status)}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}

              {/* Payment history */}
              <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="border-b border-border px-4 py-3">
                  <h2 className="font-display text-base font-bold">Payment History</h2>
                </div>
                {payments.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">No payments recorded yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2.5 font-semibold">Receipt</th>
                          <th className="px-4 py-2.5 font-semibold">Date</th>
                          <th className="px-4 py-2.5 font-semibold">Paid for</th>
                          <th className="px-4 py-2.5 font-semibold">Mode</th>
                          <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                          <th className="px-4 py-2.5 text-right font-semibold">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {payments.map((p) => (
                          <tr key={p.paymentKey} className={cn("hover:bg-muted/30", p.isReversed && "opacity-60")}>
                            <td className="px-4 py-2.5 font-medium">
                              {p.receiptNumber}
                              {p.isReversed && <Badge variant="destructive" className="ml-2">Cancelled</Badge>}
                              {assignments.length > 1 && (
                                <div className="text-xs font-normal text-muted-foreground">{assignmentYear(p.assignmentKey)}</div>
                              )}
                            </td>
                            <td className="px-4 py-2.5">{fmtDate(p.paymentDate)}</td>
                            <td className="max-w-[220px] truncate px-4 py-2.5 text-muted-foreground">{p.feeHeads ?? "—"}</td>
                            <td className="px-4 py-2.5">{label(p.paymentMode)}</td>
                            <td className="px-4 py-2.5 text-right font-semibold">{inr(p.amountPaid)}</td>
                            <td className="px-4 py-2.5 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 rounded-md"
                                disabled={downloading === p.paymentKey}
                                onClick={() => downloadReceipt(p)}
                              >
                                <Download className="h-3.5 w-3.5" />
                                {downloading === p.paymentKey ? "..." : "PDF"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Refunds */}
              {refunds.length > 0 && (
                <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                  <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                    <Undo2 className="h-4 w-4 text-primary" />
                    <h2 className="font-display text-base font-bold">Refunds</h2>
                  </div>
                  <div className="divide-y divide-border">
                    {refunds.map((r) => (
                      <div key={r.refundKey} className={cn("flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm", r.isVoided && "opacity-60")}>
                        <div>
                          <div className="font-medium">
                            {r.voucherNumber}
                            <span className="ml-2 text-xs font-normal text-muted-foreground">against {r.receiptNumber}</span>
                            {r.isVoided && <Badge variant="secondary" className="ml-2">Voided</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {fmtDate(r.refundDate)} · {label(r.refundMode)} · {r.reason}
                          </div>
                        </div>
                        <span className="font-semibold text-info">−{inr(r.refundAmount)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Summary({
  icon: Icon, label, value, tone, note,
}: {
  icon: typeof Wallet;
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
        <div className="font-display text-2xl font-bold leading-tight">{value}</div>
        {note && <div className="text-xs text-success">{note}</div>}
      </div>
    </div>
  );
}
