import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, CheckCircle2, XCircle, Clock } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useFormatDate } from "@/hooks/use-tenant-setting";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/exam-corrections")({
  head: () => ({
    meta: [
      { title: "Exam Corrections — Akira School ERP" },
      { name: "description", content: "Request and review marks re-evaluation for individual students." },
    ],
  }),
  component: ExamCorrectionsPage,
});

type ExamType = { examTypeKey: string; examTypeName: string };
type SchoolClass = { schoolClassKey: string; className: string };
type Subject = { subjectKey: string; subjectName: string };
type ExamConfig = { examConfigKey: string; examTypeKey: string; schoolClassKey: string; subjectKey: string; maxMarks: number; hasPractical: boolean; practicalMaxMarks: number };
type StudentOption = { studentKey: string; studentName: string; rollNumber: string };

type Correction = {
  correctionKey: string;
  examConfigKey: string;
  studentKey: string;
  reason: string;
  originalTheoryMarks: number | null;
  originalPracticalMarks: number | null;
  requestedTheoryMarks: number | null;
  requestedPracticalMarks: number | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewRemarks: string | null;
  reviewedOn: string | null;
  createdOn: string;
};

const emptyDraft = {
  examTypeKey: "", schoolClassKey: "", subjectKey: "", studentKey: "",
  reason: "", requestedTheoryMarks: "", requestedPracticalMarks: "",
};

