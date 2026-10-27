import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { History, Lock } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useFormatDate } from "@/hooks/use-tenant-setting";
import { useAcademicYear } from "@/hooks/use-academic-year";

export const Route = createFileRoute("/timetable-audit-log")({
  head: () => ({
    meta: [
      { title: "Timetable Audit Log — Akira School ERP" },
      { name: "description", content: "Complete, read-only history of every change made to a section's timetable — who, what, when, before and after." },
    ],
  }),
  component: TimetableAuditLogPage,
});

type SchoolClass = { schoolClassKey: string; className: string };
type SectionOption = { sectionKey: string; sectionLabel: string };
type LogRow = {
  timetableAuditLogKey: string; timetableSlotKey: string | null; changeType: string;
  previousValueJson: string | null; newValueJson: string | null;
  changedByUserKey: string; changedByName: string | null; changedAt: string;
};

const CHANGE_TYPE_LABEL: Record<string, string> = {
  SLOT_SAVED: "Slot Saved",
  STATUS_SUBMITTED: "Submitted for Review",
  STATUS_APPROVED: "Approved",
  STATUS_REJECTED: "Rejected",
  STATUS_PUBLISHED: "Published",
  SUBSTITUTE_ASSIGNED: "Substitute Assigned",
  CHANGE_REQUEST_APPLIED: "Change Request Applied",
};
const CHANGE_TYPE_BADGE: Record<string, string> = {
  SLOT_SAVED: "bg-primary/15 text-primary",
  STATUS_SUBMITTED: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  STATUS_APPROVED: "bg-info/15 text-info",
  STATUS_REJECTED: "bg-destructive/15 text-destructive",
  STATUS_PUBLISHED: "bg-success/15 text-success",
  SUBSTITUTE_ASSIGNED: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
  CHANGE_REQUEST_APPLIED: "bg-[oklch(0.55_0.1_200)]/15 text-[oklch(0.4_0.12_200)]",
};

function summarize(json: string | null): string {
  if (!json) return "—";
  try {
    const obj = JSON.parse(json) as Record<string, unknown>;
    const parts = Object.entries(obj)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
    return parts.length > 0 ? parts.join(", ") : "—";
  } catch {
    return json;
  }
}

function TimetableAuditLogPage() {
  const formatDate = useFormatDate();
  const { selectedYearKey: yearKey } = useAcademicYear();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classKey, setClassKey] = useState("");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [sectionKey, setSectionKey] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch("/api/SchoolClass")
      .then((c: SchoolClass[]) => {
        setClasses(c);
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

  const load = () => {
    if (!sectionKey || !yearKey) { setRows([]); return; }
    setLoading(true);
    const params = new URLSearchParams({ sectionId: sectionKey, academicYearId: yearKey });
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    apiFetch(`/api/TimetableAuditLog?${params.toString()}`)
      .then((d: LogRow[]) => setRows(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load audit log"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [sectionKey, yearKey, fromDate, toDate]);

  const columns: Column<LogRow>[] = [
    {
      key: "changedAt",
      header: "When",
      sortable: true,
      accessor: (r) => <span className="font-mono text-xs">{formatDate(r.changedAt)} {new Date(r.changedAt).toLocaleTimeString()}</span>,
    },
    {
      key: "changeType",
      header: "Change",
      sortable: true,
      accessor: (r) => (
        <Badge className={cn("rounded-md border-0", CHANGE_TYPE_BADGE[r.changeType] ?? "bg-muted text-muted-foreground")}>
          {CHANGE_TYPE_LABEL[r.changeType] ?? r.changeType}
        </Badge>
      ),
    },
    { key: "changedByName", header: "Changed By", sortable: true, accessor: (r) => r.changedByName ?? "System" },
    {
      key: "previousValueJson",
      header: "Before",
      accessor: (r) => <span className="text-xs text-muted-foreground">{summarize(r.previousValueJson)}</span>,
    },
    {
      key: "newValueJson",
      header: "After",
      accessor: (r) => <span className="text-xs">{summarize(r.newValueJson)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader title="Timetable Audit Log" breadcrumbs={[{ label: "Academics" }, { label: "Timetable Audit Log" }]} />

      <div className="mb-4 flex items-start gap-2 rounded-md border border-info/30 bg-info/10 px-4 py-2.5 text-sm text-info">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Append-only — every slot save, status transition, substitute assignment, and applied change request writes
          here automatically. Nothing on this page can be edited or deleted, by any role.
        </span>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
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
        <div className="space-y-1.5">
          <Label>From</Label>
          <DatePicker value={fromDate} onChange={setFromDate} max={toDate || undefined} />
        </div>
        <div className="space-y-1.5">
          <Label>To</Label>
          <DatePicker value={toDate} onChange={setToDate} min={fromDate || undefined} />
        </div>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.timetableAuditLogKey}
        searchPlaceholder="Search changes..."
        searchFields={(r) => `${r.changeType} ${r.changedByName ?? ""}`}
        emptyMessage={loading ? "Loading..." : "No changes recorded for this section in this range."}
        storageKey="timetable-audit-log"
      />
    </div>
  );
}
