import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RefreshCw, Loader2, ArrowUpCircle, XCircle, Pencil, Users } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAcademicYear } from "@/hooks/use-academic-year";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/promotion-rules")({
  head: () => ({
    meta: [
      { title: "Promotion Rules — Akira School ERP" },
      { name: "description", content: "Compute promotion/detain decisions per student from final results and academic policy." },
    ],
  }),
  component: PromotionRulesPage,
});

type ExamType = { examTypeKey: string; examTypeName: string };
type SchoolClass = { schoolClassKey: string; className: string };
type StudentOption = { studentKey: string; studentName: string; rollNumber: string };

type Decision = {
  promotionDecisionKey: string;
  studentKey: string;
  subjectsTotal: number;
  subjectsFailed: number;
  overallPercentage: number | null;
  minPassPercentUsed: number | null;
  maxFailedAllowedUsed: number | null;
  decision: "PENDING" | "PROMOTED" | "DETAINED";
  overrideReason: string | null;
  isOverridden: boolean;
};

function PromotionRulesPage() {
  const { selectedYearKey: yearKey } = useAcademicYear();
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [examTypeKey, setExamTypeKey] = useState("");
  const [classKey, setClassKey] = useState("");

  const [overrideTarget, setOverrideTarget] = useState<Decision | null>(null);
  const [overrideDecision, setOverrideDecision] = useState<"PROMOTED" | "DETAINED">("PROMOTED");
  const [overrideReason, setOverrideReason] = useState("");
  const [overriding, setOverriding] = useState(false);

  const loadLookups = () => {
    Promise.all([
      apiFetch("/api/ExamType").catch(() => []),
      apiFetch("/api/SchoolClass").catch(() => []),
    ]).then(([et, sc]) => {
      setExamTypes(et);
      setClasses(sc);
      if (!examTypeKey && et.length > 0) setExamTypeKey(et[0].examTypeKey);
    });
  };

  useEffect(loadLookups, []);

  const loadDecisions = () => {
    if (!examTypeKey || !classKey || !yearKey) {
      setDecisions([]);
      setStudents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      apiFetch(`/api/PromotionDecision?academicYearId=${yearKey}&classId=${classKey}&examTypeId=${examTypeKey}`).catch(() => []),
      apiFetch(`/api/Student?academicYearId=${yearKey}&classId=${classKey}&status=ENROLLED`).catch(() => []),
    ]).then(([d, stu]) => {
      setDecisions(d);
      setStudents(stu);
    }).finally(() => setLoading(false));
  };

  useEffect(loadDecisions, [examTypeKey, classKey, yearKey]);

  const studentName = (k: string) => (students as any[]).find((s) => s.studentKey === k)?.studentName ?? "—";
  const rollNumber = (k: string) => (students as any[]).find((s) => s.studentKey === k)?.rollNumber ?? "";

  const sorted = useMemo(() =>
    [...decisions].sort((a, b) => rollNumber(a.studentKey).localeCompare(rollNumber(b.studentKey), undefined, { numeric: true })),
  [decisions, students]);

  const promotedCount = decisions.filter((d) => d.decision === "PROMOTED").length;
  const detainedCount = decisions.filter((d) => d.decision === "DETAINED").length;

  const doCompute = async () => {
    if (!examTypeKey || !classKey || !yearKey) return;
    setComputing(true);
    try {
      await apiFetch("/api/PromotionDecision/compute", {
        method: "POST",
        body: JSON.stringify({ academicYearKey: yearKey, schoolClassKey: classKey, examTypeKey }),
      });
      toast.success("Promotion decisions computed");
      setConfirmOpen(false);
      loadDecisions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to compute promotion decisions");
    } finally {
      setComputing(false);
    }
  };

  const openOverride = (d: Decision) => {
    setOverrideTarget(d);
    setOverrideDecision(d.decision === "DETAINED" ? "PROMOTED" : "DETAINED");
    setOverrideReason("");
  };

  const doOverride = async () => {
    if (!overrideTarget) return;
    if (!overrideReason.trim()) return toast.error("A reason is required to override.");
    setOverriding(true);
    try {
      await apiFetch("/api/PromotionDecision/override", {
        method: "POST",
        body: JSON.stringify({ promotionDecisionKey: overrideTarget.promotionDecisionKey, decision: overrideDecision, overrideReason }),
      });
      toast.success("Decision overridden");
      setOverrideTarget(null);
      loadDecisions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to override decision");
    } finally {
      setOverriding(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Promotion Rules"
        actions={
          examTypeKey && classKey ? (
            <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={() => setConfirmOpen(true)} disabled={computing}>
              {computing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {decisions.length > 0 ? "Re-compute Decisions" : "Compute Decisions"}
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={examTypeKey} onValueChange={setExamTypeKey}>
          <SelectTrigger className="h-9 w-full rounded-md sm:w-[200px]"><SelectValue placeholder="Select exam" /></SelectTrigger>
          <SelectContent>
            {examTypes.map((e) => <SelectItem key={e.examTypeKey} value={e.examTypeKey}>{e.examTypeName}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={classKey} onValueChange={setClassKey}>
          <SelectTrigger className="h-9 w-full rounded-md sm:w-[160px]"><SelectValue placeholder="Select class" /></SelectTrigger>
          <SelectContent>
            {classes.map((c: any) => <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>{c.className}</SelectItem>)}
          </SelectContent>
        </Select>
        {decisions.length > 0 && (
          <>
            <Badge className="gap-1 rounded-md border-0 bg-success text-success-foreground font-semibold">
              <ArrowUpCircle className="h-3 w-3" /> {promotedCount} Promoted
            </Badge>
            <Badge className="gap-1 rounded-md border-0 bg-destructive text-destructive-foreground font-semibold">
              <XCircle className="h-3 w-3" /> {detainedCount} Detained
            </Badge>
          </>
        )}
      </div>

      {!examTypeKey || !classKey ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Select an exam and class to view or compute promotion decisions.
        </div>
      ) : loading ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Loading...</div>
      ) : decisions.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No decisions computed yet. This uses the final/annual exam's processed results together with the class's Academic Policy
          thresholds (min pass %, max failed subjects). Click "Compute Decisions" to run it.
        </div>
      ) : (
        <div className="rounded-md border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Roll</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Subjects Failed</TableHead>
                  <TableHead>Overall %</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((d) => (
                  <TableRow key={d.promotionDecisionKey}>
                    <TableCell className="text-muted-foreground">{rollNumber(d.studentKey)}</TableCell>
                    <TableCell className="font-medium">{studentName(d.studentKey)}</TableCell>
                    <TableCell>
                      {d.subjectsFailed} / {d.subjectsTotal}
                    </TableCell>
                    <TableCell>{d.overallPercentage != null ? `${d.overallPercentage}%` : "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {d.minPassPercentUsed != null ? `Min ${d.minPassPercentUsed}%` : "—"}
                      {d.maxFailedAllowedUsed != null ? ` · Max ${d.maxFailedAllowedUsed} fail` : ""}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {d.decision === "PROMOTED" && (
                          <Badge className="gap-1 rounded-md border-0 bg-success text-success-foreground font-semibold">
                            <ArrowUpCircle className="h-3 w-3" /> Promoted
                          </Badge>
                        )}
                        {d.decision === "DETAINED" && (
                          <Badge className="gap-1 rounded-md border-0 bg-destructive text-destructive-foreground font-semibold">
                            <XCircle className="h-3 w-3" /> Detained
                          </Badge>
                        )}
                        {d.decision === "PENDING" && (
                          <Badge className="rounded-md border-0 bg-muted text-muted-foreground">Pending</Badge>
                        )}
                        {d.isOverridden && <Badge variant="outline" className="rounded-md text-[10px]">Overridden</Badge>}
                      </div>
                      {d.overrideReason && <p className="mt-1 text-xs text-muted-foreground">{d.overrideReason}</p>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-purple-600 hover:text-purple-700" onClick={() => openOverride(d)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{decisions.length > 0 ? "Re-compute promotion decisions?" : "Compute promotion decisions?"}</AlertDialogTitle>
            <AlertDialogDescription>
              This evaluates every enrolled student's processed results for this exam against the class's Academic Policy thresholds
              (Min Pass % and Max Failed Subjects), replacing any existing decisions for this class and exam.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); doCompute(); }}>
              {decisions.length > 0 ? "Re-compute" : "Compute"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FormDialog
        open={!!overrideTarget}
        onOpenChange={(v) => !v && setOverrideTarget(null)}
        title={`Override Decision — ${overrideTarget ? studentName(overrideTarget.studentKey) : ""}`}
        submitLabel="Save Override"
        onSubmit={doOverride}
        submitting={overriding}
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>New Decision</Label>
            <Select value={overrideDecision} onValueChange={(v) => setOverrideDecision(v as "PROMOTED" | "DETAINED")}>
              <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PROMOTED">Promoted</SelectItem>
                <SelectItem value="DETAINED">Detained</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label required>Reason for Override</Label>
            <Textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g. Principal's discretion — medical grounds for missed exam."
              className="rounded-md"
              rows={3}
              autoFocus
            />
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
