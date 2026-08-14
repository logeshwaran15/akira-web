import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { InfoAlert } from "@/components/erp/InfoAlert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import {
  Plus,
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  ListChecks,
  Award,
  Users,
  CalendarCheck2,
  Trophy,
  ArrowDownWideNarrow,
  Wallet,
  LogOut,
  UserPlus,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admissions-applications")({
  head: () => ({
    meta: [
      { title: "Applications — Akira School ERP" },
      {
        name: "description",
        content: "Review admission applications and verify submitted documents.",
      },
    ],
  }),
  component: ApplicationsPage,
});

type Application = {
  applicationKey: string;
  applicationNumber: string;
  applicationDate: string;
  status: string;
  academicYearKey: string;
  academicYearName: string;
  classApplyingForKey: string;
  classApplyingForName: string;
  streamName: string | null;
  fullName: string;
  dateOfBirth: string;
  fatherName: string | null;
  fatherMobile: string | null;
  mandatoryDocCount: number;
  mandatoryDocSubmittedCount: number;
  admissionQuota: string;
  selectionOfferExpiryDate: string | null;
  confirmationFeeAmount: number | null;
  confirmationFeePaid: boolean;
  confirmationPaymentReference: string | null;
  waitlistPosition: number | null;
};

type AdmissionTestOption = {
  admissionTestKey: string;
  academicYearKey: string;
  classForKey: string;
  testDate: string;
  testType: string;
  passPercentage: number;
  totalMaxMarks: number | null;
};

type AdmissionTestSubject = { subjectKey: string; subjectName: string; maxMarks: number };

type ApplicationTestResult = {
  applicationTestResultKey: string;
  admissionTestKey: string;
  testDate: string | null;
  testType: string | null;
  totalMaxMarks: number | null;
  totalMarksObtained: number | null;
  percentage: number | null;
  result: string | null;
};

type ApplicationInterview = {
  applicationInterviewKey: string;
  interviewDate: string;
  interviewTime: string | null;
  panelStaffKeys: string | null;
  outcome: string | null;
  panelRemarks: string | null;
};

type StaffOption = { staffProfileKey: string; userName: string; designation: string };

type BoardOption = { boardKey: string; boardCode: string; boardName: string };
type SectionOption = { sectionKey: string; sectionLabel: string; seatingCapacity: number };
type SubjectOption = { subjectKey: string; subjectName: string };
type EnrolledStudentSummary = {
  studentKey: string;
  admissionNumber: string;
  studentName: string;
  studentStatus: string;
};
type AgeValidationResult = {
  classCode: string | null;
  cutoffDate: string;
  minimumAgeYears: number | null;
  actualAgeYears: number;
  isEligible: boolean;
};

type ApplicationDocument = {
  applicationDocumentKey: string;
  documentType: string;
  documentLabel: string;
  isMandatory: boolean;
  status: string;
  rejectionReason: string | null;
};

type ApplicationDetail = Application &
  Record<string, unknown> & {
    applicationFeeAmount: number;
    applicationFeePaid: boolean;
    paymentReference: string | null;
    gender: string | null;
    nationality: string | null;
    religion: string | null;
    motherTongue: string | null;
    bloodGroup: string | null;
    aadharNumber: string | null;
    fatherOccupation: string | null;
    fatherEmail: string | null;
    motherName: string | null;
    motherMobile: string | null;
    motherOccupation: string | null;
    motherEmail: string | null;
    guardianName: string | null;
    guardianRelationship: string | null;
    guardianMobile: string | null;
    currentAddressLine1: string | null;
    currentAddressLine2: string | null;
    currentCity: string | null;
    currentDistrict: string | null;
    currentState: string | null;
    currentPincode: string | null;
    prevSchoolName: string | null;
    prevSchoolBoard: string | null;
    prevClassLastStudied: string | null;
    prevTCNumber: string | null;
    prevYearOfPassing: number | null;
    prevPercentage: number | null;
    knownAllergies: string | null;
    chronicConditions: string | null;
    disabilityType: string | null;
    emergencyContactName: string | null;
    emergencyContactMobile: string | null;
    rejectionReason: string | null;
    remarks: string | null;
  };

const STATUS_OPTIONS = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "TEST_SCHEDULED",
  "INTERVIEW_SCHEDULED",
  "SELECTED",
  "WAITLISTED",
  "REJECTED",
  "WITHDRAWN",
  "ENROLLED",
];
const STATUS_STYLES: Record<string, string> = {
  SUBMITTED: "bg-info/15 text-info",
  UNDER_REVIEW: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  SHORTLISTED: "bg-primary/15 text-primary",
  TEST_SCHEDULED: "bg-primary/15 text-primary",
  INTERVIEW_SCHEDULED: "bg-primary/15 text-primary",
  SELECTED: "bg-success/15 text-success",
  WAITLISTED: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  REJECTED: "bg-destructive/15 text-destructive",
  WITHDRAWN: "bg-[oklch(0.55_0.1_200)]/15 text-[oklch(0.4_0.12_200)]",
  ENROLLED: "bg-success/15 text-success",
};
const DOC_STATUS_STYLES: Record<string, string> = {
  REQUIRED: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  SUBMITTED: "bg-info/15 text-info",
  VERIFIED: "bg-success/15 text-success",
  REJECTED: "bg-destructive/15 text-destructive",
};
const RESULT_STYLES: Record<string, string> = {
  PASS: "bg-success/15 text-success",
  FAIL: "bg-destructive/15 text-destructive",
  WAITLIST: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
};
const OUTCOME_STYLES: Record<string, string> = {
  RECOMMENDED: "bg-success/15 text-success",
  NOT_RECOMMENDED: "bg-destructive/15 text-destructive",
  DEFER: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
};
const QUOTA_STYLES: Record<string, string> = {
  RTE: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
  MANAGEMENT: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  STAFF_WARD: "bg-[oklch(0.55_0.1_200)]/15 text-[oklch(0.4_0.12_200)]",
  SIBLING: "bg-info/15 text-info",
  SPORTS: "bg-success/15 text-success",
  MINORITY: "bg-primary/15 text-primary",
};

function ApplicationsPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const [docTarget, setDocTarget] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<ApplicationDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const [viewTarget, setViewTarget] = useState<Application | null>(null);
  const [viewDetail, setViewDetail] = useState<ApplicationDetail | null>(null);
  const [viewDocuments, setViewDocuments] = useState<ApplicationDocument[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

  const [statusTarget, setStatusTarget] = useState<Application | null>(null);
  const [statusDraft, setStatusDraft] = useState({ status: "", rejectionReason: "" });
  const [statusSaving, setStatusSaving] = useState(false);

  const [availableTests, setAvailableTests] = useState<AdmissionTestOption[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);

  const [funnelTarget, setFunnelTarget] = useState<Application | null>(null);
  const [funnelDocs, setFunnelDocs] = useState<ApplicationDocument[]>([]);
  const [funnelTestResults, setFunnelTestResults] = useState<ApplicationTestResult[]>([]);
  const [funnelInterviews, setFunnelInterviews] = useState<ApplicationInterview[]>([]);
  const [funnelLoading, setFunnelLoading] = useState(false);
  const [funnelBusy, setFunnelBusy] = useState(false);

  const [pickedTestKey, setPickedTestKey] = useState("");
  const [marksTestKey, setMarksTestKey] = useState<string | null>(null);
  const [marksSubjects, setMarksSubjects] = useState<AdmissionTestSubject[]>([]);
  const [marksDraft, setMarksDraft] = useState<Record<string, string>>({});

  const [interviewDraft, setInterviewDraft] = useState({
    date: "",
    time: "",
    panel: [] as string[],
  });
  const [outcomeDraft, setOutcomeDraft] = useState({ outcome: "", remarks: "" });

  const [selectDraft, setSelectDraft] = useState({ expiryDate: "", fee: "" });
  const [confirmRef, setConfirmRef] = useState("");
  const [withdrawReason, setWithdrawReason] = useState("");

  const [boards, setBoards] = useState<BoardOption[]>([]);
  const [sectionsForClass, setSectionsForClass] = useState<SectionOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [existingStudent, setExistingStudent] = useState<EnrolledStudentSummary | null>(null);
  const [ageCheck, setAgeCheck] = useState<AgeValidationResult | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollDraft, setEnrollDraft] = useState({
    boardKey: "",
    sectionKey: "",
    house: "",
    medium: "",
    secondLanguageSubjectKey: "",
    thirdLanguageSubjectKey: "",
    admissionType: "NEW_ADMISSION",
    communityCategory: "",
    subCaste: "",
    minorityStatus: false,
    rteStatus: false,
    firstGenerationLearner: false,
    economicallyWeakerSection: false,
    specialNeedsCategory: "",
    emisNumber: "",
    overrideAge: false,
    overrideSectionCapacity: false,
  });

  const load = () => {
    setLoading(true);
    apiFetch("/api/Application")
      .then((d: Application[]) => setApplications(d))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load applications"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    apiFetch("/api/AdmissionTest")
      .then((d: AdmissionTestOption[]) => setAvailableTests(d))
      .catch(() => {});
    apiFetch("/api/StaffProfile")
      .then((d: StaffOption[]) => setStaffOptions(d))
      .catch(() => {});
    apiFetch("/api/Board")
      .then((d: BoardOption[]) => setBoards(d))
      .catch(() => {});
    apiFetch("/api/Subject")
      .then((d: SubjectOption[]) => setSubjects(d))
      .catch(() => {});
  }, []);

  const refreshFunnel = (a: Application) => {
    setFunnelLoading(true);
    apiFetch(`/api/Application/${a.applicationKey}`)
      .then(
        (d: {
          application: Application;
          documents: ApplicationDocument[];
          testResults: ApplicationTestResult[];
          interviews: ApplicationInterview[];
        }) => {
          setFunnelTarget(d.application);
          setFunnelDocs(d.documents);
          setFunnelTestResults(d.testResults);
          setFunnelInterviews(d.interviews);

          if (d.application.status === "ENROLLED") {
            apiFetch(`/api/Student/by-application/${d.application.applicationKey}`)
              .then((s: EnrolledStudentSummary) => setExistingStudent(s))
              .catch(() => setExistingStudent(null));
            apiFetch(
              `/api/Section?schoolClassId=${d.application.classApplyingForKey}&academicYearId=${d.application.academicYearKey}`,
            )
              .then((s: SectionOption[]) => setSectionsForClass(s))
              .catch(() => setSectionsForClass([]));
          } else {
            setExistingStudent(null);
          }
        },
      )
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load application"),
      )
      .finally(() => setFunnelLoading(false));
  };

  const openFunnel = (a: Application) => {
    setPickedTestKey("");
    setMarksTestKey(null);
    setMarksSubjects([]);
    setMarksDraft({});
    setInterviewDraft({ date: "", time: "", panel: [] });
    setOutcomeDraft({ outcome: "", remarks: "" });
    setSelectDraft({ expiryDate: "", fee: "" });
    setConfirmRef("");
    setWithdrawReason("");
    setExistingStudent(null);
    setAgeCheck(null);
    setSectionsForClass([]);
    setEnrollDraft({
      boardKey: "",
      sectionKey: "",
      house: "",
      medium: "",
      secondLanguageSubjectKey: "",
      thirdLanguageSubjectKey: "",
      admissionType: "NEW_ADMISSION",
      communityCategory: "",
      subCaste: "",
      minorityStatus: a.admissionQuota === "RTE",
      rteStatus: a.admissionQuota === "RTE",
      firstGenerationLearner: false,
      economicallyWeakerSection: false,
      specialNeedsCategory: "",
      emisNumber: "",
      overrideAge: false,
      overrideSectionCapacity: false,
    });
    setFunnelTarget(a);
    refreshFunnel(a);
  };

  const checkAge = (boardKey: string) => {
    if (!funnelTarget || !boardKey) return;
    apiFetch("/api/Student/validate-age", {
      method: "POST",
      body: JSON.stringify({
        schoolClassKey: funnelTarget.classApplyingForKey,
        academicYearKey: funnelTarget.academicYearKey,
        boardKey,
        dateOfBirth: funnelTarget.dateOfBirth,
      }),
    })
      .then((r: AgeValidationResult) => setAgeCheck(r))
      .catch(() => setAgeCheck(null));
  };

  const createStudentRecord = async () => {
    if (!funnelTarget || !enrollDraft.boardKey) {
      toast.error("Select a board to enroll under.");
      return;
    }
    setEnrolling(true);
    try {
      const result: { studentKey: string; admissionNumber: string } = await apiFetch(
        `/api/Student/enroll/${funnelTarget.applicationKey}`,
        {
          method: "POST",
          body: JSON.stringify({
            boardKey: enrollDraft.boardKey,
            sectionKey: enrollDraft.sectionKey || null,
            house: enrollDraft.house || null,
            mediumOfInstruction: enrollDraft.medium || null,
            secondLanguageSubjectKey: enrollDraft.secondLanguageSubjectKey || null,
            thirdLanguageSubjectKey: enrollDraft.thirdLanguageSubjectKey || null,
            admissionType: enrollDraft.admissionType,
            communityCategory: enrollDraft.communityCategory || null,
            subCaste: enrollDraft.subCaste || null,
            minorityStatus: enrollDraft.minorityStatus,
            rteStatus: enrollDraft.rteStatus,
            firstGenerationLearner: enrollDraft.firstGenerationLearner,
            economicallyWeakerSection: enrollDraft.economicallyWeakerSection,
            specialNeedsCategory: enrollDraft.specialNeedsCategory || null,
            emisNumber: enrollDraft.emisNumber || null,
            overrideAge: enrollDraft.overrideAge,
            overrideSectionCapacity: enrollDraft.overrideSectionCapacity,
          }),
        },
      );
      toast.success(`Student record created — ${result.admissionNumber}`);
      setExistingStudent({
        studentKey: result.studentKey,
        admissionNumber: result.admissionNumber,
        studentName: funnelTarget.fullName,
        studentStatus: "ENROLLED",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create student record");
    } finally {
      setEnrolling(false);
    }
  };

  const openMarksEntry = (r: ApplicationTestResult) => {
    setMarksTestKey(r.admissionTestKey);
    setMarksDraft({});
    apiFetch(`/api/AdmissionTest/${r.admissionTestKey}`)
      .then((d: { subjects: AdmissionTestSubject[] }) => setMarksSubjects(d.subjects))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load test subjects"),
      );
  };

  const scheduleTest = async () => {
    if (!funnelTarget || !pickedTestKey) return;
    setFunnelBusy(true);
    try {
      await apiFetch(`/api/Application/${funnelTarget.applicationKey}/schedule-test`, {
        method: "POST",
        body: JSON.stringify({ admissionTestKey: pickedTestKey }),
      });
      toast.success("Entrance test scheduled");
      setPickedTestKey("");
      refreshFunnel(funnelTarget);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule test");
    } finally {
      setFunnelBusy(false);
    }
  };

  const saveMarks = async () => {
    if (!funnelTarget || !marksTestKey) return;
    setFunnelBusy(true);
    try {
      await apiFetch(`/api/Application/${funnelTarget.applicationKey}/test-result`, {
        method: "POST",
        body: JSON.stringify({
          admissionTestKey: marksTestKey,
          marks: marksSubjects.map((s) => ({
            subjectKey: s.subjectKey,
            marksObtained: Number(marksDraft[s.subjectKey] || 0),
          })),
        }),
      });
      toast.success("Test result recorded");
      setMarksTestKey(null);
      refreshFunnel(funnelTarget);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record test result");
    } finally {
      setFunnelBusy(false);
    }
  };

  const scheduleInterview = async () => {
    if (!funnelTarget || !interviewDraft.date) {
      toast.error("An interview date is required.");
      return;
    }
    setFunnelBusy(true);
    try {
      await apiFetch(`/api/Application/${funnelTarget.applicationKey}/schedule-interview`, {
        method: "POST",
        body: JSON.stringify({
          interviewDate: interviewDraft.date,
          interviewTime: interviewDraft.time || null,
          panelStaffKeys: interviewDraft.panel,
        }),
      });
      toast.success("Interview scheduled");
      setInterviewDraft({ date: "", time: "", panel: [] });
      refreshFunnel(funnelTarget);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule interview");
    } finally {
      setFunnelBusy(false);
    }
  };

  const saveOutcome = async (interview: ApplicationInterview) => {
    if (!outcomeDraft.outcome) {
      toast.error("Select an outcome.");
      return;
    }
    setFunnelBusy(true);
    try {
      await apiFetch(`/api/Application/interview/${interview.applicationInterviewKey}/outcome`, {
        method: "PUT",
        body: JSON.stringify({
          outcome: outcomeDraft.outcome,
          panelRemarks: outcomeDraft.remarks || null,
        }),
      });
      toast.success("Interview outcome recorded");
      setOutcomeDraft({ outcome: "", remarks: "" });
      if (funnelTarget) refreshFunnel(funnelTarget);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record outcome");
    } finally {
      setFunnelBusy(false);
    }
  };

  const selectApplication = async () => {
    if (!funnelTarget || !selectDraft.expiryDate) {
      toast.error("An offer expiry date is required.");
      return;
    }
    setFunnelBusy(true);
    try {
      await apiFetch(`/api/Application/${funnelTarget.applicationKey}/select`, {
        method: "POST",
        body: JSON.stringify({
          selectionOfferExpiryDate: selectDraft.expiryDate,
          confirmationFeeAmount: Number(selectDraft.fee || 0),
        }),
      });
      toast.success("Application selected — offer sent to the family");
      refreshFunnel(funnelTarget);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to select application");
    } finally {
      setFunnelBusy(false);
    }
  };

  const waitlistApplication = async () => {
    if (!funnelTarget) return;
    setFunnelBusy(true);
    try {
      const r: { waitlistPosition: number } = await apiFetch(
        `/api/Application/${funnelTarget.applicationKey}/waitlist`,
        { method: "POST" },
      );
      toast.success(`Added to waitlist at position ${r.waitlistPosition}`);
      refreshFunnel(funnelTarget);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to waitlist application");
    } finally {
      setFunnelBusy(false);
    }
  };

  const confirmSeat = async () => {
    if (!funnelTarget || !confirmRef.trim()) {
      toast.error("A confirmation payment reference is required.");
      return;
    }
    setFunnelBusy(true);
    try {
      await apiFetch(`/api/Application/${funnelTarget.applicationKey}/confirm-seat`, {
        method: "POST",
        body: JSON.stringify({ confirmationPaymentReference: confirmRef }),
      });
      toast.success("Seat confirmed — application enrolled");
      setConfirmRef("");
      refreshFunnel(funnelTarget);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to confirm seat");
    } finally {
      setFunnelBusy(false);
    }
  };

  const withdrawSeat = async () => {
    if (!funnelTarget) return;
    setFunnelBusy(true);
    try {
      const r: {
        nextWaitlistCandidate: {
          fullName: string;
          applicationNumber: string;
          waitlistPosition: number;
        } | null;
      } = await apiFetch(`/api/Application/${funnelTarget.applicationKey}/withdraw-seat`, {
        method: "POST",
        body: JSON.stringify({ reason: withdrawReason || null }),
      });
      if (r.nextWaitlistCandidate) {
        toast.success(
          `Withdrawn. Offer the seat to ${r.nextWaitlistCandidate.fullName} (${r.nextWaitlistCandidate.applicationNumber}), next on the waitlist.`,
        );
      } else {
        toast.success("Withdrawn. No one is currently on the waitlist for this class/year.");
      }
      setWithdrawReason("");
      refreshFunnel(funnelTarget);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to withdraw seat");
    } finally {
      setFunnelBusy(false);
    }
  };

  const openDocs = (a: Application) => {
    setDocTarget(a);
    setDocsLoading(true);
    apiFetch(`/api/Application/${a.applicationKey}`)
      .then((d: { documents: ApplicationDocument[] }) => setDocuments(d.documents))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load documents"))
      .finally(() => setDocsLoading(false));
  };

  const openView = (a: Application) => {
    setViewTarget(a);
    setViewLoading(true);
    apiFetch(`/api/Application/${a.applicationKey}`)
      .then((d: { application: ApplicationDetail; documents: ApplicationDocument[] }) => {
        setViewDetail(d.application);
        setViewDocuments(d.documents);
      })
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load application"),
      )
      .finally(() => setViewLoading(false));
  };

  const setDocStatus = async (
    doc: ApplicationDocument,
    status: "SUBMITTED" | "VERIFIED" | "REJECTED",
  ) => {
    try {
      await apiFetch(`/api/Application/document/${doc.applicationDocumentKey}/status`, {
        method: "PUT",
        body: JSON.stringify({
          status,
          rejectionReason: status === "REJECTED" ? "Not acceptable" : null,
        }),
      });
      setDocuments((docs) =>
        docs.map((d) =>
          d.applicationDocumentKey === doc.applicationDocumentKey ? { ...d, status } : d,
        ),
      );
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update document");
    }
  };

  const openStatus = (a: Application) => {
    setStatusTarget(a);
    setStatusDraft({ status: a.status, rejectionReason: "" });
  };

  const saveStatus = async () => {
    if (!statusTarget) return;
    if (statusDraft.status === "REJECTED" && !statusDraft.rejectionReason.trim()) {
      toast.error("A rejection reason is required.");
      return;
    }
    setStatusSaving(true);
    try {
      await apiFetch(`/api/Application/${statusTarget.applicationKey}/status`, {
        method: "PUT",
        body: JSON.stringify({
          status: statusDraft.status,
          rejectionReason: statusDraft.status === "REJECTED" ? statusDraft.rejectionReason : null,
        }),
      });
      toast.success("Status updated");
      setStatusTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  };

  const columns: Column<Application>[] = [
    {
      key: "applicationNumber",
      header: "Application #",
      sortable: true,
      accessor: (r) => <span className="font-mono text-sm font-medium">{r.applicationNumber}</span>,
    },
    {
      key: "fullName",
      header: "Student",
      sortable: true,
      accessor: (r) => (
        <div>
          <div className="font-medium">{r.fullName}</div>
          <div className="text-xs text-muted-foreground">
            {r.classApplyingForName} · {r.academicYearName}
            {r.streamName ? ` · ${r.streamName}` : ""}
          </div>
        </div>
      ),
    },
    {
      key: "fatherMobile",
      header: "Contact",
      accessor: (r) => <span className="font-mono text-sm">{r.fatherMobile ?? "—"}</span>,
    },
    {
      key: "docs",
      header: "Documents",
      accessor: (r) => (
        <button
          onClick={() => openDocs(r)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <FileCheck2 className="h-3.5 w-3.5" />
          {r.mandatoryDocSubmittedCount}/{r.mandatoryDocCount}
        </button>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (r) => (
        <div className="flex items-center gap-1.5">
          <button onClick={() => openStatus(r)} className="text-left">
            <Badge
              className={cn(
                "cursor-pointer rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                STATUS_STYLES[r.status],
              )}
            >
              {r.status.replace(/_/g, " ")}
              {r.status === "WAITLISTED" && r.waitlistPosition ? ` #${r.waitlistPosition}` : ""}
            </Badge>
          </button>
          {r.admissionQuota && r.admissionQuota !== "GENERAL" && (
            <Badge
              className={cn(
                "rounded-md border-0 px-1.5 py-0 text-[10px] font-medium",
                QUOTA_STYLES[r.admissionQuota] ?? "bg-muted text-muted-foreground",
              )}
            >
              {r.admissionQuota.replace(/_/g, " ")}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (r) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md"
            title="View"
            onClick={() => openView(r)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md"
            title="Test, Interview & Selection"
            onClick={() => openFunnel(r)}
          >
            <ListChecks className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-md"
            onClick={() =>
              navigate({
                to: "/admissions-application-form",
                search: { id: r.applicationKey, inquiryId: undefined },
              })
            }
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Applications"
        breadcrumbs={[{ label: "Admissions" }, { label: "Applications" }]}
        actions={
          <Button
            className="h-10 gap-1.5 rounded-md shadow-sm"
            onClick={() =>
              navigate({
                to: "/admissions-application-form",
                search: { id: undefined, inquiryId: undefined },
              })
            }
          >
            <Plus className="h-4 w-4" /> New Application
          </Button>
        }
      />

      <DataTable
        data={applications}
        columns={columns}
        rowKey={(r) => r.applicationKey}
        selectable
        storageKey="admissions-applications"
        searchPlaceholder="Search by student name or application number..."
        searchFields={(r) => `${r.fullName} ${r.applicationNumber} ${r.fatherMobile ?? ""}`}
        dateField={(r) => r.applicationDate}
        dateFilterLabel="Application Date"
        emptyMessage={loading ? "Loading applications..." : "No applications yet."}
      />

      <Dialog open={!!viewTarget} onOpenChange={(v) => !v && setViewTarget(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewDetail?.applicationNumber ?? "Application"} — {viewTarget?.fullName}
            </DialogTitle>
            <DialogDescription>Read-only summary of the application.</DialogDescription>
          </DialogHeader>

          {viewLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

          {!viewLoading && viewDetail && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <Badge
                  className={cn(
                    "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                    STATUS_STYLES[viewDetail.status],
                  )}
                >
                  {viewDetail.status.replace(/_/g, " ")}
                </Badge>
                {viewDetail.rejectionReason && (
                  <span className="text-xs text-destructive">
                    Reason: {viewDetail.rejectionReason}
                  </span>
                )}
              </div>

              <ViewSection title="Application">
                <ViewRow
                  label="Class Applying For"
                  value={`${viewDetail.classApplyingForName}${viewDetail.streamName ? ` · ${viewDetail.streamName}` : ""}`}
                />
                <ViewRow label="Academic Year" value={viewDetail.academicYearName} />
                <ViewRow
                  label="Application Date"
                  value={viewDetail.applicationDate?.slice(0, 10)}
                />
                <ViewRow
                  label="Application Fee"
                  value={`₹${viewDetail.applicationFeeAmount} ${viewDetail.applicationFeePaid ? "(Paid)" : "(Unpaid)"}`}
                />
                {viewDetail.paymentReference && (
                  <ViewRow label="Payment Reference" value={viewDetail.paymentReference} />
                )}
              </ViewSection>

              <ViewSection title="Student">
                <ViewRow label="Full Name" value={viewDetail.fullName} />
                <ViewRow label="Date of Birth" value={viewDetail.dateOfBirth?.slice(0, 10)} />
                <ViewRow label="Gender" value={viewDetail.gender} />
                <ViewRow label="Nationality" value={viewDetail.nationality} />
                <ViewRow label="Religion" value={viewDetail.religion} />
                <ViewRow label="Mother Tongue" value={viewDetail.motherTongue} />
                <ViewRow label="Blood Group" value={viewDetail.bloodGroup} />
                <ViewRow label="Aadhar Number" value={viewDetail.aadharNumber} />
              </ViewSection>

              <ViewSection title="Family">
                <ViewRow label="Father" value={viewDetail.fatherName} />
                <ViewRow label="Father Mobile" value={viewDetail.fatherMobile} />
                <ViewRow label="Father Occupation" value={viewDetail.fatherOccupation} />
                <ViewRow label="Father Email" value={viewDetail.fatherEmail} />
                <ViewRow label="Mother" value={viewDetail.motherName} />
                <ViewRow label="Mother Mobile" value={viewDetail.motherMobile} />
                <ViewRow label="Mother Occupation" value={viewDetail.motherOccupation} />
                <ViewRow label="Mother Email" value={viewDetail.motherEmail} />
                {viewDetail.guardianName && (
                  <>
                    <ViewRow label="Guardian" value={viewDetail.guardianName} />
                    <ViewRow
                      label="Guardian Relationship"
                      value={viewDetail.guardianRelationship}
                    />
                    <ViewRow label="Guardian Mobile" value={viewDetail.guardianMobile} />
                  </>
                )}
              </ViewSection>

              <ViewSection title="Address">
                <ViewRow
                  label="Current Address"
                  value={[
                    viewDetail.currentAddressLine1,
                    viewDetail.currentAddressLine2,
                    viewDetail.currentCity,
                    viewDetail.currentDistrict,
                    viewDetail.currentState,
                    viewDetail.currentPincode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  colSpan
                />
              </ViewSection>

              {(viewDetail.prevSchoolName || viewDetail.prevClassLastStudied) && (
                <ViewSection title="Previous School">
                  <ViewRow label="School Name" value={viewDetail.prevSchoolName} />
                  <ViewRow label="Board" value={viewDetail.prevSchoolBoard} />
                  <ViewRow label="Class Last Studied" value={viewDetail.prevClassLastStudied} />
                  <ViewRow label="TC Number" value={viewDetail.prevTCNumber} />
                  <ViewRow label="Year of Passing" value={viewDetail.prevYearOfPassing} />
                  <ViewRow label="Percentage" value={viewDetail.prevPercentage} />
                </ViewSection>
              )}

              {(viewDetail.knownAllergies ||
                viewDetail.chronicConditions ||
                (viewDetail.disabilityType && viewDetail.disabilityType !== "NONE")) && (
                <ViewSection title="Medical">
                  <ViewRow label="Known Allergies" value={viewDetail.knownAllergies} />
                  <ViewRow label="Chronic Conditions" value={viewDetail.chronicConditions} />
                  <ViewRow label="Disability" value={viewDetail.disabilityType} />
                  <ViewRow label="Emergency Contact" value={viewDetail.emergencyContactName} />
                  <ViewRow label="Emergency Mobile" value={viewDetail.emergencyContactMobile} />
                </ViewSection>
              )}

              {viewDetail.remarks && (
                <ViewSection title="Remarks">
                  <ViewRow label="Notes" value={viewDetail.remarks} colSpan />
                </ViewSection>
              )}

              <ViewSection
                title={`Documents (${viewDocuments.filter((d) => d.status === "SUBMITTED" || d.status === "VERIFIED").length}/${viewDocuments.length})`}
              >
                <div className="col-span-2 flex flex-wrap gap-2">
                  {viewDocuments.map((d) => (
                    <Badge
                      key={d.applicationDocumentKey}
                      className={cn(
                        "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                        DOC_STATUS_STYLES[d.status],
                      )}
                    >
                      {d.documentLabel}
                      {d.isMandatory && "*"}: {d.status}
                    </Badge>
                  ))}
                </div>
              </ViewSection>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!docTarget} onOpenChange={(v) => !v && setDocTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Document Checklist — {docTarget?.fullName}</DialogTitle>
            <DialogDescription>
              Mark documents as submitted, verified, or rejected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {docsLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
            {!docsLoading &&
              documents.map((d) => (
                <div
                  key={d.applicationDocumentKey}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {d.documentLabel}
                      {d.isMandatory && <span className="ml-1 text-destructive">*</span>}
                    </div>
                    <Badge
                      className={cn(
                        "mt-1 rounded-md border-0 px-1.5 py-0 text-[11px] font-medium",
                        DOC_STATUS_STYLES[d.status],
                      )}
                    >
                      {d.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      title="Mark submitted"
                      onClick={() => setDocStatus(d, "SUBMITTED")}
                    >
                      <Clock className="h-4 w-4 text-info" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      title="Verify"
                      onClick={() => setDocStatus(d, "VERIFIED")}
                    >
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      title="Reject"
                      onClick={() => setDocStatus(d, "REJECTED")}
                    >
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!statusTarget} onOpenChange={(v) => !v && setStatusTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Status — {statusTarget?.fullName}</AlertDialogTitle>
            <AlertDialogDescription>
              Move this application through the admissions funnel. Selecting or enrolling requires
              all mandatory documents to be submitted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label required>Status</Label>
              <Select
                value={statusDraft.status}
                onValueChange={(v) => setStatusDraft({ ...statusDraft, status: v })}
              >
                <SelectTrigger className="rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {statusDraft.status === "REJECTED" && (
              <div className="space-y-1.5">
                <Label required>Rejection Reason</Label>
                <Input
                  value={statusDraft.rejectionReason}
                  onChange={(e) =>
                    setStatusDraft({ ...statusDraft, rejectionReason: e.target.value })
                  }
                  className="rounded-md"
                />
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={statusSaving}
              onClick={(e) => {
                e.preventDefault();
                saveStatus();
              }}
            >
              {statusSaving ? "Saving..." : "Save"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={!!funnelTarget} onOpenChange={(v) => !v && setFunnelTarget(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-4.5 w-4.5 text-primary" /> Test, Interview &amp; Selection —{" "}
              {funnelTarget?.fullName}
            </DialogTitle>
            <DialogDescription>
              Move this application through entrance test, interview, selection, waitlist and seat
              confirmation.
            </DialogDescription>
          </DialogHeader>

          {funnelLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

          {!funnelLoading && funnelTarget && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={cn(
                    "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                    STATUS_STYLES[funnelTarget.status],
                  )}
                >
                  {funnelTarget.status.replace(/_/g, " ")}
                </Badge>
                {funnelTarget.admissionQuota !== "GENERAL" && (
                  <Badge
                    className={cn(
                      "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                      QUOTA_STYLES[funnelTarget.admissionQuota] ?? "bg-muted text-muted-foreground",
                    )}
                  >
                    {funnelTarget.admissionQuota.replace(/_/g, " ")} Quota
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  Documents:{" "}
                  {
                    funnelDocs.filter((d) => d.status === "SUBMITTED" || d.status === "VERIFIED")
                      .length
                  }
                  /{funnelDocs.length} mandatory ready
                </span>
              </div>

              <Tabs defaultValue="test" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="test" className="gap-1.5">
                    <Award className="h-3.5 w-3.5" /> Test
                  </TabsTrigger>
                  <TabsTrigger value="interview" className="gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Interview
                  </TabsTrigger>
                  <TabsTrigger value="selection" className="gap-1.5">
                    <Trophy className="h-3.5 w-3.5" /> Selection
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="test" className="space-y-3 pt-3">
                  {funnelTarget.admissionQuota === "RTE" ? (
                    <InfoAlert tone="info" title="RTE quota — no entrance test">
                      RTE-quota applicants are admitted by government lottery only; entrance test
                      scheduling is blocked for this application.
                    </InfoAlert>
                  ) : (
                    <>
                      {funnelTestResults.map((r) => (
                        <div
                          key={r.applicationTestResultKey}
                          className="rounded-lg border border-border p-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium">
                                {r.testType} — {r.testDate?.slice(0, 10)}
                              </div>
                              {r.result ? (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {r.totalMarksObtained}/{r.totalMaxMarks} marks ·{" "}
                                  {r.percentage?.toFixed(1)}%
                                </div>
                              ) : (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  Result not entered yet
                                </div>
                              )}
                            </div>
                            {r.result ? (
                              <Badge
                                className={cn(
                                  "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                                  RESULT_STYLES[r.result],
                                )}
                              >
                                {r.result}
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-md"
                                onClick={() => openMarksEntry(r)}
                              >
                                Enter Marks
                              </Button>
                            )}
                          </div>

                          {marksTestKey === r.admissionTestKey && (
                            <div className="mt-3 space-y-2 border-t border-border pt-3">
                              {marksSubjects.map((s) => (
                                <div
                                  key={s.subjectKey}
                                  className="flex items-center justify-between gap-3"
                                >
                                  <Label className="text-sm font-normal">
                                    {s.subjectName}{" "}
                                    <span className="text-xs text-muted-foreground">
                                      (max {s.maxMarks})
                                    </span>
                                  </Label>
                                  <Input
                                    type="number"
                                    className="h-8 w-24 rounded-md"
                                    value={marksDraft[s.subjectKey] ?? ""}
                                    onChange={(e) =>
                                      setMarksDraft({
                                        ...marksDraft,
                                        [s.subjectKey]: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                              ))}
                              <div className="flex justify-end gap-2 pt-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 rounded-md"
                                  onClick={() => setMarksTestKey(null)}
                                  disabled={funnelBusy}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-8 rounded-md"
                                  onClick={saveMarks}
                                  disabled={funnelBusy}
                                >
                                  Save Result
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      <Separator />

                      <div className="space-y-2">
                        <Label>Schedule Another Test</Label>
                        <div className="flex items-center gap-2">
                          <Select value={pickedTestKey} onValueChange={setPickedTestKey}>
                            <SelectTrigger className="h-9 flex-1 rounded-md">
                              <SelectValue placeholder="Select a scheduled test" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableTests
                                .filter(
                                  (t) =>
                                    t.academicYearKey === funnelTarget.academicYearKey &&
                                    t.classForKey === funnelTarget.classApplyingForKey,
                                )
                                .filter(
                                  (t) =>
                                    !funnelTestResults.some(
                                      (r) => r.admissionTestKey === t.admissionTestKey,
                                    ),
                                )
                                .map((t) => (
                                  <SelectItem key={t.admissionTestKey} value={t.admissionTestKey}>
                                    {t.testType} — {t.testDate?.slice(0, 10)}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            className="h-9 rounded-md"
                            onClick={scheduleTest}
                            disabled={funnelBusy || !pickedTestKey}
                          >
                            Schedule
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Tests are created under Admissions → Entrance Tests.
                        </p>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="interview" className="space-y-3 pt-3">
                  {funnelInterviews.map((iv) => (
                    <div
                      key={iv.applicationInterviewKey}
                      className="rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">
                            {iv.interviewDate?.slice(0, 10)}
                            {iv.interviewTime ? ` at ${iv.interviewTime.slice(0, 5)}` : ""}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Panel:{" "}
                            {iv.panelStaffKeys
                              ? iv.panelStaffKeys
                                  .split(",")
                                  .map(
                                    (k) =>
                                      staffOptions.find((s) => s.staffProfileKey === k)?.userName ??
                                      k,
                                  )
                                  .join(", ")
                              : "—"}
                          </div>
                          {iv.panelRemarks && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              "{iv.panelRemarks}"
                            </div>
                          )}
                        </div>
                        {iv.outcome && (
                          <Badge
                            className={cn(
                              "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                              OUTCOME_STYLES[iv.outcome],
                            )}
                          >
                            {iv.outcome.replace(/_/g, " ")}
                          </Badge>
                        )}
                      </div>

                      {!iv.outcome && (
                        <div className="mt-3 space-y-2 border-t border-border pt-3">
                          <div className="space-y-1.5">
                            <Label>Outcome</Label>
                            <Select
                              value={outcomeDraft.outcome}
                              onValueChange={(v) =>
                                setOutcomeDraft({ ...outcomeDraft, outcome: v })
                              }
                            >
                              <SelectTrigger className="h-9 rounded-md">
                                <SelectValue placeholder="Select outcome" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="RECOMMENDED">Recommended</SelectItem>
                                <SelectItem value="NOT_RECOMMENDED">Not Recommended</SelectItem>
                                <SelectItem value="DEFER">Defer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label>Panel Remarks</Label>
                            <Input
                              className="rounded-md"
                              value={outcomeDraft.remarks}
                              onChange={(e) =>
                                setOutcomeDraft({ ...outcomeDraft, remarks: e.target.value })
                              }
                            />
                          </div>
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              className="h-8 rounded-md"
                              onClick={() => saveOutcome(iv)}
                              disabled={funnelBusy}
                            >
                              Save Outcome
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  <Separator />

                  <div className="space-y-3">
                    <Label>Schedule Interview</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-normal text-muted-foreground">Date</Label>
                        <Input
                          type="date"
                          className="h-9 rounded-md"
                          value={interviewDraft.date}
                          onChange={(e) =>
                            setInterviewDraft({ ...interviewDraft, date: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-normal text-muted-foreground">Time</Label>
                        <Input
                          type="time"
                          className="h-9 rounded-md"
                          value={interviewDraft.time}
                          onChange={(e) =>
                            setInterviewDraft({ ...interviewDraft, time: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-normal text-muted-foreground">
                        Interview Panel
                      </Label>
                      <div className="flex max-h-32 flex-col gap-1.5 overflow-y-auto rounded-md border border-border p-2">
                        {staffOptions.map((s) => (
                          <label
                            key={s.staffProfileKey}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Checkbox
                              checked={interviewDraft.panel.includes(s.staffProfileKey)}
                              onCheckedChange={(v) =>
                                setInterviewDraft({
                                  ...interviewDraft,
                                  panel: v
                                    ? [...interviewDraft.panel, s.staffProfileKey]
                                    : interviewDraft.panel.filter((k) => k !== s.staffProfileKey),
                                })
                              }
                            />
                            {s.userName}{" "}
                            <span className="text-xs text-muted-foreground">({s.designation})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        className="h-9 rounded-md"
                        onClick={scheduleInterview}
                        disabled={funnelBusy}
                      >
                        Schedule Interview
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="selection" className="space-y-4 pt-3">
                  {funnelTarget.mandatoryDocCount > funnelTarget.mandatoryDocSubmittedCount && (
                    <InfoAlert tone="warning" title="Mandatory documents pending">
                      {funnelTarget.mandatoryDocSubmittedCount}/{funnelTarget.mandatoryDocCount}{" "}
                      mandatory documents are submitted. Selecting or enrolling this application
                      will be blocked until all are in.
                    </InfoAlert>
                  )}

                  {(funnelTarget.status === "SELECTED" || funnelTarget.status === "ENROLLED") && (
                    <div className="rounded-lg border border-border p-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarCheck2 className="h-4 w-4" /> Offer expires{" "}
                        {funnelTarget.selectionOfferExpiryDate?.slice(0, 10) ?? "—"}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                        <Wallet className="h-4 w-4" /> Confirmation fee ₹
                        {funnelTarget.confirmationFeeAmount ?? 0}{" "}
                        {funnelTarget.confirmationFeePaid
                          ? `(Paid · ${funnelTarget.confirmationPaymentReference})`
                          : "(Unpaid)"}
                      </div>
                    </div>
                  )}

                  {funnelTarget.status === "WAITLISTED" && (
                    <InfoAlert
                      tone="info"
                      title={`Waitlisted — position #${funnelTarget.waitlistPosition ?? "—"}`}
                    >
                      This application will move up automatically as candidates ahead of it withdraw
                      or are selected.
                    </InfoAlert>
                  )}

                  {!["SELECTED", "ENROLLED", "WAITLISTED", "REJECTED", "WITHDRAWN"].includes(
                    funnelTarget.status,
                  ) && (
                    <div className="space-y-3 rounded-lg border border-border p-3">
                      <Label>Select This Application</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-normal text-muted-foreground">
                            Offer Expiry Date
                          </Label>
                          <Input
                            type="date"
                            className="h-9 rounded-md"
                            value={selectDraft.expiryDate}
                            onChange={(e) =>
                              setSelectDraft({ ...selectDraft, expiryDate: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-normal text-muted-foreground">
                            Confirmation Fee (₹)
                          </Label>
                          <Input
                            type="number"
                            className="h-9 rounded-md"
                            value={selectDraft.fee}
                            onChange={(e) =>
                              setSelectDraft({ ...selectDraft, fee: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 gap-1.5 rounded-md"
                          onClick={waitlistApplication}
                          disabled={funnelBusy}
                        >
                          <ArrowDownWideNarrow className="h-3.5 w-3.5" /> Waitlist Instead
                        </Button>
                        <Button
                          size="sm"
                          className="h-9 gap-1.5 rounded-md"
                          onClick={selectApplication}
                          disabled={funnelBusy}
                        >
                          <Trophy className="h-3.5 w-3.5" /> Select
                        </Button>
                      </div>
                    </div>
                  )}

                  {funnelTarget.status === "WAITLISTED" && (
                    <div className="space-y-3 rounded-lg border border-border p-3">
                      <Label>Promote &amp; Select</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-normal text-muted-foreground">
                            Offer Expiry Date
                          </Label>
                          <Input
                            type="date"
                            className="h-9 rounded-md"
                            value={selectDraft.expiryDate}
                            onChange={(e) =>
                              setSelectDraft({ ...selectDraft, expiryDate: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-normal text-muted-foreground">
                            Confirmation Fee (₹)
                          </Label>
                          <Input
                            type="number"
                            className="h-9 rounded-md"
                            value={selectDraft.fee}
                            onChange={(e) =>
                              setSelectDraft({ ...selectDraft, fee: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          className="h-9 gap-1.5 rounded-md"
                          onClick={selectApplication}
                          disabled={funnelBusy}
                        >
                          <Trophy className="h-3.5 w-3.5" /> Select
                        </Button>
                      </div>
                    </div>
                  )}

                  {funnelTarget.status === "SELECTED" && (
                    <div className="space-y-3 rounded-lg border border-border p-3">
                      <Label>Confirm Seat</Label>
                      <p className="text-xs text-muted-foreground">
                        Paying the confirmation fee is the only way to move this application to
                        ENROLLED.
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Payment reference"
                          className="h-9 rounded-md"
                          value={confirmRef}
                          onChange={(e) => setConfirmRef(e.target.value)}
                        />
                        <Button
                          size="sm"
                          className="h-9 gap-1.5 rounded-md"
                          onClick={confirmSeat}
                          disabled={funnelBusy}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Seat
                        </Button>
                      </div>
                    </div>
                  )}

                  {funnelTarget.status === "ENROLLED" && existingStudent && (
                    <InfoAlert
                      tone="success"
                      title={`Student record created — ${existingStudent.admissionNumber}`}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-1 h-8 gap-1.5 rounded-md"
                        onClick={() =>
                          navigate({
                            to: "/student-detail",
                            search: { id: existingStudent.studentKey },
                          })
                        }
                      >
                        <Eye className="h-3.5 w-3.5" /> View Student Profile
                      </Button>
                    </InfoAlert>
                  )}

                  {funnelTarget.status === "ENROLLED" && !existingStudent && (
                    <div className="space-y-3 rounded-lg border border-primary/30 p-3">
                      <Label>Create Student Record</Label>
                      <p className="text-xs text-muted-foreground">
                        This is the only way a permanent Student record gets created. Requires all
                        mandatory documents to be VERIFIED (not just submitted).
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-normal text-muted-foreground">Board</Label>
                          <Select
                            value={enrollDraft.boardKey}
                            onValueChange={(v) => {
                              setEnrollDraft({ ...enrollDraft, boardKey: v });
                              checkAge(v);
                            }}
                          >
                            <SelectTrigger className="h-9 rounded-md">
                              <SelectValue placeholder="Select board" />
                            </SelectTrigger>
                            <SelectContent>
                              {boards.map((b) => (
                                <SelectItem key={b.boardKey} value={b.boardKey}>
                                  {b.boardName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-normal text-muted-foreground">
                            Section
                          </Label>
                          <Select
                            value={enrollDraft.sectionKey}
                            onValueChange={(v) => setEnrollDraft({ ...enrollDraft, sectionKey: v })}
                          >
                            <SelectTrigger className="h-9 rounded-md">
                              <SelectValue placeholder="Auto-assign lowest enrolled" />
                            </SelectTrigger>
                            <SelectContent>
                              {sectionsForClass.map((s) => (
                                <SelectItem key={s.sectionKey} value={s.sectionKey}>
                                  {s.sectionLabel} ({s.seatingCapacity} seats)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-normal text-muted-foreground">House</Label>
                          <Input
                            className="h-9 rounded-md"
                            value={enrollDraft.house}
                            onChange={(e) =>
                              setEnrollDraft({ ...enrollDraft, house: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-normal text-muted-foreground">
                            Medium of Instruction
                          </Label>
                          <Input
                            className="h-9 rounded-md"
                            value={enrollDraft.medium}
                            onChange={(e) =>
                              setEnrollDraft({ ...enrollDraft, medium: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-normal text-muted-foreground">
                            Second Language
                          </Label>
                          <Select
                            value={enrollDraft.secondLanguageSubjectKey}
                            onValueChange={(v) =>
                              setEnrollDraft({ ...enrollDraft, secondLanguageSubjectKey: v })
                            }
                          >
                            <SelectTrigger className="h-9 rounded-md">
                              <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {subjects.map((s) => (
                                <SelectItem key={s.subjectKey} value={s.subjectKey}>
                                  {s.subjectName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-normal text-muted-foreground">
                            Third Language
                          </Label>
                          <Select
                            value={enrollDraft.thirdLanguageSubjectKey}
                            onValueChange={(v) =>
                              setEnrollDraft({ ...enrollDraft, thirdLanguageSubjectKey: v })
                            }
                          >
                            <SelectTrigger className="h-9 rounded-md">
                              <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {subjects.map((s) => (
                                <SelectItem key={s.subjectKey} value={s.subjectKey}>
                                  {s.subjectName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-normal text-muted-foreground">
                            Admission Type
                          </Label>
                          <Select
                            value={enrollDraft.admissionType}
                            onValueChange={(v) =>
                              setEnrollDraft({ ...enrollDraft, admissionType: v })
                            }
                          >
                            <SelectTrigger className="h-9 rounded-md">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[
                                "NEW_ADMISSION",
                                "TRANSFER_ADMISSION",
                                "RE_ADMISSION",
                                "MANAGEMENT_QUOTA",
                                "SCHOLARSHIP_ADMISSION",
                                "RTE_ADMISSION",
                                "STAFF_CHILD_ADMISSION",
                                "SIBLING_ADMISSION",
                              ].map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t.replace(/_/g, " ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-normal text-muted-foreground">
                            Community Category
                          </Label>
                          <Select
                            value={enrollDraft.communityCategory}
                            onValueChange={(v) =>
                              setEnrollDraft({ ...enrollDraft, communityCategory: v })
                            }
                          >
                            <SelectTrigger className="h-9 rounded-md">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {["OC", "BC", "BCM", "MBC", "DNC", "SC", "SCA", "ST", "OTHERS"].map(
                                (c) => (
                                  <SelectItem key={c} value={c}>
                                    {c}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-normal text-muted-foreground">
                            EMIS Number
                          </Label>
                          <Input
                            className="h-9 rounded-md"
                            value={enrollDraft.emisNumber}
                            onChange={(e) =>
                              setEnrollDraft({ ...enrollDraft, emisNumber: e.target.value })
                            }
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Mandatory for TN Board students from Class IX.
                          </p>
                        </div>
                      </div>

                      {ageCheck && (
                        <InfoAlert
                          tone={ageCheck.isEligible ? "success" : "warning"}
                          title={
                            ageCheck.isEligible
                              ? "Age criterion met"
                              : "Below minimum admission age"
                          }
                        >
                          {ageCheck.minimumAgeYears != null
                            ? `Requires ${ageCheck.minimumAgeYears} years as of ${ageCheck.cutoffDate?.slice(0, 10)} — this student is ${ageCheck.actualAgeYears.toFixed(1)} years.`
                            : "No board age rule configured for this class — no restriction applied."}
                        </InfoAlert>
                      )}

                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={enrollDraft.minorityStatus}
                            onCheckedChange={(v) =>
                              setEnrollDraft({ ...enrollDraft, minorityStatus: !!v })
                            }
                          />{" "}
                          Minority
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={enrollDraft.rteStatus}
                            onCheckedChange={(v) =>
                              setEnrollDraft({ ...enrollDraft, rteStatus: !!v })
                            }
                          />{" "}
                          RTE
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={enrollDraft.firstGenerationLearner}
                            onCheckedChange={(v) =>
                              setEnrollDraft({ ...enrollDraft, firstGenerationLearner: !!v })
                            }
                          />{" "}
                          First-Gen Learner
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={enrollDraft.economicallyWeakerSection}
                            onCheckedChange={(v) =>
                              setEnrollDraft({ ...enrollDraft, economicallyWeakerSection: !!v })
                            }
                          />{" "}
                          EWS
                        </label>
                        {ageCheck && !ageCheck.isEligible && (
                          <label className="flex items-center gap-2 text-sm text-destructive">
                            <Checkbox
                              checked={enrollDraft.overrideAge}
                              onCheckedChange={(v) =>
                                setEnrollDraft({ ...enrollDraft, overrideAge: !!v })
                              }
                            />{" "}
                            Admin Override: Age
                          </label>
                        )}
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={enrollDraft.overrideSectionCapacity}
                            onCheckedChange={(v) =>
                              setEnrollDraft({ ...enrollDraft, overrideSectionCapacity: !!v })
                            }
                          />{" "}
                          Admin Override: Section Capacity
                        </label>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          className="h-9 gap-1.5 rounded-md"
                          onClick={createStudentRecord}
                          disabled={enrolling}
                        >
                          <UserPlus className="h-3.5 w-3.5" />{" "}
                          {enrolling ? "Creating..." : "Create Student Record"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {(funnelTarget.status === "SELECTED" || funnelTarget.status === "ENROLLED") && (
                    <div className="space-y-3 rounded-lg border border-destructive/30 p-3">
                      <Label>Withdraw Seat</Label>
                      <p className="text-xs text-muted-foreground">
                        Frees this seat and surfaces the next candidate on the class waitlist.
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Reason (optional)"
                          className="h-9 rounded-md"
                          value={withdrawReason}
                          onChange={(e) => setWithdrawReason(e.target.value)}
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-9 gap-1.5 rounded-md"
                          onClick={withdrawSeat}
                          disabled={funnelBusy}
                        >
                          <LogOut className="h-3.5 w-3.5" /> Withdraw
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ViewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">{children}</div>
    </div>
  );
}

function ViewRow({
  label,
  value,
  colSpan,
}: {
  label: string;
  value: string | number | null | undefined;
  colSpan?: boolean;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className={colSpan ? "col-span-2" : undefined}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
