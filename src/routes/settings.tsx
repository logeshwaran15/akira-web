import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Camera, Loader2, Mail, ShieldCheck, User as UserIcon } from "lucide-react";
import { API_BASE_URL, apiFetch, apiUpload } from "@/lib/api";
import {
  useCurrentUser,
  useRefreshCurrentUser,
  useSetCurrentUserProfileImage,
} from "@/hooks/use-current-user";
import { useTenantSetting, useRefreshTenantSetting } from "@/hooks/use-tenant-setting";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Akira School ERP" },
      { name: "description", content: "Manage your Akira ERP profile and photo." },
    ],
  }),
  component: SettingsPage,
});

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function SettingsPage() {
  const { user, loading } = useCurrentUser();
  const refreshCurrentUser = useRefreshCurrentUser();
  const setProfileImage = useSetCurrentUserProfileImage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const displayName = user?.userName ?? "Guest";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const avatarUrl =
    preview ?? (user?.profileImagePath ? `${API_BASE_URL}${user.profileImagePath}` : null);

  const onPick = () => fileInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, WEBP or GIF images are allowed.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Image must be 5MB or smaller.");
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = (await apiUpload("/api/Auth/profile-picture", formData)) as {
        profileImagePath: string;
      };
      setProfileImage(`${result.profileImagePath}?v=${Date.now()}`);
      await refreshCurrentUser();
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo");
      setPreview(null);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localUrl);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" breadcrumbs={[{ label: "System" }, { label: "Settings" }]} />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="rounded-md border border-border bg-card p-6 text-center shadow-sm">
          <div className="relative mx-auto h-28 w-28">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-3xl font-semibold text-primary">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <button
              type="button"
              onClick={onPick}
              disabled={uploading}
              className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
              aria-label="Change profile photo"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={onFileChange}
            />
          </div>

          <div className="mt-4">
            <div className="text-base font-semibold">{loading ? "Loading..." : displayName}</div>
            <div className="text-sm text-muted-foreground">{user?.roleName}</div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="mt-4 h-9 w-full gap-1.5 rounded-md"
            onClick={onPick}
            disabled={uploading}
          >
            <Camera className="h-4 w-4" /> {uploading ? "Uploading..." : "Change Photo"}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">JPG, PNG, WEBP or GIF. Max 5MB.</p>
        </div>

        <div className="rounded-md border border-border bg-card p-6 shadow-sm">
          <h3 className="font-display text-lg font-semibold">Account Details</h3>
          <p className="text-sm text-muted-foreground">Your Akira ERP account information.</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <UserIcon className="h-3.5 w-3.5" /> Username
              </Label>
              <Input value={user?.userName ?? ""} readOnly disabled className="rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> Email
              </Label>
              <Input value={user?.email ?? ""} readOnly disabled className="rounded-md" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> Role
              </Label>
              <Input value={user?.roleName ?? ""} readOnly disabled className="rounded-md" />
            </div>
          </div>
        </div>
      </div>

      {user && !user.isPlatformTenant && <SchoolLogoCard />}
    </div>
  );
}

function SchoolLogoCard() {
  const { setting } = useTenantSetting();
  const refreshTenantSetting = useRefreshTenantSetting();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const logoUrl = preview ?? (setting?.logoUrl ? `${API_BASE_URL}${setting.logoUrl}` : null);

  const onPick = () => fileInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type) && file.type !== "image/svg+xml") {
      toast.error("Only JPG, PNG, WEBP, SVG or GIF images are allowed.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Logo must be 5MB or smaller.");
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      await apiUpload("/api/TenantSetting/logo", formData);
      await refreshTenantSetting();
      toast.success("School logo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload logo");
      setPreview(null);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localUrl);
    }
  };

  return (
    <div className="mt-4 rounded-md border border-border bg-card p-6 shadow-sm">
      <h3 className="font-display text-lg font-semibold">School Logo</h3>
      <p className="text-sm text-muted-foreground">
        Shown at the top of your sidebar in place of the Akira logo.
      </p>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-secondary/40">
          {logoUrl ? (
            <img src={logoUrl} alt="School logo" className="h-full w-full object-contain" />
          ) : (
            <Camera className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div>
          <Button
            type="button"
            variant="outline"
            className="h-9 gap-1.5 rounded-md"
            onClick={onPick}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            {uploading ? "Uploading..." : "Change Logo"}
          </Button>
          <p className="mt-1.5 text-xs text-muted-foreground">
            JPG, PNG, WEBP, SVG or GIF. Max 5MB.
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif"
          className="hidden"
          onChange={onFileChange}
        />
      </div>
    </div>
  );
}
