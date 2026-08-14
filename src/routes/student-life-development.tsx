import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { StudentAvatar } from "@/components/erp/StudentAvatar";
import { FormDialog } from "@/components/erp/FormDialog";
import { FormEngine, validateFormSchema, type FormFieldSchema, type FormValues } from "@/components/erp/FormEngine";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, X, ChevronRight, ChevronDown, ExternalLink, Eye, Plus, Download, Clock, UserPlus,
  GraduationCap, Award, ClipboardList, Crown, HeartHandshake, Dumbbell,
  Users2, Contact, FolderKanban, Gem, Compass, Landmark,
  User, Fingerprint, MapPin, HeartPulse, Bus, Home, Users, LayoutList, FileText, History,
} from "lucide-react";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/student-life-development")({
  validateSearch: (search: Record<string, unknown>): { sid?: string } => ({
    ...(typeof search.sid === "string" ? { sid: search.sid } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Student Life Development — Akira School ERP" },
      { name: "description", content: "Search a student and view their full profile and development life-cycle." },
    ],
  }),
  component: StudentLifeDevelopmentPage,
});

type Tone = "primary" | "success" | "warning" | "info" | "destructive" | "purple" | "teal";

type StudentListRow = {
  studentKey: string;
  admissionNumber: string;
  studentId: string | null;
  studentName: string;
  gender: string | null;
  photoUrl: string | null;
  studentStatus: string;
  className: string | null;
  sectionLabel: string | null;
  primaryGuardianMobile: string | null;
};

type StudentDetail = {
  studentKey: string;
  admissionNumber: string;
  studentId: string | null;
  admissionDate: string;
  studentName: string;
  gender: string | null;
  dateOfBirth: string;
  placeOfBirth: string | null;
  nationality: string;
  motherTongue: string | null;
  religion: string | null;
  bloodGroup: string | null;
  photoUrl: string | null;
  studentStatus: string;

  aadharNumberMasked: string | null;
  emisNumber: string | null;
  studentPENNumber: string | null;
  govtScholarshipNumber: string | null;
  communityCategory: string | null;
  subCaste: string | null;
  minorityStatus: boolean;
  rteStatus: boolean;
  firstGenerationLearner: boolean;
  economicallyWeakerSection: boolean;
  specialNeedsCategory: string | null;
  disabilityCategory: string;
  disabilityPercentage: number | null;

  prevSchoolName: string | null;
  prevSchoolBoard: string | null;
  prevClassLastStudied: string | null;

  currentAddressLine1: string | null;
  currentAddressLine2: string | null;
  currentCity: string | null;
  currentDistrict: string | null;
  currentState: string | null;
  currentPincode: string | null;
  permanentSameAsCurrent: boolean;
  permanentAddressLine1: string | null;
  permanentAddressLine2: string | null;
  permanentCity: string | null;
  permanentDistrict: string | null;
  permanentState: string | null;
  permanentPincode: string | null;

  knownAllergies: string | null;
  chronicConditions: string | null;
  emergencyContactName: string | null;
  emergencyContactMobile: string | null;

  isAvailingTransport: boolean;
  isResidential: boolean;
  hostelBedNumber: string | null;
};

type Enrollment = {
  studentEnrollmentKey: string; academicYearName: string | null; className: string | null;
  sectionLabel: string | null; rollNumber: string | null; admissionType: string; enrollmentDate: string; status: string;
};
type Guardian = {
  studentGuardianKey: string; relationshipType: string; fullName: string; mobileNumber: string | null;
  emailAddress: string | null; occupation: string | null; isPrimaryGuardian: boolean; isEmergencyContact: boolean;
};
type Sibling = {
  studentRelationshipKey: string; siblingName: string; siblingAdmissionNumber: string; siblingStatus: string | null;
};
type StudentDocument = {
  studentDocumentKey: string; documentType: string; fileName: string; fileUrl: string; createdOn: string;
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  TC: "Transfer Certificate (TC)",
  MARKSHEET: "Marksheet",
  BIRTH_CERTIFICATE: "Birth Certificate",
  AADHAR: "Aadhar Card",
  OTHER: "Other",
};

const STATUS_STYLES: Record<string, string> = {
  ENROLLED: "bg-success/15 text-success",
  PROMOTED: "bg-info/15 text-info",
  PASSED_OUT: "bg-[oklch(0.55_0.1_200)]/15 text-[oklch(0.4_0.12_200)]",
  TRANSFERRED_OUT: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  DROPPED: "bg-destructive/15 text-destructive",
  DECEASED: "bg-muted text-muted-foreground",
};

type LeafRow = { key: string; title: string; subtitle: string; date: string | null; badges?: string[] };
type Branch = { key: string; label: string; icon: typeof Award; tone: Tone; devTab: string; loading: boolean; rows: LeafRow[] };
type FeedItem = { key: string; date: string; label: string; category: string; tone: Tone };

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground">{value ?? "—"}</div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Award; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-secondary/20 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>
    </div>
  );
}

const CHIP_TONES: Record<Tone, string> = {
  primary: "bg-primary/15 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  info: "bg-info/15 text-info",
  destructive: "bg-destructive/15 text-destructive",
  purple: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
  teal: "bg-[oklch(0.55_0.1_200)]/15 text-[oklch(0.4_0.12_200)]",
};

const CARD_TONES: Record<Tone, string> = {
  primary: "border-primary/25 bg-primary/[0.05]",
  success: "border-success/25 bg-success/[0.05]",
  warning: "border-warning/35 bg-warning/[0.07]",
  info: "border-info/25 bg-info/[0.05]",
  destructive: "border-destructive/25 bg-destructive/[0.05]",
  purple: "border-[oklch(0.75_0.17_300)]/25 bg-[oklch(0.75_0.17_300)]/[0.05]",
  teal: "border-[oklch(0.55_0.1_200)]/25 bg-[oklch(0.55_0.1_200)]/[0.05]",
};

const ACCENT_TONES: Record<Tone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  destructive: "bg-destructive",
  purple: "bg-[oklch(0.75_0.17_300)]",
  teal: "bg-[oklch(0.55_0.1_200)]",
};

