import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CalendarClock, CheckCircle2, FileWarning, Plus, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/attendance-requests")({
  head: () => ({
    meta: [
      { title: "Attendance Requests — Akira School ERP" },
      { name: "description", content: "Review leave requests and attendance correction requests." },
    ],
  }),
  component: AttendanceRequestsPage,
});

type LeaveType = { leaveTypeKey: string; leaveTypeName: string };
type StudentOption = { studentKey: string; studentName: string; admissionNumber: string };

type LeaveRequest = {
  studentLeaveRequestKey: string;
  studentKey: string;
  admissionNumber: string;
  studentName: string;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  reason: string;
  requestedByName: string | null;
  requestedByMobile: string | null;
  status: string;
  reviewedAt: string | null;
  reviewRemarks: string | null;
};

type CorrectionRequest = {
  attendanceCorrectionRequestKey: string;
  studentKey: string;
  admissionNumber: string;
  studentName: string;
  attendanceDate: string;
  originalStatus: string | null;
  requestedStatus: string;
  reason: string;
  requestedAt: string;
  status: string;
  reviewRemarks: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  APPROVED: "bg-success/15 text-success",
  REJECTED: "bg-destructive/15 text-destructive",
};

function AttendanceRequestsPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [corrections, setCorrections] = useState<CorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);

  const [newLeaveOpen, setNewLeaveOpen] = useState(false);
  const [leaveDraft, setLeaveDraft] = useState({
    studentKey: "",
    leaveTypeKey: "",
    fromDate: "",
    toDate: "",
    reason: "",
    requestedByName: "",
    requestedByMobile: "",
  });
  const [leaveSaving, setLeaveSaving] = useState(false);

  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/StudentAttendance/leave-requests?status=PENDING"),
      apiFetch("/api/StudentAttendance/corrections?status=PENDING"),
    ])
      .then(([lr, cr]: [LeaveRequest[], CorrectionRequest[]]) => {
        setLeaveRequests(lr);
        setCorrections(cr);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load requests"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    apiFetch("/api/AttendancePolicy/leave-types")
      .then((l: LeaveType[]) => setLeaveTypes(l))
      .catch(() => {});
    apiFetch("/api/Student?status=ENROLLED")
      .then((s: StudentOption[]) => setStudents(s))
      .catch(() => {});
  }, []);

  const openNewLeave = () => {
    setLeaveDraft({
      studentKey: "",
      leaveTypeKey: "",
      fromDate: "",
      toDate: "",
      reason: "",
      requestedByName: "",
      requestedByMobile: "",
    });
    setNewLeaveOpen(true);
  };

  const saveLeaveRequest = async () => {
    if (
      !leaveDraft.studentKey ||
      !leaveDraft.leaveTypeKey ||
      !leaveDraft.fromDate ||
      !leaveDraft.toDate ||
      !leaveDraft.reason.trim()
    ) {
      toast.error("Fill in student, leave type, dates and reason.");
      return;
    }
    setLeaveSaving(true);
    try {
      await apiFetch("/api/StudentAttendance/leave-requests", {
        method: "POST",
        body: JSON.stringify(leaveDraft),
      });
      toast.success("Leave request filed");
      setNewLeaveOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to file leave request");
    } finally {
      setLeaveSaving(false);
    }
  };

  const reviewLeave = async (r: LeaveRequest, status: "APPROVED" | "REJECTED") => {
    setReviewing(r.studentLeaveRequestKey);
    try {
      await apiFetch(`/api/StudentAttendance/leave-requests/${r.studentLeaveRequestKey}/review`, {
        method: "POST",
        body: JSON.stringify({
          status,
          reviewRemarks: reviewNote[r.studentLeaveRequestKey] || null,
        }),
      });
      toast.success(
        status === "APPROVED"
          ? "Leave approved — attendance updated for the date range"
          : "Leave rejected",
      );
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to review leave request");
    } finally {
      setReviewing(null);
    }
  };

  const reviewCorrection = async (r: CorrectionRequest, status: "APPROVED" | "REJECTED") => {
    setReviewing(r.attendanceCorrectionRequestKey);
    try {
      await apiFetch(
        `/api/StudentAttendance/corrections/${r.attendanceCorrectionRequestKey}/review`,
        {
          method: "POST",
          body: JSON.stringify({
            status,
            reviewRemarks: reviewNote[r.attendanceCorrectionRequestKey] || null,
          }),
        },
      );
      toast.success(
        status === "APPROVED"
          ? "Correction approved — attendance record updated"
          : "Correction rejected",
      );
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to review correction request");
    } finally {
      setReviewing(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Attendance Requests"
        breadcrumbs={[{ label: "Attendance" }, { label: "Requests" }]}
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNewLeave}>
            <Plus className="h-4 w-4" /> New Leave Request
          </Button>
        }
      />

      <Tabs defaultValue="leave" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-96">
          <TabsTrigger value="leave" className="gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" /> Leave Requests ({leaveRequests.length})
          </TabsTrigger>
          <TabsTrigger value="corrections" className="gap-1.5">
            <FileWarning className="h-3.5 w-3.5" /> Corrections ({corrections.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leave" className="space-y-2 pt-4">
          {!loading && leaveRequests.length === 0 && (
            <p className="text-sm text-muted-foreground">No pending leave requests.</p>
          )}
          {leaveRequests.map((r) => (
            <div key={r.studentLeaveRequestKey} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">
                    {r.studentName}{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      ({r.admissionNumber})
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {r.leaveTypeName} · {r.fromDate?.slice(0, 10)} to {r.toDate?.slice(0, 10)}
                    {r.requestedByName
                      ? ` · Requested by ${r.requestedByName}${r.requestedByMobile ? ` (${r.requestedByMobile})` : ""}`
                      : ""}
                  </div>
                  <div className="mt-1 text-sm">{r.reason}</div>
                </div>
                <Badge
                  className={cn(
                    "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                    STATUS_STYLES[r.status],
                  )}
                >
                  {r.status}
                </Badge>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  placeholder="Review remarks (optional)"
                  className="h-8 flex-1 rounded-md"
                  value={reviewNote[r.studentLeaveRequestKey] ?? ""}
                  onChange={(e) =>
                    setReviewNote({ ...reviewNote, [r.studentLeaveRequestKey]: e.target.value })
                  }
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 rounded-md border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  disabled={reviewing === r.studentLeaveRequestKey}
                  onClick={() => reviewLeave(r, "REJECTED")}
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </Button>
                <Button
                  size="sm"
                  className="h-8 gap-1.5 rounded-md"
                  disabled={reviewing === r.studentLeaveRequestKey}
                  onClick={() => reviewLeave(r, "APPROVED")}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="corrections" className="space-y-2 pt-4">
          {!loading && corrections.length === 0 && (
            <p className="text-sm text-muted-foreground">No pending correction requests.</p>
          )}
          {corrections.map((r) => (
            <div
              key={r.attendanceCorrectionRequestKey}
              className="rounded-lg border border-border p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">
                    {r.studentName}{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      ({r.admissionNumber})
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {r.attendanceDate?.slice(0, 10)} ·{" "}
                    {r.originalStatus ? r.originalStatus.replace(/_/g, " ") : "Unmarked"} →{" "}
                    <span className="font-medium text-foreground">
                      {r.requestedStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="mt-1 text-sm">{r.reason}</div>
                </div>
                <Badge
                  className={cn(
                    "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                    STATUS_STYLES[r.status],
                  )}
                >
                  {r.status}
                </Badge>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  placeholder="Review remarks (optional)"
                  className="h-8 flex-1 rounded-md"
                  value={reviewNote[r.attendanceCorrectionRequestKey] ?? ""}
                  onChange={(e) =>
                    setReviewNote({
                      ...reviewNote,
                      [r.attendanceCorrectionRequestKey]: e.target.value,
                    })
                  }
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 rounded-md border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  disabled={reviewing === r.attendanceCorrectionRequestKey}
                  onClick={() => reviewCorrection(r, "REJECTED")}
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </Button>
                <Button
                  size="sm"
                  className="h-8 gap-1.5 rounded-md"
                  disabled={reviewing === r.attendanceCorrectionRequestKey}
                  onClick={() => reviewCorrection(r, "APPROVED")}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={newLeaveOpen} onOpenChange={setNewLeaveOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Leave Request</DialogTitle>
            <DialogDescription>
              No parent portal exists yet, so requests filed here on a family's behalf are recorded
              with the requester's name and mobile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label required>Student</Label>
              <Select
                value={leaveDraft.studentKey}
                onValueChange={(v) => setLeaveDraft({ ...leaveDraft, studentKey: v })}
              >
                <SelectTrigger className="rounded-md">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.studentKey} value={s.studentKey}>
                      {s.studentName} ({s.admissionNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label required>Leave Type</Label>
              <Select
                value={leaveDraft.leaveTypeKey}
                onValueChange={(v) => setLeaveDraft({ ...leaveDraft, leaveTypeKey: v })}
              >
                <SelectTrigger className="rounded-md">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((lt) => (
                    <SelectItem key={lt.leaveTypeKey} value={lt.leaveTypeKey}>
                      {lt.leaveTypeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label required>From Date</Label>
                <Input
                  type="date"
                  className="rounded-md"
                  value={leaveDraft.fromDate}
                  onChange={(e) => setLeaveDraft({ ...leaveDraft, fromDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label required>To Date</Label>
                <Input
                  type="date"
                  className="rounded-md"
                  value={leaveDraft.toDate}
                  onChange={(e) => setLeaveDraft({ ...leaveDraft, toDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label required>Reason</Label>
              <Input
                className="rounded-md"
                value={leaveDraft.reason}
                onChange={(e) => setLeaveDraft({ ...leaveDraft, reason: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Requested By (Guardian)</Label>
                <Input
                  className="rounded-md"
                  value={leaveDraft.requestedByName}
                  onChange={(e) =>
                    setLeaveDraft({ ...leaveDraft, requestedByName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Guardian Mobile</Label>
                <Input
                  className="rounded-md"
                  value={leaveDraft.requestedByMobile}
                  onChange={(e) =>
                    setLeaveDraft({ ...leaveDraft, requestedByMobile: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-md"
              onClick={() => setNewLeaveOpen(false)}
              disabled={leaveSaving}
            >
              Cancel
            </Button>
            <Button className="rounded-md" onClick={saveLeaveRequest} disabled={leaveSaving}>
              {leaveSaving ? "Filing..." : "File Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
