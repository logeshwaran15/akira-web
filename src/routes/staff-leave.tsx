import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { sanitizeRichText, isRichTextEmpty } from "@/lib/sanitize-html";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/ui/date-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FormDialog } from "@/components/erp/FormDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CalendarClock, CalendarPlus, Check, CheckCircle2, Clock, ListChecks, MoreVertical, Plus,
  User, X, XCircle,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff-leave")({
  head: () => ({
    meta: [
      { title: "Staff Leave — Akira School ERP" },
      { name: "description", content: "Apply for leave and track approvals. Leave types are configurable from Config Types." },
    ],
  }),
  component: StaffLeavePage,
});

const ADMIN_ROLE_CODES = ["ADMIN", "HR", "PRINCIPAL", "VICEPRINCIPAL"];

type LeaveTypeOption = {
  configTypeDetailKey: string;
  detailCode: string;
  detailName: string;
  detailValue: number;
};

type LeaveRequest = {
  staffLeaveRequestKey: string;
  akiraUserKey: string;
  applicantName: string | null;
  employeeId: string | null;
  departmentName: string | null;
  configTypeDetailKey: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewRemarks: string | null;
  createdOn: string;
};

const STATUS_VARIANTS: Record<string, "warning" | "success" | "destructive" | "secondary"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  CANCELLED: "secondary",
};

const STATUS_ICONS: Partial<Record<LeaveRequest["status"], typeof Check>> = {
  APPROVED: Check,
  REJECTED: X,
};

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso.slice(0, 10));
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const dateTileParts = (iso: string | null | undefined) => {
  if (!iso) return { month: "—", day: "—", year: "" };
  const d = new Date(iso.slice(0, 10));
  if (Number.isNaN(d.getTime())) return { month: "—", day: "—", year: "" };
  return {
    month: d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(),
    day: d.toLocaleDateString("en-GB", { day: "2-digit" }),
    year: String(d.getFullYear()),
  };
};

