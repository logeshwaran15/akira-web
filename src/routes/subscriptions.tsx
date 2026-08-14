import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Save, Ban, RefreshCcw, CreditCard } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { apiFetch } from "@/lib/api";
import { useFormatDate } from "@/hooks/use-tenant-setting";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/subscriptions")({
  head: () => ({
    meta: [
      { title: "Subscriptions — Akira ERP" },
      { name: "description", content: "Manage subscription plans and assign them to tenants." },
    ],
  }),
  component: SubscriptionsPage,
});

type PlanRow = {
  akiraSubscriptionPlanKey: string;
  planCode: string;
  planName: string;
  maxStudents: number;
  maxStaff: number;
  storageLimitMB: number;
  whatsAppLimit: number;
  smsLimit: number;
  isActive: boolean;
};

type TenantSubRow = {
  akiraTenantSubscriptionKey: string;
  akiraTenantKey: string;
  tenantName: string | null;
  akiraSubscriptionPlanKey: string;
  planName: string | null;
  planCode: string | null;
  startDate: string;
  endDate: string | null;
  status: "Trial" | "Active" | "Expired" | "Cancelled";
  createdOn: string;
};

type TenantOption = { tenantKey: string; tenantName: string };

type PlanDraft = {
  akiraSubscriptionPlanKey: string;
  planCode: string;
  planName: string;
  maxStudents: string;
  maxStaff: string;
  storageLimitMB: string;
  whatsAppLimit: string;
  smsLimit: string;
};

const emptyPlan: PlanDraft = {
  akiraSubscriptionPlanKey: "",
  planCode: "",
  planName: "",
  maxStudents: "0",
  maxStaff: "0",
  storageLimitMB: "0",
  whatsAppLimit: "0",
  smsLimit: "0",
};

const statusStyles: Record<TenantSubRow["status"], string> = {
  Trial: "bg-info/15 text-info",
  Active: "bg-success/15 text-success",
  Expired: "bg-muted text-muted-foreground",
  Cancelled: "bg-destructive/15 text-destructive",
};

