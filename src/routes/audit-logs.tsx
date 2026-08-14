import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/audit-logs")({
  head: () => ({
    meta: [
      { title: "Audit Logs — Akira ERP" },
      { name: "description", content: "Every create, update, status change and permission change on the platform." },
    ],
  }),
  component: AuditLogsPage,
});

type AuditLogRow = {
  akiraAuditLogKey: string;
  akiraTenantKey: string | null;
  tenantName: string | null;
  akiraUserKey: string | null;
  userName: string | null;
  action: "Create" | "Update" | "Delete" | "Approve" | "Login" | "StatusChange";
  entityName: string;
  entityId: string | null;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  timestamp: string;
};

const actionStyles: Record<AuditLogRow["action"], string> = {
  Create: "bg-success/15 text-success",
  Update: "bg-info/15 text-info",
  Delete: "bg-destructive/15 text-destructive",
  Approve: "bg-primary/15 text-primary",
  Login: "bg-muted text-muted-foreground",
  StatusChange: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
};

function AuditLogsPage() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState("all");

  const load = () => {
    setLoading(true);
    apiFetch("/api/AuditLog")
      .then((data: AuditLogRow[]) => setRows(data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load audit logs"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const entityOptions = Array.from(new Set(rows.map((r) => r.entityName))).sort();
  const filtered = entityFilter === "all" ? rows : rows.filter((r) => r.entityName === entityFilter);

  const columns: Column<AuditLogRow>[] = [
    {
      key: "timestamp", header: "When", sortable: true,
      accessor: (r) => (
        <span className="text-sm text-muted-foreground">
          {new Date(r.timestamp).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
        </span>
      ),
    },
    {
      key: "action", header: "Action", sortable: true,
      accessor: (r) => (
        <Badge className={cn("rounded-md border-0 px-2 py-0.5 text-xs font-medium", actionStyles[r.action])}>
          {r.action}
        </Badge>
      ),
    },
    {
      key: "entityName", header: "Entity", sortable: true,
      accessor: (r) => (
        <div>
          <div className="font-medium">{r.entityName}</div>
          {r.entityId && <div className="font-mono text-[11px] text-muted-foreground">{r.entityId.slice(0, 8)}…</div>}
        </div>
      ),
    },
    { key: "userName", header: "User", accessor: (r) => r.userName ?? "—" },
    { key: "tenantName", header: "Tenant", accessor: (r) => r.tenantName ?? "—" },
    {
      key: "newValue", header: "Details",
      accessor: (r) => (
        <span className="block max-w-xs truncate font-mono text-xs text-muted-foreground" title={r.newValue ?? undefined}>
          {r.newValue ?? "—"}
        </span>
      ),
    },
    { key: "ipAddress", header: "IP", accessor: (r) => <span className="font-mono text-xs text-muted-foreground">{r.ipAddress ?? "—"}</span> },
  ];

  return (
    <div>
      <PageHeader title="Audit Logs" breadcrumbs={[{ label: "Platform" }, { label: "Audit Logs" }]} />

      <DataTable
        data={filtered}
        columns={columns}
        rowKey={(r) => r.akiraAuditLogKey}
        storageKey="audit-logs"
        searchPlaceholder="Search by user, tenant, entity..."
        searchFields={(r) => `${r.userName ?? ""} ${r.tenantName ?? ""} ${r.entityName} ${r.action}`}
        dateField={(r) => r.timestamp}
        dateFilterLabel="When"
        emptyMessage={loading ? "Loading audit logs..." : "No audit activity recorded yet."}
        toolbar={
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="h-9 w-[160px] rounded-md"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              {entityOptions.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />
    </div>
  );
}
