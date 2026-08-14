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
import { Loader2, Save } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PageLoader } from "@/components/erp/Spinner";

export const Route = createFileRoute("/admissions-application-form")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : undefined,
    inquiryId: typeof search.inquiryId === "string" ? search.inquiryId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Application — Akira School ERP" },
      {
        name: "description",
        content: "Capture a full admission application with student, family, and document details.",
      },
    ],
  }),
  component: ApplicationFormPage,
});

type SchoolClass = { schoolClassKey: string; className: string };
type AcademicYear = { academicYearKey: string; yearName: string };
type Stream = { streamKey: string; streamName: string };
type Inquiry = {
  inquiryKey: string;
  studentName: string;
  classApplyingForKey: string;
  academicYearApplyingForKey: string;
  streamKey: string | null;
  fatherName: string | null;
  motherName: string | null;
  primaryMobile: string;
  email: string | null;
  previousSchoolName: string | null;
  previousClassStudied: string | null;
};

const GENDER_OPTIONS = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
  { label: "Other", value: "OTHER" },
];
const BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => ({
  label: b,
  value: b,
}));
const DISABILITY_OPTIONS = [
  { label: "None", value: "NONE" },
  { label: "Visual", value: "VISUAL" },
  { label: "Hearing", value: "HEARING" },
  { label: "Locomotor", value: "LOCOMOTOR" },
  { label: "Intellectual", value: "INTELLECTUAL" },
  { label: "Other", value: "OTHER" },
];
const QUOTA_OPTIONS = [
  { label: "General", value: "GENERAL" },
  { label: "RTE (25% Reservation)", value: "RTE" },
  { label: "Management", value: "MANAGEMENT" },
  { label: "Sports", value: "SPORTS" },
  { label: "NRI", value: "NRI" },
  { label: "Differently Abled", value: "DIFFERENTLY_ABLED" },
  { label: "Staff Ward", value: "STAFF_WARD" },
];

