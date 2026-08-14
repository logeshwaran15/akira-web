import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Building2,
  GraduationCap,
  Users,
  ShieldCheck,
  CreditCard,
  ClipboardList,
} from "lucide-react";
import { PageHeader } from "@/components/erp/PageHeader";
import { StatCard } from "@/components/erp/StatCard";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { TenantAdminDashboard } from "@/components/dashboard/TenantAdminDashboard";
import { PageLoader } from "@/components/PageLoader";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Akira School ERP" },
      { name: "description", content: "Overview of your platform or school." },
    ],
  }),
  component: DashboardRouter,
});

function DashboardRouter() {
  const { user, loading } = useCurrentUser();

  if (loading) return <PageLoader />;

  // Kept strictly separate: the platform's own AKIRA-DEFAULT tenant sees the
  // cross-tenant admin dashboard below; every real school tenant gets its
  // own scoped dashboard instead.
  return user && !user.isPlatformTenant ? <TenantAdminDashboard /> : <PlatformDashboardPage />;
}

type TenantRow = { tenantKey: string; tenantName: string; status: string };
type SchoolRow = { akiraSchoolKey: string };
type UserRow = { akiraUserKey: string };
type RoleRow = { akiraRoleKey: string };
type SubscriptionRow = { planName: string | null; status: string };
type AuditRow = {
  akiraAuditLogKey: string;
  action: string;
  entityName: string;
  userName: string | null;
  tenantName: string | null;
  timestamp: string;
};

const actionStyles: Record<string, string> = {
  Create: "bg-success/15 text-success",
  Update: "bg-info/15 text-info",
  Delete: "bg-destructive/15 text-destructive",
  Approve: "bg-primary/15 text-primary",
  Login: "bg-[oklch(0.55_0.1_200)]/15 text-[oklch(0.4_0.12_200)]",
  StatusChange: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
};

const statusColors: Record<string, string> = {
  Active: "oklch(0.72 0.18 42)",
  Draft: "oklch(0.75 0.02 260)",
  Pending: "oklch(0.82 0.16 85)",
  Suspended: "oklch(0.6 0.22 27)",
  Archived: "oklch(0.55 0.02 260)",
};

function PlatformDashboardPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      apiFetch("/api/Tenant"),
      apiFetch("/api/School"),
      apiFetch("/api/User"),
      apiFetch("/api/Role/manage"),
      apiFetch("/api/TenantSubscription"),
      apiFetch("/api/AuditLog"),
    ])
      .then(([t, s, u, r, sub, audit]) => {
        if (t.status === "fulfilled") setTenants(t.value);
        if (s.status === "fulfilled") setSchools(s.value);
        if (u.status === "fulfilled") setUsers(u.value);
        if (r.status === "fulfilled") setRoles(r.value);
        if (sub.status === "fulfilled") setSubscriptions(sub.value);
        if (audit.status === "fulfilled") {
          setAuditTotal(audit.value.length);
          setAuditLogs(audit.value.slice(0, 8));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const activeTenants = tenants.filter((t) => t.status === "Active").length;
  const activeSubscriptions = subscriptions.filter((s) => s.status === "Active").length;

  const statusCounts = tenants.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});
  const statusChartData = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }));

  const planCounts = subscriptions.reduce<Record<string, number>>((acc, s) => {
    const plan = s.planName ?? "Unassigned";
    acc[plan] = (acc[plan] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader title="Admin Dashboard" breadcrumbs={[{ label: "Dashboard" }]} />

      {/* Overview */}
      <section className="rounded-md border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-5 font-display text-lg font-bold">Platform Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Tenants"
            value={loading ? "…" : String(tenants.length)}
            delta={{ value: `${activeTenants} active`, direction: "up" }}
            icon={Building2}
            tone="primary"
          />
          <StatCard
            label="Schools"
            value={loading ? "…" : String(schools.length)}
            delta={{ value: "campuses", direction: "up" }}
            icon={GraduationCap}
            tone="teal"
          />
          <StatCard
            label="Users"
            value={loading ? "…" : String(users.length)}
            delta={{ value: "in your tenant", direction: "up" }}
            icon={Users}
            tone="info"
          />
          <StatCard
            label="Roles"
            value={loading ? "…" : String(roles.length)}
            delta={{ value: "defined", direction: "up" }}
            icon={ShieldCheck}
            tone="purple"
          />
          <StatCard
            label="Subscriptions"
            value={loading ? "…" : String(subscriptions.length)}
            delta={{ value: `${activeSubscriptions} active`, direction: "up" }}
            icon={CreditCard}
            tone="warning"
          />
          <StatCard
            label="Audit Events"
            value={loading ? "…" : String(auditTotal)}
            delta={{ value: "logged", direction: "up" }}
            icon={ClipboardList}
            tone="destructive"
          />
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Tenant status breakdown */}
        <div className="rounded-md border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-6 font-display text-lg font-bold">Tenants by Status</h2>
          <div className="h-72 w-full">
            {statusChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {loading ? "Loading..." : "No tenants yet."}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statusChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.92 0.008 260)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="status"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    stroke="oklch(0.5 0.02 260)"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    stroke="oklch(0.5 0.02 260)"
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "oklch(0.965 0.008 90)" }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid oklch(0.92 0.008 260)",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {statusChartData.map((d) => (
                      <Cell key={d.status} fill={statusColors[d.status] ?? "oklch(0.72 0.18 42)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Subscription plan distribution */}
        <div className="rounded-md bg-[oklch(0.18_0.03_260)] p-6 text-white shadow-sm">
          <h2 className="font-display text-lg font-bold">Subscription Plans</h2>
          <div className="mt-8">
            <div className="text-sm text-white/60">Total Subscriptions</div>
            <div className="mt-1 font-display text-5xl font-bold">{subscriptions.length}</div>
          </div>
          <div className="mt-6 space-y-3 text-sm">
            {Object.entries(planCounts).length === 0 ? (
              <div className="text-white/60">
                {loading ? "Loading..." : "No subscriptions yet."}
              </div>
            ) : (
              Object.entries(planCounts).map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    <span className="text-white/80">{plan}</span>
                  </div>
                  <span className="font-semibold">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="mt-6">
        <div className="rounded-md border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-display text-lg font-bold">Recent Activity</h2>
          {auditLogs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {loading ? "Loading recent activity..." : "No activity recorded yet."}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {auditLogs.map((log) => (
                <div
                  key={log.akiraAuditLogKey}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      className={cn(
                        "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                        actionStyles[log.action] ?? "bg-muted text-muted-foreground",
                      )}
                    >
                      {log.action}
                    </Badge>
                    <div className="text-sm">
                      <span className="font-medium">{log.entityName}</span>
                      {log.userName && (
                        <span className="text-muted-foreground"> by {log.userName}</span>
                      )}
                      {log.tenantName && (
                        <span className="text-muted-foreground"> · {log.tenantName}</span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
