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
  Loader2, Check, ChevronsUpDown, Camera, User, Briefcase,
} from "lucide-react";
import { apiFetch, apiUpload, API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/erp/Spinner";

export const Route = createFileRoute("/staff-edit")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : "",
  }),
  head: () => ({
    meta: [
      { title: "Edit Staff Profile — Akira School ERP" },
      { name: "description", content: "Edit designation, department and reporting details for a staff member." },
    ],
  }),
  component: StaffEditPage,
});

type StaffRow = {
  staffProfileKey: string;
  akiraUserKey: string;
  userName: string;
  profileImagePath: string | null;
  employeeId: string;
  designation: string;
  qualification: string | null;
  departmentKey: string | null;
  reportsToUserKey: string | null;
  joiningDate: string | null;
  employmentType: string;
  maxWeeklyPeriods: number;
  isActive: boolean;
};
type Department = { departmentKey: string; departmentName: string };
type StaffOption = { akiraUserKey: string; userName: string; designation: string };

const DESIGNATIONS = ["PGT", "TGT", "PRT", "PRINCIPAL", "VICE_PRINCIPAL", "COORDINATOR"];
const QUALIFICATIONS = ["B.Ed", "D.T.Ed", "D.El.Ed", "M.Ed", "B.P.Ed"];
const EMPLOYMENT_TYPES = ["REGULAR", "CONTRACT", "VISITING"];

const emptyDraft = {
  employeeId: "",
  designation: "PGT",
  qualification: "",
  departmentKey: "",
  reportsToUserKey: "",
  joiningDate: "",
  employmentType: "REGULAR",
  maxWeeklyPeriods: 30,
};

function StaffEditPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();

  const [staffName, setStaffName] = useState("");
  const [staffRecord, setStaffRecord] = useState<StaffRow | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reportsToPickerOpen, setReportsToPickerOpen] = useState(false);

  const [draft, setDraft] = useState(emptyDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      apiFetch("/api/StaffProfile"),
      apiFetch("/api/Department"),
    ])
      .then(([sp, d]: [StaffRow[], Department[]]) => {
        const s = sp.find((x) => x.staffProfileKey === id);
        if (!s) {
          toast.error("Staff profile not found");
          return;
        }
        setStaffRecord(s);
        setStaffName(s.userName);
        setDraft({
          employeeId: s.employeeId,
          designation: s.designation,
          qualification: s.qualification ?? "",
          departmentKey: s.departmentKey ?? "",
          reportsToUserKey: s.reportsToUserKey ?? "",
          joiningDate: s.joiningDate?.slice(0, 10) ?? "",
          employmentType: s.employmentType,
          maxWeeklyPeriods: s.maxWeeklyPeriods,
        });
        setPhotoPreview(s.profileImagePath ? `${API_BASE_URL}${s.profileImagePath}` : null);
        setDepartments(d);
        setStaffOptions(sp);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load staff profile"))
      .finally(() => setLoading(false));
  }, [id]);

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

  const validate = () => {
    const next: Record<string, string> = {};
    if (!draft.employeeId.trim()) next.employeeId = "Employee ID is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const cancel = () => navigate({ to: "/staff-setup" });

  const submit = async () => {
    if (!staffRecord) return;
    if (!validate()) {
      toast.error("Please fill in all required fields.");
      document.getElementById("section-employment")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/StaffProfile/${staffRecord.staffProfileKey}`, {
        method: "PUT",
        body: JSON.stringify({
          staffProfileKey: staffRecord.staffProfileKey,
          employeeId: draft.employeeId,
          designation: draft.designation,
          qualification: draft.qualification || null,
          departmentKey: draft.departmentKey || null,
          reportsToUserKey: draft.reportsToUserKey || null,
          joiningDate: draft.joiningDate || null,
          employmentType: draft.employmentType,
          maxWeeklyPeriods: draft.maxWeeklyPeriods,
          isActive: staffRecord.isActive,
        }),
      });

      if (photoFile) {
        setPhotoUploading(true);
        try {
          const formData = new FormData();
          formData.append("file", photoFile);
          await apiUpload(`/api/StaffProfile/${staffRecord.akiraUserKey}/photo`, formData);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Staff updated, but the photo upload failed.");
        } finally {
          setPhotoUploading(false);
        }
      }

      toast.success("Staff profile updated");
      navigate({ to: "/staff-setup" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update staff profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLoader label="Loading staff profile..." />;
  }

  return (
    <div>
      <PageHeader
        title={`Edit Staff Profile — ${staffName}`}
        breadcrumbs={[{ label: "Staff", to: "/staff-setup" }, { label: staffName }, { label: "Edit" }]}
        actions={<BackButton to="/staff-setup" label="Back to Staff List" className="mb-0" />}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main column */}
        <div className="space-y-5">
          <div id="section-employment" className="rounded-md border border-border bg-card p-5 shadow-sm">
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
                          {staffOptions
                            .filter((s) => s.akiraUserKey !== staffRecord?.akiraUserKey)
                            .map((s) => (
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
            <Button type="button" variant="success" className="gap-1.5 rounded-md" disabled={saving || photoUploading} onClick={submit}>
              {saving || photoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving || photoUploading ? "Saving..." : "Save Changes"}
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
        </div>
      </div>
    </div>
  );
}
