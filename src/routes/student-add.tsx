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
import {
  Loader2, Save, Check, ArrowLeft, Info,
  GraduationCap, User, MapPin, FileText, Camera, Plus, X, File as FileIcon,
} from "lucide-react";
import { apiFetch, apiUpload } from "@/lib/api";

export const Route = createFileRoute("/student-add")({
  head: () => ({
    meta: [
      { title: "Add Student — Akira School ERP" },
      {
        name: "description",
        content: "Manually add a new student directly, without going through an admission application.",
      },
    ],
  }),
  component: StudentAddPage,
});

type SchoolClass = { schoolClassKey: string; className: string };
type AcademicYear = { academicYearKey: string; yearName: string };
type Board = { boardKey: string; boardName: string };
type Section = { sectionKey: string; sectionLabel: string };
type PendingDocument = { id: string; documentType: string; file: File | null };

const MAX_DOCUMENTS = 6;

const GENDER_OPTIONS = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
  { label: "Other", value: "OTHER" },
];

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

const ADMISSION_TYPE_OPTIONS = [
  { label: "New Admission", value: "NEW_ADMISSION" },
  { label: "Transfer Admission", value: "TRANSFER_ADMISSION" },
  { label: "Re-Admission", value: "RE_ADMISSION" },
  { label: "Management Quota", value: "MANAGEMENT_QUOTA" },
  { label: "Scholarship Admission", value: "SCHOLARSHIP_ADMISSION" },
  { label: "RTE Admission", value: "RTE_ADMISSION" },
  { label: "Staff Child Admission", value: "STAFF_CHILD_ADMISSION" },
  { label: "Sibling Admission", value: "SIBLING_ADMISSION" },
];

const GUARDIAN_RELATIONSHIP_OPTIONS = [
  { label: "Father", value: "FATHER" },
  { label: "Mother", value: "MOTHER" },
  { label: "Legal Guardian", value: "LEGAL_GUARDIAN" },
  { label: "Grandfather", value: "GRANDFATHER" },
  { label: "Grandmother", value: "GRANDMOTHER" },
  { label: "Brother", value: "BROTHER" },
  { label: "Sister", value: "SISTER" },
  { label: "Uncle", value: "UNCLE" },
  { label: "Aunt", value: "AUNT" },
  { label: "Other", value: "OTHER" },
];

const DOCUMENT_TYPE_OPTIONS = [
  { label: "Transfer Certificate (TC)", value: "TC" },
  { label: "Marksheet", value: "MARKSHEET" },
  { label: "Birth Certificate", value: "BIRTH_CERTIFICATE" },
  { label: "Aadhar Card", value: "AADHAR" },
  { label: "Other", value: "OTHER" },
];

const DRAFT_KEY = "akira_student_add_draft";

