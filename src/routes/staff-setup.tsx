import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Plus, Pencil, Trash2, BookMarked, Camera, User, Eye } from "lucide-react";
import { apiFetch, apiUpload, API_BASE_URL } from "@/lib/api";
import { useFormatDate } from "@/hooks/use-tenant-setting";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff-setup")({
  head: () => ({
    meta: [
      { title: "Staff List — Akira School ERP" },
      {
        name: "description",
        content: "Manage staff profiles, contact details and subject expertise.",
      },
    ],
  }),
  component: StaffSetupPage,
});

type StaffRow = {
  staffProfileKey: string;
  akiraUserKey: string;
  userName: string;
  email: string;
  mobileNo: string | null;
  profileImagePath: string | null;
  roleCode: string | null;
  roleName: string | null;
  employeeId: string;
  designation: string;
  qualification: string | null;
  departmentKey: string | null;
  departmentName: string | null;
  joiningDate: string | null;
  employmentType: string;
  maxWeeklyPeriods: number;
  isActive: boolean;
};
type RoleOption = { akiraRoleKey: string; roleCode: string; roleName: string };

const STAFF_ROLE_CODES = [
  "TEACHER",
  "HR",
  "RECEPTION",
  "LIBRARIAN",
  "VICEPRINCIPAL",
  "ACCOUNTANT",
  "PRINCIPAL",
  "TRANSPORT",
];
type Department = { departmentKey: string; departmentName: string };
type Subject = { subjectKey: string; subjectName: string };

const DESIGNATIONS = ["PGT", "TGT", "PRT", "PRINCIPAL", "VICE_PRINCIPAL", "COORDINATOR"];
const QUALIFICATIONS = ["B.Ed", "D.T.Ed", "D.El.Ed", "M.Ed", "B.P.Ed"];
const EMPLOYMENT_TYPES = ["REGULAR", "CONTRACT", "VISITING"];

const DESIGNATION_STYLES: Record<string, string> = {
  PGT: "bg-info/15 text-info",
  TGT: "bg-success/15 text-success",
  PRT: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  PRINCIPAL: "bg-primary/15 text-primary",
  VICE_PRINCIPAL: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
  COORDINATOR: "bg-[oklch(0.55_0.1_200)]/15 text-[oklch(0.4_0.12_200)]",
};

const emptyStaff = {
  userName: "",
  password: "",
  email: "",
  mobileNo: "",
  roleCode: "TEACHER",
  employeeId: "",
  designation: "PGT",
  qualification: "",
  departmentKey: "",
  joiningDate: "",
  employmentType: "REGULAR",
  maxWeeklyPeriods: 30,
};

