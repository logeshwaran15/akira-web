import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, AlertTriangle, PhoneCall, FileText } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admissions-inquiries")({
  head: () => ({
    meta: [
      { title: "Inquiries — Akira School ERP" },
      {
        name: "description",
        content: "Track admission inquiries from first contact to conversion.",
      },
    ],
  }),
  component: InquiriesPage,
});

type Inquiry = {
  inquiryKey: string;
  inquiryDate: string;
  studentName: string;
  classApplyingForName: string;
  academicYearName: string;
  fatherName: string | null;
  primaryMobile: string;
  sourceOfInquiry: string;
  counsellorName: string | null;
  status: string;
  nextFollowUpDate: string | null;
  dropReason: string | null;
  isFollowUpOverdue: boolean;
};

const STATUS_OPTIONS = [
  "NEW",
  "CONTACTED",
  "FOLLOW_UP_SCHEDULED",
  "APPLICATION_GIVEN",
  "CONVERTED",
  "DROPPED",
];
const DROP_REASONS = [
  { label: "Fee too high", value: "FEE_HIGH" },
  { label: "Distance", value: "DISTANCE" },
  { label: "Board change", value: "BOARD_CHANGE" },
  { label: "Seat not available", value: "SEAT_NOT_AVAILABLE" },
  { label: "Chose another school", value: "CHOSE_ANOTHER_SCHOOL" },
  { label: "No response", value: "NO_RESPONSE" },
  { label: "Other", value: "OTHER" },
];
const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-info/15 text-info",
  CONTACTED: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  FOLLOW_UP_SCHEDULED: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  APPLICATION_GIVEN: "bg-primary/15 text-primary",
  CONVERTED: "bg-success/15 text-success",
  DROPPED: "bg-destructive/15 text-destructive",
};
const SOURCE_STYLES: Record<string, string> = {
  WALK_IN: "bg-info/15 text-info",
  PHONE: "bg-success/15 text-success",
  WEBSITE: "bg-primary/15 text-primary",
  SOCIAL_MEDIA: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
  REFERRAL: "bg-[oklch(0.55_0.1_200)]/15 text-[oklch(0.4_0.12_200)]",
  CAMP: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  NEWSPAPER: "bg-muted text-muted-foreground",
};

