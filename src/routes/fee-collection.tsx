import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentAvatar } from "@/components/erp/StudentAvatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Search, Wallet, CalendarDays, AlertTriangle, CheckCircle2,
  Plus, User, IndianRupee,
  PencilLine, Undo2, MinusCircle, PlusCircle, History as HistoryIcon,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/fee-collection")({
  head: () => ({
    meta: [
      { title: "Fee Collection — Akira School ERP" },
      { name: "description", content: "Collect student fees, record payments and manage outstanding balances." },
    ],
  }),
  component: FeeCollectionPage,
});

// ---------- Types (mirrors the backend FeePayment* models) ----------

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
  gender: string | null;
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

type FeeCollectionSummary = {
  todayCollection: number;
  monthCollection: number;
  totalOutstanding: number;
  paymentsToday: number;
};

type FeeAdjustment = {
  feeAdjustmentKey: string;
  studentFeeAssignmentKey: string;
  studentFeeAssignmentItemKey: string;
  feeHeadName: string;
  adjustmentType: "FINE" | "CONCESSION";
  amount: number;
  reason: string;
  isReversed: boolean;
  reversalReason: string | null;
  createdBy: string | null;
  createdOn: string;
};

const currency = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ---------- KPI card ----------

type KpiTone = "emerald" | "coral" | "rose" | "cyan";

const KPI_TONE_GRADIENT: Record<KpiTone, string> = {
  emerald: "from-emerald-500 to-emerald-600",
  coral: "from-orange-400 to-orange-600",
  rose: "from-rose-500 to-rose-600",
  cyan: "from-sky-500 to-cyan-500",
};

function FeeKpiCard({
  label, value, icon: Icon, tone, subtitle,
}: {
  label: string;
  value: string;
  icon: typeof IndianRupee;
  tone: KpiTone;
  subtitle: string;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-[92px] flex-col justify-between overflow-hidden rounded-md bg-gradient-to-br p-3 text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        KPI_TONE_GRADIENT[tone],
      )}
    >
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10 blur-xl" />

      <div className="relative flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/20">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-xs font-semibold text-white/95">{label}</span>
      </div>

      <div className="relative mt-1.5 font-display text-2xl font-extrabold leading-none tracking-tight">
        {value}
      </div>

      <div className="relative mt-1 truncate text-[11px] font-medium text-white/85">{subtitle}</div>
    </div>
  );
}