function ExamCorrectionsPage() {
  const formatDate = useFormatDate();
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [configs, setConfigs] = useState<ExamConfig[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("all");

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);

  const [reviewTarget, setReviewTarget] = useState<{ c: Correction; approve: boolean } | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/ExamType").catch(() => []),
      apiFetch("/api/SchoolClass").catch(() => []),
      apiFetch("/api/Subject").catch(() => []),
      apiFetch("/api/ExamConfiguration").catch(() => []),
      apiFetch("/api/ExamCorrection").catch(() => []),
    ])
      .then(([et, sc, sub, cfg, corr]) => {
        setExamTypes(et);
        setClasses(sc);
        setSubjects(sub);
        setConfigs(cfg);
        setCorrections(corr);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load corrections"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const className = (k: string) => classes.find((c: any) => c.schoolClassKey === k)?.className ?? "—";
  const subjectName = (k: string) => subjects.find((s: any) => s.subjectKey === k)?.subjectName ?? "—";
  const studentName = (k: string) => (students as any[]).find((s) => s.studentKey === k)?.studentName ?? "—";

  const configFor = (k: string) => configs.find((c) => c.examConfigKey === k);

  const draftConfig = configs.find((c) => c.examTypeKey === draft.examTypeKey && c.schoolClassKey === draft.schoolClassKey && c.subjectKey === draft.subjectKey);

  useEffect(() => {
    if (!draft.schoolClassKey) {
      setStudents([]);
      return;
    }
    apiFetch(`/api/Student?classId=${draft.schoolClassKey}&status=ENROLLED`)
      .then((d: StudentOption[]) => setStudents(d))
      .catch(() => {});
  }, [draft.schoolClassKey]);

  const visible = useMemo(
    () => corrections.filter((c) => statusFilter === "all" || c.status === statusFilter),
    [corrections, statusFilter],
  );

  const openNew = () => {
    setDraft(emptyDraft);
    setOpen(true);
  };

  const save = async () => {
    if (!draftConfig) return toast.error("No exam configuration found for this exam type, class and subject.");
    if (!draft.studentKey) return toast.error("Select a student.");
    if (!draft.reason.trim()) return toast.error("A reason is required.");

    setSaving(true);
    try {
      await apiFetch("/api/ExamCorrection", {
        method: "POST",
        body: JSON.stringify({
          examConfigKey: draftConfig.examConfigKey,
          studentKey: draft.studentKey,
          reason: draft.reason,
          requestedTheoryMarks: draft.requestedTheoryMarks === "" ? null : Number(draft.requestedTheoryMarks),
          requestedPracticalMarks: draft.requestedPracticalMarks === "" ? null : Number(draft.requestedPracticalMarks),
        }),
      });
      toast.success("Correction request submitted");
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit correction request");
    } finally {
      setSaving(false);
    }
  };

  const doReview = async () => {
    if (!reviewTarget) return;
    if (!reviewTarget.approve && !reviewRemarks.trim()) return toast.error("Provide a reason for rejection.");
    try {
      await apiFetch("/api/ExamCorrection/review", {
        method: "POST",
        body: JSON.stringify({ correctionKey: reviewTarget.c.correctionKey, approve: reviewTarget.approve, reviewRemarks }),
      });
      toast.success(reviewTarget.approve ? "Correction approved and marks updated" : "Correction rejected");
      setReviewTarget(null);
      setReviewRemarks("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to review correction");
    }
  };

  const pendingCount = corrections.filter((c) => c.status === "PENDING").length;

  return (
    <div>
      <PageHeader
        title="Exam Corrections"
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> Request Correction
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-full rounded-md sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
        {pendingCount > 0 && (
          <Badge className="gap-1 rounded-md border-0 bg-warning text-warning-foreground font-semibold">
            <Clock className="h-3 w-3" /> {pendingCount} pending
          </Badge>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {loading ? "Loading..." : "No correction requests yet."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {visible.map((c) => {
            const cfg = configFor(c.examConfigKey);
            return (
              <div key={c.correctionKey} className="rounded-md border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{studentName(c.studentKey)}</div>
                    <div className="text-xs text-muted-foreground">
                      {cfg ? `${subjectName(cfg.subjectKey)} · ${className(cfg.schoolClassKey)}` : "—"}
                    </div>
                  </div>
                  {c.status === "PENDING" && <Badge className="gap-1 rounded-md border-0 bg-warning text-warning-foreground font-semibold"><Clock className="h-3 w-3" /> Pending</Badge>}
                  {c.status === "APPROVED" && <Badge className="gap-1 rounded-md border-0 bg-success text-success-foreground font-semibold"><CheckCircle2 className="h-3 w-3" /> Approved</Badge>}
                  {c.status === "REJECTED" && <Badge className="gap-1 rounded-md border-0 bg-destructive text-destructive-foreground font-semibold"><XCircle className="h-3 w-3" /> Rejected</Badge>}
                </div>

                <p className="mt-2 text-sm text-muted-foreground">{c.reason}</p>

                <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="rounded-md bg-muted/50 py-1.5">
                    <div className="text-muted-foreground">Original</div>
                    <div className="font-semibold text-foreground">
                      {c.originalTheoryMarks ?? "—"}{cfg?.hasPractical ? ` + ${c.originalPracticalMarks ?? "—"}` : ""}
                    </div>
                  </div>
                  <div className="rounded-md bg-info/10 py-1.5">
                    <div className="text-muted-foreground">Requested</div>
                    <div className="font-semibold text-info">
                      {c.requestedTheoryMarks ?? "—"}{cfg?.hasPractical ? ` + ${c.requestedPracticalMarks ?? "—"}` : ""}
                    </div>
                  </div>
                </div>

                {c.reviewRemarks && (
                  <div className={cn(
                    "mt-3 rounded-md border p-2 text-xs",
                    c.status === "REJECTED" ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-border bg-muted/30 text-muted-foreground",
                  )}>
                    <span className="font-medium">Review note:</span> {c.reviewRemarks}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Requested {formatDate(c.createdOn)}</span>
                  {c.status === "PENDING" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="success" className="h-7 gap-1 rounded-md px-2.5" onClick={() => setReviewTarget({ c, approve: true })}>
                        <CheckCircle2 className="h-3 w-3" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 gap-1 rounded-md border-destructive px-2.5 text-destructive" onClick={() => setReviewTarget({ c, approve: false })}>
                        <XCircle className="h-3 w-3" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Request Correction"
        submitLabel="Submit Request"
        onSubmit={save}
        submitting={saving}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label required>Exam Type</Label>
              <Select value={draft.examTypeKey} onValueChange={(v) => setDraft({ ...draft, examTypeKey: v })}>
                <SelectTrigger className="rounded-md"><SelectValue placeholder="Exam" /></SelectTrigger>
                <SelectContent>
                  {examTypes.map((e) => <SelectItem key={e.examTypeKey} value={e.examTypeKey}>{e.examTypeName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label required>Class</Label>
              <Select value={draft.schoolClassKey} onValueChange={(v) => setDraft({ ...draft, schoolClassKey: v, studentKey: "" })}>
                <SelectTrigger className="rounded-md"><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c: any) => <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>{c.className}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label required>Subject</Label>
              <Select value={draft.subjectKey} onValueChange={(v) => setDraft({ ...draft, subjectKey: v })}>
                <SelectTrigger className="rounded-md"><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s: any) => <SelectItem key={s.subjectKey} value={s.subjectKey}>{s.subjectName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label required>Student</Label>
            <Select value={draft.studentKey} onValueChange={(v) => setDraft({ ...draft, studentKey: v })}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Select student" /></SelectTrigger>
              <SelectContent>
                {(students as any[]).map((s) => <SelectItem key={s.studentKey} value={s.studentKey}>{s.studentName} ({s.rollNumber})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {!draftConfig && draft.examTypeKey && draft.schoolClassKey && draft.subjectKey && (
            <p className="text-xs text-destructive">No exam configuration found for this combination.</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Requested Theory Marks</Label>
              <Input
                type="number" min={0} max={draftConfig?.maxMarks}
                value={draft.requestedTheoryMarks}
                onChange={(e) => setDraft({ ...draft, requestedTheoryMarks: e.target.value })}
                className="rounded-md"
              />
            </div>
            {draftConfig?.hasPractical && (
              <div className="space-y-1.5">
                <Label>Requested Practical Marks</Label>
                <Input
                  type="number" min={0} max={draftConfig.practicalMaxMarks}
                  value={draft.requestedPracticalMarks}
                  onChange={(e) => setDraft({ ...draft, requestedPracticalMarks: e.target.value })}
                  className="rounded-md"
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label required>Reason</Label>
            <Textarea
              value={draft.reason}
              onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
              placeholder="e.g. Answer script re-checked, question 5 was under-marked."
              className="rounded-md"
              rows={3}
            />
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!reviewTarget} onOpenChange={(v) => { if (!v) { setReviewTarget(null); setReviewRemarks(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{reviewTarget?.approve ? "Approve this correction?" : "Reject this correction?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {reviewTarget?.approve
                ? "The requested marks will be written back to the student's exam record. Results will need to be re-processed to reflect this change."
                : "Provide a reason for rejecting this correction request."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label required={!reviewTarget?.approve}>Remarks</Label>
            <Textarea
              value={reviewRemarks}
              onChange={(e) => setReviewRemarks(e.target.value)}
              placeholder={reviewTarget?.approve ? "Optional note" : "Reason for rejection"}
              className="rounded-md"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); doReview(); }}>
              {reviewTarget?.approve ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
