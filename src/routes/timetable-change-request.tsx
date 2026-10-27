import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { History, GitPullRequestArrow, CheckCheck, X, Rocket, Eye } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useFormatDate } from "@/hooks/use-tenant-setting";
import { useAcademicYear } from "@/hooks/use-academic-year";

export const Route = createFileRoute("/timetable-change-request")({
  head: () => ({
    meta: [
      { title: "Timetable Change Request — Akira School ERP" },
      { name: "description", content: "The only sanctioned path to edit an already-published timetable — reasoned, approved, versioned." },
    ],
  }),
  component: TimetableChangeRequestPage,
});

type SchoolClass = { schoolClassKey: string; className: string };
type SectionOption = { sectionKey: string; sectionLabel: string };
type SubjectOption = { subjectKey: string; subjectName: string };
type UserOption = { akiraUserKey: string; userName: string };
type RoomOption = { roomKey: string; roomName: string };
type Slot = {
  timetableSlotKey: string; dayOfWeek: number; periodNumber: number;
  subjectKey: string | null; subjectName: string | null;
  akiraUserKey: string | null; teacherName: string | null;
  roomKey: string | null; roomName: string | null; isBreak: boolean;
};
type PendingChange = {
  timetableSlotKey: string; dayOfWeek: number; periodNumber: number;
  subjectKey: string; teacherUserKey: string; roomKey: string;
  label: string;
};
type ChangeRequestRow = {
  timetableChangeRequestKey: string; reason: string; effectiveDate: string;
  isEmergency: boolean; status: string; reviewRemarks: string | null;
  appliedAt: string | null; createdOn: string;
};
type VersionSnapshot = { timetableVersionSnapshotKey: string; snapshotJson: string; effectiveTo: string; createdOn: string };