function FeeCollectionPage() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState<FeeCollectionSummary | null>(null);
  const [students, setStudents] = useState<FeeCollectionStudent[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [outstandingOnly, setOutstandingOnly] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<FeeCollectionStudent | null>(null);

  // Adjustment (FM-04)
  const [adjustments, setAdjustments] = useState<FeeAdjustment[]>([]);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustItemKey, setAdjustItemKey] = useState("");
  const [adjustType, setAdjustType] = useState<"FINE" | "CONCESSION">("FINE");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);

  const loadSummaryAndStudents = () => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/FeePayment/summary"),
      apiFetch("/api/FeePayment/students"),
    ])
      .then(([s, st]) => { setSummary(s ?? null); setStudents(st ?? []); })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load fee collection data"))
      .finally(() => setLoading(false));
  };

  const loadAdjustments = () => {
    apiFetch("/api/FeeAdjustment")
      .then((a) => setAdjustments(a ?? []))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load fee adjustments"));
  };

  useEffect(() => {
    loadSummaryAndStudents();
    loadAdjustments();
  }, []);

  const filteredStudents = useMemo(() => {
    let list = students;
    if (outstandingOnly) list = list.filter((s) => s.balance > 0);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((s) =>
        `${s.studentName} ${s.admissionNumber} ${s.mobileNumber ?? ""}`.toLowerCase().includes(q));
    }
    return list;
  }, [students, search, outstandingOnly]);

  // Keep the selected student panel fresh after a payment updates balances.
  const refreshSelectedStudent = (list: FeeCollectionStudent[]) => {
    if (!selectedStudent) return;
    const fresh = list.find((s) => s.studentFeeAssignmentKey === selectedStudent.studentFeeAssignmentKey);
    setSelectedStudent(fresh ?? null);
  };

  const goToCollect = () => {
    if (!selectedStudent) return;
    navigate({ to: "/fee-collection-collect", search: { studentFeeAssignmentKey: selectedStudent.studentFeeAssignmentKey } });
  };

  // ---------- Fee Adjustment (FM-04) ----------

  const openAdjustDialog = () => {
    if (!selectedStudent) return;
    setAdjustItemKey(selectedStudent.items[0]?.studentFeeAssignmentItemKey ?? "");
    setAdjustType("FINE");
    setAdjustAmount("");
    setAdjustReason("");
    setAdjustDialogOpen(true);
  };

  const submitAdjustment = async () => {
    if (!selectedStudent) return;
    const amt = Number(adjustAmount) || 0;
    if (!adjustItemKey) { toast.error("Select a fee head to adjust"); return; }
    if (amt <= 0) { toast.error("Enter an adjustment amount greater than zero"); return; }
    if (!adjustReason.trim()) { toast.error("A reason is required for the adjustment"); return; }

    setSubmittingAdjustment(true);
    try {
      await apiFetch("/api/FeeAdjustment", {
        method: "POST",
        body: JSON.stringify({
          studentFeeAssignmentItemKey: adjustItemKey,
          adjustmentType: adjustType,
          amount: amt,
          reason: adjustReason.trim(),
        }),
      });
      toast.success(`${adjustType === "FINE" ? "Fine" : "Concession"} of ${currency(amt)} applied`);
      setAdjustDialogOpen(false);
      loadAdjustments();
      Promise.all([apiFetch("/api/FeePayment/summary"), apiFetch("/api/FeePayment/students")]).then(([s, st]) => {
        setSummary(s ?? null);
        setStudents(st ?? []);
        refreshSelectedStudent(st ?? []);
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply fee adjustment");
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  const reverseAdjustment = async (adjustment: FeeAdjustment) => {
    try {
      await apiFetch(`/api/FeeAdjustment/${adjustment.feeAdjustmentKey}/reverse`, {
        method: "POST",
        body: JSON.stringify({ reason: "Reversed from Fee Collection" }),
      });
      toast.success("Adjustment reversed");
      loadAdjustments();
      Promise.all([apiFetch("/api/FeePayment/summary"), apiFetch("/api/FeePayment/students")]).then(([s, st]) => {
        setSummary(s ?? null);
        setStudents(st ?? []);
        refreshSelectedStudent(st ?? []);
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reverse adjustment");
    }
  };

  const adjustmentsForStudent = selectedStudent
    ? adjustments.filter((a) => a.studentFeeAssignmentKey === selectedStudent.studentFeeAssignmentKey)
    : [];

  return (
    <div>
      <PageHeader
        title="Fee Collection"
        actions={
          <Button
            className="h-10 gap-1.5 rounded-md shadow-sm"
            onClick={goToCollect}
            disabled={!selectedStudent || selectedStudent.balance <= 0}
          >
            <Plus className="h-4 w-4" /> Collect Payment
          </Button>
        }
      />
      <p className="-mt-4 mb-5 text-sm text-muted-foreground">
        Collect student fees, record payments and manage outstanding balances.
      </p>

      {/* ---------- Summary cards ---------- */}
      {loading ? (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[92px] rounded-md" />)}
        </div>
      ) : (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <FeeKpiCard
            label="Today's Collection" value={currency(summary?.todayCollection ?? 0)} icon={IndianRupee} tone="emerald"
            subtitle="Collected today"
          />
          <FeeKpiCard
            label="This Month" value={currency(summary?.monthCollection ?? 0)} icon={CalendarDays} tone="coral"
            subtitle="Total collected this month"
          />
          <FeeKpiCard
            label="Outstanding" value={currency(summary?.totalOutstanding ?? 0)} icon={AlertTriangle} tone="rose"
            subtitle="Total pending amount"
          />
          <FeeKpiCard
            label="Payments Today" value={String(summary?.paymentsToday ?? 0)} icon={Wallet} tone="cyan"
            subtitle="Total transactions today"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* ---------- Search + student list ---------- */}
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by student name, admission no, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm">
              <Checkbox checked={outstandingOnly} onCheckedChange={(v) => setOutstandingOnly(!!v)} />
              Show Outstanding Only
            </label>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-md" />)}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-card px-6 py-14 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="font-medium">No students found.</div>
              <p className="mt-1 text-sm text-muted-foreground">Try another student name or admission number.</p>
            </div>
          ) : (
            <div className="max-h-[560px] space-y-1.5 overflow-y-auto rounded-md border border-border bg-card p-2">
              {filteredStudents.map((s) => {
                const isSelected = selectedStudent?.studentFeeAssignmentKey === s.studentFeeAssignmentKey;
                return (
                  <button
                    type="button"
                    key={s.studentFeeAssignmentKey}
                    onClick={() => setSelectedStudent(s)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md border p-2.5 text-left transition-colors",
                      isSelected ? "border-primary/40 bg-primary/[0.05]" : "border-transparent hover:bg-muted/40",
                    )}
                  >
                    <StudentAvatar photoUrl={s.photoUrl} gender={s.gender} studentName={s.studentName} className="h-9 w-9 border border-border" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{s.studentName}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.admissionNumber} &middot; {s.className}{s.sectionLabel ? ` ${s.sectionLabel}` : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-muted-foreground">Outstanding</div>
                      <div className={cn("text-sm font-semibold", s.balance > 0 ? "text-destructive" : "text-success")}>
                        {currency(s.balance)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ---------- Student summary + fee details ---------- */}
        <div className="space-y-4">
          {!selectedStudent ? (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-md border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              <User className="mb-2 h-6 w-6 text-muted-foreground/60" />
              Select a student from the list to view their fee details.
            </div>
          ) : (
            <>
              <div className="rounded-md border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <StudentAvatar photoUrl={selectedStudent.photoUrl} gender={selectedStudent.gender} studentName={selectedStudent.studentName} className="h-12 w-12 border border-border" />
                  <div className="min-w-0">
                    <div className="truncate font-display text-base font-semibold">{selectedStudent.studentName}</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedStudent.admissionNumber} · {selectedStudent.className}{selectedStudent.sectionLabel ? ` ${selectedStudent.sectionLabel}` : ""}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-[11px] text-muted-foreground">Total Payable</div>
                    <div className="font-semibold">{currency(selectedStudent.netPayable)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Paid</div>
                    <div className="font-semibold text-success">{currency(selectedStudent.totalPaid)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Outstanding</div>
                    <div className={cn("font-semibold", selectedStudent.balance > 0 ? "text-destructive" : "text-success")}>
                      {currency(selectedStudent.balance)}
                    </div>
                  </div>
                </div>

                {selectedStudent.netPayable > 0 && (
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Payment Progress</span>
                      <span>{Math.min(100, Math.round((selectedStudent.totalPaid / selectedStudent.netPayable) * 100))}%</span>
                    </div>
                    <Progress
                      value={Math.min(100, Math.round((selectedStudent.totalPaid / selectedStudent.netPayable) * 100))}
                      className="h-2 bg-success/15 [&>div]:bg-success"
                    />
                  </div>
                )}

                {selectedStudent.balance <= 0 && (
                  <div className="mt-3 flex items-center gap-1.5 rounded-md bg-success/10 px-2.5 py-1.5 text-xs font-medium text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" /> No Outstanding Fees
                  </div>
                )}

                <Button
                  className="mt-4 w-full gap-1.5 rounded-md"
                  onClick={goToCollect}
                  disabled={selectedStudent.balance <= 0}
                >
                  <Plus className="h-4 w-4" /> Collect Payment
                </Button>
              </div>

              {/* Fee heads breakdown */}
              <div className="rounded-md border border-border bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fee Details</div>
                  <Button
                    variant="ghost" size="sm"
                    className="h-7 gap-1 rounded-md text-primary hover:bg-primary/10 hover:text-primary"
                    onClick={openAdjustDialog}
                  >
                    <PencilLine className="h-3.5 w-3.5" /> Adjust Fee
                  </Button>
                </div>
                <div className="space-y-2">
                  {selectedStudent.items.map((item) => (
                    <div key={item.studentFeeAssignmentItemKey} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{item.feeHeadName}</span>
                      <span className="flex items-center gap-3">
                        <span>{currency(item.netAmount)}</span>
                        <span className="text-success">{currency(item.paidAmount)}</span>
                        <span className={cn("font-medium", item.balance > 0 ? "text-destructive" : "text-success")}>
                          {item.balance > 0 ? currency(item.balance) : "Paid"}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
                  <span>Total</span>
                  <span className="flex items-center gap-3">
                    <span>{currency(selectedStudent.netPayable)}</span>
                    <span className="text-success">{currency(selectedStudent.totalPaid)}</span>
                    <span className={selectedStudent.balance > 0 ? "text-destructive" : "text-success"}>
                      {currency(selectedStudent.balance)}
                    </span>
                  </span>
                </div>

                {adjustmentsForStudent.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-border pt-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Adjustments</div>
                    {adjustmentsForStudent.map((adj) => (
                      <div key={adj.feeAdjustmentKey} className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex min-w-0 items-center gap-1.5">
                          {adj.adjustmentType === "FINE" ? (
                            <PlusCircle className="h-3 w-3 shrink-0 text-destructive" />
                          ) : (
                            <MinusCircle className="h-3 w-3 shrink-0 text-success" />
                          )}
                          <span className={cn("truncate", adj.isReversed && "text-muted-foreground line-through")}>
                            {adj.feeHeadName} — {adj.reason}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className={cn("font-medium", adj.adjustmentType === "FINE" ? "text-destructive" : "text-success")}>
                            {adj.adjustmentType === "FINE" ? "+" : "-"}{currency(adj.amount)}
                          </span>
                          {!adj.isReversed && (
                            <button
                              type="button"
                              title="Reverse this adjustment"
                              onClick={() => reverseAdjustment(adj)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ---------- Payment history ---------- */}
      <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-md border border-border bg-card p-4 sm:flex-row">
        <div>
          <h2 className="font-display text-base font-semibold">Payment History</h2>
          <p className="text-sm text-muted-foreground">View the full report of all payments, with filters and receipts.</p>
        </div>
        <Button className="gap-1.5 rounded-md" onClick={() => navigate({ to: "/fee-payment-history" })}>
          <HistoryIcon className="h-4 w-4" /> View Payment History
        </Button>
      </div>

      {/* ---------- Fee Adjustment (FM-04) ---------- */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Adjust Fee</DialogTitle>
            {selectedStudent && (
              <DialogDescription>
                {selectedStudent.studentName} · {selectedStudent.admissionNumber}
              </DialogDescription>
            )}
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label required>Fee Head</Label>
                <Select value={adjustItemKey} onValueChange={setAdjustItemKey}>
                  <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {selectedStudent.items.map((item) => (
                      <SelectItem key={item.studentFeeAssignmentItemKey} value={item.studentFeeAssignmentItemKey}>
                        {item.feeHeadName} — Net {currency(item.netAmount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label required>Adjustment Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType("FINE")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-md border p-2 text-sm font-medium transition-colors",
                      adjustType === "FINE" ? "border-destructive bg-destructive/5 text-destructive" : "border-border text-muted-foreground hover:bg-muted/40",
                    )}
                  >
                    <PlusCircle className="h-4 w-4" /> Fine
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("CONCESSION")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-md border p-2 text-sm font-medium transition-colors",
                      adjustType === "CONCESSION" ? "border-success bg-success/5 text-success" : "border-border text-muted-foreground hover:bg-muted/40",
                    )}
                  >
                    <MinusCircle className="h-4 w-4" /> Concession
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {adjustType === "FINE" ? "Increases the amount owed on this fee head (e.g. a late fee)." : "Reduces the amount owed on this fee head (e.g. a waiver granted after billing)."}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label required>Amount</Label>
                <Input type="number" min="0" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} className="rounded-md" />
              </div>

              <div className="space-y-1.5">
                <Label required>Reason</Label>
                <Input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} className="rounded-md" placeholder="e.g. Late payment fine for March" />
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                <Button variant="outline" className="rounded-md" onClick={() => setAdjustDialogOpen(false)}>Cancel</Button>
                <Button className="rounded-md" disabled={submittingAdjustment} onClick={submitAdjustment}>
                  {submittingAdjustment ? "Applying..." : `Apply ${adjustType === "FINE" ? "Fine" : "Concession"}`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
