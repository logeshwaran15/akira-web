import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { ShieldCheck, AlertTriangle, CheckCheck, Undo2, Rocket } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useFormatDate } from "@/hooks/use-tenant-setting";
import { useAcademicYear } from "@/hooks/use-academic-year";

export const Route = createFileRoute("/timetable-approval-workflow")({
  head: () => ({
    meta: [
      { title: "Timetable Approval Workflow — Akira School ERP" },
      { name: "description", content: "Draft → Review → Approve → Publish across every section, before anything becomes visible to teachers or parents." },
    ],
  }),
  component: TimetableApprovalWorkflowPage,
});

type StatusRow = {
  timetableKey: string; sectionKey: string; timetableName: string;
  status: string; className: string; sectionLabel: string;
  reviewedBy: string | null; reviewedAt: string | null;
  approvedBy: string | null; approvedAt: string | null;
  publishedAt: string | null; rejectionReason: string | null;
  conflictCount: number;
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  UNDER_REVIEW: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  APPROVED: "bg-info/15 text-info",
  PUBLISHED: "bg-success/15 text-success",
  ARCHIVED: "bg-muted text-muted-foreground",
};
const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", UNDER_REVIEW: "Under Review", APPROVED: "Approved", PUBLISHED: "Published", ARCHIVED: "Archived",
};

