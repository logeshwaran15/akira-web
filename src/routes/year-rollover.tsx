import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { InfoAlert } from "@/components/erp/InfoAlert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { CalendarClock, CheckCircle2, Pencil, Play } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/year-rollover")({
  head: () => ({
    meta: [
      { title: "Year Rollover — Akira School ERP" },
      {
        name: "description",
        content: "Batch-promote students to the next academic year using published exam results.",
      },
    ],
  }),
  component: YearRolloverPage,
});

type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type SchoolClass = { schoolClassKey: string; className: string };

type Batch = {
  promotionBatchKey: string;
  fromYearName: string;
  toYearName: string;
  className: string;
  status: string;
  generatedAt: string;
  approvedAt: string | null;
  studentCount: number;
  promoteCount: number;
  detainCount: number;
  passOutCount: number;
};
type BatchItem = {
  promotionBatchItemKey: string;
  studentKey: string;
  admissionNumber: string;
  studentName: string;
  examResultStatus: string | null;
  recommendedAction: string;
  targetSchoolClassKey: string | null;
  targetClassName: string | null;
  overrideReason: string | null;
  isProcessed: boolean;
};

const ACTION_STYLES: Record<string, string> = {
  PROMOTE: "bg-success/15 text-success",
  DETAIN: "bg-destructive/15 text-destructive",
  PASS_OUT: "bg-info/15 text-info",
};
const RESULT_STYLES: Record<string, string> = {
  PASS: "bg-success/15 text-success",
  SUPPLEMENTARY: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  DETAINED: "bg-destructive/15 text-destructive",
};

function YearRolloverPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [genDraft, setGenDraft] = useState({
    fromAcademicYearKey: "",
    toAcademicYearKey: "",
    schoolClassKey: "",
  });
  const [generating, setGenerating] = useState(false);

  const [reviewFor, setReviewFor] = useState<Batch | null>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<BatchItem | null>(null);
  const [editDraft, setEditDraft] = useState({
    recommendedAction: "",
    targetSchoolClassKey: "",
    overrideReason: "",
  });
  const [approveTarget, setApproveTarget] = useState<Batch | null>(null);
  const [approving, setApproving] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch("/api/PromotionBatch")
      .then((d: Batch[]) => setBatches(d))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load promotion batches"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    apiFetch("/api/AcademicYear")
      .then((y: AcademicYear[]) => setYears(y))
      .catch(() => {});
    apiFetch("/api/SchoolClass")
      .then((c: SchoolClass[]) => setClasses(c))
      .catch(() => {});
  }, []);

  const openGenerate = () => {
    const active = years.find((y) => y.status === "Active");
    setGenDraft({
      fromAcademicYearKey: active?.academicYearKey ?? "",
      toAcademicYearKey: "",
      schoolClassKey: "",
    });
    setGenerateOpen(true);
  };

  const generate = async () => {
    if (!genDraft.fromAcademicYearKey || !genDraft.toAcademicYearKey || !genDraft.schoolClassKey) {
      toast.error("Select the source year, target year and class.");
      return;
    }
    if (genDraft.fromAcademicYearKey === genDraft.toAcademicYearKey) {
      toast.error("The target year must be different from the source year.");
      return;
    }
    setGenerating(true);
    try {
      const res: { promotionBatchKey: string; studentCount: number } = await apiFetch(
        "/api/PromotionBatch/generate",
        {
          method: "POST",
          body: JSON.stringify(genDraft),
        },
      );
      toast.success(`Draft batch generated for ${res.studentCount} student(s)`);
      setGenerateOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate promotion batch");
    } finally {
      setGenerating(false);
    }
  };

  const openReview = (b: Batch) => {
    setReviewFor(b);
    setItemsLoading(true);
    apiFetch(`/api/PromotionBatch/${b.promotionBatchKey}`)
      .then((d: { items: BatchItem[] }) => setItems(d.items))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load batch"))
      .finally(() => setItemsLoading(false));
  };

  const openEditItem = (item: BatchItem) => {
    setEditingItem(item);
    setEditDraft({
      recommendedAction: item.recommendedAction,
      targetSchoolClassKey: item.targetSchoolClassKey ?? "",
      overrideReason: item.overrideReason ?? "",
    });
  };

  const saveItemOverride = async () => {
    if (!editingItem) return;
    try {
      await apiFetch(`/api/PromotionBatch/items/${editingItem.promotionBatchItemKey}`, {
        method: "PUT",
        body: JSON.stringify({
          recommendedAction: editDraft.recommendedAction,
          targetSchoolClassKey:
            editDraft.recommendedAction === "PASS_OUT"
              ? null
              : editDraft.targetSchoolClassKey || null,
          overrideReason: editDraft.overrideReason || null,
        }),
      });
      toast.success("Recommendation updated");
      setEditingItem(null);
      if (reviewFor) openReview(reviewFor);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update recommendation");
    }
  };

  const confirmApprove = async () => {
    if (!approveTarget) return;
    setApproving(true);
    try {
      await apiFetch(`/api/PromotionBatch/${approveTarget.promotionBatchKey}/approve`, {
        method: "POST",
      });
      toast.success(
        "Batch approved — enrollments created and fee demands generated for the new year",
      );
      setApproveTarget(null);
      setReviewFor(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve batch");
    } finally {
      setApproving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Year Rollover"
        breadcrumbs={[{ label: "Students", to: "/students" }, { label: "Year Rollover" }]}
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openGenerate}>
            <Play className="h-4 w-4" /> Generate Batch
          </Button>
        }
      />

      <InfoAlert tone="info" title="Existing students are not re-admitted — they are rolled over">
        Generating a batch only drafts recommendations from each student's published Annual exam
        result. Nothing changes until you review and approve it.
      </InfoAlert>

      <div className="mt-4 space-y-2">
        {!loading && batches.length === 0 && (
          <p className="text-sm text-muted-foreground">No promotion batches generated yet.</p>
        )}
        {batches.map((b) => (
          <div
            key={b.promotionBatchKey}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
          >
            <div>
              <div className="text-sm font-medium">
                {b.className} · {b.fromYearName} → {b.toYearName}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {b.studentCount} students · {b.promoteCount} promote · {b.detainCount} detain ·{" "}
                {b.passOutCount} pass out
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={cn(
                  "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                  b.status === "APPROVED"
                    ? "bg-success/15 text-success"
                    : "bg-warning/25 text-[oklch(0.45_0.12_65)]",
                )}
              >
                {b.status}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-md"
                onClick={() => openReview(b)}
              >
                {b.status === "DRAFT" ? "Review" : "View"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-4.5 w-4.5 text-primary" /> Generate Promotion Batch
            </DialogTitle>
            <DialogDescription>
              Recommendations are drawn from each student's published Annual exam result and
              PromotionRule for the class.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label required>Source Year (current)</Label>
              <Select
                value={genDraft.fromAcademicYearKey}
                onValueChange={(v) => setGenDraft({ ...genDraft, fromAcademicYearKey: v })}
              >
                <SelectTrigger className="rounded-md">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y.academicYearKey} value={y.academicYearKey}>
                      {y.yearName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label required>Target Year (next)</Label>
              <Select
                value={genDraft.toAcademicYearKey}
                onValueChange={(v) => setGenDraft({ ...genDraft, toAcademicYearKey: v })}
              >
                <SelectTrigger className="rounded-md">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y.academicYearKey} value={y.academicYearKey}>
                      {y.yearName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label required>Class</Label>
              <Select
                value={genDraft.schoolClassKey}
                onValueChange={(v) => setGenDraft({ ...genDraft, schoolClassKey: v })}
              >
                <SelectTrigger className="rounded-md">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>
                      {c.className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-md"
              onClick={() => setGenerateOpen(false)}
              disabled={generating}
            >
              Cancel
            </Button>
            <Button className="rounded-md" onClick={generate} disabled={generating}>
              {generating ? "Generating..." : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reviewFor} onOpenChange={(v) => !v && setReviewFor(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {reviewFor?.className} — {reviewFor?.fromYearName} → {reviewFor?.toYearName}
            </DialogTitle>
            <DialogDescription>
              {reviewFor?.status === "DRAFT"
                ? "Review each student's recommendation, override where needed, then approve to create next year's enrollments."
                : "This batch has already been approved."}
            </DialogDescription>
          </DialogHeader>
          {itemsLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!itemsLoading && (
            <div className="space-y-1.5">
              {items.map((item) => (
                <div
                  key={item.promotionBatchItemKey}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2.5"
                >
                  <div>
                    <div className="text-sm font-medium">{item.studentName}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {item.admissionNumber}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.examResultStatus && (
                      <Badge
                        className={cn(
                          "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                          RESULT_STYLES[item.examResultStatus],
                        )}
                      >
                        {item.examResultStatus}
                      </Badge>
                    )}
                    <Badge
                      className={cn(
                        "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                        ACTION_STYLES[item.recommendedAction],
                      )}
                    >
                      {item.recommendedAction.replace("_", " ")}
                      {item.targetClassName ? ` → ${item.targetClassName}` : ""}
                    </Badge>
                    {reviewFor?.status === "DRAFT" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-md"
                        onClick={() => openEditItem(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="rounded-md" onClick={() => setReviewFor(null)}>
              Close
            </Button>
            {reviewFor?.status === "DRAFT" && (
              <Button className="rounded-md gap-1.5" onClick={() => setApproveTarget(reviewFor)}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve Batch
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingItem} onOpenChange={(v) => !v && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override — {editingItem?.studentName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label required>Action</Label>
              <Select
                value={editDraft.recommendedAction}
                onValueChange={(v) => setEditDraft({ ...editDraft, recommendedAction: v })}
              >
                <SelectTrigger className="rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROMOTE">Promote</SelectItem>
                  <SelectItem value="DETAIN">Detain</SelectItem>
                  <SelectItem value="PASS_OUT">Pass Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editDraft.recommendedAction !== "PASS_OUT" && (
              <div className="space-y-1.5">
                <Label required>Target Class</Label>
                <Select
                  value={editDraft.targetSchoolClassKey}
                  onValueChange={(v) => setEditDraft({ ...editDraft, targetSchoolClassKey: v })}
                >
                  <SelectTrigger className="rounded-md">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>
                        {c.className}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Reason for Override</Label>
              <Input
                className="rounded-md"
                value={editDraft.overrideReason}
                onChange={(e) => setEditDraft({ ...editDraft, overrideReason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-md" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
            <Button className="rounded-md" onClick={saveItemOverride}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!approveTarget} onOpenChange={(v) => !v && setApproveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Promotion Batch?</AlertDialogTitle>
            <AlertDialogDescription>
              This creates next year's enrollment for every promoted/detained student and generates
              their fee demands. Passed-out students are marked accordingly. This cannot be undone
              from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={approving}
              onClick={(e) => {
                e.preventDefault();
                confirmApprove();
              }}
            >
              {approving ? "Approving..." : "Approve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