function StaffLeavePage() {
  const { user } = useCurrentUser();
  const isAdmin = !!user?.roleCode && ADMIN_ROLE_CODES.includes(user.roleCode);
  const [tab, setTab] = useState("apply");

  return (
    <div>
      <PageHeader title="Staff Leave" />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className={cn("grid w-full", isAdmin ? "grid-cols-2 sm:w-96" : "grid-cols-1 sm:w-52")}>
          <TabsTrigger value="apply" className="gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" /> Apply Leave
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="approvals" className="gap-1.5">
              <ListChecks className="h-3.5 w-3.5" /> Approvals
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="apply" className="pt-5">
          <ApplyLeaveTab />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="approvals" className="pt-5">
            <ApprovalsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Apply Leave — self-service                                             */
/* ---------------------------------------------------------------------- */

function ApplyLeaveTab() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ configTypeDetailKey: "", fromDate: "", toDate: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<LeaveRequest | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | LeaveRequest["status"]>("ALL");
  const [rangeFilter, setRangeFilter] = useState<"30" | "90" | "365" | "ALL">("30");

  const load = () => {
    setLoading(true);
    apiFetch("/api/StaffLeave/me")
      .then((d: LeaveRequest[]) => setRequests(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load your leave requests"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    apiFetch("/api/StaffLeave/leave-types")
      .then((d: LeaveTypeOption[]) => setLeaveTypes(d))
      .catch(() => {});
  }, []);

  const filteredRequests = useMemo(() => {
    const cutoff = rangeFilter === "ALL" ? null : Date.now() - Number(rangeFilter) * 86400000;
    return requests.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (cutoff !== null && new Date(r.createdOn).getTime() < cutoff) return false;
      return true;
    });
  }, [requests, statusFilter, rangeFilter]);

  const openNew = () => {
    setDraft({ configTypeDetailKey: "", fromDate: "", toDate: "", reason: "" });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.configTypeDetailKey || !draft.fromDate || !draft.toDate || isRichTextEmpty(draft.reason)) {
      toast.error("Fill in leave type, dates and reason.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/StaffLeave", {
        method: "POST",
        body: JSON.stringify({ ...draft, reason: sanitizeRichText(draft.reason) }),
      });
      toast.success("Leave request submitted");
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit leave request");
    } finally {
      setSaving(false);
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await apiFetch(`/api/StaffLeave/${cancelTarget.staffLeaveRequestKey}/cancel`, { method: "POST" });
      toast.success("Leave request cancelled");
      setCancelTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel leave request");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew}>
          <Plus className="h-4 w-4" /> Apply for Leave
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Recent Leave Requests</h2>
            <p className="text-xs text-muted-foreground">Here are your latest leave requests and their current status.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="h-9 w-[140px] rounded-md text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={rangeFilter} onValueChange={(v) => setRangeFilter(v as typeof rangeFilter)}>
              <SelectTrigger className="h-9 w-[140px] rounded-md text-xs">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                <SelectItem value="365">Last 1 Year</SelectItem>
                <SelectItem value="ALL">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {loading && (
          <>
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </>
        )}
        {!loading && filteredRequests.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
            <CalendarPlus className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No leave requests found</p>
            <p className="text-xs text-muted-foreground">
              {requests.length === 0 ? "Apply for leave using the button above." : "Try adjusting the filters above."}
            </p>
          </div>
        )}
        {!loading &&
          filteredRequests.map((r) => {
            const tile = dateTileParts(r.fromDate);
            return (
              <div key={r.staffLeaveRequestKey} className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap">
                  <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-muted/50 text-center">
                    <span className="text-[11px] font-semibold text-primary">{tile.month}</span>
                    <span className="text-xl font-bold leading-none text-foreground">{tile.day}</span>
                    <span className="text-[10px] text-muted-foreground">{tile.year}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{r.leaveTypeName}</span>
                      <Badge variant="outline" className="rounded-md font-mono text-xs">{r.totalDays}d</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {formatDate(r.fromDate)} → {formatDate(r.toDate)}
                    </div>
                    <div className="mt-2.5 rounded-lg bg-muted/40 p-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <ListChecks className="h-3.5 w-3.5" /> Reason
                      </div>
                      <div
                        className="mt-0.5 text-sm leading-snug [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
                        dangerouslySetInnerHTML={{ __html: sanitizeRichText(r.reason) }}
                      />
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <div className="flex items-center gap-1">
                      <Badge variant={STATUS_VARIANTS[r.status]} className="gap-1">
                        {STATUS_ICONS[r.status] && (() => {
                          const StatusIcon = STATUS_ICONS[r.status]!;
                          return <StatusIcon className="h-3 w-3" />;
                        })()}
                        {r.status}
                      </Badge>
                      {r.status === "PENDING" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-md">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setCancelTarget(r)}
                            >
                              <X className="mr-2 h-3.5 w-3.5" /> Cancel Request
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">Requested on {formatDate(r.createdOn)}</span>
                    {r.status !== "PENDING" && (r.reviewedByName || r.reviewRemarks) && (
                      <span className="max-w-[180px] text-right text-[11px] text-muted-foreground">
                        Reviewed by <span className="font-medium text-foreground">{r.reviewedByName ?? "—"}</span>
                        {r.reviewRemarks ? ` · ${r.reviewRemarks}` : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Apply for Leave"
        submitLabel="Submit Request"
        onSubmit={save}
        submitting={saving}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Leave Type</Label>
            <Select value={draft.configTypeDetailKey} onValueChange={(v) => setDraft({ ...draft, configTypeDetailKey: v })}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Select leave type" /></SelectTrigger>
              <SelectContent>
                {leaveTypes.map((lt) => (
                  <SelectItem key={lt.configTypeDetailKey} value={lt.configTypeDetailKey}>{lt.detailName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {leaveTypes.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No leave types configured yet — add them under Config Types (code STAFF_LEAVE_TYPE).
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label required>From Date</Label>
              <DatePicker
                value={draft.fromDate}
                max={draft.toDate || undefined}
                onChange={(v) => setDraft({ ...draft, fromDate: v })}
              />
            </div>
            <div className="space-y-1.5">
              <Label required>To Date</Label>
              <DatePicker
                value={draft.toDate}
                min={draft.fromDate || undefined}
                onChange={(v) => setDraft({ ...draft, toDate: v })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label required>Reason</Label>
            <RichTextEditor
              value={draft.reason}
              onChange={(html) => setDraft({ ...draft, reason: html })}
              placeholder="Briefly explain the reason for leave"
            />
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!cancelTarget} onOpenChange={(v) => !v && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this leave request?</AlertDialogTitle>
            <AlertDialogDescription>
              Your {cancelTarget?.leaveTypeName} request for {formatDate(cancelTarget?.fromDate)} → {formatDate(cancelTarget?.toDate)} will be withdrawn. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Back</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelling}
              onClick={(e) => { e.preventDefault(); confirmCancel(); }}
            >
              {cancelling ? "Cancelling..." : "Cancel Request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Approvals — HR / Admin / Principal                                     */
/* ---------------------------------------------------------------------- */

function ApprovalsTab() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    apiFetch("/api/StaffLeave/pending")
      .then((d: LeaveRequest[]) => setRequests(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load pending requests"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const review = async (r: LeaveRequest, status: "APPROVED" | "REJECTED") => {
    setReviewing(r.staffLeaveRequestKey);
    try {
      await apiFetch(`/api/StaffLeave/${r.staffLeaveRequestKey}/review`, {
        method: "POST",
        body: JSON.stringify({ status, reviewRemarks: reviewNote[r.staffLeaveRequestKey] || null }),
      });
      toast.success(status === "APPROVED" ? "Leave approved — attendance updated" : "Leave rejected");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to review leave request");
    } finally {
      setReviewing(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="mb-2 flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 sm:max-w-xs">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/20 text-[oklch(0.45_0.12_65)]">
          <Clock className="h-4.5 w-4.5" />
        </div>
        <div>
          <div className="text-lg font-semibold leading-none">{requests.length}</div>
          <div className="text-xs text-muted-foreground">Pending Approval</div>
        </div>
      </div>

      {loading && (
        <>
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </>
      )}
      {!loading && requests.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
          <CheckCircle2 className="h-8 w-8 text-success" />
          <p className="text-sm font-medium">No pending leave requests</p>
          <p className="text-xs text-muted-foreground">All leave requests have been reviewed.</p>
        </div>
      )}
      {!loading &&
        requests.map((r) => (
          <div key={r.staffLeaveRequestKey} className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <User className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{r.applicantName ?? "Unknown"}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.employeeId ?? "—"}{r.departmentName ? ` · ${r.departmentName}` : ""}
                  </div>
                </div>
              </div>
              <Badge variant={STATUS_VARIANTS[r.status]} className="gap-1">
                {STATUS_ICONS[r.status] && (() => {
                  const StatusIcon = STATUS_ICONS[r.status]!;
                  return <StatusIcon className="h-3 w-3" />;
                })()}
                {r.status}
              </Badge>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
              <span className="flex items-center gap-1.5 font-medium">
                <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" /> {r.leaveTypeName}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(r.fromDate)} → {formatDate(r.toDate)} ({r.totalDays}d)
              </span>
            </div>

            <div className="mt-2.5 rounded-lg bg-muted/40 p-2.5">
              <div className="text-xs font-medium text-muted-foreground">Reason</div>
              <div
                className="mt-0.5 text-sm leading-snug [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(r.reason) }}
              />
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                placeholder="Add review note (optional)"
                className="h-8 flex-1 rounded-md"
                value={reviewNote[r.staffLeaveRequestKey] ?? ""}
                onChange={(e) => setReviewNote({ ...reviewNote, [r.staffLeaveRequestKey]: e.target.value })}
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 rounded-md border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  disabled={reviewing === r.staffLeaveRequestKey}
                  onClick={() => review(r, "REJECTED")}
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </Button>
                <Button
                  size="sm"
                  className="h-8 gap-1.5 rounded-md bg-success text-success-foreground hover:bg-success/90"
                  disabled={reviewing === r.staffLeaveRequestKey}
                  onClick={() => review(r, "APPROVED")}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                </Button>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
