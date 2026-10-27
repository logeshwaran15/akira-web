import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { FormDialog } from "@/components/erp/FormDialog";
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  UserPlus, Trash2, PercentCircle, Users, Wallet, CheckCircle2, AlertTriangle,
  Tag, MoreVertical, Eye, Pencil, History, Printer, ReceiptText, X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/student-fee-assignment")({
  head: () => ({
    meta: [
      { title: "Student Fee Assignment — Akira School ERP" },
      { name: "description", content: "Assign fee structures to enrolled students, with per-student scholarships and discounts." },
    ],
  }),
  component: StudentFeeAssignmentPage,
});

// ---------- Types ----------

type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type SchoolClass = { schoolClassKey: string; classCatalogKey: string; classCode: string; className: string };
type FeeStructure = { feeStructureKey: string; academicYearKey: string; classCatalogKey: string; structureName: string; totalAmount: number; isActive: boolean };

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

type DiscountDraft = { type: "" | "PERCENTAGE" | "FLAT"; value: string; reason: string };

const currency = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });


// Dark, saturated pill with a soft top-light shine highlight.
const STATUS_SHINE = "text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)]";
const STATUS_STYLES: Record<Assignment["status"], string> = {
  ACTIVE: cn("bg-emerald-600 dark:bg-emerald-500", STATUS_SHINE),
  WAIVED: cn("bg-sky-600 dark:bg-sky-500", STATUS_SHINE),
  CANCELLED: cn("bg-slate-600 dark:bg-slate-500", STATUS_SHINE),
};

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "ACTIVE", label: "Active" },
  { value: "WAIVED", label: "Waived" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "PAID", label: "Fully Paid" },
  { value: "OUTSTANDING", label: "Outstanding" },
] as const;