function SubscriptionsPage() {
  const formatDate = useFormatDate();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [subs, setSubs] = useState<TenantSubRow[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(true);

  const [editingPlan, setEditingPlan] = useState<PlanDraft | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);

  const [assignTenant, setAssignTenant] = useState("");
  const [assignPlan, setAssignPlan] = useState("");
  const [assignStart, setAssignStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [assignEnd, setAssignEnd] = useState("");
  const [assignStatus, setAssignStatus] = useState<TenantSubRow["status"]>("Trial");
  const [assigning, setAssigning] = useState(false);

  const loadPlans = () => {
    setLoadingPlans(true);
    apiFetch("/api/SubscriptionPlan")
      .then((data: PlanRow[]) => setPlans(data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load plans"))
      .finally(() => setLoadingPlans(false));
  };

  const loadSubs = () => {
    setLoadingSubs(true);
    apiFetch("/api/TenantSubscription")
      .then((data: TenantSubRow[]) => setSubs(data))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load subscriptions"),
      )
      .finally(() => setLoadingSubs(false));
  };

  useEffect(() => {
    loadPlans();
    loadSubs();
    apiFetch("/api/Tenant")
      .then((data: TenantOption[]) => setTenants(data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load tenants"));
  }, []);

  const openEditPlan = (p: PlanRow) =>
    setEditingPlan({
      akiraSubscriptionPlanKey: p.akiraSubscriptionPlanKey,
      planCode: p.planCode,
      planName: p.planName,
      maxStudents: String(p.maxStudents),
      maxStaff: String(p.maxStaff),
      storageLimitMB: String(p.storageLimitMB),
      whatsAppLimit: String(p.whatsAppLimit),
      smsLimit: String(p.smsLimit),
    });

  const savePlan = async () => {
    if (!editingPlan) return;
    setSavingPlan(true);
    try {
      await apiFetch(`/api/SubscriptionPlan/${editingPlan.akiraSubscriptionPlanKey}`, {
        method: "PUT",
        body: JSON.stringify({
          akiraSubscriptionPlanKey: editingPlan.akiraSubscriptionPlanKey,
          planCode: editingPlan.planCode,
          planName: editingPlan.planName,
          maxStudents: Number(editingPlan.maxStudents) || 0,
          maxStaff: Number(editingPlan.maxStaff) || 0,
          storageLimitMB: Number(editingPlan.storageLimitMB) || 0,
          whatsAppLimit: Number(editingPlan.whatsAppLimit) || 0,
          smsLimit: Number(editingPlan.smsLimit) || 0,
          isActive: true,
        }),
      });
      toast.success("Plan updated");
      setEditingPlan(null);
      loadPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update plan");
    } finally {
      setSavingPlan(false);
    }
  };

  const assignSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTenant || !assignPlan) {
      toast.error("Select a tenant and a plan.");
      return;
    }
    setAssigning(true);
    try {
      await apiFetch("/api/TenantSubscription", {
        method: "POST",
        body: JSON.stringify({
          akiraTenantKey: assignTenant,
          akiraSubscriptionPlanKey: assignPlan,
          startDate: assignStart,
          endDate: assignEnd || null,
          status: assignStatus,
        }),
      });
      toast.success("Subscription assigned");
      setAssignTenant("");
      setAssignPlan("");
      setAssignEnd("");
      setAssignStatus("Trial");
      loadSubs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign subscription");
    } finally {
      setAssigning(false);
    }
  };

  const setSubStatus = async (row: TenantSubRow, status: TenantSubRow["status"]) => {
    try {
      await apiFetch(`/api/TenantSubscription/${row.akiraTenantSubscriptionKey}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      toast.success(`Marked ${status}`);
      loadSubs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        breadcrumbs={[{ label: "Platform" }, { label: "Subscriptions" }]}
      />

      {/* Plans */}
      <div className="rounded-md border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h3 className="font-display text-base font-semibold">Subscription Plans</h3>
            <p className="text-xs text-muted-foreground">
              Trial, Basic, Premium and Enterprise limits.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Plan
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Students
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Staff
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Storage (MB)
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  WhatsApp
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  SMS
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Edit
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingPlans ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                    Loading plans...
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((p) => {
                  const isEditing =
                    editingPlan?.akiraSubscriptionPlanKey === p.akiraSubscriptionPlanKey;
                  return (
                    <TableRow key={p.akiraSubscriptionPlanKey} className="border-border">
                      <TableCell className="text-sm font-medium">
                        {isEditing ? (
                          <Input
                            value={editingPlan.planName}
                            onChange={(e) =>
                              setEditingPlan({ ...editingPlan, planName: e.target.value })
                            }
                            className="h-8 w-40 rounded-md"
                          />
                        ) : (
                          p.planName
                        )}
                      </TableCell>
                      {(
                        [
                          "maxStudents",
                          "maxStaff",
                          "storageLimitMB",
                          "whatsAppLimit",
                          "smsLimit",
                        ] as const
                      ).map((field) => (
                        <TableCell key={field} className="text-sm">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editingPlan[field]}
                              onChange={(e) =>
                                setEditingPlan({ ...editingPlan, [field]: e.target.value })
                              }
                              className="h-8 w-24 rounded-md"
                            />
                          ) : (
                            p[field].toLocaleString()
                          )}
                        </TableCell>
                      ))}
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              className="h-8 w-8 rounded-md"
                              onClick={savePlan}
                              disabled={savingPlan}
                            >
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-md"
                              onClick={() => setEditingPlan(null)}
                              disabled={savingPlan}
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-md"
                            onClick={() => openEditPlan(p)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Assign subscription — inline form */}
      <div className="rounded-md border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-display text-base font-semibold">Assign Subscription</h3>
          <p className="text-xs text-muted-foreground">Give a tenant a plan for a date range.</p>
        </div>
        <form
          onSubmit={assignSubscription}
          className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          <div className="space-y-1.5">
            <Label required className="text-xs">
              Tenant
            </Label>
            <Select value={assignTenant} onValueChange={setAssignTenant}>
              <SelectTrigger className="h-9 rounded-md">
                <SelectValue placeholder="Select tenant" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.tenantKey} value={t.tenantKey}>
                    {t.tenantName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label required className="text-xs">
              Plan
            </Label>
            <Select value={assignPlan} onValueChange={setAssignPlan}>
              <SelectTrigger className="h-9 rounded-md">
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.akiraSubscriptionPlanKey} value={p.akiraSubscriptionPlanKey}>
                    {p.planName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label required className="text-xs">
              Start Date
            </Label>
            <DatePicker value={assignStart} onChange={setAssignStart} required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">End Date</Label>
            <DatePicker
              value={assignEnd}
              onChange={setAssignEnd}
              min={assignStart}
              placeholder="No end date"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select
              value={assignStatus}
              onValueChange={(v) => setAssignStatus(v as TenantSubRow["status"])}
            >
              <SelectTrigger className="h-9 rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["Trial", "Active", "Expired", "Cancelled"] as const).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 lg:col-span-5">
            <Button type="submit" className="h-9 gap-1.5 rounded-md" disabled={assigning}>
              <CreditCard className="h-4 w-4" />{" "}
              {assigning ? "Assigning..." : "Assign Subscription"}
            </Button>
          </div>
        </form>

        <div className="overflow-x-auto border-t border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tenant
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Plan
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Start
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  End
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingSubs ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                    Loading subscriptions...
                  </TableCell>
                </TableRow>
              ) : subs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                    No subscriptions assigned yet.
                  </TableCell>
                </TableRow>
              ) : (
                subs.map((s) => (
                  <TableRow key={s.akiraTenantSubscriptionKey} className="border-border">
                    <TableCell className="text-sm font-medium">{s.tenantName ?? "—"}</TableCell>
                    <TableCell className="text-sm">{s.planName ?? "—"}</TableCell>
                    <TableCell className="text-sm">{formatDate(s.startDate)}</TableCell>
                    <TableCell className="text-sm">
                      {s.endDate ? formatDate(s.endDate) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                          statusStyles[s.status],
                        )}
                      >
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {s.status !== "Active" && s.status !== "Cancelled" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-md text-success"
                            title="Activate"
                            onClick={() => setSubStatus(s, "Active")}
                          >
                            <RefreshCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {s.status !== "Cancelled" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-md text-destructive"
                            title="Cancel"
                            onClick={() => setSubStatus(s, "Cancelled")}
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