function StaffSetupPage() {
  const formatDate = useFormatDate();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [draft, setDraft] = useState(emptyStaff);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffRow | null>(null);
  const [viewing, setViewing] = useState<StaffRow | null>(null);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const staffRoles = roles.filter((r) => STAFF_ROLE_CODES.includes(r.roleCode));

  const [expertiseFor, setExpertiseFor] = useState<StaffRow | null>(null);
  const [expertiseKeys, setExpertiseKeys] = useState<Set<string>>(new Set());
  const [expertiseSaving, setExpertiseSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/StaffProfile"),
      apiFetch("/api/Department"),
      apiFetch("/api/Subject"),
      apiFetch("/api/Role"),
    ])
      .then(([sp, d, subj, r]) => {
        setStaff(sp);
        setDepartments(d);
        setSubjects(subj);
        setRoles(r);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load staff"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => {
    setEditing(null);
    setDraft(emptyStaff);
    setPhotoFile(null);
    setPhotoPreview(null);
    setOpen(true);
  };
  const openEdit = (s: StaffRow) => {
    setEditing(s);
    setDraft({
      userName: s.userName,
      password: "",
      email: s.email,
      mobileNo: s.mobileNo ?? "",
      roleCode: s.roleCode ?? "TEACHER",
      employeeId: s.employeeId,
      designation: s.designation,
      qualification: s.qualification ?? "",
      departmentKey: s.departmentKey ?? "",
      joiningDate: s.joiningDate?.slice(0, 10) ?? "",
      employmentType: s.employmentType,
      maxWeeklyPeriods: s.maxWeeklyPeriods,
    });
    setPhotoFile(null);
    setPhotoPreview(s.profileImagePath ? `${API_BASE_URL}${s.profileImagePath}` : null);
    setOpen(true);
  };

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Only JPG, PNG, WEBP or GIF images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5MB or smaller.");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async (akiraUserKey: string) => {
    if (!photoFile) return;
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", photoFile);
      await apiUpload(`/api/StaffProfile/${akiraUserKey}/photo`, formData);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Staff record saved, but the photo upload failed.",
      );
    } finally {
      setPhotoUploading(false);
    }
  };

  const saveStaff = async () => {
    if (!editing && (!draft.userName.trim() || !draft.password.trim() || !draft.email.trim())) {
      toast.error("Username, password and email are required for a new staff login.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const body = {
          employeeId: draft.employeeId,
          designation: draft.designation,
          qualification: draft.qualification || null,
          departmentKey: draft.departmentKey || null,
          joiningDate: draft.joiningDate || null,
          employmentType: draft.employmentType,
          maxWeeklyPeriods: draft.maxWeeklyPeriods,
        };
        await apiFetch(`/api/StaffProfile/${editing.staffProfileKey}`, {
          method: "PUT",
          body: JSON.stringify({
            staffProfileKey: editing.staffProfileKey,
            ...body,
            isActive: editing.isActive,
          }),
        });
        if (photoFile) await uploadPhoto(editing.akiraUserKey);
        toast.success("Staff profile updated");
      } else {
        const result: { staffProfileKey: string; akiraUserKey: string } = await apiFetch(
          "/api/StaffProfile/create-with-user",
          {
            method: "POST",
            body: JSON.stringify({
              userName: draft.userName,
              password: draft.password,
              email: draft.email,
              mobileNo: draft.mobileNo,
              roleCode: draft.roleCode,
              employeeId: draft.employeeId,
              designation: draft.designation,
              qualification: draft.qualification || null,
              departmentKey: draft.departmentKey || null,
              joiningDate: draft.joiningDate || null,
              employmentType: draft.employmentType,
              maxWeeklyPeriods: draft.maxWeeklyPeriods,
            }),
          },
        );
        if (photoFile) await uploadPhoto(result.akiraUserKey);
        toast.success("Staff member created");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save staff profile");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/StaffProfile/${deleteTarget.staffProfileKey}`, { method: "DELETE" });
      toast.success("Staff profile removed");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove staff profile");
    }
  };

  const openExpertise = (s: StaffRow) => {
    setExpertiseFor(s);
    apiFetch(`/api/StaffProfile/${s.akiraUserKey}/expertise`)
      .then((d: { subjectKey: string }[]) => setExpertiseKeys(new Set(d.map((x) => x.subjectKey))))
      .catch(() => setExpertiseKeys(new Set()));
  };

  const toggleExpertise = (key: string) => {
    setExpertiseKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const saveExpertise = async () => {
    if (!expertiseFor) return;
    setExpertiseSaving(true);
    try {
      await apiFetch("/api/StaffProfile/expertise", {
        method: "PUT",
        body: JSON.stringify({
          akiraUserKey: expertiseFor.akiraUserKey,
          subjectKeys: Array.from(expertiseKeys),
        }),
      });
      toast.success("Subject expertise saved");
      setExpertiseFor(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save expertise");
    } finally {
      setExpertiseSaving(false);
    }
  };

  const staffColumns: Column<StaffRow>[] = [
    {
      key: "userName",
      header: "Staff",
      sortable: true,
      accessor: (s) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-primary">
            {s.profileImagePath ? (
              <img
                src={`${API_BASE_URL}${s.profileImagePath}`}
                alt={s.userName}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-4 w-4" />
            )}
          </div>
          <div>
            <div className="font-medium">{s.userName}</div>
            <div className="font-mono text-xs text-muted-foreground">{s.employeeId}</div>
          </div>
        </div>
      ),
    },
    {
      key: "designation",
      header: "Designation",
      sortable: true,
      accessor: (s) => (
        <Badge
          className={cn(
            "rounded-md border-0",
            DESIGNATION_STYLES[s.designation] ?? "bg-muted text-muted-foreground",
          )}
        >
          {s.designation}
        </Badge>
      ),
    },
    {
      key: "departmentName",
      header: "Department",
      sortable: true,
      accessor: (s) => s.departmentName ?? "—",
    },
    { key: "employmentType", header: "Employment", sortable: true },
    { key: "maxWeeklyPeriods", header: "Max Periods/wk", sortable: true },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      accessor: (s) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md"
            onClick={() => setViewing(s)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-md"
            onClick={() => openExpertise(s)}
          >
            <BookMarked className="h-3.5 w-3.5" /> Expertise
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md"
            onClick={() => openEdit(s)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md text-destructive"
            onClick={() => setDeleteTarget(s)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Staff List"
        breadcrumbs={[{ label: "Staff" }, { label: "Staff List" }]}
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> New Staff Member
          </Button>
        }
      />

      <DataTable
        data={staff}
        columns={staffColumns}
        rowKey={(s) => s.staffProfileKey}
        searchPlaceholder="Search staff by name, employee ID, designation..."
        searchFields={(s) =>
          `${s.userName} ${s.employeeId} ${s.designation} ${s.departmentName ?? ""} ${s.email}`
        }
        storageKey="staff-list"
        emptyMessage={loading ? "Loading..." : "No staff profiles yet."}
      />

      {/* View staff */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="sm:max-w-lg rounded-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 font-display text-lg">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-primary">
                {viewing?.profileImagePath ? (
                  <img
                    src={`${API_BASE_URL}${viewing.profileImagePath}`}
                    alt={viewing.userName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5" />
                )}
              </div>
              {viewing?.userName}
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              <ViewRow label="Employee ID" value={viewing.employeeId} />
              <ViewRow label="Designation" value={viewing.designation} />
              <ViewRow label="Role" value={viewing.roleName ?? "—"} />
              <ViewRow label="Department" value={viewing.departmentName ?? "—"} />
              <ViewRow label="Qualification" value={viewing.qualification ?? "—"} />
              <ViewRow label="Employment Type" value={viewing.employmentType} />
              <ViewRow
                label="Joining Date"
                value={viewing.joiningDate ? formatDate(viewing.joiningDate) : "—"}
              />
              <ViewRow label="Max Periods/wk" value={String(viewing.maxWeeklyPeriods)} />
              <ViewRow label="Email" value={viewing.email} />
              <ViewRow label="Mobile" value={viewing.mobileNo ?? "—"} />
              <ViewRow label="Status" value={viewing.isActive ? "Active" : "Inactive"} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Staff create/edit */}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Staff Profile" : "New Staff Member"}
        submitLabel={editing ? "Save Changes" : "Create Staff Member"}
        onSubmit={saveStaff}
        submitting={saving || photoUploading}
        size="lg"
      >
        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-primary">
            {photoPreview ? (
              <img src={photoPreview} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <User className="h-6 w-6" />
            )}
          </div>
          <div>
            <Label
              htmlFor="staff-photo-input"
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-card px-3 text-sm font-medium shadow-sm hover:bg-accent"
            >
              <Camera className="h-3.5 w-3.5" /> {photoPreview ? "Change Photo" : "Upload Photo"}
            </Label>
            <input
              id="staff-photo-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={onPhotoChange}
            />
            <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WEBP or GIF, up to 5MB.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!editing && (
            <>
              <div className="space-y-1.5">
                <Label required>Username</Label>
                <Input
                  value={draft.userName}
                  onChange={(e) => setDraft({ ...draft, userName: e.target.value })}
                  className="rounded-md"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label required>Password</Label>
                <Input
                  type="password"
                  value={draft.password}
                  onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                  className="rounded-md"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label required>Email</Label>
                <Input
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  className="rounded-md"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mobile Number</Label>
                <Input
                  value={draft.mobileNo}
                  onChange={(e) => setDraft({ ...draft, mobileNo: e.target.value })}
                  className="rounded-md"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label required>System Role</Label>
                <Select
                  value={draft.roleCode}
                  onValueChange={(v) => setDraft({ ...draft, roleCode: v })}
                >
                  <SelectTrigger className="rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {staffRoles.map((r) => (
                      <SelectItem key={r.akiraRoleKey} value={r.roleCode}>
                        {r.roleName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label required>Employee ID</Label>
            <Input
              value={draft.employeeId}
              onChange={(e) => setDraft({ ...draft, employeeId: e.target.value })}
              className="rounded-md"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label required>Designation</Label>
            <Select
              value={draft.designation}
              onValueChange={(v) => setDraft({ ...draft, designation: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DESIGNATIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Qualification</Label>
            <Select
              value={draft.qualification || "none"}
              onValueChange={(v) => setDraft({ ...draft, qualification: v === "none" ? "" : v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {QUALIFICATIONS.map((q) => (
                  <SelectItem key={q} value={q}>
                    {q}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select
              value={draft.departmentKey || "none"}
              onValueChange={(v) => setDraft({ ...draft, departmentKey: v === "none" ? "" : v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.departmentKey} value={d.departmentKey}>
                    {d.departmentName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Joining Date</Label>
            <DatePicker
              value={draft.joiningDate}
              onChange={(v) => setDraft({ ...draft, joiningDate: v })}
            />
          </div>
          <div className="space-y-1.5">
            <Label required>Employment Type</Label>
            <Select
              value={draft.employmentType}
              onValueChange={(v) => setDraft({ ...draft, employmentType: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label required>Max Weekly Periods</Label>
            <Input
              type="number"
              min={1}
              value={draft.maxWeeklyPeriods}
              onChange={(e) => setDraft({ ...draft, maxWeeklyPeriods: Number(e.target.value) })}
              className="rounded-md"
              required
            />
          </div>
        </div>
      </FormDialog>

      {/* Expertise dialog */}
      <FormDialog
        open={!!expertiseFor}
        onOpenChange={(v) => !v && setExpertiseFor(null)}
        title={`Subject Expertise — ${expertiseFor?.userName ?? ""}`}
        submitLabel="Save"
        onSubmit={saveExpertise}
        submitting={expertiseSaving}
        size="md"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {subjects.map((s) => (
            <label key={s.subjectKey} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={expertiseKeys.has(s.subjectKey)}
                onCheckedChange={() => toggleExpertise(s.subjectKey)}
              />
              {s.subjectName}
            </label>
          ))}
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove staff profile for "{deleteTarget?.userName}"?
            </AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ViewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium text-foreground">{value}</div>
    </div>
  );
}