function StudentFeeAssignmentPage() {
  const navigate = useNavigate();

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [outstandingOnly, setOutstandingOnly] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);
  const [editTarget, setEditTarget] = useState<Assignment | null>(null);
  const [editDraft, setEditDraft] = useState<DiscountDraft & { status: Assignment["status"] }>({ type: "", value: "", reason: "", status: "ACTIVE" });
  const [savingEdit, setSavingEdit] = useState(false);

  const goToDetails = (a: Assignment) => {
    navigate({ to: "/student-fee-details", search: { studentFeeAssignmentKey: a.studentFeeAssignmentKey } });
  };

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/AcademicYear"),
      apiFetch("/api/SchoolClass"),
      apiFetch("/api/FeeStructure"),
      apiFetch("/api/StudentFeeAssignment"),
    ])
      .then(([y, c, fs, a]) => { setYears(y ?? []); setClasses(c ?? []); setStructures(fs ?? []); setAssignments(a ?? []); })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load fee assignments"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // ---------- Edit / Delete ----------

  const openEdit = (a: Assignment) => {
    setEditTarget(a);
    setEditDraft({ type: (a.discountType as any) ?? "", value: a.discountValue != null ? String(a.discountValue) : "", reason: a.discountReason ?? "", status: a.status });
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    setSavingEdit(true);
    try {
      await apiFetch(`/api/StudentFeeAssignment/${editTarget.studentFeeAssignmentKey}`, {
        method: "PUT",
        body: JSON.stringify({
          studentFeeAssignmentKey: editTarget.studentFeeAssignmentKey,
          discountType: editDraft.type || null,
          discountValue: editDraft.type ? Number(editDraft.value) || 0 : null,
          discountReason: editDraft.type ? editDraft.reason || null : null,
          status: editDraft.status,
        }),
      });
      toast.success("Fee assignment updated");
      setEditTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update fee assignment");
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/StudentFeeAssignment/${deleteTarget.studentFeeAssignmentKey}`, { method: "DELETE" });
      toast.success("Fee assignment removed");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove fee assignment");
    }
  };

  // ---------- Summary + filters (derived only, no new API calls) ----------

  const classFiltered = classFilter ? assignments.filter((a) => a.schoolClassKey === classFilter) : assignments;

  const filteredAssignments = classFiltered.filter((a) => {
    if (outstandingOnly && a.balance <= 0) return false;
    if (statusFilter === "all") return true;
    if (statusFilter === "PAID") return a.balance <= 0;
    if (statusFilter === "OUTSTANDING") return a.balance > 0;
    return a.status === statusFilter;
  });

  const totalAssignments = classFiltered.length;
  const totalPayable = classFiltered.reduce((sum, a) => sum + a.netPayable, 0);
  const totalPaid = classFiltered.reduce((sum, a) => sum + a.totalPaid, 0);
  const totalOutstanding = classFiltered.reduce((sum, a) => sum + a.balance, 0);
  const paidPct = totalPayable > 0 ? Math.round((totalPaid / totalPayable) * 100) : 0;
  const outstandingPct = totalPayable > 0 ? Math.round((totalOutstanding / totalPayable) * 100) : 0;

  const hasActiveFilters = !!classFilter || statusFilter !== "all" || outstandingOnly;
  const clearFilters = () => {
    setClassFilter("");
    setStatusFilter("all");
    setOutstandingOnly(false);
  };

  const columns: Column<Assignment>[] = [
    {
      key: "studentName", header: "Student", sortable: true,
      accessor: (r) => (
        <div className="flex items-center gap-2.5">
          <StudentAvatar photoUrl={r.photoUrl} gender={r.gender} studentName={r.studentName} className="h-9 w-9 border border-border" />
          <div className="min-w-0">
            <div className="truncate font-medium">{r.studentName}</div>
            <div className="text-xs text-muted-foreground">{r.admissionNumber} &middot; {r.className}{r.sectionLabel ? ` ${r.sectionLabel}` : ""}</div>
          </div>
        </div>
      ),
    },
    {
      key: "structureName", header: "Fee Structure",
      accessor: (r) => (
        <div>
          <div className="text-sm">{r.structureName}</div>
          {r.discountType && (
            <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-[oklch(0.5_0.19_300)] dark:text-[oklch(0.78_0.15_300)]">
              {r.discountType === "PERCENTAGE" ? <PercentCircle className="h-3 w-3" /> : <Tag className="h-3 w-3" />}
              {r.discountType === "PERCENTAGE" ? `${r.discountValue}% off` : `${currency(r.discountValue ?? 0)} off`}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "netPayable", header: "Amount", sortable: true,
      sortValue: (r) => r.netPayable,
      accessor: (r) => (
        <div>
          <div className="font-semibold">{currency(r.netPayable)}</div>
          <div className="text-[11px] text-muted-foreground">Net Payable</div>
        </div>
      ),
    },
    {
      key: "totalPaid", header: "Paid", sortable: true,
      sortValue: (r) => r.totalPaid,
      accessor: (r) => {
        const pct = r.netPayable > 0 ? Math.min(100, Math.round((r.totalPaid / r.netPayable) * 100)) : 0;
        return (
          <div className="min-w-[92px]">
            <div className="font-medium text-success">{currency(r.totalPaid)}</div>
            {r.netPayable > 0 && (
              <div className="mt-1 flex items-center gap-1.5">
                <Progress value={pct} className="h-1.5 w-14 bg-success/15 [&>div]:bg-success" />
                <span className="text-[10px] text-muted-foreground">{pct}%</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "balance", header: "Balance", sortable: true,
      sortValue: (r) => r.balance,
      accessor: (r) =>
        r.balance > 0 ? (
          <div>
            <div className="font-semibold text-destructive">{currency(r.balance)}</div>
            <div className="text-[11px] text-muted-foreground">Outstanding</div>
          </div>
        ) : (
          <div>
            <div className="font-semibold text-success">{currency(0)}</div>
            <div className="text-[11px] text-muted-foreground">Paid in Full</div>
          </div>
        ),
    },
    {
      key: "status", header: "Status",
      accessor: (r) => <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLES[r.status])}>{r.status}</span>,
    },
    {
      key: "actions", header: "",
      className: "text-right",
      accessor: (r) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => goToDetails(r)}>
                <Eye className="h-4 w-4" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEdit(r)}>
                <Pencil className="h-4 w-4" /> Edit Assignment
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => goToDetails(r)}>
                <History className="h-4 w-4" /> View Payment History
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print Statement
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                disabled={r.totalPaid > 0}
                onClick={() => setDeleteTarget(r)}
                title={r.totalPaid > 0 ? "Cannot remove: payments already recorded against this assignment" : undefined}
              >
                <Trash2 className="h-4 w-4" /> Remove Assignment
              </DropdownMenuItem>
              {r.totalPaid > 0 && (
                <p className="px-2 pb-1 pt-0.5 text-[11px] leading-snug text-muted-foreground">
                  Locked — payments already recorded against this assignment.
                </p>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Student Fee Assignment"
        actions={
          <Link to="/student-fee-assignment-add">
            <Button className="h-10 gap-1.5 rounded-md shadow-sm">
              <UserPlus className="h-4 w-4" /> Assign Fee Structure
            </Button>
          </Link>
        }
      />
      <p className="-mt-4 mb-5 text-sm text-muted-foreground">
        Assign and manage student-wise fee structures, discounts and outstanding balances.
      </p>

      {/* ---------- Summary cards ---------- */}
      {loading ? (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="relative flex min-h-[88px] flex-col justify-center overflow-hidden rounded-lg border border-orange-500/15 bg-gradient-to-br from-orange-500/10 to-orange-500/[0.03] p-3">
            <Users className="pointer-events-none absolute -bottom-2 -right-2 h-12 w-12 text-orange-500/15" />
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-orange-500/15 text-orange-600 dark:text-orange-400">
                <Users className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400">Total Assignments</span>
            </div>
            <div className="mt-1 font-display text-3xl font-extrabold leading-none tabular-nums text-orange-700 dark:text-orange-400">{totalAssignments.toLocaleString("en-IN")}</div>
            <div className="mt-1 truncate text-[11px] text-muted-foreground">Students with assigned fees</div>
          </div>
          <div className="relative flex min-h-[88px] flex-col justify-center overflow-hidden rounded-lg border border-sky-500/15 bg-gradient-to-br from-sky-500/10 to-sky-500/[0.03] p-3">
            <Wallet className="pointer-events-none absolute -bottom-2 -right-2 h-12 w-12 text-sky-500/15" />
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400">
                <Wallet className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-bold text-sky-600 dark:text-sky-400">Total Payable</span>
            </div>
            <div className="mt-1 font-display text-3xl font-extrabold leading-none tabular-nums text-sky-700 dark:text-sky-400">{currency(totalPayable)}</div>
            <div className="mt-1 truncate text-[11px] text-muted-foreground">Net across all assignments</div>
          </div>
          <div className="relative flex min-h-[88px] flex-col justify-center overflow-hidden rounded-lg border border-success/15 bg-gradient-to-br from-success/10 to-success/[0.03] p-3">
            <CheckCircle2 className="pointer-events-none absolute -bottom-2 -right-2 h-12 w-12 text-success/15" />
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-success/15 text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-bold text-success">Total Paid</span>
            </div>
            <div className="mt-1 font-display text-3xl font-extrabold leading-none tabular-nums text-success">{currency(totalPaid)}</div>
            <div className="mt-1 truncate text-[11px] text-muted-foreground">{paidPct}% collected</div>
          </div>
          <div className="relative flex min-h-[88px] flex-col justify-center overflow-hidden rounded-lg border border-destructive/15 bg-gradient-to-br from-destructive/10 to-destructive/[0.03] p-3">
            <AlertTriangle className="pointer-events-none absolute -bottom-2 -right-2 h-12 w-12 text-destructive/15" />
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-destructive/15 text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-bold text-destructive">Outstanding</span>
            </div>
            <div className="mt-1 font-display text-3xl font-extrabold leading-none tabular-nums text-destructive">{currency(totalOutstanding)}</div>
            <div className="mt-1 truncate text-[11px] text-muted-foreground">{outstandingPct}% pending</div>
          </div>
        </div>
      )}

      {/* ---------- Filter toolbar ---------- */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select value={classFilter || "all"} onValueChange={(v) => setClassFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="h-9 w-full rounded-md sm:w-[170px]"><SelectValue placeholder="All Classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map((c) => <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>{c.className}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-full rounded-md sm:w-[160px]"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm">
          <Checkbox checked={outstandingOnly} onCheckedChange={(v) => setOutstandingOnly(!!v)} />
          Outstanding Only
        </label>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-9 gap-1 rounded-md text-muted-foreground" onClick={clearFilters}>
            <X className="h-3.5 w-3.5" /> Clear Filters
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2 rounded-md border border-border bg-card p-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : assignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-card px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ReceiptText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="font-display text-base font-semibold">No Fee Assignments</div>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              No students have been assigned a fee structure for this academic year.
            </p>
          </div>
          <Link to="/student-fee-assignment-add">
            <Button className="mt-1 gap-1.5 rounded-md">
              <UserPlus className="h-4 w-4" /> Assign Fee Structure
            </Button>
          </Link>
        </div>
      ) : (
        <DataTable
          data={filteredAssignments}
          columns={columns}
          rowKey={(r) => r.studentFeeAssignmentKey}
          selectable
          storageKey="student-fee-assignments"
          searchPlaceholder="Search student, admission no..."
          searchFields={(r) => `${r.studentName} ${r.admissionNumber} ${r.structureName}`}
          emptyMessage="No assignments match the current filters."
        />
      )}

      {/* ---------- Edit assignment ---------- */}
      <FormDialog
        open={!!editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
        title={`Edit Fee Assignment — ${editTarget?.studentName ?? ""}`}
        description="Adjust this student's discount or status. Amounts already paid are preserved."
        submitLabel={savingEdit ? "Saving..." : "Save Changes"}
        onSubmit={saveEdit}
        submitting={savingEdit}
        size="sm"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Discount Type</Label>
              <Select value={editDraft.type || "none"} onValueChange={(v) => setEditDraft({ ...editDraft, type: v === "none" ? "" : (v as any) })}>
                <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No discount</SelectItem>
                  <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                  <SelectItem value="FLAT">Flat amount (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Value</Label>
              <Input
                type="number"
                min="0"
                value={editDraft.value}
                onChange={(e) => setEditDraft({ ...editDraft, value: e.target.value })}
                disabled={!editDraft.type}
                className="rounded-md"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input
              value={editDraft.reason}
              onChange={(e) => setEditDraft({ ...editDraft, reason: e.target.value })}
              disabled={!editDraft.type}
              placeholder="e.g. Merit scholarship"
              className="rounded-md"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={editDraft.status} onValueChange={(v) => setEditDraft({ ...editDraft, status: v as Assignment["status"] })}>
              <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="WAIVED">Waived</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove fee assignment for "{deleteTarget?.studentName}"?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone. Blocked if any payment has already been recorded.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); confirmDelete(); }}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
