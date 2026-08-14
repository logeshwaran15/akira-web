import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  Eye,
  Upload,
  Ban,
  History,
  Download,
  MoreVertical,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { exportToCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { useFormatDate } from "@/hooks/use-tenant-setting";

export const Route = createFileRoute("/report-config")({
  head: () => ({
    meta: [
      { title: "Ad-hoc Report Configuration — Akira School ERP" },
      {
        name: "description",
        content: "Author, validate and publish report definitions for end users to execute.",
      },
    ],
  }),
  component: ReportConfigPage,
});

type ReportRow = {
  tenantAdhocReportKey: string;
  reportName: string;
  displayName: string;
  category: string;
  module: string | null;
  dataSource: string | null;
  queryType: string;
  isPublished: boolean;
  isActive: boolean;
  executionCount: number;
  createdBy: string;
  createdOn: string;
  modifiedOn: string | null;
};

type HistoryRow = {
  tenantAdhocReportExecutionLogKey: string;
  executedByName: string | null;
  executedOn: string;
  recordCount: number | null;
  durationMs: number | null;
  success: boolean;
  errorMessage: string | null;
};

function ReportConfigPage() {
  const navigate = useNavigate();
  const formatDate = useFormatDate();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ReportRow | null>(null);
  const [historyTarget, setHistoryTarget] = useState<ReportRow | null>(null);
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);

  const load = () => {
    setLoading(true);
    apiFetch("/api/AdhocReport")
      .then((d: ReportRow[]) => setReports(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load reports"))
      .finally(() => setLoading(false));
    apiFetch("/api/AdhocReport/favorites")
      .then((d: string[]) => setFavorites(new Set(d)))
      .catch(() => {});
  };

  useEffect(load, []);

  const toggleFavorite = async (row: ReportRow) => {
    try {
      const r: { isFavorite: boolean } = await apiFetch(
        `/api/AdhocReport/${row.tenantAdhocReportKey}/favorite`,
        { method: "POST" },
      );
      setFavorites((prev) => {
        const next = new Set(prev);
        if (r.isFavorite) next.add(row.tenantAdhocReportKey);
        else next.delete(row.tenantAdhocReportKey);
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update favorite");
    }
  };

  const duplicateReport = async (row: ReportRow) => {
    try {
      await apiFetch(`/api/AdhocReport/${row.tenantAdhocReportKey}/duplicate`, { method: "POST" });
      toast.success(`"${row.displayName}" duplicated as a draft`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to duplicate report");
    }
  };

  const togglePublish = async (row: ReportRow) => {
    try {
      await apiFetch(`/api/AdhocReport/${row.tenantAdhocReportKey}/publish`, {
        method: "POST",
        body: JSON.stringify({ value: !row.isPublished }),
      });
      toast.success(
        row.isPublished ? "Report unpublished" : "Report published — now visible to end users",
      );
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update publish status");
    }
  };

  const toggleActive = async (row: ReportRow) => {
    try {
      await apiFetch(`/api/AdhocReport/${row.tenantAdhocReportKey}/active`, {
        method: "POST",
        body: JSON.stringify({ value: !row.isActive }),
      });
      toast.success(row.isActive ? "Report disabled" : "Report enabled");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/AdhocReport/${deleteTarget.tenantAdhocReportKey}`, { method: "DELETE" });
      toast.success("Report deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete report");
    }
  };

  const openHistory = (row: ReportRow) => {
    setHistoryTarget(row);
    apiFetch(`/api/AdhocReport/${row.tenantAdhocReportKey}/history`)
      .then((d: HistoryRow[]) => setHistoryRows(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load history"));
  };

  const columns: Column<ReportRow>[] = [
    {
      key: "favorite",
      header: "",
      className: "w-8",
      accessor: (r) => (
        <button onClick={() => toggleFavorite(r)} className="text-lg leading-none text-warning">
          {favorites.has(r.tenantAdhocReportKey) ? "★" : "☆"}
        </button>
      ),
    },
    { key: "reportName", header: "Report Name", sortable: true, className: "font-mono text-xs" },
    { key: "displayName", header: "Display Name", sortable: true, className: "font-medium" },
    {
      key: "category",
      header: "Category",
      sortable: true,
      accessor: (r) => (
        <Badge variant="outline" className="rounded-md">
          {r.category}
        </Badge>
      ),
    },
    { key: "module", header: "Module", accessor: (r) => r.module ?? "—" },
    { key: "queryType", header: "Report Type" },
    { key: "dataSource", header: "Database View/Table", accessor: (r) => r.dataSource ?? "—" },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (r) => (
        <div className="flex gap-1.5">
          <Badge
            className={cn(
              "rounded-md border-0",
              r.isPublished ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
            )}
          >
            {r.isPublished ? "Published" : "Draft"}
          </Badge>
          {!r.isActive && (
            <Badge className="rounded-md border-0 bg-destructive/15 text-destructive">
              Disabled
            </Badge>
          )}
        </div>
      ),
    },
    { key: "createdBy", header: "Created By" },
    {
      key: "createdOn",
      header: "Created Date",
      sortable: true,
      accessor: (r) => formatDate(r.createdOn),
    },
    {
      key: "modifiedOn",
      header: "Modified Date",
      accessor: (r) => (r.modifiedOn ? formatDate(r.modifiedOn) : "—"),
    },
    { key: "executionCount", header: "Execution Count", sortable: true, className: "text-center" },
    {
      key: "actions",
      header: "Actions",
      className: "w-10",
      accessor: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                navigate({ to: "/report-config-edit", search: { id: r.tenantAdhocReportKey } })
              }
            >
              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                navigate({
                  to: "/report-viewer",
                  search: { id: r.tenantAdhocReportKey, preview: true },
                })
              }
            >
              <Eye className="mr-2 h-3.5 w-3.5" /> Preview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => duplicateReport(r)}>
              <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openHistory(r)}>
              <History className="mr-2 h-3.5 w-3.5" /> History
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => togglePublish(r)}>
              {r.isPublished ? (
                <Ban className="mr-2 h-3.5 w-3.5" />
              ) : (
                <Upload className="mr-2 h-3.5 w-3.5" />
              )}
              {r.isPublished ? "Unpublish" : "Publish"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toggleActive(r)}>
              {r.isActive ? (
                <Ban className="mr-2 h-3.5 w-3.5" />
              ) : (
                <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
              )}
              {r.isActive ? "Disable" : "Enable"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setDeleteTarget(r)}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Ad-hoc Report Configuration"
        breadcrumbs={[{ label: "Configuration" }, { label: "Ad-hoc Report Configuration" }]}
        actions={
          <Button
            className="gap-1.5 rounded-md"
            onClick={() => navigate({ to: "/report-config-edit", search: { id: undefined } })}
          >
            <Plus className="h-4 w-4" /> New Report
          </Button>
        }
      />

      <DataTable
        data={reports}
        columns={columns}
        rowKey={(r) => r.tenantAdhocReportKey}
        searchPlaceholder="Search reports..."
        storageKey="report-config"
        emptyMessage={
          loading ? "Loading..." : "No reports configured yet. Click New Report to create one."
        }
        toolbar={
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-md"
            onClick={() =>
              exportToCsv(
                "report-configuration.csv",
                [
                  { key: "reportName", header: "Report Name" },
                  { key: "displayName", header: "Display Name" },
                  { key: "category", header: "Category" },
                  { key: "module", header: "Module" },
                  { key: "queryType", header: "Report Type" },
                  { key: "dataSource", header: "Database View/Table" },
                  { key: "createdBy", header: "Created By" },
                  { key: "executionCount", header: "Execution Count" },
                ],
                reports,
              )
            }
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        }
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.displayName}" will be removed from Configuration and the Reports home
              screen. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!historyTarget} onOpenChange={(v) => !v && setHistoryTarget(null)}>
        <DialogContent className="sm:max-w-2xl rounded-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-lg">
              <FileSpreadsheet className="h-4 w-4" /> Execution History —{" "}
              {historyTarget?.displayName}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {historyRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No executions recorded yet.</p>
            ) : (
              historyRows.map((h) => (
                <div
                  key={h.tenantAdhocReportExecutionLogKey}
                  className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
                >
                  <div>
                    <div className="font-medium text-foreground">
                      {h.executedByName ?? "Unknown"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(h.executedOn).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {h.success ? (
                      <>
                        <div>{h.recordCount ?? 0} rows</div>
                        <div>{h.durationMs ?? 0} ms</div>
                      </>
                    ) : (
                      <span className="text-destructive">{h.errorMessage ?? "Failed"}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