function TimetableApprovalWorkflowPage() {
  const formatDate = useFormatDate();
  const { selectedYearKey: yearKey } = useAcademicYear();
  const [rows, setRows] = useState<StatusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const [rejecting, setRejecting] = useState<StatusRow | null>(null);
  const [reason, setReason] = useState("");

  const load = () => {
    if (!yearKey) return;
    setLoading(true);
    apiFetch(`/api/Timetable/statuses/${yearKey}`)
      .then((d: StatusRow[]) => { setRows(d); setSelected([]); })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load timetable statuses"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [yearKey]);

  const approveOne = async (row: StatusRow) => {
    setBusy(true);
    try {
      await apiFetch(`/api/Timetable/${row.sectionKey}/approve?academicYearId=${yearKey}`, { method: "PUT" });
      toast.success(`${row.className} - ${row.sectionLabel} approved`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setBusy(false);
    }
  };

  const bulkApprove = async () => {
    if (selected.length === 0) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/Timetable/bulk-approve/${yearKey}`, {
        method: "PUT",
        body: JSON.stringify({ sectionKeys: selected }),
      });
      toast.success(`${res.approvedCount} timetable(s) approved`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to bulk approve");
    } finally {
      setBusy(false);
    }
  };

  const openReject = (row: StatusRow) => {
    setRejecting(row);
    setReason("");
  };

  const submitReject = async () => {
    if (!rejecting) return;
    if (!reason.trim()) {
      toast.error("A reason is required to send this back to draft.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/api/Timetable/${rejecting.sectionKey}/reject?academicYearId=${yearKey}`, {
        method: "PUT",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      toast.success("Sent back to draft with comments");
      setRejecting(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setBusy(false);
    }
  };

  const publishAll = async () => {
    setBusy(true);
    try {
      const res = await apiFetch(`/api/Timetable/publish/${yearKey}`, { method: "PUT" });
      toast.success(`Published ${res.publishedCount} section timetable(s)`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cannot publish — unresolved conflicts exist somewhere this year.");
    } finally {
      setBusy(false);
    }
  };

  const approvedCount = rows.filter((r) => r.status === "APPROVED").length;
  const underReviewSelectable = rows.filter((r) => r.status === "UNDER_REVIEW");

  const columns: Column<StatusRow>[] = [
    { key: "className", header: "Class - Section", sortable: true, accessor: (r) => <span className="font-medium">{r.className} - {r.sectionLabel}</span> },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (r) => (
        <div className="flex items-center gap-1.5">
          <Badge className={cn("rounded-md border-0", STATUS_BADGE[r.status] ?? "bg-muted text-muted-foreground")}>
            {STATUS_LABEL[r.status] ?? r.status}
          </Badge>
          {r.conflictCount > 0 && (
            <Badge className="gap-1 rounded-md border-0 bg-destructive/15 text-destructive">
              <AlertTriangle className="h-3 w-3" /> {r.conflictCount}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "reviewedAt",
      header: "Reviewed",
      accessor: (r) => (r.reviewedAt ? formatDate(r.reviewedAt) : "—"),
    },
    {
      key: "approvedAt",
      header: "Approved",
      accessor: (r) => (r.approvedAt ? formatDate(r.approvedAt) : "—"),
    },
    {
      key: "publishedAt",
      header: "Published",
      accessor: (r) => (r.publishedAt ? formatDate(r.publishedAt) : "—"),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      accessor: (r) => (
        <div className="flex items-center justify-end gap-1">
          {r.status === "UNDER_REVIEW" && (
            <>
              <Button variant="ghost" size="sm" className="h-8 gap-1 rounded-md" onClick={() => approveOne(r)} disabled={busy || r.conflictCount > 0}>
                <CheckCheck className="h-3.5 w-3.5" /> Approve
              </Button>
              <Button variant="ghost" size="sm" className="h-8 gap-1 rounded-md text-destructive" onClick={() => openReject(r)} disabled={busy}>
                <Undo2 className="h-3.5 w-3.5" /> Reject
              </Button>
            </>
          )}
          {r.status === "DRAFT" && r.rejectionReason && (
            <span className="text-xs text-destructive" title={r.rejectionReason}>Rejected: {r.rejectionReason}</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Timetable Approval Workflow"
        breadcrumbs={[{ label: "Academics" }, { label: "Timetable Approval Workflow" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-10 gap-1.5 rounded-md shadow-sm" onClick={bulkApprove} disabled={busy || selected.length === 0}>
              <CheckCheck className="h-4 w-4" /> Approve Selected ({selected.length})
            </Button>
            <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={publishAll} disabled={busy || approvedCount === 0}>
              <Rocket className="h-4 w-4" /> Publish All Approved
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex items-start gap-2 rounded-md border border-info/30 bg-info/10 px-4 py-2.5 text-sm text-info">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Draft → Coordinator Review → Principal Approval → Published. No timetable is visible to a teacher, student
          or parent until it passes both stages. Publishing is blocked wherever unresolved teacher/room conflicts remain.
        </span>
      </div>

      <div className="mb-3 flex items-center gap-2">
        {underReviewSelectable.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={selected.length === underReviewSelectable.length}
              onCheckedChange={(v) => setSelected(v ? underReviewSelectable.map((r) => r.sectionKey) : [])}
            />
            Select all under review ({underReviewSelectable.length})
          </label>
        )}
      </div>

      <DataTable
        data={rows}
        columns={[
          {
            key: "select",
            header: "",
            className: "w-8",
            accessor: (r) =>
              r.status === "UNDER_REVIEW" ? (
                <Checkbox
                  checked={selected.includes(r.sectionKey)}
                  onCheckedChange={(v) =>
                    setSelected(v ? [...selected, r.sectionKey] : selected.filter((k) => k !== r.sectionKey))
                  }
                />
              ) : null,
          },
          ...columns,
        ]}
        rowKey={(r) => r.sectionKey}
        searchPlaceholder="Search class or section..."
        searchFields={(r) => `${r.className} ${r.sectionLabel}`}
        emptyMessage={loading ? "Loading..." : "No timetables started for this academic year yet."}
        storageKey="timetable-approval-workflow"
      />

      <FormDialog
        open={!!rejecting}
        onOpenChange={(v) => !v && setRejecting(null)}
        title={rejecting ? `Send back — ${rejecting.className} - ${rejecting.sectionLabel}` : ""}
        description="This returns the timetable to Draft with your comments. The Coordinator will need to address it and resubmit."
        submitLabel="Send Back"
        onSubmit={submitReject}
        submitting={busy}
        size="sm"
      >
        <div className="space-y-1.5">
          <Label required>Reason</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What needs to change before this can be approved?"
            className="rounded-md"
            rows={4}
            required
          />
        </div>
      </FormDialog>
    </div>
  );
}