function IconChip({ icon: Icon, tone, size = "h-8 w-8" }: { icon: typeof Award; tone: Tone; size?: string }) {
  return (
    <div className={cn("flex shrink-0 items-center justify-center rounded-full", size, CHIP_TONES[tone])}>
      <Icon className="h-4 w-4" />
    </div>
  );
}

function KpiCard({ label, value, caption, icon: Icon, tone }: { label: string; value: string; caption: string; icon: typeof Award; tone: Tone }) {
  return (
    <div className={cn("relative min-w-0 overflow-hidden p-4", CARD_TONES[tone])}>
      <span className={cn("absolute inset-y-0 left-0 w-1", ACCENT_TONES[tone])} />
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs text-muted-foreground">{label}</div>
        <IconChip icon={Icon} tone={tone} size="h-9 w-9" />
      </div>
      <div className="mt-2 truncate font-display text-2xl font-bold text-foreground">{value}</div>
      <div className="mt-0.5 truncate text-xs text-muted-foreground">{caption}</div>
    </div>
  );
}

const BRANCH_DEFS: { key: string; label: string; icon: typeof Award; tone: Tone; devTab: string; path: string }[] = [
  { key: "achievements", label: "Achievements", icon: Award, tone: "purple", devTab: "achievements", path: "achievements" },
  { key: "behavior", label: "Behavior", icon: ClipboardList, tone: "destructive", devTab: "behavior", path: "behavior-records" },
  { key: "leadership", label: "Leadership", icon: Crown, tone: "warning", devTab: "leadership", path: "leadership-roles" },
  { key: "counselling", label: "Counselling", icon: HeartHandshake, tone: "destructive", devTab: "counselling", path: "counselling-records" },
  { key: "sports", label: "Sports", icon: Dumbbell, tone: "info", devTab: "sports", path: "sports-records" },
  { key: "clubs", label: "Clubs", icon: Users2, tone: "purple", devTab: "clubs", path: "club-memberships" },
  { key: "parent-engagement", label: "Parent Engagement", icon: Contact, tone: "warning", devTab: "parent-engagement", path: "parent-engagements" },
  { key: "portfolio", label: "Portfolio", icon: FolderKanban, tone: "purple", devTab: "portfolio", path: "portfolio-items" },
  { key: "talent", label: "Scholarship & Talent", icon: Gem, tone: "warning", devTab: "talent", path: "talent-records" },
  { key: "career", label: "Career Readiness", icon: Compass, tone: "purple", devTab: "career", path: "career-readiness-records" },
  { key: "alumni", label: "Alumni", icon: Landmark, tone: "success", devTab: "alumni", path: "alumni-record" },
];

type SchoolClassOpt = { schoolClassKey: string; className: string };
type AcademicYearOpt = { academicYearKey: string; yearName: string };
type BoardOpt = { boardKey: string; boardName: string };
type SectionOpt = { sectionKey: string; sectionLabel: string };

const GENDER_OPTIONS = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
  { label: "Other", value: "OTHER" },
];
const GUARDIAN_RELATIONSHIP_OPTIONS = [
  { label: "Father", value: "FATHER" },
  { label: "Mother", value: "MOTHER" },
  { label: "Legal Guardian", value: "LEGAL_GUARDIAN" },
  { label: "Grandfather", value: "GRANDFATHER" },
  { label: "Grandmother", value: "GRANDMOTHER" },
  { label: "Other", value: "OTHER" },
];

const emptyAddDraft = (): FormValues => ({ nationality: "Indian", disabilityCategory: "NONE", admissionType: "NEW_ADMISSION" });

const QUICK_ACTIONS = [
  { label: "Add New Achievement", dev: "achievements" },
  { label: "Add Counselling Note", dev: "counselling" },
  { label: "Add Behavior Record", dev: "behavior" },
  { label: "Add Parent Engagement", dev: "parent-engagement" },
];

