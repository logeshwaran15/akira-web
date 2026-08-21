import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Users2, History } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useFormatDate } from "@/hooks/use-tenant-setting";

export const Route = createFileRoute("/class-teacher-allocation")({
  head: () => ({
    meta: [
      { title: "Class Teacher Allocation — Akira School ERP" },
      { name: "description", content: "Assign one class teacher per section, with a handover history." },
    ],
  }),
  component: ClassTeacherAllocationPage,
});

type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type UserOption = { akiraUserKey: string; userName: string };
type AllocationRow = {
  sectionKey: string;
  schoolClassKey: string;
  className: string;
  classSortOrder: number;
  sectionLabel: string;
  classTeacherUserKey: string | null;
  classTeacherName: string | null;
  academicYearKey: string;
};
type Handover = {
  classTeacherHandoverKey: string;
  handoverDate: string;
  outgoingTeacherUserKey: string | null;
  outgoingTeacherName: string | null;
  incomingTeacherUserKey: string | null;
  incomingTeacherName: string | null;
  notes: string | null;
  createdOn: string;
  createdBy: string;
};

function ClassTeacherAllocationPage() {
  const formatDate = useFormatDate();
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [activeYearKey, setActiveYearKey] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [rows, setRows] = useState<AllocationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [assignTarget, setAssignTarget] = useState<AllocationRow | null>(null);
  const [assignDraft, setAssignDraft] = useState({ teacherUserKey: "", handoverDate: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const [historyFor, setHistoryFor] = useState<AllocationRow | null>(null);
  const [history, setHistory] = useState<Handover[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    Promise.all([apiFetch("/api/AcademicYear"), apiFetch("/api/User")])
      .then(([y, u]) => {
        setYears(y);
        setUsers(u);
        const active = (y as AcademicYear[]).find((year) => year.status === "Active");
        setActiveYearKey(active?.academicYearKey ?? "");
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load setup data"));
  }, []);

  const load = () => {
    if (!activeYearKey) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    apiFetch(`/api/ClassTeacherAllocation?academicYearId=${activeYearKey}`)
      .then((d: AllocationRow[]) => setRows(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load allocations"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [activeYearKey]);

  const openAssign = (row: AllocationRow) => {
    setAssignTarget(row);
    setAssignDraft({ teacherUserKey: row.classTeacherUserKey ?? "", handoverDate: "", notes: "" });
  };

  const saveAssign = async () => {
    if (!assignTarget || !assignDraft.teacherUserKey) {
      toast.error("Choose a teacher.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/ClassTeacherAllocation/assign", {
        method: "POST",
        body: JSON.stringify({
          sectionKey: assignTarget.sectionKey,
          teacherUserKey: assignDraft.teacherUserKey,
          handoverDate: assignDraft.handoverDate || null,
          notes: assignDraft.notes || null,
        }),
      });
      toast.success(assignTarget.classTeacherUserKey ? "Class teacher handed over" : "Class teacher assigned");
      setAssignTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign class teacher");
    } finally {
      setSaving(false);
    }
  };

  const openHistory = (row: AllocationRow) => {
    setHistoryFor(row);
    setHistoryLoading(true);
    apiFetch(`/api/ClassTeacherAllocation/${row.sectionKey}/history`)
      .then((d: Handover[]) => setHistory(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load history"))
      .finally(() => setHistoryLoading(false));
  };

  const sortedRows = [...rows].sort((a, b) => a.classSortOrder - b.classSortOrder || a.sectionLabel.localeCompare(b.sectionLabel));

  const columns: Column<AllocationRow>[] = [
    { key: "className", header: "Class", accessor: (r) => r.className, sortable: true },
    { key: "sectionLabel", header: "Section", accessor: (r) => r.sectionLabel, sortable: true },
    {
      key: "classTeacherName",
      header: "Class Teacher",
      sortable: true,
      accessor: (r) =>
        r.classTeacherName ? (
          r.classTeacherName
        ) : (
          <Badge className="rounded-md border-0 bg-warning/25 text-[oklch(0.45_0.12_65)]">Unassigned</Badge>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      accessor: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" className="h-8 rounded-md" onClick={() => openAssign(r)}>
            {r.classTeacherName ? "Reassign" : "Assign"}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => openHistory(r)} title="Handover history">
            <History className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Class Teacher Allocation" />

      {!activeYearKey && !loading && (
        <div className="mb-4 rounded-md border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-[oklch(0.45_0.12_65)]">
          No active academic year — activate one on the Academic Years page first.
        </div>
      )}

      <div className="mb-4 flex items-start gap-2 rounded-md border border-info/30 bg-info/10 px-4 py-2.5 text-sm text-info">
        <Users2 className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Every active section should have exactly one class teacher. A teacher can only lead one section per academic year.</span>
      </div>

      <DataTable
        data={sortedRows}
        columns={columns}
        rowKey={(r) => r.sectionKey}
        searchPlaceholder="Search class, section or teacher..."
        searchFields={(r) => `${r.className} ${r.sectionLabel} ${r.classTeacherName ?? ""}`}
        emptyMessage={loading ? "Loading..." : "No sections found for this academic year."}
        storageKey="class-teacher-allocation"
      />

      <FormDialog
        open={!!assignTarget}
        onOpenChange={(v) => !v && setAssignTarget(null)}
        title={assignTarget?.classTeacherUserKey ? "Reassign Class Teacher" : "Assign Class Teacher"}
        description={assignTarget ? `${assignTarget.className} - ${assignTarget.sectionLabel}` : undefined}
        submitLabel="Save"
        onSubmit={saveAssign}
        submitting={saving}
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Teacher</Label>
            <Select value={assignDraft.teacherUserKey} onValueChange={(v) => setAssignDraft({ ...assignDraft, teacherUserKey: v })}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose a teacher" /></SelectTrigger>
              <SelectContent>
                {users.map((u) => <SelectItem key={u.akiraUserKey} value={u.akiraUserKey}>{u.userName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Effective Date</Label>
            <DatePicker value={assignDraft.handoverDate} onChange={(v) => setAssignDraft({ ...assignDraft, handoverDate: v })} />
          </div>
          {assignTarget?.classTeacherUserKey && (
            <div className="space-y-1.5">
              <Label>Handover Notes</Label>
              <Textarea
                value={assignDraft.notes}
                onChange={(e) => setAssignDraft({ ...assignDraft, notes: e.target.value })}
                placeholder="Reason for the change (leave, resignation, etc.)"
                className="rounded-md"
                rows={3}
              />
            </div>
          )}
        </div>
      </FormDialog>

      <FormDialog
        open={!!historyFor}
        onOpenChange={(v) => !v && setHistoryFor(null)}
        title={`Handover History — ${historyFor?.className ?? ""} ${historyFor?.sectionLabel ?? ""}`}
        submitLabel="Close"
        cancelLabel="Close"
        onSubmit={() => setHistoryFor(null)}
        size="md"
      >
        {historyLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : history.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No handovers recorded for this section.</div>
        ) : (
          <div className="space-y-3">
            {history.map((h) => (
              <div key={h.classTeacherHandoverKey} className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {h.outgoingTeacherName ? `${h.outgoingTeacherName} → ` : ""}{h.incomingTeacherName ?? "Unassigned"}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(h.handoverDate)}</span>
                </div>
                {h.notes && <p className="mt-1 text-xs text-muted-foreground">{h.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </FormDialog>
    </div>
  );
}
