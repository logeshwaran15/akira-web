import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Settings, ShieldCheck, Building2, User as UserIcon } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Akira School ERP" },
      { name: "description", content: "View your Akira ERP account profile." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading } = useCurrentUser();

  const displayName = user?.userName ?? "Guest";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const avatarUrl = user?.profileImagePath ? `${API_BASE_URL}${user.profileImagePath}` : null;

  return (
    <div>
      <PageHeader title="My Profile" breadcrumbs={[{ label: "System" }, { label: "My Profile" }]} />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="rounded-md border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-3xl font-semibold text-primary">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>

          <div className="mt-4">
            <div className="text-base font-semibold">{loading ? "Loading..." : displayName}</div>
            {user?.roleName && (
              <Badge variant="secondary" className="mt-1.5 rounded-md">
                {user.roleName}
              </Badge>
            )}
          </div>

          <Button asChild variant="outline" className="mt-4 h-9 w-full gap-1.5 rounded-md">
            <Link to="/settings">
              <Settings className="h-4 w-4" /> Edit Profile
            </Link>
          </Button>
        </div>

        <div className="rounded-md border border-border bg-card p-6 shadow-sm">
          <h3 className="font-display text-lg font-semibold">Account Information</h3>
          <p className="text-sm text-muted-foreground">
            A quick look at your Akira ERP account. Head to Settings to change your photo.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-md border border-border p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <UserIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Username</div>
                <div className="truncate text-sm font-medium">{user?.userName ?? "—"}</div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-md border border-border p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-info/10 text-info">
                <Mail className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="truncate text-sm font-medium">{user?.email ?? "—"}</div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-md border border-border p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Role</div>
                <div className="truncate text-sm font-medium">{user?.roleName ?? "—"}</div>
              </div>
            </div>

            {!user?.isPlatformTenant && (
              <div className="flex items-start gap-3 rounded-md border border-border p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-violet-600">
                  <Building2 className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">School / Tenant</div>
                  <div className="truncate text-sm font-medium">{user?.tenantName ?? "—"}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