function StudentAddPage() {
  const navigate = useNavigate();

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [saving, setSaving] = useState(false);

  const [values, setValues] = useState<FormValues>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved) as FormValues;
    } catch {
      // ignore corrupt draft
    }
    return {
      nationality: "Indian",
      disabilityCategory: "NONE",
      admissionType: "NEW_ADMISSION",
      permanentSameAsCurrent: true,
    };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([
    { id: "doc-initial", documentType: "TC", file: null },
  ]);

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
    setPendingDocuments((docs) => [...docs, { id: crypto.randomUUID(), documentType: "TC", file: null }]);
  };

  const removeDocumentRow = (id: string) => {
    setPendingDocuments((docs) => {
      if (docs.length === 1) return [{ id: crypto.randomUUID(), documentType: "TC", file: null }];
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

  useEffect(() => {
    Promise.all([
      apiFetch("/api/SchoolClass"),
      apiFetch("/api/AcademicYear"),
      apiFetch("/api/Board"),
    ])
      .then(([c, y, b]) => {
        setClasses(c);
        setYears(y);
        setBoards(b);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const schoolClassKey = values.schoolClassKey as string | undefined;
    const academicYearKey = values.academicYearKey as string | undefined;
    if (!schoolClassKey || !academicYearKey) {
      setSections([]);
      return;
    }
    const params = new URLSearchParams({ schoolClassId: schoolClassKey, academicYearId: academicYearKey });
    apiFetch(`/api/Section?${params.toString()}`)
      .then((s: Section[]) => setSections(s))
      .catch(() => setSections([]));
  }, [values.schoolClassKey, values.academicYearKey]);

  const classOptions = classes.map((c) => ({ label: c.className, value: c.schoolClassKey }));
  const yearOptions = years.map((y) => ({ label: y.yearName, value: y.academicYearKey }));
  const boardOptions = boards.map((b) => ({ label: b.boardName, value: b.boardKey }));
  const sectionOptions = sections.map((s) => ({ label: s.sectionLabel, value: s.sectionKey }));

  const notSameAddress = (v: FormValues) => !v.permanentSameAsCurrent;

  const enrollmentFields: FormFieldSchema[] = [
    { name: "academicYearKey", label: "Academic Year", type: "select", required: true, options: yearOptions, placeholder: "Select Academic Year" },
    { name: "boardKey", label: "Board", type: "select", required: true, options: boardOptions, placeholder: "Select Board" },
    { name: "schoolClassKey", label: "Class", type: "select", required: true, options: classOptions, placeholder: "Select Class" },
    { name: "sectionKey", label: "Section", type: "select", options: sectionOptions, placeholder: "Auto-assign if left blank" },
    { name: "rollNumber", label: "Roll Number", type: "text", placeholder: "Enter roll number (optional)" },
    { name: "house", label: "House", type: "text", placeholder: "e.g. Blue House" },
    { name: "mediumOfInstruction", label: "Medium of Instruction", type: "text", placeholder: "e.g. English" },
    { name: "admissionType", label: "Admission Type", type: "select", options: ADMISSION_TYPE_OPTIONS, placeholder: "Select Admission Type" },
    { name: "overrideAge", label: "Override minimum age check", type: "checkbox" },
    { name: "overrideSectionCapacity", label: "Override section capacity", type: "checkbox" },
  ];

  const identityFields: FormFieldSchema[] = [
    { name: "studentName", label: "Full Name", type: "text", required: true, placeholder: "Enter full name as per documents" },
    { name: "dateOfBirth", label: "Date of Birth", type: "date", required: true, placeholder: "dd/mm/yyyy" },
    { name: "gender", label: "Gender", type: "select", required: true, options: GENDER_OPTIONS, placeholder: "Select Gender" },
    { name: "placeOfBirth", label: "Place of Birth", type: "text", placeholder: "Enter place of birth" },
    { name: "nationality", label: "Nationality", type: "text", placeholder: "e.g. Indian" },
    { name: "motherTongue", label: "Mother Tongue", type: "text", placeholder: "e.g. Tamil" },
    { name: "religion", label: "Religion", type: "text", placeholder: "Enter religion" },
    { name: "bloodGroup", label: "Blood Group", type: "text", placeholder: "e.g. O+" },
    { name: "aadharNumber", label: "Aadhar Number", type: "text", placeholder: "Enter 12-digit Aadhar number" },
  ];

  const contactFields: FormFieldSchema[] = [
    { name: "guardianFullName", label: "Guardian Name", type: "text", placeholder: "Enter guardian's full name" },
    { name: "guardianRelationshipType", label: "Relationship", type: "select", options: GUARDIAN_RELATIONSHIP_OPTIONS, placeholder: "Select Relationship" },
    { name: "guardianMobileNumber", label: "Mobile", type: "tel", placeholder: "Enter 10-digit mobile number" },
    { name: "guardianEmailAddress", label: "Email", type: "email", placeholder: "name@example.com" },
    { name: "currentAddressLine1", label: "Address Line 1", type: "text", colSpan: 2, placeholder: "House/Street/Area" },
    { name: "currentCity", label: "City", type: "text", placeholder: "Enter city" },
    { name: "currentState", label: "State", type: "text", placeholder: "Enter state" },
    { name: "currentPincode", label: "Pincode", type: "text", placeholder: "Enter pincode" },
    { name: "permanentSameAsCurrent", label: "Permanent address same as current", type: "checkbox" },
    { name: "permanentAddressLine1", label: "Permanent Address Line 1", type: "text", colSpan: 2, placeholder: "House/Street/Area", visibleIf: notSameAddress },
    { name: "permanentCity", label: "Permanent City", type: "text", placeholder: "Enter city", visibleIf: notSameAddress },
    { name: "permanentState", label: "Permanent State", type: "text", placeholder: "Enter state", visibleIf: notSameAddress },
    { name: "permanentPincode", label: "Permanent Pincode", type: "text", placeholder: "Enter pincode", visibleIf: notSameAddress },
  ];

  const additionalFields: FormFieldSchema[] = [
    { name: "emisNumber", label: "EMIS Number", type: "text", placeholder: "Enter EMIS number" },
    { name: "communityCategory", label: "Community Category", type: "select", options: COMMUNITY_OPTIONS, placeholder: "Select Community Category" },
    { name: "subCaste", label: "Sub-Caste", type: "text", placeholder: "Enter sub-caste" },
    { name: "disabilityCategory", label: "Disability Category", type: "select", options: DISABILITY_OPTIONS, placeholder: "Select Disability Category" },
    { name: "minorityStatus", label: "Minority Status", type: "checkbox" },
    { name: "rteStatus", label: "RTE Status", type: "checkbox" },
    { name: "firstGenerationLearner", label: "First Generation Learner", type: "checkbox" },
    { name: "economicallyWeakerSection", label: "Economically Weaker Section", type: "checkbox" },
    { name: "prevSchoolName", label: "Previous School Name", type: "text", placeholder: "Enter previous school name" },
    { name: "prevSchoolBoard", label: "Previous Board", type: "text", placeholder: "e.g. CBSE, State Board" },
    { name: "prevClassLastStudied", label: "Class Last Studied", type: "text", placeholder: "e.g. Class VI" },
    { name: "knownAllergies", label: "Known Allergies", type: "text", placeholder: "e.g. Peanuts, Dust (optional)" },
    { name: "emergencyContactName", label: "Emergency Contact", type: "text", placeholder: "Enter emergency contact name" },
    { name: "emergencyContactMobile", label: "Emergency Contact Mobile", type: "tel", placeholder: "Enter 10-digit mobile number" },
  ];

  const sectionsList = [
    { key: "enrollment", heading: "Enrollment Details", desc: "Select the academic and class details for the student.", icon: GraduationCap, fields: enrollmentFields },
    { key: "identity", heading: "Student Identity", desc: "Enter the basic personal information of the student.", icon: User, fields: identityFields },
    { key: "contact", heading: "Contact Details", desc: "Guardian and address details for the student.", icon: MapPin, fields: contactFields },
    { key: "additional", heading: "Additional Information", desc: "Government compliance, previous school and medical details.", icon: FileText, fields: additionalFields },
  ];

  const allFields = [...enrollmentFields, ...identityFields, ...contactFields, ...additionalFields];

  const onFieldChange = (name: string, value: unknown) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[name];
      return next;
    });
  };

  const cancel = () => navigate({ to: "/students" });

  const saveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
    toast.success("Draft saved on this device");
  };

  const submit = async () => {
    const validationErrors = validateFormSchema(allFields, values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Please fill in all required fields.");
      const firstBadSection = sectionsList.find((s) => s.fields.some((f) => validationErrors[f.name]));
      if (firstBadSection) {
        document.getElementById(`section-${firstBadSection.key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    setSaving(true);
    try {
      const body = {
        ...values,
        sectionKey: values.sectionKey || null,
      };
      const result = await apiFetch("/api/Student", { method: "POST", body: JSON.stringify(body) });

      if (photoFile) {
        try {
          const formData = new FormData();
          formData.append("file", photoFile);
          await apiUpload(`/api/Student/${result.studentKey}/photo`, formData);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Student created, but photo upload failed");
        }
      }

      for (const doc of pendingDocuments) {
        if (!doc.file) continue;
        try {
          const formData = new FormData();
          formData.append("file", doc.file);
          formData.append("documentType", doc.documentType);
          await apiUpload(`/api/Student/${result.studentKey}/documents`, formData);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : `Failed to upload ${doc.file.name}`);
        }
      }

      localStorage.removeItem(DRAFT_KEY);
      toast.success(`Student created — Admission No. ${result.admissionNumber}`);
      navigate({ to: "/student-detail", search: { id: result.studentKey } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create student");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Add Student"
        breadcrumbs={[{ label: "Students", to: "/students" }, { label: "Add Student" }]}
        actions={
          <Button type="button" variant="outline" className="gap-1.5 rounded-md" onClick={cancel}>
            <ArrowLeft className="h-4 w-4" /> Back to Students
          </Button>
        }
      />

      <div className="mb-5 flex items-start gap-2.5 rounded-md border border-info/30 bg-info/10 px-4 py-3 text-sm text-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
        <span>Creates a permanent student record directly, without an admission application. Use this for transfers, walk-ins, or historical data entry.</span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main column — form sections as cards */}
        <div className="space-y-5">
          {sectionsList.map((s) => (
            <div key={s.key} id={`section-${s.key}`} className="rounded-md border border-border bg-card p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold">{s.heading}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </div>
              <FormEngine schema={s.fields} values={values} onChange={onFieldChange} errors={errors} />
            </div>
          ))}

          <div className="flex items-center justify-between rounded-md border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="rounded-md" onClick={cancel}>
                Cancel
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="gap-1.5 rounded-md" onClick={saveDraft}>
                <Save className="h-4 w-4" /> Save as Draft
              </Button>
              <Button type="button" className="gap-1.5 rounded-md" disabled={saving} onClick={submit}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {saving ? "Creating..." : "Create Student"}
              </Button>
            </div>
          </div>
        </div>

        {/* Right column — photo + documents */}
        <div className="space-y-5">
          <div className="rounded-md border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 font-display text-sm font-bold">Profile Photo</h3>
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground">
                {photoPreview ? (
                  <img src={photoPreview} alt="Student" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-10 w-10" />
                )}
              </div>
              <Label
                htmlFor="student-photo-input"
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-card px-3 text-sm font-medium shadow-sm hover:bg-accent"
              >
                <Camera className="h-3.5 w-3.5" />
                {photoPreview ? "Change Photo" : "Upload Photo"}
              </Label>
              <input
                id="student-photo-input"
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
                <p className="text-xs text-muted-foreground">TC, marksheet, birth certificate and other paperwork.</p>
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
                    htmlFor={`student-document-input-${doc.id}`}
                    className="flex h-9 w-full cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-input bg-card px-3 text-xs font-medium hover:bg-accent"
                  >
                    <FileIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{doc.file ? doc.file.name : "Choose file"}</span>
                  </Label>
                  <input
                    id={`student-document-input-${doc.id}`}
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
