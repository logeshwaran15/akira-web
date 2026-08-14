import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormEngine, validateFormSchema, type FormFieldSchema, type FormValues } from "@/components/erp/FormEngine";
import { Button } from "@/components/ui/button";
import { Loader2, Save, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PageLoader } from "@/components/erp/Spinner";

export const Route = createFileRoute("/admissions-inquiry-form")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Inquiry — Akira School ERP" },
      { name: "description", content: "Record or update an admission inquiry." },
    ],
  }),
  component: InquiryFormPage,
});

type SchoolClass = { schoolClassKey: string; className: string };
type AcademicYear = { academicYearKey: string; yearName: string };
type Stream = { streamKey: string; streamName: string };
type UserOption = { akiraUserKey: string; userName: string };

type InquiryRecord = {
  inquiryKey: string; studentName: string; dateOfBirth: string | null; gender: string | null;
  classApplyingForKey: string; academicYearApplyingForKey: string; streamKey: string | null;
  hasSiblingInSchool: boolean; siblingName: string | null;
  fatherName: string | null; motherName: string | null; primaryMobile: string; email: string | null; locality: string | null;
  previousSchoolName: string | null; previousClassStudied: string | null;
  sourceOfInquiry: string; referredBy: string | null;
  assignedCounsellorUserKey: string | null; nextFollowUpDate: string | null; remarks: string | null;
};

const SOURCE_OPTIONS = [
  { label: "Walk-in", value: "WALK_IN" }, { label: "Phone", value: "PHONE" }, { label: "Website", value: "WEBSITE" },
  { label: "Social Media", value: "SOCIAL_MEDIA" }, { label: "Referral", value: "REFERRAL" }, { label: "Camp", value: "CAMP" }, { label: "Newspaper", value: "NEWSPAPER" },
];

function InquiryFormPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(isEditing);

  const [values, setValues] = useState<FormValues>({ sourceOfInquiry: "WALK_IN" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/SchoolClass"),
      apiFetch("/api/AcademicYear"),
      apiFetch("/api/Stream"),
      apiFetch("/api/User"),
    ])
      .then(([c, y, s, u]) => { setClasses(c); setYears(y); setStreams(s); setUsers(u); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch(`/api/Inquiry`)
      .then((all: InquiryRecord[]) => {
        const i = all.find((x) => x.inquiryKey === id);
        if (!i) { toast.error("Inquiry not found"); return; }
        setValues({
          studentName: i.studentName, dateOfBirth: i.dateOfBirth?.slice(0, 10) ?? "", gender: i.gender ?? "",
          classApplyingForKey: i.classApplyingForKey, academicYearApplyingForKey: i.academicYearApplyingForKey, streamKey: i.streamKey ?? "",
          hasSiblingInSchool: i.hasSiblingInSchool, siblingName: i.siblingName ?? "",
          fatherName: i.fatherName ?? "", motherName: i.motherName ?? "", primaryMobile: i.primaryMobile, email: i.email ?? "", locality: i.locality ?? "",
          previousSchoolName: i.previousSchoolName ?? "", previousClassStudied: i.previousClassStudied ?? "",
          sourceOfInquiry: i.sourceOfInquiry, referredBy: i.referredBy ?? "", assignedCounsellorUserKey: i.assignedCounsellorUserKey ?? "",
          nextFollowUpDate: i.nextFollowUpDate?.slice(0, 10) ?? "", remarks: i.remarks ?? "",
        });
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load inquiry"))
      .finally(() => setLoading(false));
  }, [id]);

  const classOptions = classes.map((c) => ({ label: c.className, value: c.schoolClassKey }));
  const yearOptions = years.map((y) => ({ label: y.yearName, value: y.academicYearKey }));
  const streamOptions = streams.map((s) => ({ label: s.streamName, value: s.streamKey }));
  const counsellorOptions = users.map((u) => ({ label: u.userName, value: u.akiraUserKey }));

  const isClassXI = (v: FormValues) => classes.find((c) => c.schoolClassKey === v.classApplyingForKey)?.className === "Class XI";

  const schema: FormFieldSchema[] = [
    { name: "studentName", label: "Student Name (as told by parent)", type: "text", required: true, placeholder: "Enter student's name", section: "Student" },
    { name: "dateOfBirth", label: "Date of Birth (approximate)", type: "date", section: "Student" },
    { name: "gender", label: "Gender", type: "select", options: [{ label: "Male", value: "MALE" }, { label: "Female", value: "FEMALE" }, { label: "Other", value: "OTHER" }], placeholder: "Select gender", section: "Student" },
    { name: "classApplyingForKey", label: "Class Applying For", type: "select", required: true, options: classOptions, placeholder: "Select class", section: "Student" },
    { name: "academicYearApplyingForKey", label: "Academic Year Applying For", type: "select", required: true, options: yearOptions, placeholder: "Select academic year", section: "Student" },
    { name: "streamKey", label: "Stream", type: "select", options: streamOptions, requiredIf: isClassXI, visibleIf: isClassXI, placeholder: "Select stream", section: "Student", helpText: "Mandatory for Class XI applicants." },
    { name: "hasSiblingInSchool", label: "Sibling already studying in this school", type: "checkbox", section: "Student" },
    { name: "siblingName", label: "Sibling Name", type: "text", placeholder: "Enter sibling's name", visibleIf: (v) => !!v.hasSiblingInSchool, section: "Student" },

    { name: "fatherName", label: "Father Name", type: "text", placeholder: "Enter father's name", section: "Family & Contact" },
    { name: "motherName", label: "Mother Name", type: "text", placeholder: "Enter mother's name", section: "Family & Contact" },
    { name: "primaryMobile", label: "Primary Contact Mobile", type: "tel", required: true, placeholder: "Enter mobile number", section: "Family & Contact" },
    { name: "email", label: "Email", type: "email", placeholder: "Enter email address", section: "Family & Contact" },
    { name: "locality", label: "Residential Area / Locality", type: "text", placeholder: "Enter locality", section: "Family & Contact" },

    { name: "previousSchoolName", label: "Previous School Name", type: "text", placeholder: "Enter previous school name", section: "Previous School" },
    { name: "previousClassStudied", label: "Previous Class Studied", type: "text", placeholder: "Enter previous class studied", section: "Previous School" },

    { name: "sourceOfInquiry", label: "Source of Inquiry", type: "select", required: true, options: SOURCE_OPTIONS, placeholder: "Select source", section: "Follow-up" },
    { name: "referredBy", label: "Referred By", type: "text", placeholder: "Enter referrer's name", visibleIf: (v) => v.sourceOfInquiry === "REFERRAL", section: "Follow-up" },
    { name: "assignedCounsellorUserKey", label: "Assigned Counsellor", type: "select", options: counsellorOptions, placeholder: "Select counsellor", section: "Follow-up" },
    { name: "nextFollowUpDate", label: "Next Follow-up Date", type: "date", section: "Follow-up" },
    { name: "remarks", label: "Remarks / Notes", type: "textarea", colSpan: 2, placeholder: "Enter any additional notes", section: "Follow-up" },
  ];

  const onFieldChange = (name: string, value: unknown) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => { const next = { ...e }; delete next[name]; return next; });

    if (name === "primaryMobile" && typeof value === "string" && value.length >= 10 && values.classApplyingForKey && values.academicYearApplyingForKey && !isEditing) {
      apiFetch(`/api/Inquiry/check-duplicate?primaryMobile=${encodeURIComponent(value)}&classApplyingForId=${values.classApplyingForKey}&academicYearApplyingForId=${values.academicYearApplyingForKey}`)
        .then((d: { studentName: string; status: string }[]) => {
          setDuplicateWarning(d.length > 0 ? `Possible duplicate: "${d[0].studentName}" already has an inquiry for this class/year (status: ${d[0].status}).` : null);
        })
        .catch(() => {});
    }
  };

  const cancel = () => navigate({ to: "/admissions-inquiries" });

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
      const body = {
        ...values,
        streamKey: values.streamKey || null,
        assignedCounsellorUserKey: values.assignedCounsellorUserKey || null,
        dateOfBirth: values.dateOfBirth || null,
        nextFollowUpDate: values.nextFollowUpDate || null,
      };

      if (isEditing && id) {
        await apiFetch(`/api/Inquiry/${id}`, { method: "PUT", body: JSON.stringify({ inquiryKey: id, ...body }) });
        toast.success("Inquiry updated");
      } else {
        await apiFetch("/api/Inquiry", { method: "POST", body: JSON.stringify(body) });
        toast.success("Inquiry created");
      }
      navigate({ to: "/admissions-inquiries" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save inquiry");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLoader label="Loading inquiry..." />;
  }

  return (
    <div>
      <PageHeader
        title={isEditing ? "Edit Inquiry" : "New Inquiry"}
        breadcrumbs={[{ label: "Admissions" }, { label: "Inquiries", to: "/admissions-inquiries" }, { label: isEditing ? "Edit" : "New" }]}
      />

      <form onSubmit={save} className="space-y-6">
        <div className="rounded-md border border-border bg-card p-5 shadow-sm">
          <p className="mb-4 text-sm text-muted-foreground">A lead — no fee, no commitment. Every admission starts here.</p>

          {duplicateWarning && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5 text-sm text-[oklch(0.45_0.12_65)]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {duplicateWarning}
            </div>
          )}

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
            {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Inquiry"}
          </Button>
        </div>
      </form>
    </div>
  );
}
