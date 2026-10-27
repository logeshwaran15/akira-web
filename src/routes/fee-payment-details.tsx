import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { BackButton } from "@/components/erp/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { StudentAvatar } from "@/components/erp/StudentAvatar";
import { Receipt, Printer, Download, RotateCcw } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/fee-payment-details")({
  validateSearch: (search: Record<string, unknown>): { feePaymentKey?: string } => ({
    feePaymentKey: typeof search.feePaymentKey === "string" ? search.feePaymentKey : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Payment Details — Akira School ERP" },
      { name: "description", content: "View a fee payment's details, allocations and refunds." },
    ],
  }),
  component: PaymentDetailsPage,
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
  gender: string | null;
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

type FeeRefundAllocation = {
  feeRefundAllocationKey: string;
  studentFeeAssignmentItemKey: string;
  feeHeadKey: string;
  feeHeadName: string;
  refundedAmount: number;
};

type FeeRefund = {
  feeRefundKey: string;
  feePaymentKey: string;
  receiptNumber: string;
  studentFeeAssignmentKey: string;
  studentKey: string;
  studentName: string;
  admissionNumber: string;
  photoUrl: string | null;
  className: string;
  sectionLabel: string | null;
  voucherNumber: string;
  refundAmount: number;
  refundMode: PaymentMode;
  refundDate: string;
  reason: string;
  transactionReference: string | null;
  isVoided: boolean;
  createdBy: string | null;
  createdOn: string;
  allocations: FeeRefundAllocation[];
  paymentAmount: number;
  alreadyRefunded: number;
};

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "ONLINE", label: "Online Payment" },
];

const currency = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