function InquiriesPage() {
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusTarget, setStatusTarget] = useState<Inquiry | null>(null);
  const [statusDraft, setStatusDraft] = useState({
    status: "",
    dropReason: "",
    nextFollowUpDate: "",
    remarks: "",
  });
  const [statusSaving, setStatusSaving] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch("/api/Inquiry")
      .then((d: Inquiry[]) => setInquiries(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load inquiries"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openStatus = (i: Inquiry) => {
    setStatusTarget(i);
    setStatusDraft({
      status: i.status,
      dropReason: i.dropReason ?? "",
      nextFollowUpDate: i.nextFollowUpDate?.slice(0, 10) ?? "",
      remarks: "",
    });
  };

  const saveStatus = async () => {
    if (!statusTarget) return;
    if (statusDraft.status === "DROPPED" && !statusDraft.dropReason) {
      toast.error("Choose a drop reason.");
      return;
    }
    setStatusSaving(true);
    try {
      await apiFetch(`/api/Inquiry/${statusTarget.inquiryKey}/status`, {
        method: "PUT",
        body: JSON.stringify({
          status: statusDraft.status,
          dropReason: statusDraft.status === "DROPPED" ? statusDraft.dropReason : null,
          nextFollowUpDate: statusDraft.nextFollowUpDate || null,
          remarks: statusDraft.remarks || null,
        }),
      });
      toast.success("Status updated");
      setStatusTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  };

  const columns: Column<Inquiry>[] = [
    {
      key: "studentName",
      header: "Student",
      sortable: true,
      accessor: (r) => (
        <div>
          <div className="flex items-center gap-1.5 font-medium">
            {r.studentName}
            {r.isFollowUpOverdue && (
              <AlertTriangle
                className="h-3.5 w-3.5 text-destructive"
                aria-label="Follow-up overdue"
              />
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {r.classApplyingForName} · {r.academicYearName}
          </div>
        </div>
      ),
    },
    {
      key: "primaryMobile",
      header: "Contact",
      accessor: (r) => <span className="font-mono text-sm">{r.primaryMobile}</span>,
    },
    {
      key: "sourceOfInquiry",
      header: "Source",
      accessor: (r) => (
        <Badge
          className={cn(
            "rounded-md border-0",
            SOURCE_STYLES[r.sourceOfInquiry] ?? "bg-muted text-muted-foreground",
          )}
        >
          {r.sourceOfInquiry.replace(/_/g, " ")}
        </Badge>
      ),
    },
    { key: "counsellorName", header: "Counsellor", accessor: (r) => r.counsellorName ?? "—" },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (r) => (
        <button onClick={() => openStatus(r)} className="text-left">
          <Badge
            className={cn(
              "cursor-pointer rounded-md border-0 px-2 py-0.5 text-xs font-medium",
              STATUS_STYLES[r.status],
            )}
          >
            {r.status.replace(/_/g, " ")}
          </Badge>
        </button>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (r) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-md"
            onClick={() =>
              navigate({ to: "/admissions-inquiry-form", search: { id: r.inquiryKey } })
            }
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md"
            onClick={() => openStatus(r)}
            title="Update status"
          >
            <PhoneCall className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md"
            title="Create application"
            onClick={() =>
              navigate({
                to: "/admissions-application-form",
                search: { id: undefined, inquiryId: r.inquiryKey },
              })
            }
          >
            <FileText className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Inquiries"
        breadcrumbs={[{ label: "Admissions" }, { label: "Inquiries" }]}
        actions={
          <Button
            className="h-10 gap-1.5 rounded-md shadow-sm"
            onClick={() => navigate({ to: "/admissions-inquiry-form", search: { id: undefined } })}
          >
            <Plus className="h-4 w-4" /> New Inquiry
          </Button>
        }
      />

      <DataTable
        data={inquiries}
        columns={columns}
        rowKey={(r) => r.inquiryKey}
        selectable
        storageKey="admissions-inquiries"
        searchPlaceholder="Search by student name or mobile..."
        searchFields={(r) => `${r.studentName} ${r.primaryMobile} ${r.fatherName ?? ""}`}
        dateField={(r) => r.inquiryDate}
        dateFilterLabel="Inquiry Date"
        emptyMessage={loading ? "Loading inquiries..." : "No inquiries yet."}
      />

      <AlertDialog open={!!statusTarget} onOpenChange={(v) => !v && setStatusTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Status — {statusTarget?.studentName}</AlertDialogTitle>
            <AlertDialogDescription>
              Move this inquiry through the funnel or record a follow-up.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label required>Status</Label>
              <Select
                value={statusDraft.status}
                onValueChange={(v) => setStatusDraft({ ...statusDraft, status: v })}
              >
                <SelectTrigger className="rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {statusDraft.status === "DROPPED" && (
              <div className="space-y-1.5">
                <Label required>Drop Reason</Label>
                <Select
                  value={statusDraft.dropReason}
                  onValueChange={(v) => setStatusDraft({ ...statusDraft, dropReason: v })}
                >
                  <SelectTrigger className="rounded-md">
                    <SelectValue placeholder="Choose reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {DROP_REASONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(statusDraft.status === "CONTACTED" ||
              statusDraft.status === "FOLLOW_UP_SCHEDULED") && (
              <div className="space-y-1.5">
                <Label>Next Follow-up Date</Label>
                <Input
                  type="date"
                  value={statusDraft.nextFollowUpDate}
                  onChange={(e) =>
                    setStatusDraft({ ...statusDraft, nextFollowUpDate: e.target.value })
                  }
                  className="rounded-md"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Input
                value={statusDraft.remarks}
                onChange={(e) => setStatusDraft({ ...statusDraft, remarks: e.target.value })}
                placeholder="Optional note"
                className="rounded-md"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={statusSaving}
              onClick={(e) => {
                e.preventDefault();
                saveStatus();
              }}
            >
              {statusSaving ? "Saving..." : "Save"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