const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  APPROVED: "bg-info/15 text-info",
  REJECTED: "bg-destructive/15 text-destructive",
  APPLIED: "bg-success/15 text-success",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function TimetableChangeRequestPage() {
  const formatDate = useFormatDate();
  const { selectedYearKey: yearKey } = useAcademicYear();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classKey, setClassKey] = useState("");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [sectionKey, setSectionKey] = useState("");
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [teachers, setTeachers] = useState<UserOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [requests, setRequests] = useState<ChangeRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [slotDraft, setSlotDraft] = useState({ subjectKey: "", teacherUserKey: "", roomKey: "" });
  const [pending, setPending] = useState<PendingChange[]>([]);

  const [submitOpen, setSubmitOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(todayISO());
  const [isEmergency, setIsEmergency] = useState(false);

  const [rejecting, setRejecting] = useState<ChangeRequestRow | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState("");

  const [viewingVersions, setViewingVersions] = useState(false);
  const [versions, setVersions] = useState<VersionSnapshot[]>([]);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/SchoolClass"), apiFetch("/api/Subject"), apiFetch("/api/User"), apiFetch("/api/Room"),
    ])
      .then(([c, subj, u, r]) => {
        setClasses(c);
        setSubjects(subj);
        setTeachers(u);
        setRooms(r);
        if (c.length > 0) setClassKey(c[0].schoolClassKey);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load filters"));
  }, []);

  useEffect(() => {
    if (!classKey || !yearKey) { setSections([]); return; }
    apiFetch(`/api/Section?schoolClassId=${classKey}&academicYearId=${yearKey}`)
      .then((d: SectionOption[]) => { setSections(d); setSectionKey(d[0]?.sectionKey ?? ""); })
      .catch(() => setSections([]));
  }, [classKey, yearKey]);

  const loadSlots = () => {
    if (!sectionKey || !yearKey) return;
    setLoading(true);
    apiFetch(`/api/Timetable?sectionId=${sectionKey}&academicYearId=${yearKey}`)
      .then((d: Slot[]) => setSlots(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load current timetable"))
      .finally(() => setLoading(false));
  };

  const loadRequests = () => {
    if (!sectionKey || !yearKey) return;
    apiFetch(`/api/TimetableChangeRequest?sectionId=${sectionKey}&academicYearId=${yearKey}`)
      .then((d: ChangeRequestRow[]) => setRequests(d))
      .catch(() => setRequests([]));
  };

  useEffect(loadSlots, [sectionKey, yearKey]);
  useEffect(loadRequests, [sectionKey, yearKey]);
  useEffect(() => { setPending([]); }, [sectionKey, yearKey]);

  const openEditSlot = (slot: Slot) => {
    setEditingSlot(slot);
    setSlotDraft({
      subjectKey: slot.subjectKey ?? "", teacherUserKey: slot.akiraUserKey ?? "", roomKey: slot.roomKey ?? "",
    });
  };

  const queueChange = () => {
    if (!editingSlot) return;
    const subjectName = subjects.find((s) => s.subjectKey === slotDraft.subjectKey)?.subjectName ?? "—";
    const teacherName = teachers.find((t) => t.akiraUserKey === slotDraft.teacherUserKey)?.userName ?? "—";
    const roomName = rooms.find((r) => r.roomKey === slotDraft.roomKey)?.roomName ?? "—";
    const item: PendingChange = {
      timetableSlotKey: editingSlot.timetableSlotKey,
      dayOfWeek: editingSlot.dayOfWeek,
      periodNumber: editingSlot.periodNumber,
      subjectKey: slotDraft.subjectKey,
      teacherUserKey: slotDraft.teacherUserKey,
      roomKey: slotDraft.roomKey,
      label: `${DAY_NAMES[editingSlot.dayOfWeek]} P${editingSlot.periodNumber}: ${subjectName} / ${teacherName} / ${roomName}`,
    };
    setPending((prev) => [...prev.filter((p) => p.timetableSlotKey !== item.timetableSlotKey), item]);
    setEditingSlot(null);
  };

  const removePending = (timetableSlotKey: string) => {
    setPending((prev) => prev.filter((p) => p.timetableSlotKey !== timetableSlotKey));
  };

  const submitRequest = async () => {
    if (!reason.trim()) {
      toast.error("A reason is required.");
      return;
    }
    if (pending.length === 0) {
      toast.error("Queue at least one slot change first.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/TimetableChangeRequest", {
        method: "POST",
        body: JSON.stringify({
          sectionKey,
          academicYearKey: yearKey,
          reason: reason.trim(),
          effectiveDate,
          isEmergency,
          changes: pending.map((p) => ({
            timetableSlotKey: p.timetableSlotKey,
            dayOfWeek: p.dayOfWeek,
            periodNumber: p.periodNumber,
            subjectKey: p.subjectKey || null,
            teacherUserKey: p.teacherUserKey || null,
            roomKey: p.roomKey || null,
          })),
        }),
      });
      toast.success("Change request submitted");
      setSubmitOpen(false);
      setPending([]);
      setReason("");
      setIsEmergency(false);
      loadRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit change request");
    } finally {
      setBusy(false);
    }
  };

  const approve = async (req: ChangeRequestRow) => {
    setBusy(true);
    try {
      await apiFetch(`/api/TimetableChangeRequest/${req.timetableChangeRequestKey}/approve`, {
        method: "PUT",
        body: JSON.stringify({}),
      });
      toast.success("Change request approved");
      loadRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setBusy(false);
    }
  };

  const openReject = (req: ChangeRequestRow) => {
    setRejecting(req);
    setRejectRemarks("");
  };

  const submitReject = async () => {
    if (!rejecting) return;
    if (!rejectRemarks.trim()) {
      toast.error("Remarks are required to reject.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/api/TimetableChangeRequest/${rejecting.timetableChangeRequestKey}/reject`, {
        method: "PUT",
        body: JSON.stringify({ remarks: rejectRemarks.trim() }),
      });
      toast.success("Change request rejected");
      setRejecting(null);
      loadRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setBusy(false);
    }
  };

  const apply = async (req: ChangeRequestRow) => {
    setBusy(true);
    try {
      await apiFetch(`/api/TimetableChangeRequest/${req.timetableChangeRequestKey}/apply`, { method: "PUT" });
      toast.success("Change applied to the live timetable");
      loadRequests();
      loadSlots();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply — check for a new teacher/room clash.");
    } finally {
      setBusy(false);
    }
  };

  const openVersions = () => {
    if (!sectionKey || !yearKey) return;
    apiFetch(`/api/TimetableChangeRequest/versions?sectionId=${sectionKey}&academicYearId=${yearKey}`)
      .then((d: VersionSnapshot[]) => { setVersions(d); setViewingVersions(true); })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load version history"));
  };

  const requestColumns: Column<ChangeRequestRow>[] = [
    { key: "reason", header: "Reason", accessor: (r) => <span className="font-medium">{r.reason}</span> },
    { key: "effectiveDate", header: "Effective From", sortable: true, accessor: (r) => formatDate(r.effectiveDate) },
    {
      key: "isEmergency",
      header: "Priority",
      accessor: (r) => (r.isEmergency ? <Badge className="rounded-md border-0 bg-destructive/15 text-destructive">Emergency</Badge> : "Normal"),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (r) => <Badge className={cn("rounded-md border-0", STATUS_BADGE[r.status] ?? "bg-muted text-muted-foreground")}>{r.status}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      accessor: (r) => (
        <div className="flex items-center justify-end gap-1">
          {r.status === "PENDING" && (
            <>
              <Button variant="ghost" size="sm" className="h-8 gap-1 rounded-md" onClick={() => approve(r)} disabled={busy}>
                <CheckCheck className="h-3.5 w-3.5" /> Approve
              </Button>
              <Button variant="ghost" size="sm" className="h-8 gap-1 rounded-md text-destructive" onClick={() => openReject(r)} disabled={busy}>
                <X className="h-3.5 w-3.5" /> Reject
              </Button>
            </>
          )}
          {r.status === "APPROVED" && (
            <Button variant="ghost" size="sm" className="h-8 gap-1 rounded-md" onClick={() => apply(r)} disabled={busy}>
              <Rocket className="h-3.5 w-3.5" /> Apply
            </Button>
          )}
          {r.status === "REJECTED" && r.reviewRemarks && (
            <span className="text-xs text-destructive" title={r.reviewRemarks}>{r.reviewRemarks}</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Timetable Change Request"
        breadcrumbs={[{ label: "Academics" }, { label: "Timetable Change Request" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openVersions}>
              <History className="h-4 w-4" /> Version History
            </Button>
            <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={() => setSubmitOpen(true)} disabled={pending.length === 0}>
              <GitPullRequestArrow className="h-4 w-4" /> Submit Request ({pending.length})
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex items-start gap-2 rounded-md border border-info/30 bg-info/10 px-4 py-2.5 text-sm text-info">
        <GitPullRequestArrow className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          The only sanctioned way to edit a published timetable. Click a slot below to queue a change, then submit
          with a reason and an effective date — nothing changes on the live timetable until it's approved and applied.
        </span>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Class</Label>
          <Select value={classKey} onValueChange={setClassKey}>
            <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose class" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>{c.className}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Section</Label>
          <Select value={sectionKey} onValueChange={setSectionKey}>
            <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose section" /></SelectTrigger>
            <SelectContent>
              {sections.map((s) => <SelectItem key={s.sectionKey} value={s.sectionKey}>{s.sectionLabel}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="mb-4 rounded-md border border-warning/30 bg-warning/10 p-3">
          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Queued changes</div>
          <div className="flex flex-wrap gap-2">
            {pending.map((p) => (
              <Badge key={p.timetableSlotKey} className="gap-1.5 rounded-md border-0 bg-card text-foreground shadow-sm">
                {p.label}
                <button type="button" onClick={() => removePending(p.timetableSlotKey)} className="ml-1 text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-md border border-border bg-card shadow-sm">
        <div className="border-b border-border p-4">
          <h2 className="font-display text-base font-semibold">Current Live Timetable</h2>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : slots.filter((s) => !s.isBreak).length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No slots to change for this section.</div>
          ) : (
            slots.filter((s) => !s.isBreak).map((slot) => {
              const queued = pending.find((p) => p.timetableSlotKey === slot.timetableSlotKey);
              return (
                <div key={slot.timetableSlotKey} className="flex items-center justify-between gap-3 p-3">
                  <div className="text-sm">
                    <span className="font-medium">{DAY_NAMES[slot.dayOfWeek]} P{slot.periodNumber}</span>
                    {" — "}{slot.subjectName ?? "Free"} {slot.teacherName ? `/ ${slot.teacherName}` : ""} {slot.roomName ? `/ ${slot.roomName}` : ""}
                  </div>
                  <Button
                    variant={queued ? "default" : "outline"}
                    size="sm"
                    className="h-8 rounded-md"
                    onClick={() => openEditSlot(slot)}
                  >
                    {queued ? "Editing" : "Change"}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-6 rounded-md border border-border bg-card shadow-sm">
        <div className="border-b border-border p-4">
          <h2 className="font-display text-base font-semibold">Change Requests</h2>
        </div>
        <DataTable
          data={requests}
          columns={requestColumns}
          rowKey={(r) => r.timetableChangeRequestKey}
          searchPlaceholder="Search change requests..."
          searchFields={(r) => r.reason}
          emptyMessage="No change requests for this section yet."
          storageKey="timetable-change-request"
        />
      </div>

      <FormDialog
        open={!!editingSlot}
        onOpenChange={(v) => !v && setEditingSlot(null)}
        title={editingSlot ? `${DAY_NAMES[editingSlot.dayOfWeek]} — Period ${editingSlot.periodNumber}` : ""}
        submitLabel="Queue Change"
        onSubmit={queueChange}
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Select value={slotDraft.subjectKey || "none"} onValueChange={(v) => setSlotDraft({ ...slotDraft, subjectKey: v === "none" ? "" : v })}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose subject" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {subjects.map((s) => <SelectItem key={s.subjectKey} value={s.subjectKey}>{s.subjectName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Teacher</Label>
            <Select value={slotDraft.teacherUserKey || "none"} onValueChange={(v) => setSlotDraft({ ...slotDraft, teacherUserKey: v === "none" ? "" : v })}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose teacher" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {teachers.map((t) => <SelectItem key={t.akiraUserKey} value={t.akiraUserKey}>{t.userName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Room</Label>
            <Select value={slotDraft.roomKey || "none"} onValueChange={(v) => setSlotDraft({ ...slotDraft, roomKey: v === "none" ? "" : v })}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose room" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {rooms.map((r) => <SelectItem key={r.roomKey} value={r.roomKey}>{r.roomName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>

      <FormDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        title="Submit Change Request"
        description={`${pending.length} slot change(s) queued`}
        submitLabel="Submit"
        onSubmit={submitRequest}
        submitting={busy}
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this change needed?"
              className="rounded-md"
              rows={3}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label required>Effective Date</Label>
            <DatePicker value={effectiveDate} onChange={setEffectiveDate} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isEmergency} onCheckedChange={(v) => setIsEmergency(!!v)} />
            Emergency — needs immediate approval (e.g. room unusable today)
          </label>
        </div>
      </FormDialog>

      <FormDialog
        open={!!rejecting}
        onOpenChange={(v) => !v && setRejecting(null)}
        title="Reject Change Request"
        submitLabel="Reject"
        onSubmit={submitReject}
        submitting={busy}
        size="sm"
      >
        <div className="space-y-1.5">
          <Label required>Remarks</Label>
          <Textarea
            value={rejectRemarks}
            onChange={(e) => setRejectRemarks(e.target.value)}
            placeholder="Why is this being rejected?"
            className="rounded-md"
            rows={3}
            required
          />
        </div>
      </FormDialog>

      <FormDialog
        open={viewingVersions}
        onOpenChange={setViewingVersions}
        title="Version History"
        submitLabel="Close"
        cancelLabel="Close"
        onSubmit={() => setViewingVersions(false)}
        size="lg"
      >
        {versions.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No prior versions — this timetable hasn't been changed since publishing.</div>
        ) : (
          <div className="space-y-3">
            {versions.map((v) => {
              let count = 0;
              try { count = (JSON.parse(v.snapshotJson) as unknown[]).length; } catch { /* ignore */ }
              return (
                <div key={v.timetableVersionSnapshotKey} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                  <div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <Eye className="h-3.5 w-3.5" /> Valid through {formatDate(v.effectiveTo)}
                    </div>
                    <div className="text-xs text-muted-foreground">{count} slots — snapshotted {formatDate(v.createdOn)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FormDialog>
    </div>
  );
}
