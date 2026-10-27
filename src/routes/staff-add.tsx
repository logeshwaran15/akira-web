import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { BackButton } from "@/components/erp/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Loader2, Check, ChevronsUpDown, Camera, User, KeyRound, Briefcase,
  Plus, X, File as FileIcon,
} from "lucide-react";
import { apiFetch, apiUpload } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff-add")({
  head: () => ({
    meta: [
      { title: "New Staff Member — Akira School ERP" },
      { name: "description", content: "Create a new staff login and profile with role, department and reporting details." },
    ],
  }),
  component: StaffAddPage,
});

type RoleOption = { akiraRoleKey: string; roleCode: string; roleName: string };
type Department = { departmentKey: string; departmentName: string };
type StaffOption = { akiraUserKey: string; userName: string; designation: string };

const STAFF_ROLE_CODES = [
  "TEACHER", "HR", "RECEPTION", "LIBRARIAN", "VICEPRINCIPAL", "ACCOUNTANT", "PRINCIPAL", "TRANSPORT",
];
const DESIGNATIONS = ["PGT", "TGT", "PRT", "PRINCIPAL", "VICE_PRINCIPAL", "COORDINATOR"];
const QUALIFICATIONS = ["B.Ed", "D.T.Ed", "D.El.Ed", "M.Ed", "B.P.Ed"];
const EMPLOYMENT_TYPES = ["REGULAR", "CONTRACT", "VISITING"];

const DOCUMENT_TYPE_OPTIONS = [
  { label: "Resume / CV", value: "RESUME" },
  { label: "Aadhar Card", value: "AADHAR" },
  { label: "Educational Certificate", value: "CERTIFICATE" },
  { label: "Experience Letter", value: "EXPERIENCE_LETTER" },
  { label: "Other", value: "OTHER" },
];

const MAX_DOCUMENTS = 6;

type PendingDocument = { id: string; documentType: string; file: File | null };

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
  reportsToUserKey: "",
  joiningDate: "",
  employmentType: "REGULAR",
  maxWeeklyPeriods: 30,
};