function ApplicationFormPage() {
  const { id, inquiryId } = Route.useSearch();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(isEditing);

  const [values, setValues] = useState<FormValues>({
    permanentSameAsCurrent: true,
    nationality: "Indian",
    disabilityType: "NONE",
    admissionQuota: "GENERAL",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/SchoolClass"),
      apiFetch("/api/AcademicYear"),
      apiFetch("/api/Stream"),
    ])
      .then(([c, y, s]) => {
        setClasses(c);
        setYears(y);
        setStreams(s);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!inquiryId || isEditing) return;
    apiFetch("/api/Inquiry")
      .then((all: Inquiry[]) => {
        const i = all.find((x) => x.inquiryKey === inquiryId);
        if (!i) return;
        setValues((v) => ({
          ...v,
          linkedInquiryKey: i.inquiryKey,
          fullName: i.studentName,
          classApplyingForKey: i.classApplyingForKey,
          academicYearKey: i.academicYearApplyingForKey,
          streamKey: i.streamKey ?? "",
          fatherName: i.fatherName ?? "",
          motherName: i.motherName ?? "",
          fatherMobile: i.primaryMobile,
          fatherEmail: i.email ?? "",
          prevSchoolName: i.previousSchoolName ?? "",
          prevClassLastStudied: i.previousClassStudied ?? "",
        }));
      })
      .catch(() => {});
  }, [inquiryId, isEditing]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch(`/api/Application/${id}`)
      .then((d: { application: Record<string, unknown> }) => {
        const a = d.application;
        const dateFields = ["dateOfBirth", "prevTCDate"];
        const next: FormValues = { ...a };
        for (const f of dateFields) {
          if (typeof next[f] === "string") next[f] = (next[f] as string).slice(0, 10);
        }
        next.streamKey = a.streamKey ?? "";
        next.linkedInquiryKey = a.linkedInquiryKey ?? "";
        setValues(next);
      })
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load application"),
      )
      .finally(() => setLoading(false));
  }, [id]);

  const classOptions = classes.map((c) => ({ label: c.className, value: c.schoolClassKey }));
  const yearOptions = years.map((y) => ({ label: y.yearName, value: y.academicYearKey }));
  const streamOptions = streams.map((s) => ({ label: s.streamName, value: s.streamKey }));

  const isClassXI = (v: FormValues) =>
    classes.find((c) => c.schoolClassKey === v.classApplyingForKey)?.className === "Class XI";
  const notSameAddress = (v: FormValues) => !v.permanentSameAsCurrent;

  const schema: FormFieldSchema[] = [
    {
      name: "classApplyingForKey",
      label: "Class Applying For",
      type: "select",
      required: true,
      options: classOptions,
      section: "Application",
    },
    {
      name: "academicYearKey",
      label: "Academic Year",
      type: "select",
      required: true,
      options: yearOptions,
      section: "Application",
    },
    {
      name: "streamKey",
      label: "Stream",
      type: "select",
      options: streamOptions,
      requiredIf: isClassXI,
      visibleIf: isClassXI,
      section: "Application",
    },
    {
      name: "admissionQuota",
      label: "Admission Quota",
      type: "select",
      options: QUOTA_OPTIONS,
      section: "Application",
    },
    {
      name: "applicationFeeAmount",
      label: "Application Fee Amount",
      type: "number",
      section: "Application",
    },
    {
      name: "applicationFeePaid",
      label: "Application Fee Paid",
      type: "checkbox",
      section: "Application",
    },
    {
      name: "paymentReference",
      label: "Payment Reference",
      type: "text",
      visibleIf: (v) => !!v.applicationFeePaid,
      section: "Application",
    },

    {
      name: "fullName",
      label: "Full Name (as per Birth Certificate)",
      type: "text",
      required: true,
      placeholder: "Enter your full name",
      section: "Student",
    },
    {
      name: "dateOfBirth",
      label: "Date of Birth",
      type: "date",
      required: true,
      section: "Student",
    },
    {
      name: "placeOfBirth",
      label: "Place of Birth",
      type: "text",
      placeholder: "Enter your place of birth",
      section: "Student",
    },
    {
      name: "gender",
      label: "Gender",
      type: "select",
      options: GENDER_OPTIONS,
      placeholder: "Select gender",
      section: "Student",
    },
    {
      name: "nationality",
      label: "Nationality",
      type: "text",
      placeholder: "Enter your nationality",
      section: "Student",
    },
    {
      name: "religion",
      label: "Religion",
      type: "text",
      placeholder: "Enter your religion",
      section: "Student",
    },
    {
      name: "motherTongue",
      label: "Mother Tongue",
      type: "text",
      placeholder: "Enter your mother tongue",
      section: "Student",
    },
    {
      name: "bloodGroup",
      label: "Blood Group",
      type: "select",
      options: BLOOD_GROUP_OPTIONS,
      placeholder: "Select blood group",
      section: "Student",
    },
    {
      name: "aadharNumber",
      label: "Aadhar Number",
      type: "text",
      placeholder: "Enter your 12-digit Aadhar number",
      section: "Student",
    },

    {
      name: "fatherName",
      label: "Father Name",
      type: "text",
      placeholder: "Enter father's name",
      section: "Father",
    },
    {
      name: "fatherOccupation",
      label: "Occupation",
      type: "text",
      placeholder: "Enter father's occupation",
      section: "Father",
    },
    {
      name: "fatherQualification",
      label: "Qualification",
      type: "text",
      placeholder: "Enter father's qualification",
      section: "Father",
    },
    {
      name: "fatherAnnualIncome",
      label: "Annual Income",
      type: "number",
      placeholder: "Enter annual income",
      section: "Father",
    },
    {
      name: "fatherMobile",
      label: "Mobile",
      type: "tel",
      required: true,
      placeholder: "Enter mobile number",
      section: "Father",
    },
    {
      name: "fatherEmail",
      label: "Email",
      type: "email",
      placeholder: "Enter email address",
      section: "Father",
    },
    {
      name: "fatherWorkplace",
      label: "Workplace",
      type: "text",
      placeholder: "Enter workplace",
      section: "Father",
    },
    {
      name: "fatherAadhar",
      label: "Aadhar Number",
      type: "text",
      placeholder: "Enter father's Aadhar number",
      section: "Father",
    },

    {
      name: "motherName",
      label: "Mother Name",
      type: "text",
      placeholder: "Enter mother's name",
      section: "Mother",
    },
    {
      name: "motherOccupation",
      label: "Occupation",
      type: "text",
      placeholder: "Enter mother's occupation",
      section: "Mother",
    },
    {
      name: "motherQualification",
      label: "Qualification",
      type: "text",
      placeholder: "Enter mother's qualification",
      section: "Mother",
    },
    {
      name: "motherAnnualIncome",
      label: "Annual Income",
      type: "number",
      placeholder: "Enter annual income",
      section: "Mother",
    },
    {
      name: "motherMobile",
      label: "Mobile",
      type: "tel",
      placeholder: "Enter mobile number",
      section: "Mother",
    },
    {
      name: "motherEmail",
      label: "Email",
      type: "email",
      placeholder: "Enter email address",
      section: "Mother",
    },
    {
      name: "motherWorkplace",
      label: "Workplace",
      type: "text",
      placeholder: "Enter workplace",
      section: "Mother",
    },
    {
      name: "motherAadhar",
      label: "Aadhar Number",
      type: "text",
      placeholder: "Enter mother's Aadhar number",
      section: "Mother",
    },

    {
      name: "guardianName",
      label: "Guardian Name (if applicable)",
      type: "text",
      placeholder: "Enter guardian's name",
      section: "Guardian",
    },
    {
      name: "guardianRelationship",
      label: "Relationship",
      type: "text",
      placeholder: "Enter relationship to student",
      section: "Guardian",
    },
    {
      name: "guardianMobile",
      label: "Mobile",
      type: "tel",
      placeholder: "Enter mobile number",
      section: "Guardian",
    },
    {
      name: "guardianEmail",
      label: "Email",
      type: "email",
      placeholder: "Enter email address",
      section: "Guardian",
    },

    {
      name: "currentAddressLine1",
      label: "Address Line 1",
      type: "text",
      colSpan: 2,
      placeholder: "Enter address line 1",
      section: "Current Address",
    },
    {
      name: "currentAddressLine2",
      label: "Address Line 2",
      type: "text",
      colSpan: 2,
      placeholder: "Enter address line 2",
      section: "Current Address",
    },
    {
      name: "currentCity",
      label: "City",
      type: "text",
      placeholder: "Enter your city",
      section: "Current Address",
    },
    {
      name: "currentDistrict",
      label: "District",
      type: "text",
      placeholder: "Enter your district",
      section: "Current Address",
    },
    {
      name: "currentState",
      label: "State",
      type: "text",
      placeholder: "Enter your state",
      section: "Current Address",
    },
    {
      name: "currentPincode",
      label: "Pincode",
      type: "text",
      placeholder: "Enter your pincode",
      section: "Current Address",
    },

    {
      name: "permanentSameAsCurrent",
      label: "Permanent address same as current",
      type: "checkbox",
      section: "Permanent Address",
    },
    {
      name: "permanentAddressLine1",
      label: "Address Line 1",
      type: "text",
      colSpan: 2,
      placeholder: "Enter address line 1",
      visibleIf: notSameAddress,
      section: "Permanent Address",
    },
    {
      name: "permanentAddressLine2",
      label: "Address Line 2",
      type: "text",
      colSpan: 2,
      placeholder: "Enter address line 2",
      visibleIf: notSameAddress,
      section: "Permanent Address",
    },
    {
      name: "permanentCity",
      label: "City",
      type: "text",
      placeholder: "Enter your city",
      visibleIf: notSameAddress,
      section: "Permanent Address",
    },
    {
      name: "permanentDistrict",
      label: "District",
      type: "text",
      placeholder: "Enter your district",
      visibleIf: notSameAddress,
      section: "Permanent Address",
    },
    {
      name: "permanentState",
      label: "State",
      type: "text",
      placeholder: "Enter your state",
      visibleIf: notSameAddress,
      section: "Permanent Address",
    },
    {
      name: "permanentPincode",
      label: "Pincode",
      type: "text",
      placeholder: "Enter your pincode",
      visibleIf: notSameAddress,
      section: "Permanent Address",
    },

    {
      name: "prevSchoolName",
      label: "Previous School Name",
      type: "text",
      placeholder: "Enter previous school name",
      section: "Previous School",
    },
    {
      name: "prevSchoolBoard",
      label: "Board",
      type: "text",
      placeholder: "Enter previous board",
      section: "Previous School",
    },
    {
      name: "prevClassLastStudied",
      label: "Class Last Studied",
      type: "text",
      placeholder: "Enter class last studied",
      section: "Previous School",
    },
    {
      name: "prevTCNumber",
      label: "TC Number",
      type: "text",
      placeholder: "Enter TC number",
      section: "Previous School",
    },
    { name: "prevTCDate", label: "TC Date", type: "date", section: "Previous School" },
    {
      name: "prevYearOfPassing",
      label: "Year of Passing",
      type: "number",
      placeholder: "Enter year of passing",
      section: "Previous School",
    },
    {
      name: "prevPercentage",
      label: "Percentage / Grade",
      type: "number",
      placeholder: "Enter percentage or grade",
      section: "Previous School",
    },
    {
      name: "prevMediumOfInstruction",
      label: "Medium of Instruction",
      type: "text",
      placeholder: "Enter medium of instruction",
      section: "Previous School",
    },

    {
      name: "knownAllergies",
      label: "Known Allergies",
      type: "textarea",
      placeholder: "Enter known allergies, if any",
      section: "Medical",
    },
    {
      name: "chronicConditions",
      label: "Chronic Conditions",
      type: "textarea",
      placeholder: "Enter chronic conditions, if any",
      section: "Medical",
    },
    {
      name: "disabilityType",
      label: "Disability",
      type: "select",
      options: DISABILITY_OPTIONS,
      placeholder: "Select disability type",
      section: "Medical",
    },
    {
      name: "emergencyContactName",
      label: "Emergency Contact Name",
      type: "text",
      placeholder: "Enter emergency contact name",
      section: "Medical",
    },
    {
      name: "emergencyContactMobile",
      label: "Emergency Contact Mobile",
      type: "tel",
      placeholder: "Enter emergency contact mobile",
      section: "Medical",
    },

    {
      name: "remarks",
      label: "Remarks",
      type: "textarea",
      colSpan: 2,
      placeholder: "Enter any additional remarks",
      section: "Notes",
    },
  ];

  const onFieldChange = (name: string, value: unknown) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[name];
      return next;
    });
  };

  const cancel = () => navigate({ to: "/admissions-applications" });

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
        linkedInquiryKey: values.linkedInquiryKey || null,
        prevTCDate: values.prevTCDate || null,
      };

      if (isEditing && id) {
        await apiFetch(`/api/Application/${id}`, {
          method: "PUT",
          body: JSON.stringify({ applicationKey: id, ...body }),
        });
        toast.success("Application updated");
      } else {
        await apiFetch("/api/Application", { method: "POST", body: JSON.stringify(body) });
        toast.success("Application created");
      }
      navigate({ to: "/admissions-applications" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save application");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLoader label="Loading application..." />;
  }

  return (
    <div>
      <PageHeader
        title={isEditing ? "Edit Application" : "New Application"}
        breadcrumbs={[
          { label: "Admissions" },
          { label: "Applications", to: "/admissions-applications" },
          { label: isEditing ? "Edit" : "New" },
        ]}
      />

      <form onSubmit={save} className="space-y-6">
        <div className="rounded-md border border-border bg-card p-5 shadow-sm">
          <p className="mb-4 text-sm text-muted-foreground">
            Full official application — the document checklist is generated automatically once
            saved.
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
            {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Application"}
          </Button>
        </div>
      </form>
    </div>
  );
}
