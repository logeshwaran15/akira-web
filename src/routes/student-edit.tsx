import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import {
  FormEngine,
  validateFormSchema,
  type FormFieldSchema,
  type FormValues,
} from "@/components/erp/FormEngine";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Camera, User } from "lucide-react";
import { apiFetch, apiUpload, API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/erp/Spinner";

export const Route = createFileRoute("/student-edit")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : "",
  }),
  head: () => ({
    meta: [
      { title: "Edit Student — Akira School ERP" },
      {
        name: "description",
        content: "Edit core identity, compliance, address and medical details for a student.",
      },
    ],
  }),
  component: StudentEditPage,
});

type Student = Record<string, unknown> & {
  studentKey: string;
  studentName: string;
  photoUrl: string | null;
};

const COMMUNITY_OPTIONS = [
  { label: "OC", value: "OC" },
  { label: "BC", value: "BC" },
  { label: "BCM", value: "BCM" },
  { label: "MBC", value: "MBC" },
  { label: "DNC", value: "DNC" },
  { label: "SC", value: "SC" },
  { label: "SCA", value: "SCA" },
  { label: "ST", value: "ST" },
  { label: "OTHERS", value: "OTHERS" },
];

const DISABILITY_OPTIONS = [
  { label: "None", value: "NONE" },
  { label: "Visual", value: "VISUAL" },
  { label: "Hearing", value: "HEARING" },
  { label: "Locomotor", value: "LOCOMOTOR" },
  { label: "Intellectual", value: "INTELLECTUAL" },
  { label: "Multiple", value: "MULTIPLE" },
];

const GENDER_OPTIONS = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
  { label: "Other", value: "OTHER" },
];

function StudentEditPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();

  const [studentName, setStudentName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch(`/api/Student/${id}`)
      .then((d: { student: Student }) => {
        setStudentName(d.student.studentName);
        setValues({ ...d.student });
        setPhotoPreview(d.student.photoUrl ? `${API_BASE_URL}${d.student.photoUrl}` : null);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load student"))
      .finally(() => setLoading(false));
  }, [id]);

  const onPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !id) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Only JPG, PNG, WEBP or GIF images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5MB or smaller.");
      return;
    }

    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result: { photoUrl: string } = await apiUpload(`/api/Student/${id}/photo`, formData);
      setValues((v) => ({ ...v, photoUrl: result.photoUrl }));
      toast.success("Photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setPhotoUploading(false);
    }
  };

  const onFieldChange = (name: string, value: unknown) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[name];
      return next;
    });
  };

  const cancel = () => navigate({ to: "/student-detail", search: { id } });

  const notSameAddress = (v: FormValues) => !v.permanentSameAsCurrent;

  const schema: FormFieldSchema[] = [
    { name: "studentName", label: "Full Name", type: "text", required: true, section: "Identity" },
    { name: "initials", label: "Initials", type: "text", section: "Identity" },
    {
      name: "gender",
      label: "Gender",
      type: "select",
      options: GENDER_OPTIONS,
      section: "Identity",
    },
    { name: "placeOfBirth", label: "Place of Birth", type: "text", section: "Identity" },
    { name: "nationality", label: "Nationality", type: "text", section: "Identity" },
    { name: "motherTongue", label: "Mother Tongue", type: "text", section: "Identity" },
    { name: "religion", label: "Religion", type: "text", section: "Identity" },
    { name: "bloodGroup", label: "Blood Group", type: "text", section: "Identity" },
    { name: "aadharNumber", label: "Aadhar Number", type: "text", section: "Identity", placeholder: "Leave blank to keep unchanged", helpText: "Hidden for privacy. Only enter a value here if you want to change it." },

    { name: "emisNumber", label: "EMIS Number", type: "text", section: "Government & Compliance" },
    {
      name: "studentPENNumber",
      label: "Student PEN Number",
      type: "text",
      section: "Government & Compliance",
    },
    {
      name: "govtScholarshipNumber",
      label: "Govt Scholarship Number",
      type: "text",
      section: "Government & Compliance",
    },
    {
      name: "communityCategory",
      label: "Community Category",
      type: "select",
      options: COMMUNITY_OPTIONS,
      section: "Government & Compliance",
    },
    { name: "subCaste", label: "Sub-Caste", type: "text", section: "Government & Compliance" },
    {
      name: "disabilityCategory",
      label: "Disability Category",
      type: "select",
      options: DISABILITY_OPTIONS,
      section: "Government & Compliance",
    },
    {
      name: "minorityStatus",
      label: "Minority Status",
      type: "checkbox",
      section: "Government & Compliance",
    },
    {
      name: "rteStatus",
      label: "RTE Status",
      type: "checkbox",
      section: "Government & Compliance",
    },
    {
      name: "firstGenerationLearner",
      label: "First Generation Learner",
      type: "checkbox",
      section: "Government & Compliance",
    },
    {
      name: "economicallyWeakerSection",
      label: "Economically Weaker Section",
      type: "checkbox",
      section: "Government & Compliance",
    },

    {
      name: "currentAddressLine1",
      label: "Address Line 1",
      type: "text",
      colSpan: 2,
      section: "Address",
    },
    { name: "currentCity", label: "City", type: "text", section: "Address" },
    { name: "currentState", label: "State", type: "text", section: "Address" },
    { name: "currentPincode", label: "Pincode", type: "text", section: "Address" },
    { name: "permanentSameAsCurrent", label: "Permanent address same as current", type: "checkbox", section: "Address" },
    { name: "permanentAddressLine1", label: "Permanent Address Line 1", type: "text", colSpan: 2, section: "Address", visibleIf: notSameAddress },
    { name: "permanentCity", label: "Permanent City", type: "text", section: "Address", visibleIf: notSameAddress },
    { name: "permanentState", label: "Permanent State", type: "text", section: "Address", visibleIf: notSameAddress },
    { name: "permanentPincode", label: "Permanent Pincode", type: "text", section: "Address", visibleIf: notSameAddress },

    { name: "prevSchoolName", label: "Previous School Name", type: "text", section: "Previous School" },
    { name: "prevSchoolBoard", label: "Previous Board", type: "text", section: "Previous School" },
    { name: "prevClassLastStudied", label: "Class Last Studied", type: "text", section: "Previous School" },

    { name: "knownAllergies", label: "Known Allergies", type: "text", section: "Medical" },
    { name: "emergencyContactName", label: "Emergency Contact", type: "text", section: "Medical" },
    { name: "emergencyContactMobile", label: "Emergency Contact Mobile", type: "tel", section: "Medical" },
  ];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateFormSchema(schema, values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch(`/api/Student/${id}`, {
        method: "PUT",
        body: JSON.stringify({ studentKey: id, ...values }),
      });
      toast.success("Student profile updated");
      navigate({ to: "/student-detail", search: { id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update student");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLoader label="Loading student..." />;
  }

  return (
    <div>
      <PageHeader
        title={`Edit Student — ${studentName}`}
        breadcrumbs={[
          { label: "Students", to: "/students" },
          { label: studentName, to: "/student-detail", search: { id } },
          { label: "Edit" },
        ]}
      />

      <form onSubmit={save} className="space-y-6">
        <div className="rounded-md border border-border bg-card p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-4">
            <div
              className={cn(
                "flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full",
                photoPreview
                  ? ""
                  : values.gender === "MALE"
                    ? "bg-[oklch(0.75_0.13_255)]/15 text-[oklch(0.55_0.18_255)]"
                    : values.gender === "FEMALE"
                      ? "bg-[oklch(0.75_0.13_355)]/15 text-[oklch(0.6_0.19_355)]"
                      : "bg-muted text-muted-foreground",
              )}
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Student" className="h-full w-full object-cover" />
              ) : (
                <User className="h-7 w-7" />
              )}
            </div>
            <div>
              <Label
                htmlFor="student-photo-input"
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-card px-3 text-sm font-medium shadow-sm hover:bg-accent"
              >
                <Camera className="h-3.5 w-3.5" />
                {photoUploading ? "Uploading..." : photoPreview ? "Change Photo" : "Upload Photo"}
              </Label>
              <input
                id="student-photo-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={photoUploading}
                onChange={onPhotoChange}
              />
              <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WEBP or GIF, up to 5MB.</p>
            </div>
          </div>

          <p className="mb-4 text-sm text-muted-foreground">
            Core identity, compliance and contact details. Date of birth and admission number never
            change.
          </p>
          <FormEngine schema={schema} values={values} onChange={onFieldChange} errors={errors} />
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
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