function StaffAddPage() {
  const navigate = useNavigate();

  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [reportsToPickerOpen, setReportsToPickerOpen] = useState(false);

  const [draft, setDraft] = useState(emptyStaff);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([
    { id: "doc-initial", documentType: "RESUME", file: null },
  ]);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/Role"),
      apiFetch("/api/Department"),
      apiFetch("/api/StaffProfile"),
    ])
      .then(([r, d, sp]) => {
        setRoles(r);
        setDepartments(d);
        setStaffOptions(sp);
      })
      .catch(() => {});
  }, []);

  const staffRoles = roles.filter((r) => STAFF_ROLE_CODES.includes(r.roleCode));

  const setField = (name: keyof typeof draft, value: string | number) => {
    setDraft((d) => ({ ...d, [name]: value }));
    setErrors((e) => {
      if (!e[name]) return e;
      const next = { ...e };
      delete next[name];
      return next;
    });
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

  const addDocumentRow = () => {
    if (pendingDocuments.length >= MAX_DOCUMENTS) return;
    setPendingDocuments((docs) => [...docs, { id: crypto.randomUUID(), documentType: "RESUME", file: null }]);
  };

  const removeDocumentRow = (id: string) => {
    setPendingDocuments((docs) => {
      if (docs.length === 1) return [{ id: crypto.randomUUID(), documentType: "RESUME", file: null }];
      return docs.filter((d) => d.id !== id);
    });
  };

  const setDocumentRowType = (id: string, type: string) => {
    setPendingDocuments((docs) => docs.map((d) => (d.id === id ? { ...d, documentType: type } : d)));
  };

  const onDocumentFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) {
      toast.error("Only JPG, PNG, WEBP or PDF files are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Document must be 10MB or smaller.");
      return;
    }
    setPendingDocuments((docs) => docs.map((d) => (d.id === id ? { ...d, file } : d)));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!draft.userName.trim()) next.userName = "Username is required.";
    if (!draft.password.trim()) next.password = "Password is required.";
    if (!draft.email.trim()) next.email = "Email is required.";
    if (!draft.employeeId.trim()) next.employeeId = "Employee ID is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const cancel = () => navigate({ to: "/staff-setup" });

  const submit = async () => {
    if (!validate()) {
      toast.error("Please fill in all required fields.");
      document.getElementById("section-account")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setSaving(true);
    try {
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
            reportsToUserKey: draft.reportsToUserKey || null,
            joiningDate: draft.joiningDate || null,
            employmentType: draft.employmentType,
            maxWeeklyPeriods: draft.maxWeeklyPeriods,
          }),
        },
      );

      if (photoFile) {
        try {
          const formData = new FormData();
          formData.append("file", photoFile);
          await apiUpload(`/api/StaffProfile/${result.akiraUserKey}/photo`, formData);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Staff created, but the photo upload failed.");
        }
      }

      for (const doc of pendingDocuments) {
        if (!doc.file) continue;
        try {
          const formData = new FormData();
          formData.append("file", doc.file);
          formData.append("documentType", doc.documentType);
          await apiUpload(`/api/StaffProfile/${result.akiraUserKey}/documents`, formData);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : `Failed to upload ${doc.file.name}`);
        }
      }

      toast.success("Staff member created");
      navigate({ to: "/staff-setup" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create staff member");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="New Staff Member"
        breadcrumbs={[{ label: "Staff", to: "/staff-setup" }, { label: "New Staff Member" }]}
        actions={<BackButton to="/staff-setup" label="Back to Staff List" className="mb-0" />}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main column — form sections as cards */}
        <div className="space-y-5">
          <div id="section-account" className="rounded-md border border-border bg-card p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold">Login &amp; Account</h3>
                <p className="text-sm text-muted-foreground">Credentials this staff member will use to sign in.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label required>Username</Label>
                <Input
                  value={draft.userName}
                  onChange={(e) => setField("userName", e.target.value)}
                  placeholder="e.g. jane.doe"
                  className={cn("rounded-md", errors.userName && "border-destructive")}
                />
                {errors.userName && <p className="text-xs text-destructive">{errors.userName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label required>Password</Label>
                <Input
                  type="password"
                  value={draft.password}
                  onChange={(e) => setField("password", e.target.value)}
                  placeholder="Enter a temporary password"
                  className={cn("rounded-md", errors.password && "border-destructive")}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>
              <div className="space-y-1.5">
                <Label required>Email</Label>
                <Input
                  type="email"
                  value={draft.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="name@example.com"
                  className={cn("rounded-md", errors.email && "border-destructive")}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Mobile Number</Label>
                <Input
                  value={draft.mobileNo}
                  onChange={(e) => setField("mobileNo", e.target.value)}
                  placeholder="Enter 10-digit mobile number"
                  className="rounded-md"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label required>System Role</Label>
                <Select value={draft.roleCode} onValueChange={(v) => setField("roleCode", v)}>
                  <SelectTrigger className="rounded-md"><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {staffRoles.map((r) => (
                      <SelectItem key={r.akiraRoleKey} value={r.roleCode}>{r.roleName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold">Employment Details</h3>
                <p className="text-sm text-muted-foreground">Designation, department and reporting structure.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label required>Employee ID</Label>
                <Input
                  value={draft.employeeId}
                  onChange={(e) => setField("employeeId", e.target.value)}
                  placeholder="e.g. EMP-1042"
                  className={cn("rounded-md", errors.employeeId && "border-destructive")}
                />
                {errors.employeeId && <p className="text-xs text-destructive">{errors.employeeId}</p>}
              </div>
              <div className="space-y-1.5">
                <Label required>Designation</Label>
                <Select value={draft.designation} onValueChange={(v) => setField("designation", v)}>
                  <SelectTrigger className="rounded-md"><SelectValue placeholder="Select designation" /></SelectTrigger>
                  <SelectContent>
                    {DESIGNATIONS.map((d) => (
                      <SelectItem key={d} value={d}>{d.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Qualification</Label>
                <Select
                  value={draft.qualification || "none"}
                  onValueChange={(v) => setField("qualification", v === "none" ? "" : v)}
                >
                  <SelectTrigger className="rounded-md"><SelectValue placeholder="Select qualification" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {QUALIFICATIONS.map((q) => (
                      <SelectItem key={q} value={q}>{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select
                  value={draft.departmentKey || "none"}
                  onValueChange={(v) => setField("departmentKey", v === "none" ? "" : v)}
                >
                  <SelectTrigger className="rounded-md"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.departmentKey} value={d.departmentKey}>{d.departmentName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Reports To</Label>
                <Popover open={reportsToPickerOpen} onOpenChange={setReportsToPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={reportsToPickerOpen}
                      className="w-full justify-between rounded-md bg-transparent font-normal"
                    >
                      <span className="truncate">
                        {draft.reportsToUserKey
                          ? (() => {
                              const m = staffOptions.find((x) => x.akiraUserKey === draft.reportsToUserKey);
                              return m ? `${m.userName} (${m.designation})` : "Select manager";
                            })()
                          : "None"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Search staff by name..." />
                      <CommandList>
                        <CommandEmpty>No staff member found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              setField("reportsToUserKey", "");
                              setReportsToPickerOpen(false);
                            }}
                          >
                            <Check className={cn("h-4 w-4", !draft.reportsToUserKey ? "opacity-100" : "opacity-0")} />
                            None
                          </CommandItem>
                          {staffOptions.map((s) => (
                            <CommandItem
                              key={s.akiraUserKey}
                              value={`${s.userName} ${s.designation}`}
                              onSelect={() => {
                                setField("reportsToUserKey", s.akiraUserKey);
                                setReportsToPickerOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "h-4 w-4",
                                  draft.reportsToUserKey === s.akiraUserKey ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <span className="truncate">
                                {s.userName} <span className="text-xs text-muted-foreground">({s.designation})</span>
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label>Joining Date</Label>
                <DatePicker
                  value={draft.joiningDate}
                  onChange={(v) => setField("joiningDate", v)}
                  placeholder="dd/mm/yyyy"
                />
              </div>
              <div className="space-y-1.5">
                <Label required>Employment Type</Label>
                <Select value={draft.employmentType} onValueChange={(v) => setField("employmentType", v)}>
                  <SelectTrigger className="rounded-md"><SelectValue placeholder="Select employment type" /></SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
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
                  onChange={(e) => setField("maxWeeklyPeriods", Number(e.target.value))}
                  placeholder="e.g. 30"
                  className="rounded-md"
                />
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-2 rounded-md border border-border bg-card p-4 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] sm:static sm:flex-row sm:items-center sm:justify-between sm:shadow-sm">
            <Button type="button" variant="outline" className="rounded-md" onClick={cancel}>
              Cancel
            </Button>
            <Button type="button" variant="success" className="gap-1.5 rounded-md" disabled={saving} onClick={submit}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? "Creating..." : "Create Staff Member"}
            </Button>
          </div>
        </div>

        {/* Right column — photo */}
        <div className="space-y-5">
          <div className="rounded-md border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 font-display text-sm font-bold">Profile Photo</h3>
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground">
                {photoPreview ? (
                  <img src={photoPreview} alt="Staff" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-10 w-10" />
                )}
              </div>
              <Label
                htmlFor="staff-photo-input"
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-card px-3 text-sm font-medium shadow-sm hover:bg-accent"
              >
                <Camera className="h-3.5 w-3.5" />
                {photoPreview ? "Change Photo" : "Upload Photo"}
              </Label>
              <input
                id="staff-photo-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={onPhotoChange}
              />
              <p className="text-center text-xs text-muted-foreground">JPG, PNG, WEBP or GIF, up to 5MB.</p>
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-bold">Documents</h3>
                <p className="text-xs text-muted-foreground">Resume, ID proof, certificates and other paperwork.</p>
              </div>
              <span className="text-xs text-muted-foreground">{pendingDocuments.length}/{MAX_DOCUMENTS}</span>
            </div>

            <div className="space-y-3">
              {pendingDocuments.map((doc, i) => (
                <div key={doc.id} className="rounded-md border border-border bg-secondary/20 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <select
                      value={doc.documentType}
                      onChange={(e) => setDocumentRowType(doc.id, e.target.value)}
                      className="h-8 flex-1 rounded-md border border-input bg-card px-2 text-xs shadow-sm"
                    >
                      {DOCUMENT_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeDocumentRow(doc.id)}
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove document"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <Label
                    htmlFor={`staff-document-input-${doc.id}`}
                    className="flex h-9 w-full cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-input bg-card px-3 text-xs font-medium hover:bg-accent"
                  >
                    <FileIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{doc.file ? doc.file.name : "Choose file"}</span>
                  </Label>
                  <input
                    id={`staff-document-input-${doc.id}`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => onDocumentFileChange(doc.id, e)}
                  />
                  {i === 0 && <p className="mt-1 text-[11px] text-muted-foreground">JPG, PNG, WEBP or PDF, up to 10MB.</p>}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addDocumentRow}
              disabled={pendingDocuments.length >= MAX_DOCUMENTS}
              className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-input text-sm font-medium text-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> Add Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
