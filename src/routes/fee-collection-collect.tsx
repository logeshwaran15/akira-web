import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { BackButton } from "@/components/erp/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import {
  ChevronLeft, CheckCircle2, Receipt, Printer, Download, Plus,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/fee-collection-collect")({
  validateSearch: (search: Record<string, unknown>): { studentFeeAssignmentKey?: string } => ({
    studentFeeAssignmentKey: typeof search.studentFeeAssignmentKey === "string" ? search.studentFeeAssignmentKey : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Collect Fee — Akira School ERP" },
      { name: "description", content: "Collect a student's fee payment." },
    ],
  }),
  component: CollectFeePage,
});

// ---------- Types (mirror fee-collection.tsx) ----------

type FeeCollectionItem = {
  studentFeeAssignmentItemKey: string;
  feeHeadKey: string;
  feeHeadName: string;
  netAmount: number;
  paidAmount: number;
  balance: number;
  frequency: string;
  dueDate: string | null;
};

type FeeCollectionStudent = {
  studentFeeAssignmentKey: string;
  studentKey: string;
  studentName: string;
  admissionNumber: string;
  photoUrl: string | null;
  mobileNumber: string | null;
  className: string;
  sectionLabel: string | null;
  academicYearName: string;
  structureName: string;
  status: "ACTIVE" | "WAIVED" | "CANCELLED";
  netPayable: number;
  totalPaid: number;
  balance: number;
  items: FeeCollectionItem[];
};

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

const currency = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

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

type WizardStep = "select-heads" | "confirm" | "success";

