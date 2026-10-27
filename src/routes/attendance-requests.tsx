import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  ArrowRight,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  FileWarning,
  Plus,
  XCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/attendance-requests")({
  head: () => ({
    meta: [
      { title: "Attendance Requests — Akira School ERP" },
      { name: "description", content: "Raise and review attendance correction requests." },
    ],
  }),
  component: AttendanceRequestsPage,
});

type StudentOption = { studentKey: string; studentName: string; admissionNumber: string };

type AttendanceHistoryRow = { attendanceDate: string; status: string };

type StatusOption = {
  configTypeDetailKey: string;
  detailCode: string;
  detailName: string;
  sortOrder: number;
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
  reviewedAt: string | null;
  reviewRemarks: string | null;
  reviewedByName: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-warning/15 text-[oklch(0.45_0.12_65)]",
  APPROVED: "bg-success/15 text-success",
  REJECTED: "bg-destructive/15 text-destructive",
};

const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso.slice(0, 10));
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const parseIsoDate = (iso: string) => {
  if (!iso) return undefined;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const toIsoDate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function StudentIdentity({ name, admissionNumber }: { name: string; admissionNumber: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
        {initialsOf(name)}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{name}</div>
        <div className="font-mono text-xs text-muted-foreground">{admissionNumber}</div>
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success">
        <CheckCircle2 className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="mt-4 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-2/3" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

function AttendanceRequestsPage() {
  const [corrections, setCorrections] = useState<CorrectionRequest[]>([]);
  const [approved, setApproved] = useState<CorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingApproved, setLoadingApproved] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "approved">("pending");

  const [students, setStudents] = useState<StudentOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);

  const [newCorrectionOpen, setNewCorrectionOpen] = useState(false);
  const [correctionDraft, setCorrectionDraft] = useState({
    studentKey: "",
    attendanceDate: "",
    requestedStatus: "",
    reason: "",
  });
  const [originalStatus, setOriginalStatus] = useState<string | null | undefined>(undefined);
  const [loadingOriginalStatus, setLoadingOriginalStatus] = useState(false);
  const [correctionSaving, setCorrectionSaving] = useState(false);
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewConfirm, setReviewConfirm] = useState<{ request: CorrectionRequest; status: "APPROVED" | "REJECTED" } | null>(null);
  const [raiseConfirmOpen, setRaiseConfirmOpen] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch("/api/StudentAttendance/corrections?status=PENDING")
      .then((cr: CorrectionRequest[]) => setCorrections(cr))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load requests"))
      .finally(() => setLoading(false));

    setLoadingApproved(true);
    apiFetch("/api/StudentAttendance/corrections?status=APPROVED")
      .then((cr: CorrectionRequest[]) => setApproved(cr))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load approved requests"))
      .finally(() => setLoadingApproved(false));
  };

  useEffect(load, []);

  useEffect(() => {
    apiFetch("/api/Student?status=ENROLLED")
      .then((s: StudentOption[]) => setStudents(s))
      .catch(() => {});
    apiFetch("/api/StudentAttendance/status-options")
      .then((o: StatusOption[]) => setStatusOptions(o))
      .catch(() => {});
  }, []);

  // Look up how the student is currently marked on the picked date, so the
  // requester can see what they're actually correcting.
  useEffect(() => {
    if (!correctionDraft.studentKey || !correctionDraft.attendanceDate) {
      setOriginalStatus(undefined);
      return;
    }
    setLoadingOriginalStatus(true);
    apiFetch(
      `/api/StudentAttendance/student/${correctionDraft.studentKey}?fromDate=${correctionDraft.attendanceDate}&toDate=${correctionDraft.attendanceDate}`,
    )
      .then((rows: AttendanceHistoryRow[]) => {
        const match = rows.find((r) => r.attendanceDate.slice(0, 10) === correctionDraft.attendanceDate);
        setOriginalStatus(match?.status ?? null);
      })
      .catch(() => setOriginalStatus(null))
      .finally(() => setLoadingOriginalStatus(false));
  }, [correctionDraft.studentKey, correctionDraft.attendanceDate]);

  const openNewCorrection = () => {
    setCorrectionDraft({ studentKey: "", attendanceDate: "", requestedStatus: "", reason: "" });
    setOriginalStatus(undefined);
    setNewCorrectionOpen(true);
  };

  const requestRaiseConfirm = () => {
    if (
      !correctionDraft.studentKey ||
      !correctionDraft.attendanceDate ||
      !correctionDraft.requestedStatus ||
      !correctionDraft.reason.trim()
    ) {
      toast.error("Select the student, date, corrected status and give a reason.");
      return;
    }
    setRaiseConfirmOpen(true);
  };

  const saveCorrectionRequest = async () => {
    setCorrectionSaving(true);
    try {
      await apiFetch("/api/StudentAttendance/corrections", {
        method: "POST",
        body: JSON.stringify(correctionDraft),
      });
      toast.success("Correction request filed — awaiting review");
      setRaiseConfirmOpen(false);
      setNewCorrectionOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to file correction request");
    } finally {
      setCorrectionSaving(false);
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
      setReviewConfirm(null);
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
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNewCorrection}>
            <Plus className="h-4 w-4" /> New Correction Request
          </Button>
        }
      />
      <p className="-mt-4 mb-5 text-sm text-muted-foreground">
        Raise and review attendance correction requests for students wrongly marked present/absent.
      </p>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/20 text-[oklch(0.45_0.12_65)]">
            <FileWarning className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-lg font-semibold leading-none">{corrections.length}</div>
            <div className="text-xs text-muted-foreground">Pending Corrections</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/10 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/20 text-success">
            <CheckCircle2 className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-lg font-semibold leading-none">{approved.length}</div>
            <div className="text-xs text-muted-foreground">Approved</div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pending" | "approved")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-96">
          <TabsTrigger value="pending" className="gap-1.5">
            <FileWarning className="h-3.5 w-3.5" /> Pending {corrections.length}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Approved {approved.length}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 pt-4">
          {loading && (
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          )}
          {!loading && corrections.length === 0 && (
            <EmptyState
              title="No pending correction requests"
              description="All attendance corrections have been reviewed."
            />
          )}
          {!loading &&
            corrections.map((r) => (
              <div
                key={r.attendanceCorrectionRequestKey}
                className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <StudentIdentity name={r.studentName} admissionNumber={r.admissionNumber} />
                  <Badge
                    className={cn(
                      "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                      STATUS_STYLES[r.status],
                    )}
                  >
                    {r.status}
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <FileWarning className="h-3.5 w-3.5" /> Attendance Correction
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(r.attendanceDate)}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium">
                  <Badge
                    className={cn(
                      "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                      r.originalStatus
                        ? STATUS_STYLES[r.originalStatus] ?? "bg-muted text-muted-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {r.originalStatus ? r.originalStatus.replace(/_/g, " ") : "Unmarked"}
                  </Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <Badge className="rounded-md border-0 bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                    {r.requestedStatus.replace(/_/g, " ")}
                  </Badge>
                </div>

                <div className="mt-2.5 rounded-lg bg-muted/40 p-2.5">
                  <div className="text-xs font-medium text-muted-foreground">Reason</div>
                  <p className="mt-0.5 text-sm leading-snug">{r.reason}</p>
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    placeholder="Add review note (optional)"
                    className="h-8 flex-1 rounded-md"
                    value={reviewNote[r.attendanceCorrectionRequestKey] ?? ""}
                    onChange={(e) =>
                      setReviewNote({
                        ...reviewNote,
                        [r.attendanceCorrectionRequestKey]: e.target.value,
                      })
                    }
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 rounded-md border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      disabled={reviewing === r.attendanceCorrectionRequestKey}
                      onClick={() => setReviewConfirm({ request: r, status: "REJECTED" })}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 rounded-md bg-success text-success-foreground hover:bg-success/90"
                      disabled={reviewing === r.attendanceCorrectionRequestKey}
                      onClick={() => setReviewConfirm({ request: r, status: "APPROVED" })}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
        </TabsContent>

        <TabsContent value="approved" className="space-y-3 pt-4">
          {loadingApproved && (
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          )}
          {!loadingApproved && approved.length === 0 && (
            <EmptyState
              title="No approved corrections yet"
              description="Approved attendance corrections will show up here."
            />
          )}
          {!loadingApproved &&
            approved.map((r) => (
              <div
                key={r.attendanceCorrectionRequestKey}
                className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <StudentIdentity name={r.studentName} admissionNumber={r.admissionNumber} />
                  <Badge
                    className={cn(
                      "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                      STATUS_STYLES[r.status],
                    )}
                  >
                    {r.status}
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <FileWarning className="h-3.5 w-3.5" /> Attendance Correction
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(r.attendanceDate)}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium">
                  <Badge
                    className={cn(
                      "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                      r.originalStatus
                        ? STATUS_STYLES[r.originalStatus] ?? "bg-muted text-muted-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {r.originalStatus ? r.originalStatus.replace(/_/g, " ") : "Unmarked"}
                  </Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <Badge className="rounded-md border-0 bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                    {r.requestedStatus.replace(/_/g, " ")}
                  </Badge>
                </div>

                <div className="mt-2.5 rounded-lg bg-muted/40 p-2.5">
                  <div className="text-xs font-medium text-muted-foreground">Reason</div>
                  <p className="mt-0.5 text-sm leading-snug">{r.reason}</p>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  Approved by{" "}
                  <span className="font-medium text-foreground">
                    {r.reviewedByName || "—"}
                  </span>
                  {r.reviewedAt ? ` on ${formatDate(r.reviewedAt)}` : ""}
                  {r.reviewRemarks ? ` · "${r.reviewRemarks}"` : ""}
                </div>
              </div>
            ))}
        </TabsContent>
      </Tabs>

      <Dialog open={newCorrectionOpen} onOpenChange={setNewCorrectionOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Correction Request</DialogTitle>
            <DialogDescription>
              Select the student and date, then choose the corrected status and reason. A reviewer
              will approve or reject it before the attendance record changes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label required>Student</Label>
                <Popover open={studentPickerOpen} onOpenChange={setStudentPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={studentPickerOpen}
                      className="w-full justify-between rounded-md font-normal"
                    >
                      <span className="truncate">
                        {correctionDraft.studentKey
                          ? (() => {
                              const s = students.find((x) => x.studentKey === correctionDraft.studentKey);
                              return s ? `${s.studentName} (${s.admissionNumber})` : "Select student";
                            })()
                          : "Select student"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Search by name or admission no..." />
                      <CommandList>
                        <CommandEmpty>No student found.</CommandEmpty>
                        <CommandGroup>
                          {students.map((s) => (
                            <CommandItem
                              key={s.studentKey}
                              value={`${s.studentName} ${s.admissionNumber}`}
                              onSelect={() => {
                                setCorrectionDraft({ ...correctionDraft, studentKey: s.studentKey });
                                setStudentPickerOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "h-4 w-4",
                                  correctionDraft.studentKey === s.studentKey
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              <span className="truncate">
                                {s.studentName}{" "}
                                <span className="font-mono text-xs text-muted-foreground">
                                  ({s.admissionNumber})
                                </span>
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Correction Details
              </div>
              <div className="space-y-1.5">
                <Label required>Date</Label>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 rounded-md font-normal"
                    >
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      {correctionDraft.attendanceDate
                        ? formatDate(correctionDraft.attendanceDate)
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={parseIsoDate(correctionDraft.attendanceDate)}
                      onSelect={(d) => {
                        setCorrectionDraft({
                          ...correctionDraft,
                          attendanceDate: d ? toIsoDate(d) : "",
                        });
                        setDateOpen(false);
                      }}
                      disabled={{ after: new Date() }}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {correctionDraft.studentKey && correctionDraft.attendanceDate && (
                <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">
                    Currently marked
                  </span>
                  {loadingOriginalStatus ? (
                    <span className="text-xs text-muted-foreground">Loading…</span>
                  ) : (
                    <Badge
                      className={cn(
                        "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                        originalStatus
                          ? STATUS_STYLES[originalStatus] ?? "bg-muted text-muted-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {originalStatus ? originalStatus.replace(/_/g, " ") : "Unmarked"}
                    </Badge>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label required>Corrected Status</Label>
                <Popover open={statusPickerOpen} onOpenChange={setStatusPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={statusPickerOpen}
                      className="w-full justify-between rounded-md font-normal"
                    >
                      <span className="truncate">
                        {correctionDraft.requestedStatus
                          ? statusOptions.find((s) => s.detailCode === correctionDraft.requestedStatus)
                              ?.detailName ?? correctionDraft.requestedStatus.replace(/_/g, " ")
                          : "Select status"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandList>
                        <CommandEmpty>No statuses configured.</CommandEmpty>
                        <CommandGroup>
                          {statusOptions.map((s) => (
                            <CommandItem
                              key={s.configTypeDetailKey}
                              value={s.detailCode}
                              onSelect={() => {
                                setCorrectionDraft({ ...correctionDraft, requestedStatus: s.detailCode });
                                setStatusPickerOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "h-4 w-4",
                                  correctionDraft.requestedStatus === s.detailCode
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {s.detailName}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Label required>Reason</Label>
                <Input
                  className="rounded-md"
                  placeholder="e.g. Was present but marked absent by mistake"
                  value={correctionDraft.reason}
                  onChange={(e) =>
                    setCorrectionDraft({ ...correctionDraft, reason: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-md"
              onClick={() => setNewCorrectionOpen(false)}
              disabled={correctionSaving}
            >
              Cancel
            </Button>
            <Button className="rounded-md" onClick={requestRaiseConfirm} disabled={correctionSaving}>
              File Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={raiseConfirmOpen} onOpenChange={(v) => !correctionSaving && setRaiseConfirmOpen(v)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Raise this correction request?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const s = students.find((x) => x.studentKey === correctionDraft.studentKey);
                const statusName =
                  statusOptions.find((o) => o.detailCode === correctionDraft.requestedStatus)?.detailName ??
                  correctionDraft.requestedStatus.replace(/_/g, " ");
                return (
                  <>
                    You're requesting to mark <strong className="text-foreground">{s?.studentName}</strong> as{" "}
                    <strong className="text-foreground">{statusName}</strong> on{" "}
                    <strong className="text-foreground">{formatDate(correctionDraft.attendanceDate)}</strong>. It
                    will stay pending until a reviewer approves it.
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={correctionSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={correctionSaving} onClick={(e) => { e.preventDefault(); saveCorrectionRequest(); }}>
              {correctionSaving ? "Filing..." : "Yes, raise request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!reviewConfirm} onOpenChange={(v) => !v && setReviewConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {reviewConfirm?.status === "APPROVED" ? "Approve this correction?" : "Reject this correction?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {reviewConfirm && (
                <>
                  {reviewConfirm.status === "APPROVED" ? (
                    <>
                      This will update <strong className="text-foreground">{reviewConfirm.request.studentName}</strong>
                      's attendance on{" "}
                      <strong className="text-foreground">{formatDate(reviewConfirm.request.attendanceDate)}</strong>{" "}
                      to <strong className="text-foreground">{reviewConfirm.request.requestedStatus.replace(/_/g, " ")}</strong>.
                    </>
                  ) : (
                    <>
                      This will reject the correction request for{" "}
                      <strong className="text-foreground">{reviewConfirm.request.studentName}</strong> on{" "}
                      <strong className="text-foreground">{formatDate(reviewConfirm.request.attendanceDate)}</strong>{" "}
                      — the attendance record stays unchanged.
                    </>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!reviewing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={
                reviewConfirm?.status === "REJECTED"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-success text-success-foreground hover:bg-success/90"
              }
              disabled={!!reviewing}
              onClick={(e) => {
                e.preventDefault();
                if (reviewConfirm) reviewCorrection(reviewConfirm.request, reviewConfirm.status);
              }}
            >
              {reviewing
                ? "Saving..."
                : reviewConfirm?.status === "APPROVED"
                  ? "Yes, approve"
                  : "Yes, reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
