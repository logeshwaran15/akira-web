import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, IconTile } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FormDialog } from "@/components/erp/FormDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, XCircle, ClipboardCheck, AlertTriangle, LockOpen } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/marks-verification")({
  head: () => ({
    meta: [
      { title: "Marks Verification — Akira School ERP" },
      { name: "description", content: "HOD/coordinator review and approval of locked marks before result processing." },
    ],
  }),
  component: MarksVerificationPage,
});

type ExamType = { examTypeKey: string; examTypeName: string };
type SchoolClass = { schoolClassKey: string; className: string };
type Subject = { subjectKey: string; subjectName: string };

type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";
type QueueItem = {
  examConfigKey: string;
  examTypeKey: string;
  schoolClassKey: string;
  subjectKey: string;
  status: VerificationStatus;
  remarks: string | null;
  totalCount: number;
  passCount: number;
  failCount: number;
  absentCount: number;
};

function MarksVerificationPage() {
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [examTypeFilter, setExamTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [rejectTarget, setRejectTarget] = useState<QueueItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approveTarget, setApproveTarget] = useState<QueueItem | null>(null);
  const [unlockTarget, setUnlockTarget] = useState<QueueItem | null>(null);

  const loadLookups = () => {
    Promise.all([
      apiFetch("/api/ExamType").catch(() => []),
      apiFetch("/api/SchoolClass").catch(() => []),
      apiFetch("/api/Subject").catch(() => []),
    ]).then(([et, sc, sub]) => {
      setExamTypes(et);
      setClasses(sc);
      setSubjects(sub);
      if (!examTypeFilter && et.length > 0) setExamTypeFilter(et[0].examTypeKey);
    });
  };

  const loadQueue = (examTypeId: string) => {
    setLoading(true);
    const qs = examTypeId ? `?examTypeId=${examTypeId}` : "";
    apiFetch(`/api/ExamMarkVerification/queue${qs}`)
      .then((d: QueueItem[]) => setQueue(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load verification queue"))
      .finally(() => setLoading(false));
  };

  useEffect(loadLookups, []);
  useEffect(() => loadQueue(examTypeFilter), [examTypeFilter]);

  const className = (k: string) => classes.find((c: any) => c.schoolClassKey === k)?.className ?? "—";
  const subjectName = (k: string) => subjects.find((s: any) => s.subjectKey === k)?.subjectName ?? "—";

  const visible = useMemo(
    () => queue.filter((c) => statusFilter === "all" || c.status === statusFilter),
    [queue, statusFilter],
  );

  const doApprove = async () => {
    if (!approveTarget) return;
    try {
      await apiFetch("/api/ExamMarkVerification/approve", {
        method: "POST",
        body: JSON.stringify({ examConfigKey: approveTarget.examConfigKey }),
      });
      toast.success("Marks approved — ready for result processing");
      setApproveTarget(null);
      loadQueue(examTypeFilter);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve marks");
    }
  };

  const doReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) return toast.error("Provide a reason for rejection.");
    try {
      await apiFetch("/api/ExamMarkVerification/reject", {
        method: "POST",
        body: JSON.stringify({ examConfigKey: rejectTarget.examConfigKey, remarks: rejectReason }),
      });
      toast.success("Marks rejected and sent back for correction");
      setRejectTarget(null);
      setRejectReason("");
      loadQueue(examTypeFilter);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject marks");
    }
  };

  const doUnlock = async () => {
    if (!unlockTarget) return;
    try {
      await apiFetch("/api/ExamMarkVerification/unlock", {
        method: "POST",
        body: JSON.stringify({ examConfigKey: unlockTarget.examConfigKey }),
      });
      toast.success("Marks unlocked for re-editing");
      setUnlockTarget(null);
      loadQueue(examTypeFilter);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to unlock marks");
    }
  };

  const pendingCount = queue.filter((c) => c.status === "PENDING").length;
  const approvedCount = queue.filter((c) => c.status === "APPROVED").length;
  const rejectedCount = queue.filter((c) => c.status === "REJECTED").length;

  return (
    <div>
      <PageHeader title="Marks Verification" />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
          <IconTile icon={ClipboardCheck} tone="primary" size="sm" />
          <div>
            <div className="text-xs text-muted-foreground">Submitted</div>
            <div className="font-display text-lg font-semibold">{queue.length}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
          <IconTile icon={AlertTriangle} tone="warning" size="sm" />
          <div>
            <div className="text-xs text-muted-foreground">Pending</div>
            <div className="font-display text-lg font-semibold">{pendingCount}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
          <IconTile icon={CheckCircle2} tone="success" size="sm" />
          <div>
            <div className="text-xs text-muted-foreground">Approved</div>
            <div className="font-display text-lg font-semibold">{approvedCount}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
          <IconTile icon={XCircle} tone="destructive" size="sm" />
          <div>
            <div className="text-xs text-muted-foreground">Rejected</div>
            <div className="font-display text-lg font-semibold">{rejectedCount}</div>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={examTypeFilter} onValueChange={setExamTypeFilter}>
          <SelectTrigger className="h-9 w-full rounded-md sm:w-[200px]"><SelectValue placeholder="Select exam" /></SelectTrigger>
          <SelectContent>
            {examTypes.map((e) => <SelectItem key={e.examTypeKey} value={e.examTypeKey}>{e.examTypeName}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-full rounded-md sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {loading ? "Loading..." : "No locked mark sets waiting for verification. Marks must be locked in Marks Entry first."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {visible.map((c) => (
            <div key={c.examConfigKey} className="rounded-md border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{subjectName(c.subjectKey)}</div>
                  <div className="text-xs text-muted-foreground">{className(c.schoolClassKey)}</div>
                </div>
                {c.status === "PENDING" && <Badge className="rounded-md border-0 bg-warning text-warning-foreground font-semibold">Pending</Badge>}
                {c.status === "APPROVED" && <Badge className="gap-1 rounded-md border-0 bg-success text-success-foreground font-semibold"><CheckCircle2 className="h-3 w-3" /> Approved</Badge>}
                {c.status === "REJECTED" && <Badge className="gap-1 rounded-md border-0 bg-destructive text-destructive-foreground font-semibold"><XCircle className="h-3 w-3" /> Rejected</Badge>}
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                <div className="rounded-md bg-muted/50 py-1.5">
                  <div className="font-semibold text-foreground">{c.totalCount}</div>
                  <div className="text-muted-foreground">Total</div>
                </div>
                <div className="rounded-md bg-success/10 py-1.5">
                  <div className="font-semibold text-success">{c.passCount}</div>
                  <div className="text-muted-foreground">Pass</div>
                </div>
                <div className="rounded-md bg-destructive/10 py-1.5">
                  <div className="font-semibold text-destructive">{c.failCount}</div>
                  <div className="text-muted-foreground">Fail</div>
                </div>
                <div className="rounded-md bg-muted/50 py-1.5">
                  <div className="font-semibold text-foreground">{c.absentCount}</div>
                  <div className="text-muted-foreground">Absent</div>
                </div>
              </div>

              {c.status === "REJECTED" && c.remarks && (
                <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                  <span className="font-medium">Rejection reason:</span> {c.remarks}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {c.status === "PENDING" && (
                  <>
                    <Button size="sm" variant="success" className="h-8 gap-1.5 rounded-md" onClick={() => setApproveTarget(c)}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-md border-destructive text-destructive" onClick={() => setRejectTarget(c)}>
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </>
                )}
                {c.status !== "PENDING" && (
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-md" onClick={() => setUnlockTarget(c)}>
                    <LockOpen className="h-3.5 w-3.5" /> Unlock &amp; Re-review
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!approveTarget} onOpenChange={(v) => !v && setApproveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve marks for {approveTarget && subjectName(approveTarget.subjectKey)}?</AlertDialogTitle>
            <AlertDialogDescription>Approved marks become eligible for result processing and report card generation.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); doApprove(); }}>Approve</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!unlockTarget} onOpenChange={(v) => !v && setUnlockTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock this mark set?</AlertDialogTitle>
            <AlertDialogDescription>The teacher will be able to edit marks again, and this record returns to Pending.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); doUnlock(); }}>Unlock</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FormDialog
        open={!!rejectTarget}
        onOpenChange={(v) => { if (!v) { setRejectTarget(null); setRejectReason(""); } }}
        title={`Reject marks — ${rejectTarget ? subjectName(rejectTarget.subjectKey) : ""}`}
        submitLabel="Reject & Send Back"
        onSubmit={doReject}
        size="sm"
      >
        <div className="space-y-1.5">
          <Label required>Reason for rejection</Label>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Marks for roll 12–15 look transposed, please recheck."
            className="rounded-md"
            rows={4}
            autoFocus
          />
        </div>
      </FormDialog>
    </div>
  );
}