function CollectFeePage() {
  const navigate = useNavigate();
  const { studentFeeAssignmentKey } = Route.useSearch();

  const [student, setStudent] = useState<FeeCollectionStudent | null>(null);
  const [loading, setLoading] = useState(true);

  const [wizardStep, setWizardStep] = useState<WizardStep>("select-heads");
  const [selectedItemKeys, setSelectedItemKeys] = useState<string[]>([]);
  const [amountInput, setAmountInput] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  const [paymentDate, setPaymentDate] = useState(todayIso());
  const [transactionRef, setTransactionRef] = useState("");
  const [bankName, setBankName] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastPayment, setLastPayment] = useState<FeePayment | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  useEffect(() => {
    if (!studentFeeAssignmentKey) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiFetch("/api/FeePayment/students")
      .then((list: FeeCollectionStudent[]) => {
        const found = (list ?? []).find((s) => s.studentFeeAssignmentKey === studentFeeAssignmentKey);
        setStudent(found ?? null);
        if (found) {
          const outstandingItems = found.items.filter((i) => i.balance > 0);
          setSelectedItemKeys(outstandingItems.map((i) => i.studentFeeAssignmentItemKey));
          setAmountInput(found.balance > 0 ? String(found.balance) : "");
        }
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load student fee details"))
      .finally(() => setLoading(false));
  }, [studentFeeAssignmentKey]);

  const toggleItem = (key: string, balance: number) => {
    setSelectedItemKeys((keys) => {
      const next = keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key];
      if (!keys.includes(key)) {
        const currentAmt = Number(amountInput) || 0;
        setAmountInput(String(currentAmt + balance));
      }
      return next;
    });
  };

  const selectedItems = useMemo(
    () => (student?.items ?? []).filter((i) => selectedItemKeys.includes(i.studentFeeAssignmentItemKey)),
    [student, selectedItemKeys],
  );
  const selectedItemsBalance = selectedItems.reduce((sum, i) => sum + i.balance, 0);

  const amount = Number(amountInput) || 0;
  const outstanding = student?.balance ?? 0;
  const remainingBalance = Math.max(0, outstanding - amount);

  const amountError =
    amount <= 0 ? "Enter an amount greater than zero." :
    amount > outstanding ? `Amount cannot exceed the outstanding balance of ${currency(outstanding)}.` :
    selectedItemKeys.length > 0 && Math.abs(amount - selectedItemsBalance) > 0.5 ?
      `Amount should match the selected fee heads' due total of ${currency(selectedItemsBalance)}.` :
    null;

  const modeError =
    paymentMode === "UPI" && !transactionRef.trim() ? "Enter the UPI transaction ID." :
    paymentMode === "CARD" && !transactionRef.trim() ? "Enter the card transaction/reference number." :
    paymentMode === "ONLINE" && !transactionRef.trim() ? "Enter the payment gateway reference." :
    paymentMode === "BANK_TRANSFER" && (!bankName.trim() || !transactionRef.trim()) ? "Enter the bank name and UTR/transaction number." :
    paymentMode === "CHEQUE" && (!chequeNumber.trim() || !bankName.trim() || !chequeDate) ? "Enter the cheque number, bank name and cheque date." :
    null;

  const canProceed = !amountError && !modeError && !!student;

  const buildAllocations = () => {
    if (selectedItemKeys.length === 0) return [];
    let remaining = amount;
    const sorted = [...selectedItems].sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
    return sorted.map((item) => {
      const take = Math.min(item.balance, remaining);
      remaining -= take;
      return { studentFeeAssignmentItemKey: item.studentFeeAssignmentItemKey, allocatedAmount: Math.round(take * 100) / 100 };
    }).filter((a) => a.allocatedAmount > 0);
  };

  const submitPayment = async () => {
    if (!student || !canProceed) return;
    setSubmitting(true);
    try {
      const payload = {
        studentFeeAssignmentKey: student.studentFeeAssignmentKey,
        amountPaid: amount,
        paymentMode,
        paymentDate,
        transactionReference: transactionRef.trim() || null,
        bankName: bankName.trim() || null,
        chequeNumber: chequeNumber.trim() || null,
        chequeDate: chequeDate || null,
        remarks: remarks.trim() || null,
        allocations: buildAllocations(),
      };

      const payment: FeePayment = await apiFetch("/api/FeePayment", { method: "POST", body: JSON.stringify(payload) });
      toast.success(`Payment of ${currency(amount)} collected successfully`);
      setLastPayment(payment);
      setWizardStep("success");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to collect payment");
    } finally {
      setSubmitting(false);
    }
  };

  const startAnother = () => {
    if (!student) return;
    const outstandingItems = student.items.filter((i) => i.balance > 0);
    setSelectedItemKeys(outstandingItems.map((i) => i.studentFeeAssignmentItemKey));
    setAmountInput(remainingBalance > 0 ? String(remainingBalance) : "");
    setPaymentMode("CASH");
    setPaymentDate(todayIso());
    setTransactionRef("");
    setBankName("");
    setChequeNumber("");
    setChequeDate("");
    setRemarks("");
    setLastPayment(null);
    setWizardStep("select-heads");
  };

  if (!studentFeeAssignmentKey) {
    return (
      <div>
        <PageHeader
          title="Collect Fee"
          actions={<BackButton to="/fee-collection" label="Back to Fee Collection" className="mb-0" />}
        />
        <div className="rounded-md border border-dashed border-border bg-card px-6 py-14 text-center text-sm text-muted-foreground">
          No student selected. Go back to Fee Collection and pick a student first.
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Collect Fee"
        breadcrumbs={[{ label: "Fee Collection", to: "/fee-collection" }, { label: "Collect Fee" }]}
        actions={<BackButton to="/fee-collection" label="Back to Fee Collection" className="mb-0" />}
      />

      {loading ? (
        <Skeleton className="h-[420px] rounded-md" />
      ) : !student ? (
        <div className="rounded-md border border-dashed border-border bg-card px-6 py-14 text-center text-sm text-muted-foreground">
          Student not found. They may no longer have an active fee assignment.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          {/* ---------- Payment wizard ---------- */}
          <div className="rounded-md border border-border bg-card p-5 shadow-sm">
            {student.balance <= 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <CheckCircle2 className="h-8 w-8 text-success" />
                <div className="font-medium">No Outstanding Fees</div>
                <p className="text-sm text-muted-foreground">This student has no balance due.</p>
              </div>
            ) : wizardStep === "select-heads" ? (
              <div className="space-y-4">
                <div className="rounded-md bg-muted/40 p-3 text-sm">
                  <span className="text-muted-foreground">Outstanding: </span>
                  <span className="font-semibold text-destructive">{currency(student.balance)}</span>
                </div>

                <div className="space-y-1.5">
                  <Label>Select Fee Heads (optional — leave unchecked to allocate automatically)</Label>
                  <div className="space-y-1.5 rounded-md border border-border p-2">
                    {student.items.map((item) => {
                      const checked = selectedItemKeys.includes(item.studentFeeAssignmentItemKey);
                      const isPaid = item.balance <= 0;
                      return (
                        <label
                          key={item.studentFeeAssignmentItemKey}
                          className={cn(
                            "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm",
                            isPaid ? "opacity-50" : "cursor-pointer hover:bg-muted/40",
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <Checkbox
                              checked={checked}
                              disabled={isPaid}
                              onCheckedChange={() => toggleItem(item.studentFeeAssignmentItemKey, item.balance)}
                            />
                            {item.feeHeadName}
                          </span>
                          <span className={isPaid ? "text-muted-foreground" : "font-medium text-destructive"}>
                            {isPaid ? "Paid in Full" : `Due ${currency(item.balance)}`}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label required>Amount to Pay</Label>
                    <Input
                      type="number"
                      min="0"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      className="rounded-md"
                    />
                    {amountError && <p className="text-xs text-destructive">{amountError}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label required>Payment Mode</Label>
                    <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as PaymentMode)}>
                      <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {paymentMode === "UPI" && (
                  <div className="space-y-1.5">
                    <Label required>Transaction ID</Label>
                    <Input value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} className="rounded-md" placeholder="UPI transaction ID" />
                  </div>
                )}
                {(paymentMode === "CARD" || paymentMode === "ONLINE") && (
                  <div className="space-y-1.5">
                    <Label required>{paymentMode === "CARD" ? "Transaction / Reference Number" : "Gateway Reference"}</Label>
                    <Input value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} className="rounded-md" />
                  </div>
                )}
                {paymentMode === "BANK_TRANSFER" && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label required>Bank Name</Label>
                      <Input value={bankName} onChange={(e) => setBankName(e.target.value)} className="rounded-md" />
                    </div>
                    <div className="space-y-1.5">
                      <Label required>UTR / Transaction Number</Label>
                      <Input value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} className="rounded-md" />
                    </div>
                  </div>
                )}
                {paymentMode === "CHEQUE" && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label required>Cheque Number</Label>
                      <Input value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} className="rounded-md" />
                    </div>
                    <div className="space-y-1.5">
                      <Label required>Bank Name</Label>
                      <Input value={bankName} onChange={(e) => setBankName(e.target.value)} className="rounded-md" />
                    </div>
                    <div className="space-y-1.5">
                      <Label required>Cheque Date</Label>
                      <DatePicker value={chequeDate} onChange={setChequeDate} className="rounded-md" />
                    </div>
                  </div>
                )}
                {modeError && <p className="text-xs text-destructive">{modeError}</p>}

                <div className="space-y-1.5">
                  <Label required>Payment Date</Label>
                  <DatePicker value={paymentDate} onChange={setPaymentDate} max={todayIso()} className="rounded-md sm:w-[220px]" />
                </div>

                <div className="space-y-1.5">
                  <Label>Remarks</Label>
                  <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} className="rounded-md" placeholder="Optional notes" />
                </div>

                <div className="rounded-md border border-border bg-muted/30 p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment Summary</div>
                  <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                    <div>
                      <div className="text-[11px] text-muted-foreground">Outstanding Before</div>
                      <div className="font-medium">{currency(outstanding)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">Amount Paying</div>
                      <div className="font-medium text-success">{currency(amount)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">Remaining Balance</div>
                      <div className="font-semibold">{currency(remainingBalance)}</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                  <Button variant="outline" className="rounded-md" onClick={() => navigate({ to: "/fee-collection" })}>Cancel</Button>
                  <Button className="rounded-md" disabled={!canProceed} onClick={() => setWizardStep("confirm")}>
                    Collect {currency(amount)}
                  </Button>
                </div>
              </div>
            ) : wizardStep === "confirm" ? (
              <div className="space-y-4">
                <div className="rounded-md border border-border p-4 text-sm">
                  <div className="mb-3 font-display text-base font-semibold">Confirm Payment</div>
                  <dl className="space-y-2">
                    <div className="flex justify-between"><dt className="text-muted-foreground">Student</dt><dd className="font-medium">{student.studentName}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">Amount</dt><dd className="font-semibold text-success">{currency(amount)}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">Payment Mode</dt><dd className="font-medium">{PAYMENT_MODES.find((m) => m.value === paymentMode)?.label}</dd></div>
                    {transactionRef && <div className="flex justify-between"><dt className="text-muted-foreground">Transaction Ref</dt><dd className="font-medium">{transactionRef}</dd></div>}
                    <div className="flex justify-between"><dt className="text-muted-foreground">Payment Date</dt><dd className="font-medium">{formatDate(paymentDate)}</dd></div>
                    <div className="flex justify-between border-t border-border pt-2"><dt className="text-muted-foreground">Remaining Balance</dt><dd className="font-semibold">{currency(remainingBalance)}</dd></div>
                  </dl>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Button variant="outline" className="gap-1.5 rounded-md" onClick={() => setWizardStep("select-heads")}>
                    <ChevronLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button className="rounded-md" disabled={submitting} onClick={submitPayment}>
                    {submitting ? "Collecting Payment..." : "Confirm Payment"}
                  </Button>
                </div>
              </div>
            ) : (
              lastPayment && (
                <div className="space-y-4 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <div className="font-display text-lg font-semibold">{currency(lastPayment.amountPaid)} collected successfully</div>
                    <div className="text-sm text-muted-foreground">{lastPayment.studentName}</div>
                  </div>
                  <dl className="mx-auto max-w-xs space-y-1.5 text-left text-sm">
                    <div className="flex justify-between"><dt className="text-muted-foreground">Receipt No</dt><dd className="font-medium">{lastPayment.receiptNumber}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">Payment Mode</dt><dd className="font-medium">{PAYMENT_MODES.find((m) => m.value === lastPayment.paymentMode)?.label}</dd></div>
                    {lastPayment.transactionReference && <div className="flex justify-between"><dt className="text-muted-foreground">Transaction ID</dt><dd className="font-medium">{lastPayment.transactionReference}</dd></div>}
                    <div className="flex justify-between"><dt className="text-muted-foreground">Remaining Balance</dt><dd className="font-semibold">{currency(lastPayment.balanceAfter)}</dd></div>
                  </dl>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button variant="outline" className="gap-1.5 rounded-md border-info text-info hover:bg-info/10 hover:text-info" onClick={() => setReceiptOpen(true)}>
                      <Receipt className="h-4 w-4" /> View Receipt
                    </Button>
                    <Button variant="outline" className="gap-1.5 rounded-md border-primary text-primary hover:bg-primary/10 hover:text-primary" onClick={() => window.print()}>
                      <Printer className="h-4 w-4" /> Print Receipt
                    </Button>
                    <Button variant="outline" className="gap-1.5 rounded-md border-success text-success hover:bg-success/10 hover:text-success" onClick={() => window.print()}>
                      <Download className="h-4 w-4" /> Download PDF
                    </Button>
                    <Button className="gap-1.5 rounded-md" onClick={startAnother} disabled={remainingBalance <= 0}>
                      <Plus className="h-4 w-4" /> New Payment
                    </Button>
                  </div>
                  <Button
                    variant="ghost" className="w-full rounded-md text-muted-foreground"
                    onClick={() => navigate({ to: "/fee-collection" })}
                  >
                    Done
                  </Button>
                </div>
              )
            )}
          </div>

          {/* ---------- Student summary ---------- */}
          <div className="h-fit rounded-md border border-border bg-card p-4 shadow-sm lg:sticky lg:top-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border border-border">
                <AvatarImage src={student.photoUrl ?? undefined} alt={student.studentName} />
                <AvatarFallback className="font-semibold">{initials(student.studentName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate font-display text-base font-semibold">{student.studentName}</div>
                <div className="text-xs text-muted-foreground">
                  {student.admissionNumber} · {student.className}{student.sectionLabel ? ` ${student.sectionLabel}` : ""}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total Payable</span>
                <span className="font-medium">{currency(student.netPayable)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Paid</span>
                <span className="font-medium text-success">{currency(student.totalPaid)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2.5">
                <span className="text-xs font-medium text-muted-foreground">Outstanding</span>
                <span className="font-display text-lg font-bold text-destructive">{currency(student.balance)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Receipt view ---------- */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="sm:max-w-md rounded-md">
          {lastPayment && <ReceiptView payment={lastPayment} />}
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
