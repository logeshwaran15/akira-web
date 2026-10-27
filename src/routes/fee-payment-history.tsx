import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { BackButton } from "@/components/erp/BackButton";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Wallet, Download } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/fee-payment-history")({
  head: () => ({
    meta: [
      { title: "Payment History — Akira School ERP" },
      { name: "description", content: "Full report of all fee payments collected across the school." },
    ],
  }),
  component: PaymentHistoryPage,
});

// ---------- Types (mirror fee-collection.tsx) ----------

type PaymentAllocation = {
  feePaymentAllocationKey: string;
  studentFeeAssignmentItemKey: string;
  feeHeadKey: string;
  feeHeadName: string;
  allocatedAmount: number;
};

type PaymentMode = "CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "CHEQUE" | "ONLINE";

type FeePayment = {
  feePaymentKey: string;
  studentFeeAssignmentKey: string;
  studentKey: string;
  studentName: string;
  admissionNumber: string;
  photoUrl: string | null;
  className: string;
  sectionLabel: string | null;
  receiptNumber: string;
  amountPaid: number;
  paymentMode: PaymentMode;
  paymentDate: string;
  transactionReference: string | null;
  bankName: string | null;
  chequeNumber: string | null;
  chequeDate: string | null;
  remarks: string | null;
  isReversed: boolean;
  createdBy: string | null;
  createdOn: string;
  allocations: PaymentAllocation[];
  balanceAfter: number;
};

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "ONLINE", label: "Online Payment" },
];

const SHINE = "text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)]";

const MODE_BADGE_STYLES: Record<PaymentMode, string> = {
  CASH: `bg-[#178750] dark:bg-[#1FA05F] ${SHINE}`,
  UPI: `bg-[#0D6FAE] dark:bg-[#1382CC] ${SHINE}`,
  CARD: `bg-[oklch(0.55_0.2_300)] dark:bg-[oklch(0.6_0.2_300)] ${SHINE}`,
  BANK_TRANSFER: `bg-[#B45C00] dark:bg-[#D6790A] ${SHINE}`,
  CHEQUE: `bg-[oklch(0.5_0.12_200)] dark:bg-[oklch(0.55_0.12_200)] ${SHINE}`,
  ONLINE: `bg-[#6D28D9] dark:bg-[#7C3AED] ${SHINE}`,
};

const PAYMENT_STATUS_BADGE = {
  recorded: `bg-[#178750] dark:bg-[#1FA05F] ${SHINE}`,
  reversed: `bg-slate-600 dark:bg-slate-500 ${SHINE}`,
};

const currency = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

function PaymentHistoryPage() {
  const navigate = useNavigate();

  const [history, setHistory] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    setLoading(true);
    apiFetch("/api/FeePayment")
      .then((h) => setHistory(h ?? []))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load payment history"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = history;
    if (modeFilter !== "all") list = list.filter((p) => p.paymentMode === modeFilter);
    if (statusFilter === "recorded") list = list.filter((p) => !p.isReversed);
    if (statusFilter === "reversed") list = list.filter((p) => p.isReversed);
    return list;
  }, [history, modeFilter, statusFilter]);


  const columns: Column<FeePayment>[] = [
    {
      key: "receiptNumber", header: "Receipt No", sortable: true,
      accessor: (p) => <span className="font-medium">{p.receiptNumber}</span>,
    },
    {
      key: "studentName", header: "Student",
      accessor: (p) => (
        <div className="min-w-0">
          <div className="truncate text-sm">{p.studentName}</div>
          <div className="text-xs text-muted-foreground">
            {p.admissionNumber} · {p.className}{p.sectionLabel ? ` ${p.sectionLabel}` : ""}
          </div>
        </div>
      ),
    },
    {
      key: "paymentDate", header: "Date", sortable: true,
      sortValue: (p) => p.paymentDate,
      accessor: (p) => <span className="text-sm">{formatDate(p.paymentDate)}</span>,
    },
    {
      key: "amountPaid", header: "Amount", sortable: true,
      sortValue: (p) => p.amountPaid,
      accessor: (p) => <span className={cn("font-semibold", p.isReversed ? "text-muted-foreground line-through" : "text-success")}>{currency(p.amountPaid)}</span>,
    },
    {
      key: "paymentMode", header: "Mode",
      accessor: (p) => (
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", MODE_BADGE_STYLES[p.paymentMode])}>
          {PAYMENT_MODES.find((m) => m.value === p.paymentMode)?.label ?? p.paymentMode}
        </span>
      ),
    },
    {
      key: "status", header: "Status",
      accessor: (p) => (
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", p.isReversed ? PAYMENT_STATUS_BADGE.reversed : PAYMENT_STATUS_BADGE.recorded)}>
          {p.isReversed ? "Reversed" : "Recorded"}
        </span>
      ),
    },
    {
      key: "createdBy", header: "Collected By",
      accessor: (p) => <span className="text-sm text-muted-foreground">{p.createdBy ?? "—"}</span>,
    },
    {
      key: "actions", header: "",
      className: "text-right",
      accessor: (p) => (
        <Button
          size="sm" className="h-7 rounded-md bg-info px-3 text-white shadow-sm hover:bg-info/90"
          onClick={() => navigate({ to: "/fee-payment-details", search: { feePaymentKey: p.feePaymentKey } })}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Payment History"
        breadcrumbs={[{ label: "Fee Collection", to: "/fee-collection" }, { label: "Payment History" }]}
        actions={
          <div className="flex gap-2">
            <Button className="h-9 gap-1.5 rounded-md bg-success text-success-foreground hover:bg-success/90" onClick={() => window.print()}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <BackButton to="/fee-collection" label="Back to Fee Collection" className="mb-0" />
          </div>
        }
      />
      {/* ---------- Filter toolbar ---------- */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select value={modeFilter} onValueChange={setModeFilter}>
          <SelectTrigger className="h-9 w-full rounded-md sm:w-[170px]"><SelectValue placeholder="All Modes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            {PAYMENT_MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-full rounded-md sm:w-[160px]"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="recorded">Recorded</SelectItem>
            <SelectItem value="reversed">Reversed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2 rounded-md border border-border bg-card p-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-card px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div className="font-display text-base font-semibold">No Payments Found</div>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">No payments match the current filters.</p>
        </div>
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          rowKey={(p) => p.feePaymentKey}
          storageKey="fee-payment-history-report"
          searchPlaceholder="Search receipt no, student, admission no..."
          searchFields={(p) => `${p.receiptNumber} ${p.studentName} ${p.admissionNumber}`}
          dateField={(p) => p.paymentDate}
          dateFilterLabel="Payment Date"
          emptyMessage="No payments match the current filters."
        />
      )}
    </div>
  );
}
