import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Plus, Pencil, Ban, CheckCircle2, Archive, Eye, EyeOff, Copy } from "lucide-react";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { useFormatDate } from "@/hooks/use-tenant-setting";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tenants")({
  head: () => ({
    meta: [
      { title: "Tenants — Akira ERP" },
      { name: "description", content: "Onboard schools operating on the Akira platform." },
    ],
  }),
  component: TenantsPage,
});

type TenantRow = {
  tenantKey: string;
  tenantCode: string;
  tenantName: string;
  status: "Draft" | "Pending" | "Active" | "Suspended" | "Archived";
  isActive: boolean;
  createdOn: string;
};

const statusStyles: Record<TenantRow["status"], string> = {
  Draft: "bg-muted text-muted-foreground",
  Pending: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  Active: "bg-success/15 text-success",
  Suspended: "bg-destructive/15 text-destructive",
  Archived: "bg-muted text-muted-foreground",
};

type SchoolDetail = {
  akiraSchoolKey: string;
  schoolName: string;
  schoolCode: string;
  boardType: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

type SubscriptionDetail = {
  akiraTenantKey: string;
  planName: string | null;
  planCode: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
};

type BrandingDetail = { logoUrl: string | null; faviconUrl: string | null };
type AdminCredentials = { userName: string | null; password: string | null; email: string | null };

type TenantViewData = {
  tenant: TenantRow;
  school: SchoolDetail | null;
  subscription: SubscriptionDetail | null;
  branding: BrandingDetail | null;
  admin: AdminCredentials | null;
};

function TenantsPage() {
  const navigate = useNavigate();
  const formatDate = useFormatDate();
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTarget, setStatusTarget] = useState<{
    row: TenantRow;
    action: "suspend" | "activate" | "archive";
  } | null>(null);
  const [applyingStatus, setApplyingStatus] = useState(false);
  const [viewData, setViewData] = useState<TenantViewData | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch("/api/Tenant")
      .then((data: TenantRow[]) => setRows(data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load tenants"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const confirmStatusChange = async () => {
    if (!statusTarget) return;
    setApplyingStatus(true);
    try {
      await apiFetch(`/api/Tenant/${statusTarget.row.tenantKey}/${statusTarget.action}`, {
        method: "POST",
      });
      toast.success(
        `Tenant ${statusTarget.action === "activate" ? "activated" : statusTarget.action === "suspend" ? "suspended" : "archived"}`,
      );
      setStatusTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update tenant status");
    } finally {
      setApplyingStatus(false);
    }
  };

  const openView = async (row: TenantRow) => {
    setShowPassword(false);
    setViewLoading(true);
    setViewData({ tenant: row, school: null, subscription: null, branding: null, admin: null });
    try {
      const [schools, subscriptions, branding, admin] = await Promise.all([
        apiFetch(`/api/School/by-tenant/${row.tenantKey}`).catch(() => []),
        apiFetch("/api/TenantSubscription").catch(() => []),
        apiFetch(`/api/Tenant/${row.tenantKey}/branding`).catch(() => null),
        apiFetch(`/api/Tenant/${row.tenantKey}/admin-credentials`).catch(() => null),
      ]);
      setViewData({
        tenant: row,
        school: schools?.[0] ?? null,
        subscription:
          (subscriptions as SubscriptionDetail[]).find((s) => s.akiraTenantKey === row.tenantKey) ??
          null,
        branding,
        admin,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load tenant details");
    } finally {
      setViewLoading(false);
    }
  };

  const copyToClipboard = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const columns: Column<TenantRow>[] = [
    {
      key: "tenantName",
      header: "Tenant",
      sortable: true,
      accessor: (r) => (
        <div>
          <div className="font-medium">{r.tenantName}</div>
          <div className="font-mono text-xs text-muted-foreground">{r.tenantCode}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (r) => (
        <Badge
          className={cn(
            "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
            statusStyles[r.status],
          )}
        >
          {r.status}
        </Badge>
      ),
    },
    {
      key: "createdOn",
      header: "Created",
      sortable: true,
      accessor: (r) => formatDate(r.createdOn),
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (r) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md"
            onClick={() => openView(r)}
            title="View"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md"
            onClick={() => navigate({ to: "/tenant-form", search: { id: r.tenantKey } })}
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {r.status !== "Active" && r.status !== "Archived" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md text-success"
              title="Activate"
              onClick={() => setStatusTarget({ row: r, action: "activate" })}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {r.status === "Active" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md text-destructive"
              title="Suspend"
              onClick={() => setStatusTarget({ row: r, action: "suspend" })}
            >
              <Ban className="h-3.5 w-3.5" />
            </Button>
          )}
          {r.status !== "Archived" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md text-muted-foreground"
              title="Archive"
              onClick={() => setStatusTarget({ row: r, action: "archive" })}
            >
              <Archive className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Tenants"
        breadcrumbs={[{ label: "Platform" }, { label: "Tenants" }]}
        actions={
          <Button
            className="h-10 gap-1.5 rounded-md shadow-sm"
            onClick={() => navigate({ to: "/tenant-form", search: { id: undefined } })}
          >
            <Plus className="h-4 w-4" /> New Tenant
          </Button>
        }
      />

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.tenantKey}
        selectable
        storageKey="tenants"
        searchPlaceholder="Search tenants..."
        searchFields={(r) => `${r.tenantName} ${r.tenantCode}`}
        dateField={(r) => r.createdOn}
        dateFilterLabel="Created"
        emptyMessage={loading ? "Loading tenants..." : "No tenants yet."}
      />

      <AlertDialog open={!!statusTarget} onOpenChange={(v) => !v && setStatusTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusTarget?.action === "activate" && `Activate "${statusTarget.row.tenantName}"?`}
              {statusTarget?.action === "suspend" && `Suspend "${statusTarget.row.tenantName}"?`}
              {statusTarget?.action === "archive" && `Archive "${statusTarget.row.tenantName}"?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget?.action === "activate" &&
                "This tenant's users will be able to sign in."}
              {statusTarget?.action === "suspend" &&
                "This tenant's users will be immediately blocked from signing in."}
              {statusTarget?.action === "archive" &&
                "This tenant becomes permanently read-only. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applyingStatus}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                statusTarget?.action !== "activate" &&
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
              disabled={applyingStatus}
              onClick={(e) => {
                e.preventDefault();
                confirmStatusChange();
              }}
            >
              {applyingStatus ? "Applying..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!viewData} onOpenChange={(v) => !v && setViewData(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              {viewData?.tenant.tenantName}
            </DialogTitle>
            <DialogDescription>
              Full tenant details, including admin login credentials.
            </DialogDescription>
          </DialogHeader>

          {viewLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : (
            viewData && (
              <div className="max-h-[70vh] space-y-4 overflow-y-auto py-2">
                <div className="rounded-md border border-border p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Tenant
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Code:</span>{" "}
                      <span className="font-mono">{viewData.tenant.tenantCode}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>{" "}
                      <Badge
                        className={cn(
                          "rounded-md border-0 px-1.5 py-0 text-xs font-medium",
                          statusStyles[viewData.tenant.status],
                        )}
                      >
                        {viewData.tenant.status}
                      </Badge>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Created:</span>{" "}
                      {new Date(viewData.tenant.createdOn).toLocaleString()}
                    </div>
                  </div>
                </div>

                {viewData.school && (
                  <div className="rounded-md border border-border p-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      School
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>{" "}
                        {viewData.school.schoolName}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Code:</span>{" "}
                        <span className="font-mono">{viewData.school.schoolCode}</span>
                      </div>
                      {viewData.school.boardType && (
                        <div>
                          <span className="text-muted-foreground">Board:</span>{" "}
                          {viewData.school.boardType}
                        </div>
                      )}
                      {viewData.school.phone && (
                        <div>
                          <span className="text-muted-foreground">Phone:</span>{" "}
                          {viewData.school.phone}
                        </div>
                      )}
                      {viewData.school.email && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Email:</span>{" "}
                          {viewData.school.email}
                        </div>
                      )}
                      {viewData.school.address && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Address:</span>{" "}
                          {viewData.school.address}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {viewData.subscription && (
                  <div className="rounded-md border border-border p-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Subscription
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Plan:</span>{" "}
                        {viewData.subscription.planName}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>{" "}
                        {viewData.subscription.status}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Start:</span>{" "}
                        {formatDate(viewData.subscription.startDate)}
                      </div>
                      {viewData.subscription.endDate && (
                        <div>
                          <span className="text-muted-foreground">End:</span>{" "}
                          {formatDate(viewData.subscription.endDate)}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {viewData.branding?.logoUrl && (
                  <div className="rounded-md border border-border p-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Branding
                    </div>
                    <img
                      src={`${API_BASE_URL}${viewData.branding.logoUrl}`}
                      alt="Logo"
                      className="h-16 w-16 rounded-md border border-border object-contain"
                    />
                  </div>
                )}

                <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
                    Admin Login
                  </div>
                  {viewData.admin?.userName ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-muted-foreground">Username:</span>{" "}
                          <span className="font-mono">{viewData.admin.userName}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-md"
                          onClick={() => copyToClipboard(viewData.admin!.userName!, "Username")}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">Password:</span>
                          <span className="font-mono">
                            {showPassword ? viewData.admin.password : "••••••••"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-md"
                            onClick={() => setShowPassword((s) => !s)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-md"
                            onClick={() => copyToClipboard(viewData.admin!.password!, "Password")}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {viewData.admin.email && (
                        <div>
                          <span className="text-muted-foreground">Email:</span>{" "}
                          {viewData.admin.email}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No admin user found for this tenant.
                    </p>
                  )}
                </div>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
