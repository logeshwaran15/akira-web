import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { BackButton } from "@/components/erp/BackButton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentAvatar } from "@/components/erp/StudentAvatar";
import { Printer, Receipt, Wallet, CalendarClock, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/student-fee-details")({
  validateSearch: (search: Record<string, unknown>): { studentFeeAssignmentKey?: string } => ({
    studentFeeAssignmentKey: typeof search.studentFeeAssignmentKey === "string" ? search.studentFeeAssignmentKey : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Student Fee Details — Akira School ERP" },
      { name: "description", content: "Full breakdown of a student's fee assignment." },
    ],
  }),
  component: StudentFeeDetailsPage,
});

// ---------- Types (mirror student-fee-assignment.tsx) ----------

type AssignmentItem = {
  studentFeeAssignmentItemKey: string;
  feeHeadKey: string;
  feeHeadName: string;
  originalAmount: number;
  discountAmount: number;
  netAmount: number;
  paidAmount: number;
  frequency: string;
  dueDate: string | null;
};

type Assignment = {
  studentFeeAssignmentKey: string;
  studentKey: string;
  studentName: string;
  admissionNumber: string;
  photoUrl: string | null;
  gender: string | null;
  schoolClassKey: string;
  className: string;
  sectionLabel: string | null;
  academicYearName: string;
  structureName: string;
  discountType: "PERCENTAGE" | "FLAT" | null;
  discountValue: number | null;
  discountReason: string | null;
  status: "ACTIVE" | "WAIVED" | "CANCELLED";
  items: AssignmentItem[];
  totalAmount: number;
  totalDiscount: number;
  netPayable: number;
  totalPaid: number;
  balance: number;
};

type PaymentMode = "CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "CHEQUE" | "ONLINE";

type PaymentAllocation = {
  feePaymentAllocationKey: string;
  studentFeeAssignmentItemKey: string;
  feeHeadKey: string;
  feeHeadName: string;
  allocatedAmount: number;
};

type FeePayment = {
  feePaymentKey: string;
  studentFeeAssignmentKey: string;
  receiptNumber: string;
  amountPaid: number;
  paymentMode: PaymentMode;
  paymentDate: string;
  isReversed: boolean;
  balanceAfter: number;
  allocations: PaymentAllocation[];
};

const FREQUENCY_LABELS: Record<string, string> = {
  ONE_TIME: "One-time",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  HALF_YEARLY: "Half-Yearly",
  ANNUALLY: "Annually",
};

const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  ONLINE: "Online Payment",
};

const currency = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const STATUS_SHINE = "text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)]";
const STATUS_STYLES: Record<Assignment["status"], string> = {
  ACTIVE: cn("bg-emerald-600 dark:bg-emerald-500", STATUS_SHINE),
  WAIVED: cn("bg-sky-600 dark:bg-sky-500", STATUS_SHINE),
  CANCELLED: cn("bg-slate-600 dark:bg-slate-500", STATUS_SHINE),
};

