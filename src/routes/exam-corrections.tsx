import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle2, FileText, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/exam-corrections")({
  head: () => ({
    meta: [
      { title: "Mark Corrections — Akira School ERP" },
      {
        name: "description",
        content: "Review examination mark correction requests filed after publication.",
      },
    ],
  }),
  component: ExamCorrectionsPage,
});

type CorrectionRequest = {
  examMarkCorrectionRequestKey: string;
  studentKey: string;
  admissionNumber: string;
  studentName: string;
  subjectName: string;
  examName: string;
  originalTheoryMarks: number | null;
  originalPracticalMarks: number | null;
  requestedTheoryMarks: number | null;
  requestedPracticalMarks: number | null;
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

function ExamCorrectionsPage() {
  const [requests, setRequests] = useState<CorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    apiFetch("/api/Exam/mark-corrections?status=PENDING")
      .then((d: CorrectionRequest[]) => setRequests(d))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load correction requests"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const review = async (r: CorrectionRequest, status: "APPROVED" | "REJECTED") => {
    setReviewing(r.examMarkCorrectionRequestKey);
    try {
      await apiFetch(`/api/Exam/mark-corrections/${r.examMarkCorrectionRequestKey}/review`, {
        method: "POST",
        body: JSON.stringify({
          status,
          reviewRemarks: reviewNote[r.examMarkCorrectionRequestKey] || null,
        }),
      });
      toast.success(
        status === "APPROVED"
          ? "Correction approved — marks and results updated"
          : "Correction rejected",
      );
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to review correction");
    } finally {
      setReviewing(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Mark Corrections"
        breadcrumbs={[
          { label: "Examinations", to: "/examinations" },
          { label: "Mark Corrections" },
        ]}
      />

      {!loading && requests.length === 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          <FileText className="h-5 w-5 shrink-0" /> No pending mark correction requests.
        </div>
      )}

      <div className="space-y-2">
        {requests.map((r) => (
          <div key={r.examMarkCorrectionRequestKey} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-sm font-medium">
                  {r.studentName}{" "}
                  <span className="font-mono text-xs text-muted-foreground">
                    ({r.admissionNumber})
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {r.examName} · {r.subjectName}
                </div>
                <div className="mt-1 text-sm">
                  {r.originalTheoryMarks ?? "—"} →{" "}
                  <span className="font-medium">{r.requestedTheoryMarks ?? "—"}</span>
                  {(r.originalPracticalMarks != null || r.requestedPracticalMarks != null) && (
                    <>
                      {" "}
                      (practical: {r.originalPracticalMarks ?? "—"} →{" "}
                      <span className="font-medium">{r.requestedPracticalMarks ?? "—"}</span>)
                    </>
                  )}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{r.reason}</div>
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
                value={reviewNote[r.examMarkCorrectionRequestKey] ?? ""}
                onChange={(e) =>
                  setReviewNote({ ...reviewNote, [r.examMarkCorrectionRequestKey]: e.target.value })
                }
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 rounded-md"
                disabled={reviewing === r.examMarkCorrectionRequestKey}
                onClick={() => review(r, "REJECTED")}
              >
                <XCircle className="h-3.5 w-3.5 text-destructive" /> Reject
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5 rounded-md"
                disabled={reviewing === r.examMarkCorrectionRequestKey}
                onClick={() => review(r, "APPROVED")}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