function PaymentDetailsPage() {
  const { feePaymentKey } = Route.useSearch();

  const [payment, setPayment] = useState<FeePayment | null>(null);
  const [refunds, setRefunds] = useState<FeeRefund[]>([]);
  const [loading, setLoading] = useState(true);

  const [receiptOpen, setReceiptOpen] = useState(false);

  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundAmountInput, setRefundAmountInput] = useState("");
  const [refundMode, setRefundMode] = useState<PaymentMode>("CASH");
  const [refundDate, setRefundDate] = useState(todayIso());
  const [refundReason, setRefundReason] = useState("");
  const [refundReference, setRefundReference] = useState("");
  const [submittingRefund, setSubmittingRefund] = useState(false);

  const load = () => {
    if (!feePaymentKey) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      apiFetch("/api/FeePayment"),
      apiFetch("/api/FeeRefund"),
    ])
      .then(([payments, r]: [FeePayment[], FeeRefund[]]) => {
        const found = (payments ?? []).find((p) => p.feePaymentKey === feePaymentKey);
        setPayment(found ?? null);
        setRefunds(r ?? []);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load payment details"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [feePaymentKey]);

  const refundsForPayment = refunds.filter((r) => r.feePaymentKey === feePaymentKey);
  const alreadyRefunded = refundsForPayment.filter((r) => !r.isVoided).reduce((s, r) => s + r.refundAmount, 0);
  const refundableBalance = payment ? payment.amountPaid - alreadyRefunded : 0;

  const openRefundDialog = () => {
    if (!payment) return;
    setRefundAmountInput(refundableBalance > 0 ? String(refundableBalance) : "");
    setRefundMode(payment.paymentMode);
    setRefundDate(todayIso());
    setRefundReason("");
    setRefundReference("");
    setRefundDialogOpen(true);
  };

  const refundAmountValue = Number(refundAmountInput) || 0;
  const refundAmountError =
    refundAmountValue <= 0 ? "Enter a refund amount greater than zero." :
    refundAmountValue > refundableBalance ? `Refund cannot exceed the refundable balance of ${currency(refundableBalance)}.` :
    null;

  const submitRefund = async () => {
    if (!payment || refundAmountError) return;
    if (!refundReason.trim()) { toast.error("A reason is required for the refund"); return; }

    setSubmittingRefund(true);
    try {
      await apiFetch("/api/FeeRefund", {
        method: "POST",
        body: JSON.stringify({
          feePaymentKey: payment.feePaymentKey,
          refundAmount: refundAmountValue,
          refundMode,
          refundDate,
          reason: refundReason.trim(),
          transactionReference: refundReference.trim() || null,
          allocations: [],
        }),
      });
      toast.success(`Refund of ${currency(refundAmountValue)} recorded`);
      setRefundDialogOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record refund");
    } finally {
      setSubmittingRefund(false);
    }
  };

  if (!feePaymentKey) {
    return (
      <div>
        <PageHeader
          title="Payment Details"
          actions={<BackButton to="/fee-collection" label="Back to Fee Collection" className="mb-0" />}
        />
        <div className="rounded-md border border-dashed border-border bg-card px-6 py-14 text-center text-sm text-muted-foreground">
          No payment selected. Go back to Fee Collection and pick a payment from the history table.
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Payment Details"
        breadcrumbs={[{ label: "Fee Collection", to: "/fee-collection" }, { label: "Payment Details" }]}
        actions={<BackButton to="/fee-collection" label="Back to Fee Collection" className="mb-0" />}
      />

      {loading ? (
        <Skeleton className="h-[720px] rounded-md" />
      ) : !payment ? (
        <div className="rounded-md border border-dashed border-border bg-card px-6 py-14 text-center text-sm text-muted-foreground">
          Payment not found.
        </div>
      ) : (
        <>
          <div className="mb-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-md border-info text-info hover:bg-info/10 hover:text-info" onClick={() => setReceiptOpen(true)}>
              <Receipt className="h-3.5 w-3.5" /> View Receipt
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-md" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
            {!payment.isReversed && (
              <Button
                size="sm"
                className="gap-1.5 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={refundableBalance <= 0}
                onClick={openRefundDialog}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Refund Payment
              </Button>
            )}
          </div>

          <div className="mx-auto max-w-3xl overflow-hidden rounded-md border border-border bg-card shadow-sm">
            {/* ---------- Invoice header ---------- */}
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-display text-xl font-bold tracking-tight">FEE PAYMENT RECEIPT</div>
                <div className="mt-2 text-sm font-semibold">Akira School</div>
                <div className="text-xs text-muted-foreground">School Address Line, City, State — PIN</div>
                <div className="text-xs text-muted-foreground">+91 00000 00000</div>
                <div className="text-xs text-muted-foreground">accounts@akiraschool.edu</div>
              </div>
              <div className="w-full shrink-0 overflow-hidden rounded-md border border-border sm:w-64">
                <div className="flex items-center justify-between bg-info px-3 py-1.5 text-xs font-semibold text-white">
                  <span>DATE</span><span>{formatDate(payment.paymentDate)}</span>
                </div>
                <div className="flex items-center justify-between bg-info px-3 py-1.5 text-xs font-semibold text-white">
                  <span>RECEIPT NO.</span><span>{payment.receiptNumber}</span>
                </div>
                <div className="flex items-center justify-between bg-info px-3 py-1.5 text-xs font-semibold text-white">
                  <span>STATUS</span><span>{payment.isReversed ? "REVERSED" : "PAID"}</span>
                </div>
              </div>
            </div>

            {/* ---------- Bill To / Payment Mode ---------- */}
            <div className="grid grid-cols-1 gap-0 border-t border-border sm:grid-cols-2">
              <div className="border-b border-border p-5 sm:border-b-0 sm:border-r">
                <div className="mb-2 bg-info px-2 py-1 text-xs font-semibold text-white">BILL TO</div>
                <div className="flex items-center gap-3">
                  <StudentAvatar photoUrl={payment.photoUrl} gender={payment.gender} studentName={payment.studentName} className="h-10 w-10 border border-border" />
                  <div>
                    <div className="text-sm font-semibold">{payment.studentName}</div>
                    <div className="text-xs text-muted-foreground">Admission No: {payment.admissionNumber}</div>
                    <div className="text-xs text-muted-foreground">{payment.className}{payment.sectionLabel ? ` ${payment.sectionLabel}` : ""}</div>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="mb-2 bg-info px-2 py-1 text-xs font-semibold text-white">PAYMENT MODE</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="font-medium">{PAYMENT_MODES.find((m) => m.value === payment.paymentMode)?.label}</span></div>
                  {payment.transactionReference && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Transaction Ref</span><span className="font-medium">{payment.transactionReference}</span></div>
                  )}
                  {payment.bankName && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Bank Name</span><span className="font-medium">{payment.bankName}</span></div>
                  )}
                  {payment.chequeNumber && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Cheque No.</span><span className="font-medium">{payment.chequeNumber}</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-muted-foreground">Collected By</span><span className="font-medium">{payment.createdBy ?? "—"}</span></div>
                </div>
              </div>
            </div>

            {/* ---------- Line items ---------- */}
            <div className="p-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-info text-left text-xs font-semibold text-white">
                    <th className="px-3 py-2">ITEM NO.</th>
                    <th className="px-3 py-2">DESCRIPTION</th>
                    <th className="px-3 py-2 text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {payment.allocations.map((a, i) => (
                    <tr key={a.feePaymentAllocationKey} className="border-b border-border">
                      <td className="px-3 py-2 text-muted-foreground">{String(i + 1).padStart(3, "0")}</td>
                      <td className="px-3 py-2">{a.feeHeadName}</td>
                      <td className="px-3 py-2 text-right font-medium">{currency(a.allocatedAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {payment.remarks && (
                <div className="mt-4 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Remarks: </span>{payment.remarks}
                </div>
              )}

              {/* ---------- Totals ---------- */}
              <div className="mt-4 flex justify-end">
                <div className="w-full max-w-xs space-y-1.5 text-sm">
                  <div className="flex justify-between border-t border-border pt-1.5">
                    <span className="font-semibold text-info">AMOUNT PAID</span>
                    <span className={cn("font-semibold", payment.isReversed ? "text-muted-foreground line-through" : "text-success")}>{currency(payment.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between bg-muted/40 px-2 py-1.5">
                    <span className="font-bold text-info">BALANCE AFTER</span>
                    <span className="font-bold">{currency(payment.balanceAfter)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center text-xs text-muted-foreground italic">
                Thank you for your payment.
              </div>
            </div>

            {/* ---------- Previous Payment Detail (refunds) ---------- */}
            {refundsForPayment.length > 0 && (
              <div className="border-t border-border p-5">
                <div className="mb-2 bg-muted px-2 py-1 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Refund History
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Voucher No.</th>
                      <th className="px-3 py-2">Mode</th>
                      <th className="px-3 py-2">Reason</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refundsForPayment.map((r) => (
                      <tr key={r.feeRefundKey} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-muted-foreground">{formatDate(r.refundDate)}</td>
                        <td className={cn("px-3 py-2", r.isVoided && "text-muted-foreground line-through")}>{r.voucherNumber}</td>
                        <td className="px-3 py-2 text-muted-foreground">{PAYMENT_MODES.find((m) => m.value === r.refundMode)?.label}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.reason}</td>
                        <td className={cn("px-3 py-2 text-right font-medium", r.isVoided ? "text-muted-foreground line-through" : "text-destructive")}>
                          -{currency(r.refundAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ---------- Refund ---------- */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Refund Payment</DialogTitle>
            {payment && (
              <DialogDescription>
                {payment.studentName} · Receipt {payment.receiptNumber}
              </DialogDescription>
            )}
          </DialogHeader>
          {payment && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/40 p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Original Payment</span><span className="font-medium">{currency(payment.amountPaid)}</span></div>
                {alreadyRefunded > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Already Refunded</span><span className="font-medium">{currency(alreadyRefunded)}</span></div>
                )}
                <div className="flex justify-between font-semibold"><span>Refundable Balance</span><span>{currency(refundableBalance)}</span></div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label required>Refund Amount</Label>
                  <Input type="number" min="0" value={refundAmountInput} onChange={(e) => setRefundAmountInput(e.target.value)} className="rounded-md" />
                  {refundAmountError && <p className="text-xs text-destructive">{refundAmountError}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label required>Refund Mode</Label>
                  <Select value={refundMode} onValueChange={(v) => setRefundMode(v as PaymentMode)}>
                    <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label required>Refund Date</Label>
                  <DatePicker value={refundDate} onChange={setRefundDate} max={todayIso()} className="rounded-md" />
                </div>
                <div className="space-y-1.5">
                  <Label>Transaction Reference</Label>
                  <Input value={refundReference} onChange={(e) => setRefundReference(e.target.value)} className="rounded-md" placeholder="Optional" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label required>Reason</Label>
                <Input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} className="rounded-md" placeholder="e.g. Fee overpaid, transferred out" />
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                <Button variant="outline" className="rounded-md" onClick={() => setRefundDialogOpen(false)}>Cancel</Button>
                <Button className="rounded-md" disabled={submittingRefund || !!refundAmountError} onClick={submitRefund}>
                  {submittingRefund ? "Processing..." : `Refund ${currency(refundAmountValue)}`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ---------- Receipt view ---------- */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="sm:max-w-md rounded-md">
          {payment && <ReceiptView payment={payment} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReceiptView({ payment }: { payment: FeePayment }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="text-center">
        <div className="font-display text-base font-bold">AKIRA SCHOOL ERP</div>
        <div className="text-xs text-muted-foreground">Payment Receipt</div>
      </div>
      <div className="border-t border-dashed border-border pt-3">
        <div className="flex justify-between"><span className="text-muted-foreground">Receipt No</span><span className="font-medium">{payment.receiptNumber}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{formatDate(payment.paymentDate)}</span></div>
      </div>
      <div className="border-t border-dashed border-border pt-3">
        <div className="flex justify-between"><span className="text-muted-foreground">Student</span><span className="font-medium">{payment.studentName}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Admission No</span><span className="font-medium">{payment.admissionNumber}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Class</span><span className="font-medium">{payment.className}{payment.sectionLabel ? ` - ${payment.sectionLabel}` : ""}</span></div>
      </div>
      <div className="border-t border-dashed border-border pt-3">
        {payment.allocations.map((a) => (
          <div key={a.feePaymentAllocationKey} className="flex justify-between"><span className="text-muted-foreground">{a.feeHeadName}</span><span>{currency(a.allocatedAmount)}</span></div>
        ))}
      </div>
      <div className="border-t border-dashed border-border pt-3">
        <div className="flex justify-between font-semibold"><span>Amount Paid</span><span className="text-success">{currency(payment.amountPaid)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Payment Mode</span><span>{PAYMENT_MODES.find((m) => m.value === payment.paymentMode)?.label}</span></div>
        {payment.transactionReference && <div className="flex justify-between"><span className="text-muted-foreground">Transaction ID</span><span>{payment.transactionReference}</span></div>}
      </div>
      <div className="border-t border-dashed border-border pt-3">
        <div className="flex justify-between"><span className="text-muted-foreground">Remaining Balance</span><span className="font-semibold">{currency(payment.balanceAfter)}</span></div>
      </div>
      <div className="border-t border-dashed border-border pt-3 text-center font-semibold text-success">
        {payment.isReversed ? "PAYMENT REVERSED" : "PAID SUCCESSFULLY"}
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1 gap-1.5 rounded-md border-primary text-primary hover:bg-primary/10 hover:text-primary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print
        </Button>
        <Button variant="outline" className="flex-1 gap-1.5 rounded-md border-success text-success hover:bg-success/10 hover:text-success" onClick={() => window.print()}>
          <Download className="h-4 w-4" /> Download PDF
        </Button>
      </div>
    </div>
  );
}