function StudentFeeDetailsPage() {
  const { studentFeeAssignmentKey } = Route.useSearch();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);

  useEffect(() => {
    if (!studentFeeAssignmentKey) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      apiFetch("/api/StudentFeeAssignment"),
      apiFetch("/api/FeePayment"),
    ])
      .then(([assignments, allPayments]: [Assignment[], FeePayment[]]) => {
        const found = (assignments ?? []).find((a) => a.studentFeeAssignmentKey === studentFeeAssignmentKey);
        setAssignment(found ?? null);
        setPayments((allPayments ?? []).filter((p) => p.studentFeeAssignmentKey === studentFeeAssignmentKey));
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load student fee details"))
      .finally(() => setLoading(false));
  }, [studentFeeAssignmentKey]);

  const timeline = useMemo(
    () => [...payments].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)),
    [payments],
  );

  const today = todayIso();
  const nextDueItem = useMemo(() => {
    if (!assignment) return null;
    return assignment.items
      .filter((i) => i.netAmount - i.paidAmount > 0 && i.dueDate)
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))[0] ?? null;
  }, [assignment]);
  const paidHeadsCount = assignment ? assignment.items.filter((i) => i.netAmount - i.paidAmount <= 0).length : 0;

  if (!studentFeeAssignmentKey) {
    return (
      <div>
        <PageHeader
          title="Student Fee Details"
          actions={<BackButton to="/student-fee-assignment" label="Back to Assignments" className="mb-0" />}
        />
        <div className="rounded-md border border-dashed border-border bg-card px-6 py-14 text-center text-sm text-muted-foreground">
          No assignment selected. Go back and pick a student from the list.
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Student Fee Details"
        breadcrumbs={[{ label: "Student Fee Assignment", to: "/student-fee-assignment" }, { label: "Student Fee Details" }]}
        actions={<BackButton to="/student-fee-assignment" label="Back to Assignments" className="mb-0" />}
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className="h-[520px] rounded-md" />
          <Skeleton className="h-[420px] rounded-md" />
        </div>
      ) : !assignment ? (
        <div className="rounded-md border border-dashed border-border bg-card px-6 py-14 text-center text-sm text-muted-foreground">
          Assignment not found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ---------- Invoice-style fee card ---------- */}
          <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-border bg-muted/30 p-5">
              <div className="flex items-center gap-3">
                <StudentAvatar photoUrl={assignment.photoUrl} gender={assignment.gender} studentName={assignment.studentName} className="h-14 w-14 border border-border" />
                <div>
                  <div className="font-display text-lg font-semibold">{assignment.studentName}</div>
                  <div className="text-xs text-muted-foreground">
                    {assignment.admissionNumber} · {assignment.className}{assignment.sectionLabel ? ` ${assignment.sectionLabel}` : ""}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{assignment.academicYearName}</div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLES[assignment.status])}>
                  {assignment.status}
                </span>
                <Button variant="outline" size="sm" className="gap-1.5 rounded-md" onClick={() => window.print()}>
                  <Printer className="h-3.5 w-3.5" /> Print
                </Button>
              </div>
            </div>

            <div className="p-5">
              {/* Quick summary strip */}
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-md border border-border p-2.5 text-center">
                  <div className="font-display text-sm font-bold">{paidHeadsCount} / {assignment.items.length}</div>
                  <div className="text-[11px] text-muted-foreground">Fee heads paid</div>
                </div>
                <div className={cn(
                  "rounded-md border p-2.5 text-center",
                  nextDueItem && nextDueItem.dueDate && nextDueItem.dueDate < today ? "border-destructive/30 bg-destructive/5" : "border-border",
                )}>
                  <div className={cn("font-display text-sm font-bold", nextDueItem && nextDueItem.dueDate && nextDueItem.dueDate < today && "text-destructive")}>
                    {nextDueItem?.dueDate ? formatDate(nextDueItem.dueDate) : "—"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {nextDueItem && nextDueItem.dueDate && nextDueItem.dueDate < today ? "Overdue since" : "Next due date"}
                  </div>
                </div>
                <div className="rounded-md border border-border p-2.5 text-center">
                  <div className="font-display text-sm font-bold">{timeline.length}</div>
                  <div className="text-[11px] text-muted-foreground">Payments recorded</div>
                </div>
              </div>

              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Receipt className="h-3.5 w-3.5" /> Fee Structure
              </div>
              <div className="text-sm font-medium">{assignment.structureName}</div>
              {assignment.discountType && (
                <div className="mt-0.5 text-xs text-[oklch(0.5_0.19_300)] dark:text-[oklch(0.78_0.15_300)]">
                  {assignment.discountType === "PERCENTAGE" ? `${assignment.discountValue}% discount` : `${currency(assignment.discountValue ?? 0)} flat discount`}
                  {assignment.discountReason ? ` — ${assignment.discountReason}` : ""}
                </div>
              )}

              {/* Invoice line items */}
              <div className="mt-4 overflow-hidden rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2">Fee Head</th>
                      <th className="px-3 py-2">Frequency</th>
                      <th className="px-3 py-2">Due Date</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2 text-right">Paid</th>
                      <th className="px-3 py-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignment.items.map((item) => {
                      const itemBalance = Math.max(0, item.netAmount - item.paidAmount);
                      const isOverdue = itemBalance > 0 && !!item.dueDate && item.dueDate < today;
                      return (
                        <tr key={item.studentFeeAssignmentItemKey} className={cn("border-b border-border last:border-0", isOverdue && "bg-destructive/5")}>
                          <td className="px-3 py-2 text-muted-foreground">{item.feeHeadName}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{FREQUENCY_LABELS[item.frequency] ?? item.frequency}</td>
                          <td className="px-3 py-2 text-xs">
                            {item.dueDate ? (
                              <span className={cn("inline-flex items-center gap-1", isOverdue && "font-medium text-destructive")}>
                                {isOverdue && <AlertCircle className="h-3 w-3" />}
                                {formatDate(item.dueDate)}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-3 py-2 text-right">{currency(item.netAmount)}</td>
                          <td className="px-3 py-2 text-right text-success">{currency(item.paidAmount)}</td>
                          <td className={cn("px-3 py-2 text-right font-medium", itemBalance > 0 ? "text-destructive" : "text-success")}>
                            {currency(itemBalance)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30 font-semibold">
                      <td className="px-3 py-2" colSpan={3}>Total</td>
                      <td className="px-3 py-2 text-right">{currency(assignment.netPayable)}</td>
                      <td className="px-3 py-2 text-right text-success">{currency(assignment.totalPaid)}</td>
                      <td className={cn("px-3 py-2 text-right", assignment.balance > 0 ? "text-destructive" : "text-success")}>
                        {currency(assignment.balance)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {assignment.netPayable > 0 && (
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Payment Progress</span>
                    <span>{Math.min(100, Math.round((assignment.totalPaid / assignment.netPayable) * 100))}% Paid</span>
                  </div>
                  <Progress
                    value={Math.min(100, Math.round((assignment.totalPaid / assignment.netPayable) * 100))}
                    className="h-2 bg-success/15 [&>div]:bg-success"
                  />
                </div>
              )}

              <div className="mt-4 grid grid-cols-3 gap-3 rounded-md bg-muted/30 p-3 text-sm">
                <div>
                  <div className="text-[11px] text-muted-foreground">Original Amount</div>
                  <div className="font-medium">{currency(assignment.totalAmount)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Discount</div>
                  <div className="font-medium text-[oklch(0.5_0.19_300)] dark:text-[oklch(0.78_0.15_300)]">
                    {assignment.totalDiscount > 0 ? `-${currency(assignment.totalDiscount)}` : currency(0)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Net Payable</div>
                  <div className="font-semibold">{currency(assignment.netPayable)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* ---------- Payment timeline ---------- */}
          <div className="h-fit rounded-md border border-border bg-card p-4 shadow-sm lg:sticky lg:top-4">
            <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <CalendarClock className="h-4 w-4 text-muted-foreground" /> Payment Timeline
            </div>

            {timeline.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                <Wallet className="h-5 w-5 text-muted-foreground/60" />
                No payments recorded yet.
              </div>
            ) : (
              <ol className="relative space-y-5 border-l border-border pl-4">
                {timeline.map((p) => {
                  const isExpanded = expandedPayment === p.feePaymentKey;
                  return (
                    <li key={p.feePaymentKey} className="relative">
                      <span
                        className={cn(
                          "absolute -left-[21px] top-0.5 flex h-3 w-3 items-center justify-center rounded-full border-2 border-card",
                          p.isReversed ? "bg-slate-500" : "bg-success",
                        )}
                      />
                      <button
                        type="button"
                        className="flex w-full items-start justify-between gap-2 text-left"
                        onClick={() => setExpandedPayment(isExpanded ? null : p.feePaymentKey)}
                      >
                        <div className="min-w-0">
                          <div className={cn("text-sm font-semibold", p.isReversed && "text-muted-foreground line-through")}>
                            {currency(p.amountPaid)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {PAYMENT_MODE_LABELS[p.paymentMode]} · {p.receiptNumber}
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">{formatDate(p.paymentDate)}</div>
                        </div>
                        {p.isReversed && (
                          <span className="shrink-0 rounded-full bg-slate-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                            Reversed
                          </span>
                        )}
                      </button>
                      {isExpanded && p.allocations.length > 0 && (
                        <div className="mt-2 space-y-1 rounded-md bg-muted/40 p-2 text-xs">
                          {p.allocations.map((a) => (
                            <div key={a.feePaymentAllocationKey} className="flex items-center justify-between">
                              <span className="text-muted-foreground">{a.feeHeadName}</span>
                              <span className="font-medium">{currency(a.allocatedAmount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