function StudentLifeDevelopmentPage() {
  const { sid } = Route.useSearch();
  const [students, setStudents] = useState<StudentListRow[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [selected, setSelected] = useState<StudentListRow | null>(null);
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [siblings, setSiblings] = useState<Sibling[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [mainTab, setMainTab] = useState("overview");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ enrollment: true });

  const [addOpen, setAddOpen] = useState(false);
  const [addValues, setAddValues] = useState<FormValues>(emptyAddDraft());
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [addSaving, setAddSaving] = useState(false);
  const [addClasses, setAddClasses] = useState<SchoolClassOpt[]>([]);
  const [addYears, setAddYears] = useState<AcademicYearOpt[]>([]);
  const [addBoards, setAddBoards] = useState<BoardOpt[]>([]);
  const [addSections, setAddSections] = useState<SectionOpt[]>([]);

  const loadStudents = () => {
    setStudentsLoading(true);
    return apiFetch("/api/Student")
      .then((d: StudentListRow[]) => setStudents(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load students"))
      .finally(() => setStudentsLoading(false));
  };

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (!addOpen || addClasses.length > 0) return;
    Promise.all([apiFetch("/api/SchoolClass"), apiFetch("/api/AcademicYear"), apiFetch("/api/Board")])
      .then(([c, y, b]) => { setAddClasses(c); setAddYears(y); setAddBoards(b); })
      .catch(() => {});
  }, [addOpen, addClasses.length]);

  useEffect(() => {
    const schoolClassKey = addValues.schoolClassKey as string | undefined;
    const academicYearKey = addValues.academicYearKey as string | undefined;
    if (!schoolClassKey || !academicYearKey) { setAddSections([]); return; }
    const params = new URLSearchParams({ schoolClassId: schoolClassKey, academicYearId: academicYearKey });
    apiFetch(`/api/Section?${params.toString()}`)
      .then((s: SectionOpt[]) => setAddSections(s))
      .catch(() => setAddSections([]));
  }, [addValues.schoolClassKey, addValues.academicYearKey]);

  const addSchema: FormFieldSchema[] = [
    { name: "academicYearKey", label: "Academic Year", type: "select", required: true, options: addYears.map((y) => ({ label: y.yearName, value: y.academicYearKey })), section: "Enrollment" },
    { name: "boardKey", label: "Board", type: "select", required: true, options: addBoards.map((b) => ({ label: b.boardName, value: b.boardKey })), section: "Enrollment" },
    { name: "schoolClassKey", label: "Class", type: "select", required: true, options: addClasses.map((c) => ({ label: c.className, value: c.schoolClassKey })), section: "Enrollment" },
    { name: "sectionKey", label: "Section", type: "select", options: addSections.map((s) => ({ label: s.sectionLabel, value: s.sectionKey })), placeholder: "Auto-assign if left blank", section: "Enrollment" },

    { name: "studentName", label: "Full Name", type: "text", required: true, section: "Identity" },
    { name: "dateOfBirth", label: "Date of Birth", type: "date", required: true, section: "Identity" },
    { name: "gender", label: "Gender", type: "select", options: GENDER_OPTIONS, section: "Identity" },
    { name: "bloodGroup", label: "Blood Group", type: "text", section: "Identity" },

    { name: "guardianFullName", label: "Guardian Name", type: "text", section: "Primary Guardian" },
    { name: "guardianRelationshipType", label: "Relationship", type: "select", options: GUARDIAN_RELATIONSHIP_OPTIONS, section: "Primary Guardian" },
    { name: "guardianMobileNumber", label: "Mobile", type: "tel", section: "Primary Guardian" },
  ];

  const onAddFieldChange = (name: string, value: unknown) => {
    setAddValues((v) => ({ ...v, [name]: value }));
    setAddErrors((e) => { const next = { ...e }; delete next[name]; return next; });
  };

  const submitAddStudent = async () => {
    const validationErrors = validateFormSchema(addSchema, addValues);
    if (Object.keys(validationErrors).length > 0) {
      setAddErrors(validationErrors);
      toast.error("Please fill in all required fields.");
      return;
    }
    setAddSaving(true);
    try {
      const body = { ...addValues, sectionKey: addValues.sectionKey || null };
      const result = await apiFetch("/api/Student", { method: "POST", body: JSON.stringify(body) });
      toast.success(`Student created — Admission No. ${result.admissionNumber}`);
      setAddOpen(false);
      setAddValues(emptyAddDraft());
      await loadStudents();
      const created = students.find((s) => s.studentKey === result.studentKey);
      selectStudent(created ?? { studentKey: result.studentKey, admissionNumber: result.admissionNumber, studentId: null, studentName: addValues.studentName as string, gender: (addValues.gender as string) ?? null, photoUrl: null, studentStatus: "ENROLLED", className: null, sectionLabel: null, primaryGuardianMobile: (addValues.guardianMobileNumber as string) ?? null });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create student");
    } finally {
      setAddSaving(false);
    }
  };

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return students
      .filter((s) =>
        (s.studentId ?? "").toLowerCase().includes(q) ||
        s.admissionNumber.toLowerCase().includes(q) ||
        s.studentName.toLowerCase().includes(q),
      )
      .slice(0, 10);
  }, [query, students]);

  const selectStudent = (s: StudentListRow) => {
    setSelected(s);
    setQuery("");
    setMainTab("overview");
    setExpanded({ enrollment: true });
  };

  useEffect(() => {
    if (!sid || selected || students.length === 0) return;
    const match = students.find((s) => s.studentKey === sid);
    if (match) selectStudent(match);
  }, [sid, students, selected]);

  useEffect(() => {
    if (!selected) return;
    setLoadingDetail(true);
    setDetail(null);
    setEnrollments([]);
    setGuardians([]);
    setSiblings([]);
    setDocuments([]);
    setBranches(BRANCH_DEFS.map((b) => ({ key: b.key, label: b.label, icon: b.icon, tone: b.tone, devTab: b.devTab, loading: true, rows: [] })));

    setDocumentsLoading(true);
    apiFetch(`/api/Student/${selected.studentKey}/documents`)
      .then((d: StudentDocument[]) => setDocuments(d ?? []))
      .catch(() => setDocuments([]))
      .finally(() => setDocumentsLoading(false));

    apiFetch(`/api/Student/${selected.studentKey}`)
      .then((d: { student: StudentDetail; enrollments: Enrollment[]; guardians: Guardian[]; siblings: Sibling[] }) => {
        setDetail(d.student);
        setEnrollments(d.enrollments ?? []);
        setGuardians(d.guardians ?? []);
        setSiblings(d.siblings ?? []);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load student"))
      .finally(() => setLoadingDetail(false));

    BRANCH_DEFS.forEach((b) => {
      apiFetch(`/api/Student/${selected.studentKey}/${b.path}`)
        .then((raw) => {
          const rows = toLeafRows(b.key, raw);
          setBranches((prev) => prev.map((p) => (p.key === b.key ? { ...p, loading: false, rows } : p)));
        })
        .catch(() => {
          setBranches((prev) => prev.map((p) => (p.key === b.key ? { ...p, loading: false, rows: [] } : p)));
        });
    });
  }, [selected]);

  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);

  const downloadReport = async (reportPath: string, label: string) => {
    if (!selected) return;
    setDownloadingReport(reportPath);
    try {
      const token = localStorage.getItem("akira_token");
      const res = await fetch(`${API_BASE_URL}/api/Student/${selected.studentKey}/reports/${reportPath}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to generate report");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${label.replace(/\s+/g, "_")}_${selected.admissionNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setDownloadingReport(null);
    }
  };

  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  const expandAll = () => {
    const all: Record<string, boolean> = { enrollment: true };
    branches.forEach((b) => { all[b.key] = true; });
    setExpanded(all);
  };

  const totalRecords = branches.reduce((sum, b) => sum + b.rows.length, 0);
  const branchByKey = (key: string) => branches.find((b) => b.key === key);

  const feed: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];
    enrollments.forEach((e) =>
      items.push({ key: e.studentEnrollmentKey, date: e.enrollmentDate, label: `Enrolled — ${e.className ?? "Unassigned"}`, category: "Enrollment", tone: "info" }),
    );
    branches.forEach((b) => {
      b.rows.forEach((r) => {
        if (r.date) items.push({ key: r.key, date: r.date, label: `${b.label}: ${r.title}`, category: b.label, tone: b.tone });
      });
    });
    return items.filter((i) => i.date).sort((a, c) => new Date(c.date).getTime() - new Date(a.date).getTime());
  }, [enrollments, branches]);

  const devLink = (dev: string) => (selected ? { to: "/student-detail" as const, search: { id: selected.studentKey, tab: "development", dev } } : undefined);

  return (
    <div>
      <PageHeader
        title="Student Life Development"
        breadcrumbs={[{ label: "Students" }, { label: "Life Development" }]}
        actions={
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex h-10 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4" /> Add Student
          </button>
        }
      />

      <div className="mb-5 max-w-lg">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Student ID, Admission Number or Name..."
            className="rounded-md px-9"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {query.trim() !== "" && (
          <div className="mt-1.5 overflow-hidden rounded-md border border-border bg-card shadow-sm">
            {studentsLoading ? (
              <div className="px-3 py-3 text-sm text-muted-foreground">Loading students...</div>
            ) : matches.length === 0 ? (
              <div className="px-3 py-3 text-sm text-muted-foreground">No students match "{query}".</div>
            ) : (
              matches.map((s) => (
                <button
                  key={s.studentKey}
                  type="button"
                  onClick={() => selectStudent(s)}
                  className="flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left last:border-0 hover:bg-secondary/50"
                >
                  <StudentAvatar photoUrl={s.photoUrl} gender={s.gender} studentName={s.studentName} className="h-8 w-8 text-xs font-semibold" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.studentName}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {s.studentId ? `ID: ${s.studentId} · ` : ""}Adm: {s.admissionNumber}
                      {s.className ? ` · ${s.className}${s.sectionLabel ? ` ${s.sectionLabel}` : ""}` : ""}
                    </div>
                  </div>
                  <Badge className={cn("shrink-0 rounded-md border-0 text-[10px] font-medium", STATUS_STYLES[s.studentStatus] ?? "bg-muted text-muted-foreground")}>
                    {s.studentStatus}
                  </Badge>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {!selected ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-card py-20 text-center">
          <Search className="mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Search for a student above to view their full details and life-development history.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr_280px]">
          {/* Left: profile + quick actions */}
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-card p-5 text-center shadow-sm">
              <StudentAvatar photoUrl={detail?.photoUrl} gender={detail?.gender} studentName={selected.studentName} className="mx-auto h-20 w-20 text-2xl font-semibold" />
              <div className="mt-3 font-display text-base font-bold">{selected.studentName}</div>
              <Badge className={cn("mt-1 rounded-md border-0 text-[10px] font-medium", STATUS_STYLES[selected.studentStatus] ?? "bg-muted text-muted-foreground")}>
                {selected.studentStatus}
              </Badge>

              <div className="mt-4 space-y-2 text-left text-sm">
                <div className="flex justify-between gap-2"><span className="text-muted-foreground">Student ID</span><span className="font-mono font-medium">{detail?.studentId ?? "—"}</span></div>
                <div className="flex justify-between gap-2"><span className="text-muted-foreground">Admission No.</span><span className="font-mono font-medium">{selected.admissionNumber}</span></div>
                <div className="flex justify-between gap-2"><span className="text-muted-foreground">Admission Date</span><span className="font-medium">{detail ? formatDate(detail.admissionDate) : "—"}</span></div>
                <div className="flex justify-between gap-2"><span className="text-muted-foreground">Date of Birth</span><span className="font-medium">{detail ? formatDate(detail.dateOfBirth) : "—"}</span></div>
                <div className="flex justify-between gap-2"><span className="text-muted-foreground">Gender</span><span className="font-medium">{detail?.gender ?? "—"}</span></div>
                <div className="flex justify-between gap-2"><span className="text-muted-foreground">Blood Group</span><span className="font-medium">{detail?.bloodGroup ?? "—"}</span></div>
                <div className="flex justify-between gap-2"><span className="text-muted-foreground">Nationality</span><span className="font-medium">{detail?.nationality ?? "—"}</span></div>
                <div className="flex justify-between gap-2"><span className="text-muted-foreground">Mobile</span><span className="font-medium">{selected.primaryGuardianMobile ?? "—"}</span></div>
              </div>

              <Link
                to="/student-detail"
                search={{ id: selected.studentKey }}
                className="mt-4 flex items-center justify-center gap-1.5 rounded-md border border-border py-2 text-xs font-medium text-primary hover:bg-secondary/50"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open Full Profile
              </Link>
            </div>

            <div className="rounded-md border border-border bg-card p-5 shadow-sm">
              <h4 className="mb-3 text-sm font-semibold text-muted-foreground">Quick Actions</h4>
              <div className="space-y-1">
                {QUICK_ACTIONS.map((qa) => (
                  <Link
                    key={qa.dev}
                    to="/student-detail"
                    search={{ id: selected.studentKey, tab: "development", dev: qa.dev }}
                    className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-secondary/50"
                  >
                    <span>{qa.label}</span>
                    <Plus className="h-3.5 w-3.5 text-primary" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Center: tabs */}
          <div className="min-w-0 space-y-4">
            <div className="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-md border border-border bg-card shadow-sm sm:grid-cols-5 sm:divide-y-0">
              <KpiCard label="Life Cycle Areas" value={String(BRANCH_DEFS.length)} caption="Total Categories" icon={Users2} tone="purple" />
              <KpiCard label="Achievements" value={String(branchByKey("achievements")?.rows.length ?? 0)} caption="Total Records" icon={Award} tone="success" />
              <KpiCard label="Counselling" value={String(branchByKey("counselling")?.rows.length ?? 0)} caption="Sessions" icon={HeartHandshake} tone="destructive" />
              <KpiCard label="Parent Engagement" value={String(branchByKey("parent-engagement")?.rows.length ?? 0)} caption="Interactions" icon={Contact} tone="info" />
              <KpiCard label="Last Activity" value={feed[0] ? formatDate(feed[0].date) : "—"} caption="Recent Update" icon={Clock} tone="warning" />
            </div>

            <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
              <TabsList className="h-auto w-full justify-start gap-1 rounded-md border border-border bg-card p-1">
                <TabsTrigger value="overview" className="gap-1.5 rounded-md text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none"><LayoutList className="h-3.5 w-3.5" /> Overview</TabsTrigger>
                <TabsTrigger value="details" className="gap-1.5 rounded-md text-xs data-[state=active]:bg-info/15 data-[state=active]:text-info data-[state=active]:shadow-none"><User className="h-3.5 w-3.5" /> Life Cycle Details</TabsTrigger>
                <TabsTrigger value="achievements" className="gap-1.5 rounded-md text-xs data-[state=active]:bg-[oklch(0.75_0.17_300)]/15 data-[state=active]:text-[oklch(0.55_0.2_300)] data-[state=active]:shadow-none"><Award className="h-3.5 w-3.5" /> Achievements</TabsTrigger>
                <TabsTrigger value="reports" className="gap-1.5 rounded-md text-xs data-[state=active]:bg-warning/25 data-[state=active]:text-[oklch(0.45_0.12_65)] data-[state=active]:shadow-none"><FileText className="h-3.5 w-3.5" /> Reports</TabsTrigger>
                <TabsTrigger value="timeline" className="gap-1.5 rounded-md text-xs data-[state=active]:bg-[oklch(0.55_0.1_200)]/15 data-[state=active]:text-[oklch(0.4_0.12_200)] data-[state=active]:shadow-none"><History className="h-3.5 w-3.5" /> Timeline</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="pt-4">
                <div className="rounded-md border border-border bg-card p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-display text-base font-bold">Life Cycle Overview</h3>
                    <button type="button" onClick={expandAll} className="text-xs font-medium text-primary hover:underline">Expand All</button>
                  </div>

                  <div className={cn("relative mb-2 overflow-hidden rounded-md border", CARD_TONES.info)}>
                    <span className={cn("absolute inset-y-0 left-0 w-1", ACCENT_TONES.info)} />
                    <button type="button" onClick={() => toggle("enrollment")} className="flex w-full items-center justify-between gap-2 py-2.5 pl-4 pr-3 hover:bg-secondary/40">
                      <div className="flex items-center gap-2.5">
                        <IconChip icon={GraduationCap} tone="info" />
                        <span className="text-sm font-semibold">Enrollment History</span>
                        <Badge className="rounded-md border-0 bg-muted px-1.5 py-0 text-[10px] font-medium text-muted-foreground">{enrollments.length}</Badge>
                      </div>
                      {expanded.enrollment ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    {expanded.enrollment && (
                      <div className="overflow-x-auto border-t border-border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                              <th className="px-3 py-2">Class & Section</th>
                              <th className="px-3 py-2">Academic Year</th>
                              <th className="px-3 py-2">Admission Type</th>
                              <th className="px-3 py-2">Status</th>
                              <th className="px-3 py-2">Admission Date</th>
                              <th className="px-3 py-2 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {enrollments.length === 0 ? (
                              <tr><td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">{loadingDetail ? "Loading..." : "No enrollment history."}</td></tr>
                            ) : (
                              enrollments
                                .slice()
                                .sort((a, b) => new Date(b.enrollmentDate).getTime() - new Date(a.enrollmentDate).getTime())
                                .map((e) => (
                                  <tr key={e.studentEnrollmentKey} className="border-b border-border last:border-0">
                                    <td className="px-3 py-2 font-medium">{e.className ?? "Unassigned"}{e.sectionLabel ? ` · Section ${e.sectionLabel}` : ""}</td>
                                    <td className="px-3 py-2 text-muted-foreground">{e.academicYearName ?? "—"}</td>
                                    <td className="px-3 py-2 text-muted-foreground">{e.admissionType.replace(/_/g, " ")}</td>
                                    <td className="px-3 py-2">
                                      <Badge className={cn("rounded-md border-0 text-[10px] font-medium", e.status === "ACTIVE" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>{e.status}</Badge>
                                    </td>
                                    <td className="px-3 py-2 text-muted-foreground">{formatDate(e.enrollmentDate)}</td>
                                    <td className="px-3 py-2 text-right">
                                      <Link to="/student-detail" search={{ id: selected.studentKey, tab: "enrollment" }} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-primary hover:bg-primary/10">
                                        <Eye className="h-3.5 w-3.5" />
                                      </Link>
                                    </td>
                                  </tr>
                                ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {branches.map((b) => (
                    <div key={b.key} className={cn("relative mb-2 overflow-hidden rounded-md border", CARD_TONES[b.tone])}>
                      <span className={cn("absolute inset-y-0 left-0 w-1", ACCENT_TONES[b.tone])} />
                      <button type="button" onClick={() => toggle(b.key)} className="flex w-full items-center justify-between gap-2 py-2.5 pl-4 pr-3 hover:bg-secondary/40">
                        <div className="flex items-center gap-2.5">
                          <IconChip icon={b.icon} tone={b.tone} />
                          <span className="text-sm font-semibold">{b.label}</span>
                          {b.loading ? <span className="text-xs text-muted-foreground">Loading...</span> : (
                            <Badge className="rounded-md border-0 bg-muted px-1.5 py-0 text-[10px] font-medium text-muted-foreground">{b.rows.length}</Badge>
                          )}
                        </div>
                        {expanded[b.key] ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      {expanded[b.key] && (
                        <div className="space-y-1.5 border-t border-border p-3">
                          {!b.loading && b.rows.length === 0 ? (
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>No records yet.</span>
                              {devLink(b.devTab) && (
                                <Link to="/student-detail" search={devLink(b.devTab)!.search} className="font-medium text-primary hover:underline">Add one</Link>
                              )}
                            </div>
                          ) : (
                            b.rows.slice().sort((a, c) => (c.date ?? "").localeCompare(a.date ?? "")).map((r) => (
                              <div key={r.key} className={cn("flex items-start justify-between gap-3 rounded-md border px-3 py-2", CARD_TONES[b.tone])}>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium">{r.title}</div>
                                  <div className="truncate text-xs text-muted-foreground">{r.subtitle}</div>
                                  {r.badges && r.badges.length > 0 && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {r.badges.map((bd) => <Badge key={bd} className="rounded-md border-0 bg-primary/10 px-1.5 py-0 text-[10px] font-medium text-primary">{bd}</Badge>)}
                                    </div>
                                  )}
                                </div>
                                <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{formatDate(r.date)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="details" className="pt-4">
                {loadingDetail || !detail ? (
                  <div className="rounded-md border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">Loading student details...</div>
                ) : (
                  <div className="rounded-md border border-border bg-card p-5 shadow-sm">
                    <h3 className="mb-4 font-display text-base font-bold">Life Cycle Details</h3>
                    <div className="grid gap-3">
                      <Section icon={User} title="Personal Information">
                        <Field label="Gender" value={detail.gender} />
                        <Field label="Date of Birth" value={formatDate(detail.dateOfBirth)} />
                        <Field label="Place of Birth" value={detail.placeOfBirth} />
                        <Field label="Nationality" value={detail.nationality} />
                        <Field label="Mother Tongue" value={detail.motherTongue} />
                        <Field label="Religion" value={detail.religion} />
                        <Field label="Blood Group" value={detail.bloodGroup} />
                        <Field label="Admission Date" value={formatDate(detail.admissionDate)} />
                      </Section>

                      <Section icon={Fingerprint} title="Identity & Community">
                        <Field label="Aadhar Number" value={detail.aadharNumberMasked} />
                        <Field label="EMIS Number" value={detail.emisNumber} />
                        <Field label="Student PEN" value={detail.studentPENNumber} />
                        <Field label="Govt Scholarship #" value={detail.govtScholarshipNumber} />
                        <Field label="Community Category" value={detail.communityCategory} />
                        <Field label="Sub-Caste" value={detail.subCaste} />
                        <Field label="Minority Status" value={detail.minorityStatus ? "Yes" : "No"} />
                        <Field label="RTE Status" value={detail.rteStatus ? "Yes" : "No"} />
                        <Field label="First Gen. Learner" value={detail.firstGenerationLearner ? "Yes" : "No"} />
                        <Field label="Economically Weaker" value={detail.economicallyWeakerSection ? "Yes" : "No"} />
                        <Field label="Special Needs" value={detail.specialNeedsCategory} />
                        <Field label="Disability" value={detail.disabilityCategory !== "NONE" ? `${detail.disabilityCategory}${detail.disabilityPercentage ? ` (${detail.disabilityPercentage}%)` : ""}` : "None"} />
                      </Section>

                      {(detail.prevSchoolName || detail.prevSchoolBoard || detail.prevClassLastStudied) && (
                        <Section icon={GraduationCap} title="Previous School">
                          <Field label="School Name" value={detail.prevSchoolName} />
                          <Field label="Board" value={detail.prevSchoolBoard} />
                          <Field label="Last Class Studied" value={detail.prevClassLastStudied} />
                        </Section>
                      )}

                      <Section icon={MapPin} title="Current Address">
                        <div className="col-span-2 sm:col-span-3">
                          <Field label="Address" value={[detail.currentAddressLine1, detail.currentAddressLine2].filter(Boolean).join(", ") || null} />
                        </div>
                        <Field label="City" value={detail.currentCity} />
                        <Field label="District" value={detail.currentDistrict} />
                        <Field label="State" value={detail.currentState} />
                        <Field label="Pincode" value={detail.currentPincode} />
                      </Section>

                      <Section icon={Home} title="Permanent Address">
                        {detail.permanentSameAsCurrent ? (
                          <div className="col-span-2 text-sm text-muted-foreground sm:col-span-3">Same as current address</div>
                        ) : (
                          <>
                            <div className="col-span-2 sm:col-span-3">
                              <Field label="Address" value={[detail.permanentAddressLine1, detail.permanentAddressLine2].filter(Boolean).join(", ") || null} />
                            </div>
                            <Field label="City" value={detail.permanentCity} />
                            <Field label="District" value={detail.permanentDistrict} />
                            <Field label="State" value={detail.permanentState} />
                            <Field label="Pincode" value={detail.permanentPincode} />
                          </>
                        )}
                      </Section>

                      <Section icon={HeartPulse} title="Medical & Emergency">
                        <Field label="Known Allergies" value={detail.knownAllergies} />
                        <Field label="Chronic Conditions" value={detail.chronicConditions} />
                        <Field label="Emergency Contact" value={detail.emergencyContactName} />
                        <Field label="Emergency Mobile" value={detail.emergencyContactMobile} />
                      </Section>

                      <Section icon={Bus} title="Transport & Hostel">
                        <Field label="Uses Transport" value={detail.isAvailingTransport ? "Yes" : "No"} />
                        <Field label="Residential (Hostel)" value={detail.isResidential ? "Yes" : "No"} />
                        {detail.isResidential && <Field label="Hostel Bed #" value={detail.hostelBedNumber} />}
                      </Section>

                      <Section icon={Users} title={`Guardians (${guardians.length})`}>
                        {guardians.length === 0 ? (
                          <div className="col-span-2 text-sm text-muted-foreground sm:col-span-3">No guardians on file.</div>
                        ) : (
                          guardians.map((g) => (
                            <div key={g.studentGuardianKey} className="col-span-2 rounded-md border border-border bg-card p-2.5 sm:col-span-3">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-sm font-medium">{g.fullName}</span>
                                <Badge className="rounded-md border-0 bg-muted px-1.5 py-0 text-[10px] font-medium text-muted-foreground">{g.relationshipType.replace(/_/g, " ")}</Badge>
                                {g.isPrimaryGuardian && <Badge className="rounded-md border-0 bg-primary/10 px-1.5 py-0 text-[10px] font-medium text-primary">Primary</Badge>}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">{[g.mobileNumber, g.emailAddress, g.occupation].filter(Boolean).join(" · ") || "No contact details"}</div>
                            </div>
                          ))
                        )}
                      </Section>

                      <Section icon={Users2} title={`Siblings (${siblings.length})`}>
                        {siblings.length === 0 ? (
                          <div className="col-span-2 text-sm text-muted-foreground sm:col-span-3">No siblings linked.</div>
                        ) : (
                          siblings.map((sib) => (
                            <div key={sib.studentRelationshipKey} className="col-span-2 rounded-md border border-border bg-card p-2.5 sm:col-span-3">
                              <div className="text-sm font-medium">{sib.siblingName}</div>
                              <div className="text-xs text-muted-foreground">Adm: {sib.siblingAdmissionNumber}{sib.siblingStatus ? ` · ${sib.siblingStatus}` : ""}</div>
                            </div>
                          ))
                        )}
                      </Section>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="achievements" className="pt-4">
                <div className="rounded-md border border-border bg-card p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-display text-base font-bold">Achievements</h3>
                    {selected && (
                      <Link to="/student-detail" search={{ id: selected.studentKey, tab: "development", dev: "achievements" }} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary/50">
                        <Plus className="h-3.5 w-3.5" /> Add Achievement
                      </Link>
                    )}
                  </div>
                  <div className="space-y-2">
                    {(() => {
                      const b = branchByKey("achievements");
                      if (!b || b.loading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>;
                      if (b.rows.length === 0) return <div className="py-8 text-center text-sm text-muted-foreground">No achievements recorded yet.</div>;
                      return b.rows.slice().sort((a, c) => (c.date ?? "").localeCompare(a.date ?? "")).map((r) => (
                        <div key={r.key} className={cn("flex items-start justify-between gap-3 rounded-md border px-3 py-2.5", CARD_TONES.purple)}>
                          <div className="flex items-start gap-2.5">
                            <IconChip icon={Award} tone="purple" />
                            <div>
                              <div className="text-sm font-medium">{r.title}</div>
                              <div className="text-xs text-muted-foreground">{r.subtitle}</div>
                            </div>
                          </div>
                          <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{formatDate(r.date)}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="reports" className="pt-4 space-y-4">
                <div className="rounded-md border border-border bg-card p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-base font-bold">Documents</h3>
                      <p className="text-sm text-muted-foreground">TC, marksheet and other paperwork uploaded for this student.</p>
                    </div>
                    <Badge className="rounded-md border-0 bg-muted px-1.5 py-0 text-[10px] font-medium text-muted-foreground">{documents.length}</Badge>
                  </div>
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="px-3 py-2">Document Type</th>
                          <th className="px-3 py-2">File Name</th>
                          <th className="px-3 py-2">Uploaded On</th>
                          <th className="px-3 py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documentsLoading ? (
                          <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">Loading documents...</td></tr>
                        ) : documents.length === 0 ? (
                          <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">No documents uploaded yet.</td></tr>
                        ) : (
                          documents
                            .slice()
                            .sort((a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime())
                            .map((d) => (
                              <tr key={d.studentDocumentKey} className="border-b border-border last:border-0">
                                <td className="px-3 py-2 font-medium">{DOCUMENT_TYPE_LABELS[d.documentType] ?? d.documentType}</td>
                                <td className="px-3 py-2 text-muted-foreground">{d.fileName}</td>
                                <td className="px-3 py-2 text-muted-foreground">{formatDate(d.createdOn)}</td>
                                <td className="px-3 py-2 text-right">
                                  <a
                                    href={`${API_BASE_URL}${d.fileUrl}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    download={d.fileName}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-primary hover:bg-primary/10"
                                    aria-label={`Download ${d.fileName}`}
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </a>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-md border border-border bg-card p-5 shadow-sm">
                  <h3 className="mb-1 font-display text-base font-bold">Generated Reports</h3>
                  <p className="mb-4 text-sm text-muted-foreground">Download a PDF snapshot of this student's records.</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { label: "Life Development Report", path: "life-development" },
                      { label: "Achievements Report", path: "achievements" },
                      { label: "Counselling Report", path: "counselling" },
                      { label: "Complete Profile Report", path: "complete-profile" },
                    ].map((r) => (
                      <button
                        key={r.path}
                        type="button"
                        disabled={downloadingReport === r.path}
                        onClick={() => downloadReport(r.path, r.label)}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 text-sm hover:bg-muted/50 disabled:opacity-60"
                      >
                        <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> {r.label}</span>
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="pt-4">
                <div className="rounded-md border border-border bg-card p-5 shadow-sm">
                  <h3 className="mb-4 font-display text-base font-bold">Full Timeline</h3>
                  {feed.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">{loadingDetail ? "Loading..." : "No dated activity yet."}</div>
                  ) : (
                    <div className="relative space-y-4 border-l border-border pl-5">
                      {feed.map((item) => (
                        <div key={item.key} className="relative">
                          <span className={cn("absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full", ACCENT_TONES[item.tone])} />
                          <div className="text-sm font-medium">{item.label}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(item.date)} · {item.category}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: recent activity, reports, mini timeline */}
          <div className="space-y-4">
            <div className={cn("relative overflow-hidden rounded-md border p-5 shadow-sm", CARD_TONES.info)}>
              <span className={cn("absolute inset-x-0 top-0 h-1", ACCENT_TONES.info)} />
              <h4 className="mb-3 text-sm font-semibold">Recent Activities</h4>
              <div className="space-y-2.5">
                {feed.length === 0 ? (
                  <div className="text-xs text-muted-foreground">{loadingDetail ? "Loading..." : "No activity yet."}</div>
                ) : (
                  feed.slice(0, 5).map((item) => (
                    <div key={item.key} className="flex items-start gap-2">
                      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", ACCENT_TONES[item.tone])} />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium">{item.category}</div>
                        <div className="text-[11px] text-muted-foreground">{formatDate(item.date)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button type="button" onClick={() => setMainTab("timeline")} className="mt-3 w-full rounded-md border border-border py-1.5 text-xs font-medium hover:bg-secondary/50">
                View All Activities
              </button>
            </div>

            <div className={cn("relative overflow-hidden rounded-md border p-5 shadow-sm", CARD_TONES.warning)}>
              <span className={cn("absolute inset-x-0 top-0 h-1", ACCENT_TONES.warning)} />
              <h4 className="mb-3 text-sm font-semibold">Download Reports</h4>
              <div className="space-y-1.5">
                {documentsLoading ? (
                  <div className="text-xs text-muted-foreground">Loading...</div>
                ) : documents.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No documents uploaded yet.</div>
                ) : (
                  documents.slice(0, 5).map((d) => (
                    <a
                      key={d.studentDocumentKey}
                      href={`${API_BASE_URL}${d.fileUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      download={d.fileName}
                      className="flex items-center justify-between gap-2 text-xs text-foreground hover:text-primary"
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{DOCUMENT_TYPE_LABELS[d.documentType] ?? d.documentType}</span>
                      </span>
                      <Download className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  ))
                )}
              </div>
              <button type="button" onClick={() => setMainTab("reports")} className="mt-3 w-full rounded-md border border-border py-1.5 text-xs font-medium hover:bg-secondary/50">
                View All Reports
              </button>
            </div>

            <div className={cn("relative overflow-hidden rounded-md border p-5 shadow-sm", CARD_TONES.teal)}>
              <span className={cn("absolute inset-x-0 top-0 h-1", ACCENT_TONES.teal)} />
              <h4 className="mb-3 text-sm font-semibold">Student Timeline</h4>
              <div className="space-y-2.5">
                {feed.slice(0, 5).map((item) => (
                  <div key={item.key} className="flex items-start gap-2">
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", ACCENT_TONES[item.tone])} />
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground">{formatDate(item.date)}</div>
                      <div className="truncate text-xs font-medium">{item.label}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setMainTab("timeline")} className="mt-3 w-full rounded-md border border-border py-1.5 text-xs font-medium hover:bg-secondary/50">
                View Full Timeline
              </button>
            </div>
          </div>
        </div>
      )}

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add Student"
        description="Quick-add a student — they'll appear in search immediately and open right here."
        submitLabel="Create Student"
        onSubmit={submitAddStudent}
        submitting={addSaving}
        size="lg"
      >
        <FormEngine schema={addSchema} values={addValues} onChange={onAddFieldChange} errors={addErrors} />
      </FormDialog>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toLeafRows(branchKey: string, raw: any): LeafRow[] {
  if (!raw) return [];
  switch (branchKey) {
    case "achievements":
      return (raw as any[]).map((r) => ({
        key: r.studentAchievementKey, title: r.title, date: r.achievementDate,
        subtitle: [r.category?.replace(/_/g, " "), r.level, r.position].filter(Boolean).join(" · "),
      }));
    case "behavior":
      return (raw as any[]).map((r) => ({
        key: r.studentBehaviorRecordKey, title: r.title, date: r.incidentDate,
        subtitle: r.recordType.replace(/_/g, " "),
        badges: r.followUpRequired ? [`Follow-up: ${r.followUpStatus ?? "OPEN"}`] : undefined,
      }));
    case "leadership":
      return (raw as any[]).map((r) => ({
        key: r.studentLeadershipRoleKey, title: r.roleTitle.replace(/_/g, " "), date: r.startDate,
        subtitle: [r.scope, r.endDate ? "Ended" : "Active"].filter(Boolean).join(" · "),
      }));
    case "counselling":
      return (raw as any[]).map((r) => ({
        key: r.studentCounsellingRecordKey, title: r.supportArea.replace(/_/g, " "), date: r.sessionDate,
        subtitle: [r.counsellorName, r.outcomeStatus].filter(Boolean).join(" · "),
      }));
    case "sports":
      return (raw as any[]).map((r) => ({
        key: r.studentSportsRecordKey, title: r.sportName, date: r.eventDate,
        subtitle: [r.recordType?.replace(/_/g, " "), r.level, r.position].filter(Boolean).join(" · "),
      }));
    case "clubs":
      return (raw as any[]).map((r) => ({
        key: r.studentClubMembershipKey, title: r.clubName, date: r.joinDate,
        subtitle: [r.roleInClub.replace(/_/g, " "), r.leaveDate ? "Left" : "Active"].filter(Boolean).join(" · "),
      }));
    case "parent-engagement":
      return (raw as any[]).map((r) => ({
        key: r.studentParentEngagementKey, title: r.subject ?? r.engagementType.replace(/_/g, " "), date: r.engagementDate,
        subtitle: [r.mode?.replace(/_/g, " "), r.outcomeStatus].filter(Boolean).join(" · "),
      }));
    case "portfolio":
      return (raw as any[]).map((r) => ({
        key: r.studentPortfolioItemKey, title: r.title, date: r.itemDate,
        subtitle: r.itemType.replace(/_/g, " "),
        badges: r.isFeatured ? ["Featured"] : undefined,
      }));
    case "talent":
      return (raw as any[]).map((r) => ({
        key: r.studentTalentRecordKey, title: r.talentArea.replace(/_/g, " "), date: r.identifiedDate,
        subtitle: r.proficiencyLevel,
        badges: r.scholarshipRecommended ? ["Scholarship Recommended"] : undefined,
      }));
    case "career":
      return (raw as any[]).map((r) => ({
        key: r.studentCareerReadinessRecordKey, title: r.title, date: r.recordDate,
        subtitle: [r.recordType.replace(/_/g, " "), r.status].filter(Boolean).join(" · "),
      }));
    case "alumni": {
      if (Array.isArray(raw) || !raw.studentAlumniRecordKey) return [];
      return [{
        key: raw.studentAlumniRecordKey,
        title: raw.higherEducationInstitution ?? raw.currentOccupation ?? "Alumni Record",
        date: raw.graduationDate,
        subtitle: [raw.courseOfStudy, raw.currentOccupation].filter(Boolean).join(" · "),
        badges: raw.mentorshipParticipation ? ["Mentor"] : undefined,
      }];
    }
    default:
      return [];
  }
}
