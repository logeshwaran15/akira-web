import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Loader2, Save } from "lucide-react";
import { apiFetch, apiUpload, API_BASE_URL } from "@/lib/api";
import { PageLoader } from "@/components/erp/Spinner";
import { useFormatDate } from "@/hooks/use-tenant-setting";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/tenant-form")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Tenant — Akira ERP" },
      { name: "description", content: "Add or edit a tenant on the Akira platform." },
    ],
  }),
  component: TenantFormPage,
});

type PlanOption = { akiraSubscriptionPlanKey: string; planName: string };
type ModuleOption = { akiraModuleKey: string; moduleName: string };
type TenantRecord = { tenantKey: string; tenantCode: string; tenantName: string };
type SchoolRecord = {
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
  status: string;
  startDate: string;
  endDate: string | null;
};
type AdminCredentials = { userName?: string; email?: string } | null;

type Draft = {
  tenantCode: string;
  tenantName: string;
  schoolName: string;
  schoolCode: string;
  boardType: string;
  email: string;
  phone: string;
  address: string;
  akiraSubscriptionPlanKey: string;
  startDate: string;
  enabledModuleKeys: string[];
  faviconUrl: string;
  adminUserName: string;
  adminPassword: string;
  adminEmail: string;
};

const BOARD_TYPES = ["Tamil Nadu State Board", "CBSE", "ICSE", "IB", "IGCSE"];
const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"];

const empty: Draft = {
  tenantCode: "",
  tenantName: "",
  schoolName: "",
  schoolCode: "",
  boardType: "",
  email: "",
  phone: "",
  address: "",
  adminUserName: "",
  adminPassword: "",
  adminEmail: "",
  akiraSubscriptionPlanKey: "",
  startDate: new Date().toISOString().slice(0, 10),
  enabledModuleKeys: [],
  faviconUrl: "",
};

function TenantFormPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const formatDate = useFormatDate();
  const isEditing = !!id;

  const [draft, setDraft] = useState<Draft>(empty);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [schoolKey, setSchoolKey] = useState<string | null>(null);
  const [initialModuleKeys, setInitialModuleKeys] = useState<string[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionDetail | null>(null);
  const [adminCredentials, setAdminCredentials] = useState<AdminCredentials>(null);

  useEffect(() => {
    apiFetch("/api/SubscriptionPlan")
      .then((d: PlanOption[]) => setPlans(d))
      .catch(() => {});
    apiFetch("/api/Module")
      .then((d: ModuleOption[]) => setModules(d))
      .catch(() => {});

    if (!isEditing) {
      apiFetch("/api/Tenant")
        .then((tenants: TenantRecord[]) => {
          const nextNumber = String(tenants.length + 1).padStart(4, "0");
          const defaultCredential = `Tenant${nextNumber}`;
          setDraft((d) => ({
            ...d,
            adminUserName: d.adminUserName || defaultCredential,
            adminPassword: d.adminPassword || defaultCredential,
          }));
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      apiFetch(`/api/Tenant/${id}`) as Promise<TenantRecord>,
      apiFetch(`/api/Tenant/${id}/branding`).catch(() => null),
      apiFetch(`/api/School/by-tenant/${id}`).catch(() => []) as Promise<SchoolRecord[]>,
      apiFetch(`/api/Tenant/${id}/modules`).catch(() => []) as Promise<
        { akiraModuleKey: string; isEnabled: boolean }[]
      >,
      apiFetch("/api/TenantSubscription").catch(() => []) as Promise<SubscriptionDetail[]>,
      apiFetch(`/api/Tenant/${id}/admin-credentials`).catch(
        () => null,
      ) as Promise<AdminCredentials>,
    ])
      .then(([tenant, branding, schools, tenantModules, subscriptions, admin]) => {
        const school = schools?.[0] ?? null;
        const enabledKeys = (tenantModules ?? [])
          .filter((m) => m.isEnabled)
          .map((m) => m.akiraModuleKey);

        setDraft((d) => ({
          ...d,
          tenantCode: tenant.tenantCode,
          tenantName: tenant.tenantName,
          faviconUrl: branding?.faviconUrl ?? "",
          schoolName: school?.schoolName ?? "",
          schoolCode: school?.schoolCode ?? "",
          boardType: school?.boardType ?? "",
          email: school?.email ?? "",
          phone: school?.phone ?? "",
          address: school?.address ?? "",
          enabledModuleKeys: enabledKeys,
          adminUserName: admin?.userName ?? "",
          adminEmail: admin?.email ?? "",
        }));
        setSchoolKey(school?.akiraSchoolKey ?? null);
        setInitialModuleKeys(enabledKeys);
        setSubscription(subscriptions.find((s) => s.akiraTenantKey === id) ?? null);
        setAdminCredentials(admin);
        if (branding?.logoUrl) setLogoPreview(`${API_BASE_URL}${branding.logoUrl}`);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load tenant"))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleModule = (key: string) => {
    setDraft((d) => ({
      ...d,
      enabledModuleKeys: d.enabledModuleKeys.includes(key)
        ? d.enabledModuleKeys.filter((k) => k !== key)
        : [...d.enabledModuleKeys, key],
    }));
  };

  const onPickLogo = () => fileInputRef.current?.click();

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, WEBP, SVG or GIF images are allowed.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Logo must be 5MB or smaller.");
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const uploadLogoIfNeeded = async (tenantKey: string) => {
    if (!logoFile) return;
    const formData = new FormData();
    formData.append("file", logoFile);
    await apiUpload(`/api/Tenant/${tenantKey}/branding/logo`, formData);
  };

  const cancel = () => navigate({ to: "/tenants" });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing && id) {
        await apiFetch(`/api/Tenant/${id}`, {
          method: "PUT",
          body: JSON.stringify({
            akiraTenantKey: id,
            tenantCode: draft.tenantCode,
            tenantName: draft.tenantName,
          }),
        });

        if (schoolKey) {
          await apiFetch(`/api/School/${schoolKey}`, {
            method: "PUT",
            body: JSON.stringify({
              akiraSchoolKey: schoolKey,
              schoolName: draft.schoolName,
              schoolCode: draft.schoolCode,
              boardType: draft.boardType || null,
              email: draft.email || null,
              phone: draft.phone || null,
              address: draft.address || null,
              isActive: true,
            }),
          });
        }

        const addedModules = draft.enabledModuleKeys.filter((k) => !initialModuleKeys.includes(k));
        const removedModules = initialModuleKeys.filter(
          (k) => !draft.enabledModuleKeys.includes(k),
        );
        await Promise.all([
          ...addedModules.map((moduleKey) =>
            apiFetch(`/api/Tenant/${id}/modules/${moduleKey}`, {
              method: "PUT",
              body: JSON.stringify({ isEnabled: true }),
            }),
          ),
          ...removedModules.map((moduleKey) =>
            apiFetch(`/api/Tenant/${id}/modules/${moduleKey}`, {
              method: "PUT",
              body: JSON.stringify({ isEnabled: false }),
            }),
          ),
        ]);

        if (draft.faviconUrl || logoFile) {
          await apiFetch(`/api/Tenant/${id}/branding`, {
            method: "PUT",
            body: JSON.stringify({ akiraTenantKey: id, faviconUrl: draft.faviconUrl || null }),
          });
        }
        await uploadLogoIfNeeded(id);
        toast.success("Tenant updated");
      } else {
        if (!draft.akiraSubscriptionPlanKey) {
          toast.error("Select a subscription plan.");
          setSaving(false);
          return;
        }
        if (!draft.adminUserName || !draft.adminPassword || !draft.adminEmail) {
          toast.error("Set an admin username, email and password for this tenant.");
          setSaving(false);
          return;
        }

        const result = await apiFetch("/api/Tenant/onboard", {
          method: "POST",
          body: JSON.stringify({
            tenantCode: draft.tenantCode,
            tenantName: draft.tenantName,
            schoolName: draft.schoolName,
            schoolCode: draft.schoolCode,
            boardType: draft.boardType || null,
            email: draft.email || null,
            phone: draft.phone || null,
            address: draft.address || null,
            akiraSubscriptionPlanKey: draft.akiraSubscriptionPlanKey,
            startDate: draft.startDate,
            enabledModuleKeys: draft.enabledModuleKeys,
            faviconUrl: draft.faviconUrl || null,
            adminUserName: draft.adminUserName,
            adminPassword: draft.adminPassword,
            adminEmail: draft.adminEmail,
          }),
        });

        await uploadLogoIfNeeded(result.tenantKey);
        toast.success("Tenant onboarded — admin account, school, subscription and modules created");
      }

      navigate({ to: "/tenants" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save tenant");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLoader label="Loading tenant..." />;
  }

  return (
    <div>
      <PageHeader
        title={isEditing ? "Edit Tenant" : "Onboard New Tenant"}
        breadcrumbs={[
          { label: "Platform" },
          { label: "Tenants", to: "/tenants" },
          { label: isEditing ? "Edit" : "New" },
        ]}
      />

      <form onSubmit={save} className="space-y-6">
        <div className="rounded-md border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-display text-base font-semibold">Tenant Identity</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label required>Tenant Name</Label>
              <Input
                value={draft.tenantName}
                onChange={(e) => setDraft({ ...draft, tenantName: e.target.value })}
                placeholder="Enter your school or organization name"
                className="rounded-md"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label required>Tenant Code</Label>
              <Input
                value={draft.tenantCode}
                onChange={(e) => setDraft({ ...draft, tenantCode: e.target.value.toUpperCase() })}
                placeholder="Enter a unique tenant code"
                className="rounded-md"
                required
              />
            </div>
          </div>
        </div>

        <>
          <div className="rounded-md border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 font-display text-base font-semibold">School Profile</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label required>School Name</Label>
                <Input
                  value={draft.schoolName}
                  onChange={(e) => setDraft({ ...draft, schoolName: e.target.value })}
                  placeholder="Enter your school name"
                  className="rounded-md"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label required>School Code</Label>
                <Input
                  value={draft.schoolCode}
                  onChange={(e) => setDraft({ ...draft, schoolCode: e.target.value.toUpperCase() })}
                  placeholder="Enter a unique school code"
                  className="rounded-md"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Board Type</Label>
                <Select
                  value={draft.boardType || "none"}
                  onValueChange={(v) => setDraft({ ...draft, boardType: v === "none" ? "" : v })}
                >
                  <SelectTrigger className="rounded-md">
                    <SelectValue placeholder="Choose your affiliation board" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {BOARD_TYPES.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={draft.phone}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                  placeholder="Enter your contact number"
                  className="rounded-md"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  placeholder="Enter your school email"
                  className="rounded-md"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input
                  value={draft.address}
                  onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                  placeholder="Enter your school address"
                  className="rounded-md"
                />
              </div>
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-1 font-display text-base font-semibold">Admin Account</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              {isEditing
                ? "This tenant's first ADMIN login. Passwords cannot be changed from here."
                : "This creates the first login for this tenant, with the ADMIN role."}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label required={!isEditing}>Admin Username</Label>
                <Input
                  value={draft.adminUserName}
                  onChange={(e) => setDraft({ ...draft, adminUserName: e.target.value })}
                  placeholder="Enter an admin username"
                  className="rounded-md"
                  required={!isEditing}
                  disabled={isEditing}
                />
              </div>
              {!isEditing && (
                <div className="space-y-1.5">
                  <Label required>Admin Password</Label>
                  <Input
                    type="password"
                    value={draft.adminPassword}
                    onChange={(e) => setDraft({ ...draft, adminPassword: e.target.value })}
                    placeholder="Enter a password"
                    className="rounded-md"
                    required
                  />
                </div>
              )}
              <div className={isEditing ? "space-y-1.5" : "sm:col-span-2 space-y-1.5"}>
                <Label required={!isEditing}>Admin Email</Label>
                <Input
                  type="email"
                  value={draft.adminEmail}
                  onChange={(e) => setDraft({ ...draft, adminEmail: e.target.value })}
                  placeholder="Enter the admin's email address"
                  className="rounded-md"
                  required={!isEditing}
                  disabled={isEditing}
                />
              </div>
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 font-display text-base font-semibold">Subscription</h2>
            {isEditing ? (
              <div className="space-y-2 text-sm">
                {subscription ? (
                  <>
                    <div>
                      <span className="text-muted-foreground">Plan:</span>{" "}
                      {subscription.planName ?? "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span> {subscription.status}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Start:</span>{" "}
                      {formatDate(subscription.startDate)}
                    </div>
                    {subscription.endDate && (
                      <div>
                        <span className="text-muted-foreground">End:</span>{" "}
                        {formatDate(subscription.endDate)}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">No subscription found for this tenant.</p>
                )}
                <Link to="/subscriptions" className="inline-block text-sm text-primary underline">
                  Manage subscription →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label required>Plan</Label>
                  <Select
                    value={draft.akiraSubscriptionPlanKey}
                    onValueChange={(v) => setDraft({ ...draft, akiraSubscriptionPlanKey: v })}
                  >
                    <SelectTrigger className="rounded-md">
                      <SelectValue placeholder="Choose a subscription plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((p) => (
                        <SelectItem
                          key={p.akiraSubscriptionPlanKey}
                          value={p.akiraSubscriptionPlanKey}
                        >
                          {p.planName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label required>Start Date</Label>
                  <DatePicker
                    value={draft.startDate}
                    onChange={(v) => setDraft({ ...draft, startDate: v })}
                    required
                  />
                </div>
              </div>
            )}
          </div>

          <div className="rounded-md border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 font-display text-base font-semibold">Enabled Modules</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {modules.map((m) => (
                <label key={m.akiraModuleKey} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={draft.enabledModuleKeys.includes(m.akiraModuleKey)}
                    onCheckedChange={() => toggleModule(m.akiraModuleKey)}
                  />
                  {m.moduleName}
                </label>
              ))}
            </div>
          </div>
        </>

        <div className="rounded-md border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-display text-base font-semibold">Branding</h2>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="relative h-24 w-24 shrink-0">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-md border border-border bg-secondary/40">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <Camera className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <button
                type="button"
                onClick={onPickLogo}
                className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                aria-label="Upload logo"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif"
                className="hidden"
                onChange={onLogoChange}
              />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 gap-1.5 rounded-md"
                  onClick={onPickLogo}
                >
                  <Camera className="h-4 w-4" /> Choose Logo
                </Button>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  JPG, PNG, WEBP, SVG or GIF. Max 5MB.
                </p>
              </div>
              <div className="max-w-sm space-y-1.5">
                <Label>Favicon URL</Label>
                <Input
                  value={draft.faviconUrl}
                  onChange={(e) => setDraft({ ...draft, faviconUrl: e.target.value })}
                  placeholder="Enter a favicon link"
                  className="rounded-md"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border border-border bg-card p-4 shadow-sm">
          <Button
            type="button"
            variant="outline"
            className="rounded-md border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={cancel}
          >
            Cancel
          </Button>
          <Button type="submit" className="gap-1.5 rounded-md" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Tenant"}
          </Button>
        </div>
      </form>
    </div>
  );
}
