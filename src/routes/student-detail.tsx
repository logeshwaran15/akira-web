import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { InfoAlert } from "@/components/erp/InfoAlert";
import { StudentAvatar } from "@/components/erp/StudentAvatar";
import { PageLoader } from "@/components/erp/Spinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormDialog } from "@/components/erp/FormDialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  ShieldCheck,
  GraduationCap,
  Users,
  Pencil,
  Plus,
  Trash2,
  Star,
  Phone,
  Wallet,
  Receipt,
  CheckCircle2,
  XCircle,
  BadgePercent,
  Ban,
  Award,
  ClipboardList,
  Crown,
  HeartHandshake,
  Dumbbell,
  Users2,
  Gauge,
  Contact,
  FolderKanban,
  Gem,
  Compass,
  Landmark,
  Linkedin,
  ArrowLeft,
  BadgeCheck,
  ChevronDown,
  CalendarCheck,
  Percent,
  MapPin,
  Building2,
  BookOpen,
  Atom,
  Sparkles,
  FileText,
  Download,
  Upload,
  History,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { apiFetch, apiUpload, API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/student-detail")({
  validateSearch: (search: Record<string, unknown>): { id: string; tab?: string; dev?: string } => ({
    id: typeof search.id === "string" ? search.id : "",
    ...(typeof search.tab === "string" ? { tab: search.tab } : {}),
    ...(typeof search.dev === "string" ? { dev: search.dev } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Student Profile — Akira School ERP" },
      {
        name: "description",
        content: "Permanent student identity, enrollment history, guardians and sibling links.",
      },
    ],
  }),
  component: StudentDetailPage,
});

type Student = Record<string, unknown> & {
  studentKey: string;
  admissionNumber: string;
  admissionDate: string;
  studentName: string;
  initials: string | null;
  gender: string | null;
  dateOfBirth: string;
  placeOfBirth: string | null;
  nationality: string;
  motherTongue: string | null;
  religion: string | null;
  bloodGroup: string | null;
  photoUrl: string | null;
  studentStatus: string;
  aadharNumber: string | null;
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
  currentAddressLine1: string | null;
  currentAddressLine2: string | null;
  currentCity: string | null;
  currentDistrict: string | null;
  currentState: string | null;
  currentPincode: string | null;
  permanentSameAsCurrent: boolean;
  knownAllergies: string | null;
  chronicConditions: string | null;
  emergencyContactName: string | null;
  emergencyContactMobile: string | null;
  isResidential: boolean;
};

type Enrollment = {
  studentEnrollmentKey: string;
  academicYearKey: string;
  academicYearName: string | null;
  boardName: string | null;
  className: string | null;
  sectionLabel: string | null;
  rollNumber: string | null;
  house: string | null;
  mediumOfInstruction: string | null;
  admissionType: string;
  enrollmentDate: string;
  status: string;
};

type Guardian = {
  studentGuardianKey: string;
  relationshipType: string;
  fullName: string;
  mobileNumber: string | null;
  alternateMobileNumber: string | null;
  emailAddress: string | null;
  occupation: string | null;
  employer: string | null;
  annualIncome: number | null;
  educationQualification: string | null;
  communicationPreference: string | null;
  preferredLanguage: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  isPrimaryGuardian: boolean;
  isSecondaryGuardian: boolean;
  isEmergencyContact: boolean;
  isFinancialGuardian: boolean;
  isAcademicGuardian: boolean;
};

type Sibling = {
  studentRelationshipKey: string;
  siblingStudentKey: string;
  siblingName: string;
  siblingAdmissionNumber: string;
  siblingStatus: string | null;
};

type StudentSearchResult = { studentKey: string; studentName: string; admissionNumber: string };

type StudentDocument = {
  studentDocumentKey: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  createdOn: string;
};

const DOCUMENT_TYPE_OPTIONS = [
  { label: "Transfer Certificate (TC)", value: "TC" },
  { label: "Marksheet", value: "MARKSHEET" },
  { label: "Birth Certificate", value: "BIRTH_CERTIFICATE" },
  { label: "Aadhar Card", value: "AADHAR" },
  { label: "Medical Certificate", value: "MEDICAL_CERTIFICATE" },
  { label: "Other", value: "OTHER" },
];
const DOCUMENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  DOCUMENT_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

type StudentCertificate = {
  studentCertificateKey: string;
  certificateType: string;
  certificateNumber: string;
  issueDate: string;
  requestReason: string | null;
  approvalStatus: string;
  rejectionReason: string | null;
  qrVerificationCode: string;
  fileUrl: string | null;
  isDuplicate: boolean;
  createdOn: string;
  createdBy: string;
};

const CERTIFICATE_TYPE_OPTIONS = [
  { label: "Transfer Certificate (TC)", value: "TC" },
  { label: "Bonafide Certificate", value: "BONAFIDE" },
  { label: "Medical Certificate", value: "MEDICAL" },
];

type AuditLogEntry = {
  akiraAuditLogKey: string;
  userName: string | null;
  action: string;
  entityId: string | null;
  oldValue: string | null;
  newValue: string | null;
  timestamp: string;
};

type Achievement = {
  studentAchievementKey: string;
  category: string;
  title: string;
  description: string | null;
  level: string | null;
  awardingBody: string | null;
  position: string | null;
  achievementDate: string;
  academicYearKey: string | null;
  academicYearName: string | null;
  certificateUrl: string | null;
};

type BehaviorRecord = {
  studentBehaviorRecordKey: string;
  recordType: string;
  severity: string | null;
  title: string;
  description: string | null;
  incidentDate: string;
  actionTaken: string | null;
  followUpRequired: boolean;
  followUpStatus: string | null;
  followUpDate: string | null;
  parentNotified: boolean;
  reportedByStaffName: string | null;
  academicYearKey: string | null;
  academicYearName: string | null;
};

type LeadershipRole = {
  studentLeadershipRoleKey: string;
  roleTitle: string;
  scope: string | null;
  academicYearKey: string | null;
  academicYearName: string | null;
  startDate: string;
  endDate: string | null;
  responsibilities: string | null;
  notes: string | null;
};

type CounsellingRecord = {
  studentCounsellingRecordKey: string;
  supportArea: string;
  sessionDate: string;
  counsellorName: string | null;
  referredBy: string | null;
  reasonForReferral: string | null;
  sessionNotes: string | null;
  interventionPlan: string | null;
  outcomeStatus: string;
  followUpDate: string | null;
  parentInformed: boolean;
  academicYearKey: string | null;
  academicYearName: string | null;
};

type SportsRecord = {
  studentSportsRecordKey: string;
  recordType: string;
  sportName: string;
  level: string | null;
  position: string | null;
  eventDate: string;
  academicYearKey: string | null;
  academicYearName: string | null;
  coachName: string | null;
  fitnessScore: number | null;
  fitnessParameters: string | null;
  scholarshipAmount: number | null;
  description: string | null;
  certificateUrl: string | null;
};

type ClubMembership = {
  studentClubMembershipKey: string;
  clubName: string;
  roleInClub: string;
  academicYearKey: string | null;
  academicYearName: string | null;
  joinDate: string;
  leaveDate: string | null;
  achievements: string | null;
  notes: string | null;
};

type ParentEngagement = {
  studentParentEngagementKey: string;
  engagementType: string;
  engagementDate: string;
  guardianName: string | null;
  mode: string | null;
  subject: string | null;
  summary: string | null;
  outcomeStatus: string;
  followUpDate: string | null;
  conductedBy: string | null;
  academicYearKey: string | null;
  academicYearName: string | null;
};

type PortfolioItem = {
  studentPortfolioItemKey: string;
  itemType: string;
  title: string;
  description: string | null;
  itemDate: string;
  academicYearKey: string | null;
  academicYearName: string | null;
  mediaUrl: string | null;
  issuedBy: string | null;
  isFeatured: boolean;
};

type TalentRecord = {
  studentTalentRecordKey: string;
  talentArea: string;
  proficiencyLevel: string;
  identifiedDate: string;
  identifiedBy: string | null;
  evidence: string | null;
  scholarshipRecommended: boolean;
  scholarshipDetails: string | null;
  academicYearKey: string | null;
  academicYearName: string | null;
  notes: string | null;
};

type CareerReadinessRecord = {
  studentCareerReadinessRecordKey: string;
  recordType: string;
  title: string;
  recordDate: string;
  counsellorName: string | null;
  details: string | null;
  targetInstitution: string | null;
  status: string;
  academicYearKey: string | null;
  academicYearName: string | null;
  notes: string | null;
};

type AlumniRecord = {
  studentAlumniRecordKey: string;
  graduationDate: string | null;
  graduationAcademicYearKey: string | null;
  graduationAcademicYearName: string | null;
  higherEducationInstitution: string | null;
  courseOfStudy: string | null;
  currentOccupation: string | null;
  currentEmployer: string | null;
  contactEmail: string | null;
  contactMobile: string | null;
  linkedInUrl: string | null;
  mentorshipParticipation: boolean;
  mentorshipDetails: string | null;
  institutionEngagementNotes: string | null;
  notes: string | null;
};

type Concession = {
  studentConcessionKey: string;
  academicYearName: string | null;
  categoryName: string;
  discountType: string;
  discountValue: number;
  approvalStatus: string;
  remarks: string | null;
};

type FeeDemand = {
  feeDemandKey: string;
  academicYearName: string | null;
  feeHeadName: string;
  installmentLabel: string | null;
  dueDate: string;
  grossAmount: number;
  concessionAmount: number;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
};

type FeeReceipt = {
  feeReceiptKey: string;
  receiptNumber: string;
  receiptDate: string;
  totalAmount: number;
  paymentMode: string;
  paymentReference: string | null;
  status: string;
  cancelReason: string | null;
};

type AcademicYear = { academicYearKey: string; yearName: string };
type ConcessionCategory = { concessionCategoryKey: string; categoryName: string };

const DEMAND_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  PARTIALLY_PAID: "bg-info/15 text-info",
  PAID: "bg-success/15 text-success",
  WAIVED: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
  CANCELLED: "bg-destructive/15 text-destructive",
};
const CONCESSION_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  APPROVED: "bg-success/15 text-success",
  REJECTED: "bg-destructive/15 text-destructive",
};

const STATUS_STYLES: Record<string, string> = {
  ENROLLED: "bg-success/15 text-success",
  PROMOTED: "bg-info/15 text-info",
  PASSED_OUT: "bg-[oklch(0.55_0.1_200)]/15 text-[oklch(0.4_0.12_200)]",
  TRANSFERRED_OUT: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  DROPPED: "bg-destructive/15 text-destructive",
  DECEASED: "bg-muted text-muted-foreground",
};

const ENROLLMENT_STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-success/15 text-success",
  COMPLETED: "bg-info/15 text-info",
  TRANSFERRED: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  WITHDRAWN: "bg-destructive/15 text-destructive",
};

const RELATIONSHIP_STYLES: Record<string, string> = {
  FATHER: "bg-info/15 text-info",
  MOTHER: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
  LEGAL_GUARDIAN: "bg-[oklch(0.55_0.1_200)]/15 text-[oklch(0.4_0.12_200)]",
};
const RELATIONSHIP_OPTIONS = [
  "FATHER",
  "MOTHER",
  "LEGAL_GUARDIAN",
  "GRANDFATHER",
  "GRANDMOTHER",
  "BROTHER",
  "SISTER",
  "UNCLE",
  "AUNT",
  "FOSTER_PARENT",
  "HOSTEL_WARDEN",
  "COURT_APPOINTED_GUARDIAN",
  "OTHER",
];

const ACHIEVEMENT_CATEGORY_OPTIONS = [
  "ACADEMIC",
  "SPORTS",
  "CULTURAL",
  "COMPETITION",
  "OLYMPIAD",
  "TALENT_PROGRAM",
  "COMMUNITY_SERVICE",
  "LEADERSHIP",
  "INNOVATION",
  "OTHER",
];

const ACHIEVEMENT_LEVEL_OPTIONS = ["SCHOOL", "DISTRICT", "STATE", "NATIONAL", "INTERNATIONAL"];

const ACHIEVEMENT_CATEGORY_STYLES: Record<string, string> = {
  ACADEMIC: "bg-info/15 text-info",
  SPORTS: "bg-success/15 text-success",
  CULTURAL: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
  COMPETITION: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  OLYMPIAD: "bg-primary/15 text-primary",
  LEADERSHIP: "bg-[oklch(0.55_0.1_200)]/15 text-[oklch(0.4_0.12_200)]",
};

const emptyAchievementDraft = () => ({
  studentAchievementKey: "",
  category: "ACADEMIC",
  title: "",
  description: "",
  level: "",
  awardingBody: "",
  position: "",
  achievementDate: "",
  academicYearKey: "",
  certificateUrl: "",
});

const BEHAVIOR_RECORD_TYPE_OPTIONS = [
  "POSITIVE_RECOGNITION",
  "DISCIPLINARY_INCIDENT",
  "TEACHER_OBSERVATION",
  "COUNSELLING_REFERRAL",
  "PARENT_MEETING",
  "BEHAVIOR_IMPROVEMENT_PLAN",
];

const BEHAVIOR_SEVERITY_OPTIONS = ["MINOR", "MODERATE", "MAJOR", "SEVERE"];
const BEHAVIOR_FOLLOWUP_STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "RESOLVED"];

const BEHAVIOR_RECORD_TYPE_STYLES: Record<string, string> = {
  POSITIVE_RECOGNITION: "bg-success/15 text-success",
  DISCIPLINARY_INCIDENT: "bg-destructive/15 text-destructive",
  TEACHER_OBSERVATION: "bg-info/15 text-info",
  COUNSELLING_REFERRAL: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
  PARENT_MEETING: "bg-[oklch(0.55_0.1_200)]/15 text-[oklch(0.4_0.12_200)]",
  BEHAVIOR_IMPROVEMENT_PLAN: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
};

const BEHAVIOR_SEVERITY_STYLES: Record<string, string> = {
  MINOR: "bg-muted text-muted-foreground",
  MODERATE: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  MAJOR: "bg-destructive/15 text-destructive",
  SEVERE: "bg-destructive/25 text-destructive",
};

const emptyBehaviorDraft = () => ({
  studentBehaviorRecordKey: "",
  recordType: "TEACHER_OBSERVATION",
  severity: "",
  title: "",
  description: "",
  incidentDate: "",
  actionTaken: "",
  followUpRequired: false,
  followUpStatus: "",
  followUpDate: "",
  parentNotified: false,
  reportedByStaffName: "",
  academicYearKey: "",
});

const LEADERSHIP_ROLE_OPTIONS = [
  "SCHOOL_CAPTAIN",
  "VICE_CAPTAIN",
  "HOUSE_CAPTAIN",
  "PREFECT",
  "CLUB_LEADER",
  "EVENT_COORDINATOR",
  "STUDENT_COUNCIL_MEMBER",
  "VOLUNTEER_LEADER",
  "OTHER",
];

const emptyLeadershipDraft = () => ({
  studentLeadershipRoleKey: "",
  roleTitle: "SCHOOL_CAPTAIN",
  scope: "",
  academicYearKey: "",
  startDate: "",
  endDate: "",
  responsibilities: "",
  notes: "",
});

const SUPPORT_AREA_OPTIONS = [
  "ACADEMIC_COUNSELLING",
  "BEHAVIORAL_COUNSELLING",
  "CAREER_GUIDANCE",
  "EMOTIONAL_SUPPORT",
  "LEARNING_ASSISTANCE",
  "SPECIAL_NEEDS_SUPPORT",
  "WELLNESS_PROGRAM",
];

const OUTCOME_STATUS_OPTIONS = ["ONGOING", "RESOLVED", "REFERRED_EXTERNAL", "DISCONTINUED"];

const OUTCOME_STATUS_STYLES: Record<string, string> = {
  ONGOING: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  RESOLVED: "bg-success/15 text-success",
  REFERRED_EXTERNAL: "bg-info/15 text-info",
  DISCONTINUED: "bg-muted text-muted-foreground",
};

const emptyCounsellingDraft = () => ({
  studentCounsellingRecordKey: "",
  supportArea: "ACADEMIC_COUNSELLING",
  sessionDate: "",
  counsellorName: "",
  referredBy: "",
  reasonForReferral: "",
  sessionNotes: "",
  interventionPlan: "",
  outcomeStatus: "ONGOING",
  followUpDate: "",
  parentInformed: false,
  academicYearKey: "",
});

const SPORTS_RECORD_TYPE_OPTIONS = [
  "TEAM_MEMBERSHIP",
  "COMPETITION",
  "AWARD",
  "FITNESS_ASSESSMENT",
  "SPORTS_SCHOLARSHIP",
  "TRAINING_PROGRAM",
];

const SPORTS_RECORD_TYPE_STYLES: Record<string, string> = {
  TEAM_MEMBERSHIP: "bg-info/15 text-info",
  COMPETITION: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  AWARD: "bg-primary/15 text-primary",
  FITNESS_ASSESSMENT: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
  SPORTS_SCHOLARSHIP: "bg-success/15 text-success",
  TRAINING_PROGRAM: "bg-[oklch(0.55_0.1_200)]/15 text-[oklch(0.4_0.12_200)]",
};

const emptySportsDraft = () => ({
  studentSportsRecordKey: "",
  recordType: "TEAM_MEMBERSHIP",
  sportName: "",
  level: "",
  position: "",
  eventDate: "",
  academicYearKey: "",
  coachName: "",
  fitnessScore: "",
  fitnessParameters: "",
  scholarshipAmount: "",
  description: "",
  certificateUrl: "",
});

const CLUB_NAME_OPTIONS = [
  "Science Club",
  "Literary Club",
  "Art Club",
  "Music Club",
  "Drama Club",
  "Coding Club",
  "Robotics Club",
  "Eco Club",
  "Debate Club",
  "Community Service Club",
  "Other",
];

const CLUB_ROLE_OPTIONS = ["MEMBER", "CLUB_LEADER", "CO_LEADER", "COORDINATOR"];

const DEV_SUBSECTIONS = [
  { value: "achievements", label: "Achievements", icon: Award },
  { value: "behavior", label: "Behavior", icon: ClipboardList },
  { value: "leadership", label: "Leadership", icon: Crown },
  { value: "counselling", label: "Counselling", icon: HeartHandshake },
  { value: "sports", label: "Sports", icon: Dumbbell },
  { value: "clubs", label: "Clubs", icon: Users2 },
  { value: "parent-engagement", label: "Parent Engagement", icon: Contact },
  { value: "portfolio", label: "Portfolio", icon: FolderKanban },
  { value: "talent", label: "Scholarship & Talent", icon: Gem },
  { value: "career", label: "Career Readiness", icon: Compass },
  { value: "alumni", label: "Alumni", icon: Landmark },
];

const emptyClubDraft = () => ({
  studentClubMembershipKey: "",
  clubName: "Science Club",
  roleInClub: "MEMBER",
  academicYearKey: "",
  joinDate: "",
  leaveDate: "",
  achievements: "",
  notes: "",
});

const ENGAGEMENT_TYPE_OPTIONS = [
  "PARENT_MEETING",
  "COMMUNICATION",
  "ACKNOWLEDGEMENT",
  "INTERVENTION",
  "FEEDBACK",
  "CONSENT_ACTIVITY",
  "ACADEMIC_DISCUSSION",
];

const ENGAGEMENT_MODE_OPTIONS = [
  "IN_PERSON",
  "PHONE_CALL",
  "EMAIL",
  "SMS",
  "WHATSAPP",
  "LETTER",
  "APP_NOTIFICATION",
];

const ENGAGEMENT_OUTCOME_OPTIONS = ["COMPLETED", "PENDING", "FOLLOW_UP_REQUIRED"];

const ENGAGEMENT_OUTCOME_STYLES: Record<string, string> = {
  COMPLETED: "bg-success/15 text-success",
  PENDING: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  FOLLOW_UP_REQUIRED: "bg-info/15 text-info",
};

const emptyEngagementDraft = () => ({
  studentParentEngagementKey: "",
  engagementType: "PARENT_MEETING",
  engagementDate: "",
  guardianName: "",
  mode: "",
  subject: "",
  summary: "",
  outcomeStatus: "COMPLETED",
  followUpDate: "",
  conductedBy: "",
  academicYearKey: "",
});

const PORTFOLIO_ITEM_TYPE_OPTIONS = ["PROJECT", "ARTWORK", "DIGITAL_BADGE", "CERTIFICATE", "OTHER"];

const PORTFOLIO_ITEM_TYPE_STYLES: Record<string, string> = {
  PROJECT: "bg-info/15 text-info",
  ARTWORK: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
  DIGITAL_BADGE: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  CERTIFICATE: "bg-success/15 text-success",
  OTHER: "bg-muted text-muted-foreground",
};

const emptyPortfolioDraft = () => ({
  studentPortfolioItemKey: "",
  itemType: "PROJECT",
  title: "",
  description: "",
  itemDate: "",
  academicYearKey: "",
  mediaUrl: "",
  issuedBy: "",
  isFeatured: false,
});

const TALENT_AREA_OPTIONS = [
  "ACADEMIC_TALENT",
  "SPORTS_TALENT",
  "ARTISTIC_TALENT",
  "LEADERSHIP_POTENTIAL",
  "INNOVATION_POTENTIAL",
  "COMMUNITY_CONTRIBUTION",
];

const PROFICIENCY_LEVEL_OPTIONS = ["EMERGING", "PROFICIENT", "ADVANCED", "EXCEPTIONAL"];

const PROFICIENCY_LEVEL_STYLES: Record<string, string> = {
  EMERGING: "bg-muted text-muted-foreground",
  PROFICIENT: "bg-info/15 text-info",
  ADVANCED: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  EXCEPTIONAL: "bg-success/15 text-success",
};

const emptyTalentDraft = () => ({
  studentTalentRecordKey: "",
  talentArea: "ACADEMIC_TALENT",
  proficiencyLevel: "EMERGING",
  identifiedDate: "",
  identifiedBy: "",
  evidence: "",
  scholarshipRecommended: false,
  scholarshipDetails: "",
  academicYearKey: "",
  notes: "",
});

const CAREER_RECORD_TYPE_OPTIONS = [
  "CAREER_INTEREST",
  "CAREER_ASSESSMENT",
  "GUIDANCE_SESSION",
  "ENTRANCE_EXAM_PREP",
  "COLLEGE_ASPIRATION",
  "SCHOLARSHIP_OPPORTUNITY",
  "MENTORSHIP_ACTIVITY",
];

const CAREER_STATUS_OPTIONS = ["PLANNED", "IN_PROGRESS", "COMPLETED"];

const CAREER_STATUS_STYLES: Record<string, string> = {
  PLANNED: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  COMPLETED: "bg-success/15 text-success",
};

const emptyCareerDraft = () => ({
  studentCareerReadinessRecordKey: "",
  recordType: "CAREER_INTEREST",
  title: "",
  recordDate: "",
  counsellorName: "",
  details: "",
  targetInstitution: "",
  status: "PLANNED",
  academicYearKey: "",
  notes: "",
});

const emptyAlumniDraft = () => ({
  studentAlumniRecordKey: "",
  graduationDate: "",
  graduationAcademicYearKey: "",
  higherEducationInstitution: "",
  courseOfStudy: "",
  currentOccupation: "",
  currentEmployer: "",
  contactEmail: "",
  contactMobile: "",
  linkedInUrl: "",
  mentorshipParticipation: false,
  mentorshipDetails: "",
  institutionEngagementNotes: "",
  notes: "",
});

const emptyGuardianDraft = () => ({
  studentGuardianKey: "",
  relationshipType: "FATHER",
  fullName: "",
  mobileNumber: "",
  alternateMobileNumber: "",
  emailAddress: "",
  occupation: "",
  employer: "",
  annualIncome: "",
  educationQualification: "",
  communicationPreference: "",
  preferredLanguage: "",
  addressLine1: "",
  city: "",
  state: "",
  pincode: "",
  isPrimaryGuardian: false,
  isSecondaryGuardian: false,
  isEmergencyContact: false,
  isFinancialGuardian: false,
  isAcademicGuardian: false,
});

function StudentDetailPage() {
  const { id, tab, dev } = Route.useSearch();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(tab ?? "profile");
  const [activeDevTab, setActiveDevTab] = useState(dev ?? "achievements");

  const [student, setStudent] = useState<Student | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [siblings, setSiblings] = useState<Sibling[]>([]);
  const [loading, setLoading] = useState(true);

  const [guardianOpen, setGuardianOpen] = useState(false);
  const [guardianDraft, setGuardianDraft] = useState(emptyGuardianDraft());
  const [guardianSaving, setGuardianSaving] = useState(false);
  const [deleteGuardianTarget, setDeleteGuardianTarget] = useState<Guardian | null>(null);

  const [siblingQuery, setSiblingQuery] = useState("");
  const [siblingResults, setSiblingResults] = useState<StudentSearchResult[]>([]);
  const [siblingSearching, setSiblingSearching] = useState(false);

  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentUploadType, setDocumentUploadType] = useState("TC");
  const [documentUploading, setDocumentUploading] = useState(false);
  const [deleteDocumentTarget, setDeleteDocumentTarget] = useState<StudentDocument | null>(null);
  const [documentDeleting, setDocumentDeleting] = useState(false);

  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [auditLogLoading, setAuditLogLoading] = useState(false);

  const [aadharRevealed, setAadharRevealed] = useState<string | null>(null);
  const [aadharRevealing, setAadharRevealing] = useState(false);

  const [certificates, setCertificates] = useState<StudentCertificate[]>([]);
  const [certificatesLoading, setCertificatesLoading] = useState(false);
  const [certificateRequestType, setCertificateRequestType] = useState("TC");
  const [certificateRequestReason, setCertificateRequestReason] = useState("");
  const [certificateRequesting, setCertificateRequesting] = useState(false);
  const [certificateActioningId, setCertificateActioningId] = useState<string | null>(null);
  const [rejectCertificateTarget, setRejectCertificateTarget] = useState<StudentCertificate | null>(null);
  const [rejectCertificateReason, setRejectCertificateReason] = useState("");

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementOpen, setAchievementOpen] = useState(false);
  const [achievementDraft, setAchievementDraft] = useState(emptyAchievementDraft());
  const [achievementSaving, setAchievementSaving] = useState(false);
  const [deleteAchievementTarget, setDeleteAchievementTarget] = useState<Achievement | null>(null);

  const [behaviorRecords, setBehaviorRecords] = useState<BehaviorRecord[]>([]);
  const [behaviorOpen, setBehaviorOpen] = useState(false);
  const [behaviorDraft, setBehaviorDraft] = useState(emptyBehaviorDraft());
  const [behaviorSaving, setBehaviorSaving] = useState(false);
  const [deleteBehaviorTarget, setDeleteBehaviorTarget] = useState<BehaviorRecord | null>(null);

  const [leadershipRoles, setLeadershipRoles] = useState<LeadershipRole[]>([]);
  const [leadershipOpen, setLeadershipOpen] = useState(false);
  const [leadershipDraft, setLeadershipDraft] = useState(emptyLeadershipDraft());
  const [leadershipSaving, setLeadershipSaving] = useState(false);
  const [deleteLeadershipTarget, setDeleteLeadershipTarget] = useState<LeadershipRole | null>(null);

  const [counsellingRecords, setCounsellingRecords] = useState<CounsellingRecord[]>([]);
  const [counsellingOpen, setCounsellingOpen] = useState(false);
  const [counsellingDraft, setCounsellingDraft] = useState(emptyCounsellingDraft());
  const [counsellingSaving, setCounsellingSaving] = useState(false);
  const [deleteCounsellingTarget, setDeleteCounsellingTarget] = useState<CounsellingRecord | null>(null);

  const [sportsRecords, setSportsRecords] = useState<SportsRecord[]>([]);
  const [sportsOpen, setSportsOpen] = useState(false);
  const [sportsDraft, setSportsDraft] = useState(emptySportsDraft());
  const [sportsSaving, setSportsSaving] = useState(false);
  const [deleteSportsTarget, setDeleteSportsTarget] = useState<SportsRecord | null>(null);

  const [clubMemberships, setClubMemberships] = useState<ClubMembership[]>([]);
  const [clubOpen, setClubOpen] = useState(false);
  const [clubDraft, setClubDraft] = useState(emptyClubDraft());
  const [clubSaving, setClubSaving] = useState(false);
  const [deleteClubTarget, setDeleteClubTarget] = useState<ClubMembership | null>(null);

  const [parentEngagements, setParentEngagements] = useState<ParentEngagement[]>([]);
  const [engagementOpen, setEngagementOpen] = useState(false);
  const [engagementDraft, setEngagementDraft] = useState(emptyEngagementDraft());
  const [engagementSaving, setEngagementSaving] = useState(false);
  const [deleteEngagementTarget, setDeleteEngagementTarget] = useState<ParentEngagement | null>(null);

  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const [portfolioDraft, setPortfolioDraft] = useState(emptyPortfolioDraft());
  const [portfolioSaving, setPortfolioSaving] = useState(false);
  const [deletePortfolioTarget, setDeletePortfolioTarget] = useState<PortfolioItem | null>(null);

  const [talentRecords, setTalentRecords] = useState<TalentRecord[]>([]);
  const [talentOpen, setTalentOpen] = useState(false);
  const [talentDraft, setTalentDraft] = useState(emptyTalentDraft());
  const [talentSaving, setTalentSaving] = useState(false);
  const [deleteTalentTarget, setDeleteTalentTarget] = useState<TalentRecord | null>(null);

  const [careerRecords, setCareerRecords] = useState<CareerReadinessRecord[]>([]);
  const [careerOpen, setCareerOpen] = useState(false);
  const [careerDraft, setCareerDraft] = useState(emptyCareerDraft());
  const [careerSaving, setCareerSaving] = useState(false);
  const [deleteCareerTarget, setDeleteCareerTarget] = useState<CareerReadinessRecord | null>(null);

  const [alumniRecord, setAlumniRecord] = useState<AlumniRecord | null>(null);
  const [alumniOpen, setAlumniOpen] = useState(false);
  const [alumniDraft, setAlumniDraft] = useState(emptyAlumniDraft());
  const [alumniSaving, setAlumniSaving] = useState(false);
  const [deleteAlumniConfirmOpen, setDeleteAlumniConfirmOpen] = useState(false);

  const [statusOpen, setStatusOpen] = useState(false);
  const [statusDraft, setStatusDraft] = useState("ENROLLED");
  const [statusSaving, setStatusSaving] = useState(false);

  const [attendanceSummary, setAttendanceSummary] = useState<{
    totalMarkedDays: number;
    presentEquivalentDays: number;
    absentDays: number;
    lateDays: number;
    halfDays: number;
    excusedDays: number;
    requiredPercent: number;
    attendancePercent: number | null;
  } | null>(null);

  const [concessions, setConcessions] = useState<Concession[]>([]);
  const [demands, setDemands] = useState<FeeDemand[]>([]);
  const [receipts, setReceipts] = useState<FeeReceipt[]>([]);
  const [feeLoading, setFeeLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [concessionCategories, setConcessionCategories] = useState<ConcessionCategory[]>([]);
  const [concessionOpen, setConcessionOpen] = useState(false);
  const [concessionDraft, setConcessionDraft] = useState({
    concessionCategoryKey: "",
    academicYearKey: "",
    remarks: "",
  });
  const [concessionSaving, setConcessionSaving] = useState(false);

  const [selectedDemandKeys, setSelectedDemandKeys] = useState<string[]>([]);
  const [paymentDraft, setPaymentDraft] = useState({
    paymentMode: "CASH",
    paymentReference: "",
    remarks: "",
  });
  const [collecting, setCollecting] = useState(false);

  const [waiveTarget, setWaiveTarget] = useState<FeeDemand | null>(null);
  const [waiveReason, setWaiveReason] = useState("");
  const [waiving, setWaiving] = useState(false);

  const [cancelReceiptTarget, setCancelReceiptTarget] = useState<FeeReceipt | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const loadFees = () => {
    if (!id) return;
    setFeeLoading(true);
    Promise.all([
      apiFetch(`/api/Fee/student/${id}/concessions`),
      apiFetch(`/api/Fee/student/${id}/demands`),
      apiFetch(`/api/Fee/receipts?studentId=${id}`),
    ])
      .then(([c, d, r]: [Concession[], FeeDemand[], FeeReceipt[]]) => {
        setConcessions(c);
        setDemands(d);
        setReceipts(r);
      })
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load fee records"),
      )
      .finally(() => setFeeLoading(false));
  };

  useEffect(loadFees, [id]);

  useEffect(() => {
    Promise.all([apiFetch("/api/AcademicYear"), apiFetch("/api/ConcessionCategory")])
      .then(([y, c]: [AcademicYear[], ConcessionCategory[]]) => {
        setAcademicYears(y);
        setConcessionCategories(c);
      })
      .catch(() => {});
  }, []);

  const generateDemands = async () => {
    if (!id) return;
    setGenerating(true);
    try {
      const r: { installmentsGenerated: number } = await apiFetch(
        `/api/Fee/student/${id}/generate-demands`,
        { method: "POST" },
      );
      toast.success(
        r.installmentsGenerated > 0
          ? `${r.installmentsGenerated} installment(s) generated`
          : "No new installments to generate — already up to date",
      );
      loadFees();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate fee demands");
    } finally {
      setGenerating(false);
    }
  };

  const openAssignConcession = () => {
    setConcessionDraft({ concessionCategoryKey: "", academicYearKey: "", remarks: "" });
    setConcessionOpen(true);
  };

  const saveConcession = async () => {
    if (!id || !concessionDraft.concessionCategoryKey || !concessionDraft.academicYearKey) {
      toast.error("Select a concession category and academic year.");
      return;
    }
    setConcessionSaving(true);
    try {
      await apiFetch(`/api/Fee/student/${id}/concessions`, {
        method: "POST",
        body: JSON.stringify(concessionDraft),
      });
      toast.success("Concession assigned");
      setConcessionOpen(false);
      loadFees();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign concession");
    } finally {
      setConcessionSaving(false);
    }
  };

  const updateConcessionApproval = async (
    c: Concession,
    approvalStatus: "APPROVED" | "REJECTED",
  ) => {
    try {
      await apiFetch(`/api/Fee/concessions/${c.studentConcessionKey}/approval`, {
        method: "PUT",
        body: JSON.stringify({ approvalStatus }),
      });
      toast.success(`Concession ${approvalStatus.toLowerCase()}`);
      loadFees();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update concession");
    }
  };

  const removeConcession = async (c: Concession) => {
    try {
      await apiFetch(`/api/Fee/concessions/${c.studentConcessionKey}`, { method: "DELETE" });
      toast.success("Concession removed");
      loadFees();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove concession");
    }
  };

  const toggleDemandSelection = (key: string) => {
    setSelectedDemandKeys((keys) =>
      keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key],
    );
  };

  const selectedTotal = demands
    .filter((d) => selectedDemandKeys.includes(d.feeDemandKey))
    .reduce((sum, d) => sum + d.balanceAmount, 0);

  const collectPayment = async () => {
    if (!id || selectedDemandKeys.length === 0) return;
    setCollecting(true);
    try {
      const selected = demands.filter((d) => selectedDemandKeys.includes(d.feeDemandKey));
      await apiFetch("/api/Fee/receipts", {
        method: "POST",
        body: JSON.stringify({
          studentKey: id,
          paymentMode: paymentDraft.paymentMode,
          paymentReference: paymentDraft.paymentReference || null,
          remarks: paymentDraft.remarks || null,
          allocations: selected.map((d) => ({
            feeDemandKey: d.feeDemandKey,
            amount: d.balanceAmount,
          })),
        }),
      });
      toast.success("Payment collected");
      setSelectedDemandKeys([]);
      setPaymentDraft({ paymentMode: "CASH", paymentReference: "", remarks: "" });
      loadFees();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to collect payment");
    } finally {
      setCollecting(false);
    }
  };

  const confirmWaive = async () => {
    if (!waiveTarget || !waiveReason.trim()) {
      toast.error("A reason is required to waive a fee demand.");
      return;
    }
    setWaiving(true);
    try {
      await apiFetch(`/api/Fee/demands/${waiveTarget.feeDemandKey}/waive`, {
        method: "POST",
        body: JSON.stringify({ waivedReason: waiveReason }),
      });
      toast.success("Fee demand waived");
      setWaiveTarget(null);
      setWaiveReason("");
      loadFees();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to waive fee demand");
    } finally {
      setWaiving(false);
    }
  };

  const downloadReceiptPdf = async (receiptId: string, receiptNumber: string) => {
    try {
      const token = localStorage.getItem("akira_token");
      const res = await fetch(`${API_BASE_URL}/api/Fee/receipts/${receiptId}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to download receipt");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Receipt_${receiptNumber.replace(/\//g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download receipt");
    }
  };

  const confirmCancelReceipt = async () => {
    if (!cancelReceiptTarget || !cancelReason.trim()) {
      toast.error("A reason is required to cancel a receipt.");
      return;
    }
    setCancelling(true);
    try {
      await apiFetch(`/api/Fee/receipts/${cancelReceiptTarget.feeReceiptKey}/cancel`, {
        method: "POST",
        body: JSON.stringify({ cancelReason }),
      });
      toast.success("Receipt cancelled");
      setCancelReceiptTarget(null);
      setCancelReason("");
      loadFees();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel receipt");
    } finally {
      setCancelling(false);
    }
  };

  const load = () => {
    if (!id) return;
    setLoading(true);
    apiFetch(`/api/Student/${id}`)
      .then(
        (d: {
          student: Student;
          enrollments: Enrollment[];
          guardians: Guardian[];
          siblings: Sibling[];
        }) => {
          setStudent(d.student);
          setEnrollments(d.enrollments);
          setGuardians(d.guardians);
          setSiblings(d.siblings);
        },
      )
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load student"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const loadAchievements = () => {
    if (!id) return;
    apiFetch(`/api/Student/${id}/achievements`)
      .then((a: Achievement[]) => setAchievements(a))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load achievements"));
  };

  useEffect(loadAchievements, [id]);

  const loadDocuments = () => {
    if (!id) return;
    setDocumentsLoading(true);
    apiFetch(`/api/Student/${id}/documents`)
      .then((d: StudentDocument[]) => setDocuments(d ?? []))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load documents"))
      .finally(() => setDocumentsLoading(false));
  };

  useEffect(loadDocuments, [id]);

  const loadAuditLog = () => {
    if (!id) return;
    setAuditLogLoading(true);
    apiFetch(`/api/AuditLog?entityName=Student&entityId=${id}`)
      .then((a: AuditLogEntry[]) => setAuditLog(a ?? []))
      .catch(() => setAuditLog([]))
      .finally(() => setAuditLogLoading(false));
  };

  useEffect(loadAuditLog, [id]);

  const loadCertificates = () => {
    if (!id) return;
    setCertificatesLoading(true);
    apiFetch(`/api/Student/${id}/certificates`)
      .then((c: StudentCertificate[]) => setCertificates(c ?? []))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load certificates"))
      .finally(() => setCertificatesLoading(false));
  };

  useEffect(loadCertificates, [id]);

  const requestCertificate = async () => {
    if (!id) return;
    setCertificateRequesting(true);
    try {
      await apiFetch(`/api/Student/${id}/certificates`, {
        method: "POST",
        body: JSON.stringify({ certificateType: certificateRequestType, requestReason: certificateRequestReason || null }),
      });
      toast.success("Certificate requested");
      setCertificateRequestReason("");
      loadCertificates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to request certificate");
    } finally {
      setCertificateRequesting(false);
    }
  };

  const approveCertificate = async (certificateId: string) => {
    setCertificateActioningId(certificateId);
    try {
      await apiFetch(`/api/Student/certificates/${certificateId}/approve`, { method: "PUT" });
      toast.success("Certificate approved and generated");
      loadCertificates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve certificate");
    } finally {
      setCertificateActioningId(null);
    }
  };

  const confirmRejectCertificate = async () => {
    if (!rejectCertificateTarget || !rejectCertificateReason.trim()) {
      toast.error("A rejection reason is required.");
      return;
    }
    setCertificateActioningId(rejectCertificateTarget.studentCertificateKey);
    try {
      await apiFetch(`/api/Student/certificates/${rejectCertificateTarget.studentCertificateKey}/reject`, {
        method: "PUT",
        body: JSON.stringify({ rejectionReason: rejectCertificateReason }),
      });
      toast.success("Certificate request rejected");
      setRejectCertificateTarget(null);
      setRejectCertificateReason("");
      loadCertificates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject certificate");
    } finally {
      setCertificateActioningId(null);
    }
  };

  const revealAadhar = async () => {
    if (!id) return;
    setAadharRevealing(true);
    try {
      const result: { aadharNumber: string | null } = await apiFetch(`/api/Student/${id}/aadhaar`);
      setAadharRevealed(result.aadharNumber ?? "—");
      setTimeout(() => setAadharRevealed(null), 60_000);
      loadAuditLog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reveal Aadhar number");
    } finally {
      setAadharRevealing(false);
    }
  };

  const uploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !id) return;
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) {
      toast.error("Only JPG, PNG, WEBP or PDF files are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Document must be 10MB or smaller.");
      return;
    }
    setDocumentUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", documentUploadType);
      await apiUpload(`/api/Student/${id}/documents`, formData);
      toast.success("Document uploaded");
      loadDocuments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setDocumentUploading(false);
    }
  };

  const confirmDeleteDocument = async () => {
    if (!deleteDocumentTarget) return;
    setDocumentDeleting(true);
    try {
      await apiFetch(`/api/Student/documents/${deleteDocumentTarget.studentDocumentKey}`, { method: "DELETE" });
      toast.success("Document deleted");
      setDeleteDocumentTarget(null);
      loadDocuments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete document");
    } finally {
      setDocumentDeleting(false);
    }
  };

  const loadBehaviorRecords = () => {
    if (!id) return;
    apiFetch(`/api/Student/${id}/behavior-records`)
      .then((b: BehaviorRecord[]) => setBehaviorRecords(b))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load behavior records"),
      );
  };

  useEffect(loadBehaviorRecords, [id]);

  const loadLeadershipRoles = () => {
    if (!id) return;
    apiFetch(`/api/Student/${id}/leadership-roles`)
      .then((r: LeadershipRole[]) => setLeadershipRoles(r))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load leadership roles"),
      );
  };

  useEffect(loadLeadershipRoles, [id]);

  const loadCounsellingRecords = () => {
    if (!id) return;
    apiFetch(`/api/Student/${id}/counselling-records`)
      .then((c: CounsellingRecord[]) => setCounsellingRecords(c))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load counselling records"),
      );
  };

  useEffect(loadCounsellingRecords, [id]);

  const loadSportsRecords = () => {
    if (!id) return;
    apiFetch(`/api/Student/${id}/sports-records`)
      .then((s: SportsRecord[]) => setSportsRecords(s))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load sports records"),
      );
  };

  useEffect(loadSportsRecords, [id]);

  const loadClubMemberships = () => {
    if (!id) return;
    apiFetch(`/api/Student/${id}/club-memberships`)
      .then((c: ClubMembership[]) => setClubMemberships(c))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load club memberships"),
      );
  };

  useEffect(loadClubMemberships, [id]);

  const loadParentEngagements = () => {
    if (!id) return;
    apiFetch(`/api/Student/${id}/parent-engagements`)
      .then((e: ParentEngagement[]) => setParentEngagements(e))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load parent engagement history"),
      );
  };

  useEffect(loadParentEngagements, [id]);

  const loadPortfolioItems = () => {
    if (!id) return;
    apiFetch(`/api/Student/${id}/portfolio-items`)
      .then((p: PortfolioItem[]) => setPortfolioItems(p))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load portfolio items"),
      );
  };

  useEffect(loadPortfolioItems, [id]);

  const loadTalentRecords = () => {
    if (!id) return;
    apiFetch(`/api/Student/${id}/talent-records`)
      .then((t: TalentRecord[]) => setTalentRecords(t))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load talent records"),
      );
  };

  useEffect(loadTalentRecords, [id]);

  const loadCareerRecords = () => {
    if (!id) return;
    apiFetch(`/api/Student/${id}/career-readiness-records`)
      .then((c: CareerReadinessRecord[]) => setCareerRecords(c))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load career readiness records"),
      );
  };

  useEffect(loadCareerRecords, [id]);

  const loadAlumniRecord = () => {
    if (!id) return;
    apiFetch(`/api/Student/${id}/alumni-record`)
      .then((a: AlumniRecord | null) => setAlumniRecord(a))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load alumni record"),
      );
  };

  useEffect(loadAlumniRecord, [id]);

  useEffect(() => {
    if (!id || enrollments.length === 0) return;
    const academicYearKey = enrollments[0].academicYearKey;
    if (!academicYearKey) return;
    apiFetch(`/api/StudentAttendance/student/${id}/summary?academicYearId=${academicYearKey}`)
      .then((s) => setAttendanceSummary(s))
      .catch(() => {});
  }, [id, enrollments]);

  const openAddGuardian = () => {
    setGuardianDraft(emptyGuardianDraft());
    setGuardianOpen(true);
  };

  const openEditGuardian = (g: Guardian) => {
    setGuardianDraft({
      studentGuardianKey: g.studentGuardianKey,
      relationshipType: g.relationshipType,
      fullName: g.fullName,
      mobileNumber: g.mobileNumber ?? "",
      alternateMobileNumber: g.alternateMobileNumber ?? "",
      emailAddress: g.emailAddress ?? "",
      occupation: g.occupation ?? "",
      employer: g.employer ?? "",
      annualIncome: g.annualIncome != null ? String(g.annualIncome) : "",
      educationQualification: g.educationQualification ?? "",
      communicationPreference: g.communicationPreference ?? "",
      preferredLanguage: g.preferredLanguage ?? "",
      addressLine1: g.addressLine1 ?? "",
      city: g.city ?? "",
      state: g.state ?? "",
      pincode: g.pincode ?? "",
      isPrimaryGuardian: g.isPrimaryGuardian,
      isSecondaryGuardian: g.isSecondaryGuardian,
      isEmergencyContact: g.isEmergencyContact,
      isFinancialGuardian: g.isFinancialGuardian,
      isAcademicGuardian: g.isAcademicGuardian,
    });
    setGuardianOpen(true);
  };

  const saveGuardian = async () => {
    if (!student || !guardianDraft.fullName.trim()) {
      toast.error("Guardian name is required.");
      return;
    }
    setGuardianSaving(true);
    const body = {
      relationshipType: guardianDraft.relationshipType,
      fullName: guardianDraft.fullName,
      mobileNumber: guardianDraft.mobileNumber || null,
      alternateMobileNumber: guardianDraft.alternateMobileNumber || null,
      emailAddress: guardianDraft.emailAddress || null,
      occupation: guardianDraft.occupation || null,
      employer: guardianDraft.employer || null,
      annualIncome: guardianDraft.annualIncome ? Number(guardianDraft.annualIncome) : null,
      educationQualification: guardianDraft.educationQualification || null,
      communicationPreference: guardianDraft.communicationPreference || null,
      preferredLanguage: guardianDraft.preferredLanguage || null,
      addressLine1: guardianDraft.addressLine1 || null,
      city: guardianDraft.city || null,
      state: guardianDraft.state || null,
      pincode: guardianDraft.pincode || null,
      isPrimaryGuardian: guardianDraft.isPrimaryGuardian,
      isSecondaryGuardian: guardianDraft.isSecondaryGuardian,
      isEmergencyContact: guardianDraft.isEmergencyContact,
      isFinancialGuardian: guardianDraft.isFinancialGuardian,
      isAcademicGuardian: guardianDraft.isAcademicGuardian,
    };
    try {
      if (guardianDraft.studentGuardianKey) {
        await apiFetch(`/api/Student/guardians/${guardianDraft.studentGuardianKey}`, {
          method: "PUT",
          body: JSON.stringify({ studentGuardianKey: guardianDraft.studentGuardianKey, ...body }),
        });
      } else {
        await apiFetch(`/api/Student/${student.studentKey}/guardians`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      toast.success("Guardian saved");
      setGuardianOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save guardian");
    } finally {
      setGuardianSaving(false);
    }
  };

  const deleteGuardian = async () => {
    if (!deleteGuardianTarget) return;
    try {
      await apiFetch(`/api/Student/guardians/${deleteGuardianTarget.studentGuardianKey}`, {
        method: "DELETE",
      });
      toast.success("Guardian removed");
      setDeleteGuardianTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove guardian");
    }
  };

  const searchSiblings = (q: string) => {
    setSiblingQuery(q);
    if (q.trim().length < 2) {
      setSiblingResults([]);
      return;
    }
    setSiblingSearching(true);
    apiFetch(`/api/Student`)
      .then((all: StudentSearchResult[]) => {
        const lower = q.toLowerCase();
        setSiblingResults(
          all
            .filter(
              (s) =>
                s.studentKey !== student?.studentKey &&
                (s.studentName.toLowerCase().includes(lower) ||
                  s.admissionNumber.toLowerCase().includes(lower)),
            )
            .slice(0, 8),
        );
      })
      .catch(() => {})
      .finally(() => setSiblingSearching(false));
  };

  const addSibling = async (siblingStudentKey: string) => {
    if (!student) return;
    try {
      await apiFetch(`/api/Student/${student.studentKey}/siblings`, {
        method: "POST",
        body: JSON.stringify({ siblingStudentKey }),
      });
      toast.success("Sibling linked");
      setSiblingQuery("");
      setSiblingResults([]);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to link sibling");
    }
  };

  const removeSibling = async (relationshipKey: string) => {
    try {
      await apiFetch(`/api/Student/siblings/${relationshipKey}`, { method: "DELETE" });
      toast.success("Sibling link removed");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove sibling link");
    }
  };

  const openAddAchievement = () => {
    setAchievementDraft(emptyAchievementDraft());
    setAchievementOpen(true);
  };

  const openEditAchievement = (a: Achievement) => {
    setAchievementDraft({
      studentAchievementKey: a.studentAchievementKey,
      category: a.category,
      title: a.title,
      description: a.description ?? "",
      level: a.level ?? "",
      awardingBody: a.awardingBody ?? "",
      position: a.position ?? "",
      achievementDate: a.achievementDate?.slice(0, 10) ?? "",
      academicYearKey: a.academicYearKey ?? "",
      certificateUrl: a.certificateUrl ?? "",
    });
    setAchievementOpen(true);
  };

  const saveAchievement = async () => {
    if (!student || !achievementDraft.title.trim() || !achievementDraft.achievementDate) {
      toast.error("Title and achievement date are required.");
      return;
    }
    setAchievementSaving(true);
    const body = {
      category: achievementDraft.category,
      title: achievementDraft.title,
      description: achievementDraft.description || null,
      level: achievementDraft.level || null,
      awardingBody: achievementDraft.awardingBody || null,
      position: achievementDraft.position || null,
      achievementDate: achievementDraft.achievementDate,
      academicYearKey: achievementDraft.academicYearKey || null,
      certificateUrl: achievementDraft.certificateUrl || null,
    };
    try {
      if (achievementDraft.studentAchievementKey) {
        await apiFetch(`/api/Student/achievements/${achievementDraft.studentAchievementKey}`, {
          method: "PUT",
          body: JSON.stringify({
            studentAchievementKey: achievementDraft.studentAchievementKey,
            ...body,
          }),
        });
      } else {
        await apiFetch(`/api/Student/${student.studentKey}/achievements`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      toast.success("Achievement saved");
      setAchievementOpen(false);
      loadAchievements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save achievement");
    } finally {
      setAchievementSaving(false);
    }
  };

  const deleteAchievement = async () => {
    if (!deleteAchievementTarget) return;
    try {
      await apiFetch(`/api/Student/achievements/${deleteAchievementTarget.studentAchievementKey}`, {
        method: "DELETE",
      });
      toast.success("Achievement removed");
      setDeleteAchievementTarget(null);
      loadAchievements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove achievement");
    }
  };

  const openAddBehavior = () => {
    setBehaviorDraft(emptyBehaviorDraft());
    setBehaviorOpen(true);
  };

  const openEditBehavior = (b: BehaviorRecord) => {
    setBehaviorDraft({
      studentBehaviorRecordKey: b.studentBehaviorRecordKey,
      recordType: b.recordType,
      severity: b.severity ?? "",
      title: b.title,
      description: b.description ?? "",
      incidentDate: b.incidentDate?.slice(0, 10) ?? "",
      actionTaken: b.actionTaken ?? "",
      followUpRequired: b.followUpRequired,
      followUpStatus: b.followUpStatus ?? "",
      followUpDate: b.followUpDate?.slice(0, 10) ?? "",
      parentNotified: b.parentNotified,
      reportedByStaffName: b.reportedByStaffName ?? "",
      academicYearKey: b.academicYearKey ?? "",
    });
    setBehaviorOpen(true);
  };

  const saveBehavior = async () => {
    if (!student || !behaviorDraft.title.trim() || !behaviorDraft.incidentDate) {
      toast.error("Title and date are required.");
      return;
    }
    setBehaviorSaving(true);
    const body = {
      recordType: behaviorDraft.recordType,
      severity: behaviorDraft.severity || null,
      title: behaviorDraft.title,
      description: behaviorDraft.description || null,
      incidentDate: behaviorDraft.incidentDate,
      actionTaken: behaviorDraft.actionTaken || null,
      followUpRequired: behaviorDraft.followUpRequired,
      followUpStatus: behaviorDraft.followUpRequired ? behaviorDraft.followUpStatus || "OPEN" : null,
      followUpDate: behaviorDraft.followUpRequired ? behaviorDraft.followUpDate || null : null,
      parentNotified: behaviorDraft.parentNotified,
      reportedByStaffName: behaviorDraft.reportedByStaffName || null,
      academicYearKey: behaviorDraft.academicYearKey || null,
    };
    try {
      if (behaviorDraft.studentBehaviorRecordKey) {
        await apiFetch(`/api/Student/behavior-records/${behaviorDraft.studentBehaviorRecordKey}`, {
          method: "PUT",
          body: JSON.stringify({
            studentBehaviorRecordKey: behaviorDraft.studentBehaviorRecordKey,
            ...body,
          }),
        });
      } else {
        await apiFetch(`/api/Student/${student.studentKey}/behavior-records`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      toast.success("Behavior record saved");
      setBehaviorOpen(false);
      loadBehaviorRecords();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save behavior record");
    } finally {
      setBehaviorSaving(false);
    }
  };

  const deleteBehavior = async () => {
    if (!deleteBehaviorTarget) return;
    try {
      await apiFetch(`/api/Student/behavior-records/${deleteBehaviorTarget.studentBehaviorRecordKey}`, {
        method: "DELETE",
      });
      toast.success("Behavior record removed");
      setDeleteBehaviorTarget(null);
      loadBehaviorRecords();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove behavior record");
    }
  };

  const openAddLeadership = () => {
    setLeadershipDraft(emptyLeadershipDraft());
    setLeadershipOpen(true);
  };

  const openEditLeadership = (r: LeadershipRole) => {
    setLeadershipDraft({
      studentLeadershipRoleKey: r.studentLeadershipRoleKey,
      roleTitle: r.roleTitle,
      scope: r.scope ?? "",
      academicYearKey: r.academicYearKey ?? "",
      startDate: r.startDate?.slice(0, 10) ?? "",
      endDate: r.endDate?.slice(0, 10) ?? "",
      responsibilities: r.responsibilities ?? "",
      notes: r.notes ?? "",
    });
    setLeadershipOpen(true);
  };

  const saveLeadership = async () => {
    if (!student || !leadershipDraft.startDate) {
      toast.error("Start date is required.");
      return;
    }
    setLeadershipSaving(true);
    const body = {
      roleTitle: leadershipDraft.roleTitle,
      scope: leadershipDraft.scope || null,
      academicYearKey: leadershipDraft.academicYearKey || null,
      startDate: leadershipDraft.startDate,
      endDate: leadershipDraft.endDate || null,
      responsibilities: leadershipDraft.responsibilities || null,
      notes: leadershipDraft.notes || null,
    };
    try {
      if (leadershipDraft.studentLeadershipRoleKey) {
        await apiFetch(`/api/Student/leadership-roles/${leadershipDraft.studentLeadershipRoleKey}`, {
          method: "PUT",
          body: JSON.stringify({
            studentLeadershipRoleKey: leadershipDraft.studentLeadershipRoleKey,
            ...body,
          }),
        });
      } else {
        await apiFetch(`/api/Student/${student.studentKey}/leadership-roles`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      toast.success("Leadership role saved");
      setLeadershipOpen(false);
      loadLeadershipRoles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save leadership role");
    } finally {
      setLeadershipSaving(false);
    }
  };

  const deleteLeadership = async () => {
    if (!deleteLeadershipTarget) return;
    try {
      await apiFetch(`/api/Student/leadership-roles/${deleteLeadershipTarget.studentLeadershipRoleKey}`, {
        method: "DELETE",
      });
      toast.success("Leadership role removed");
      setDeleteLeadershipTarget(null);
      loadLeadershipRoles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove leadership role");
    }
  };

  const openAddCounselling = () => {
    setCounsellingDraft(emptyCounsellingDraft());
    setCounsellingOpen(true);
  };

  const openEditCounselling = (c: CounsellingRecord) => {
    setCounsellingDraft({
      studentCounsellingRecordKey: c.studentCounsellingRecordKey,
      supportArea: c.supportArea,
      sessionDate: c.sessionDate?.slice(0, 10) ?? "",
      counsellorName: c.counsellorName ?? "",
      referredBy: c.referredBy ?? "",
      reasonForReferral: c.reasonForReferral ?? "",
      sessionNotes: c.sessionNotes ?? "",
      interventionPlan: c.interventionPlan ?? "",
      outcomeStatus: c.outcomeStatus,
      followUpDate: c.followUpDate?.slice(0, 10) ?? "",
      parentInformed: c.parentInformed,
      academicYearKey: c.academicYearKey ?? "",
    });
    setCounsellingOpen(true);
  };

  const saveCounselling = async () => {
    if (!student || !counsellingDraft.sessionDate) {
      toast.error("Session date is required.");
      return;
    }
    setCounsellingSaving(true);
    const body = {
      supportArea: counsellingDraft.supportArea,
      sessionDate: counsellingDraft.sessionDate,
      counsellorName: counsellingDraft.counsellorName || null,
      referredBy: counsellingDraft.referredBy || null,
      reasonForReferral: counsellingDraft.reasonForReferral || null,
      sessionNotes: counsellingDraft.sessionNotes || null,
      interventionPlan: counsellingDraft.interventionPlan || null,
      outcomeStatus: counsellingDraft.outcomeStatus,
      followUpDate: counsellingDraft.followUpDate || null,
      parentInformed: counsellingDraft.parentInformed,
      academicYearKey: counsellingDraft.academicYearKey || null,
    };
    try {
      if (counsellingDraft.studentCounsellingRecordKey) {
        await apiFetch(`/api/Student/counselling-records/${counsellingDraft.studentCounsellingRecordKey}`, {
          method: "PUT",
          body: JSON.stringify({
            studentCounsellingRecordKey: counsellingDraft.studentCounsellingRecordKey,
            ...body,
          }),
        });
      } else {
        await apiFetch(`/api/Student/${student.studentKey}/counselling-records`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      toast.success("Counselling record saved");
      setCounsellingOpen(false);
      loadCounsellingRecords();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save counselling record");
    } finally {
      setCounsellingSaving(false);
    }
  };

  const deleteCounselling = async () => {
    if (!deleteCounsellingTarget) return;
    try {
      await apiFetch(`/api/Student/counselling-records/${deleteCounsellingTarget.studentCounsellingRecordKey}`, {
        method: "DELETE",
      });
      toast.success("Counselling record removed");
      setDeleteCounsellingTarget(null);
      loadCounsellingRecords();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove counselling record");
    }
  };

  const openAddSports = () => {
    setSportsDraft(emptySportsDraft());
    setSportsOpen(true);
  };

  const openEditSports = (s: SportsRecord) => {
    setSportsDraft({
      studentSportsRecordKey: s.studentSportsRecordKey,
      recordType: s.recordType,
      sportName: s.sportName,
      level: s.level ?? "",
      position: s.position ?? "",
      eventDate: s.eventDate?.slice(0, 10) ?? "",
      academicYearKey: s.academicYearKey ?? "",
      coachName: s.coachName ?? "",
      fitnessScore: s.fitnessScore != null ? String(s.fitnessScore) : "",
      fitnessParameters: s.fitnessParameters ?? "",
      scholarshipAmount: s.scholarshipAmount != null ? String(s.scholarshipAmount) : "",
      description: s.description ?? "",
      certificateUrl: s.certificateUrl ?? "",
    });
    setSportsOpen(true);
  };

  const saveSports = async () => {
    if (!student || !sportsDraft.sportName.trim() || !sportsDraft.eventDate) {
      toast.error("Sport name and event date are required.");
      return;
    }
    setSportsSaving(true);
    const body = {
      recordType: sportsDraft.recordType,
      sportName: sportsDraft.sportName,
      level: sportsDraft.level || null,
      position: sportsDraft.position || null,
      eventDate: sportsDraft.eventDate,
      academicYearKey: sportsDraft.academicYearKey || null,
      coachName: sportsDraft.coachName || null,
      fitnessScore: sportsDraft.fitnessScore ? Number(sportsDraft.fitnessScore) : null,
      fitnessParameters: sportsDraft.fitnessParameters || null,
      scholarshipAmount: sportsDraft.scholarshipAmount ? Number(sportsDraft.scholarshipAmount) : null,
      description: sportsDraft.description || null,
      certificateUrl: sportsDraft.certificateUrl || null,
    };
    try {
      if (sportsDraft.studentSportsRecordKey) {
        await apiFetch(`/api/Student/sports-records/${sportsDraft.studentSportsRecordKey}`, {
          method: "PUT",
          body: JSON.stringify({
            studentSportsRecordKey: sportsDraft.studentSportsRecordKey,
            ...body,
          }),
        });
      } else {
        await apiFetch(`/api/Student/${student.studentKey}/sports-records`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      toast.success("Sports record saved");
      setSportsOpen(false);
      loadSportsRecords();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save sports record");
    } finally {
      setSportsSaving(false);
    }
  };

  const deleteSports = async () => {
    if (!deleteSportsTarget) return;
    try {
      await apiFetch(`/api/Student/sports-records/${deleteSportsTarget.studentSportsRecordKey}`, {
        method: "DELETE",
      });
      toast.success("Sports record removed");
      setDeleteSportsTarget(null);
      loadSportsRecords();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove sports record");
    }
  };

  const openAddClub = () => {
    setClubDraft(emptyClubDraft());
    setClubOpen(true);
  };

  const openEditClub = (c: ClubMembership) => {
    setClubDraft({
      studentClubMembershipKey: c.studentClubMembershipKey,
      clubName: c.clubName,
      roleInClub: c.roleInClub,
      academicYearKey: c.academicYearKey ?? "",
      joinDate: c.joinDate?.slice(0, 10) ?? "",
      leaveDate: c.leaveDate?.slice(0, 10) ?? "",
      achievements: c.achievements ?? "",
      notes: c.notes ?? "",
    });
    setClubOpen(true);
  };

  const saveClub = async () => {
    if (!student || !clubDraft.clubName.trim() || !clubDraft.joinDate) {
      toast.error("Club name and join date are required.");
      return;
    }
    setClubSaving(true);
    const body = {
      clubName: clubDraft.clubName,
      roleInClub: clubDraft.roleInClub,
      academicYearKey: clubDraft.academicYearKey || null,
      joinDate: clubDraft.joinDate,
      leaveDate: clubDraft.leaveDate || null,
      achievements: clubDraft.achievements || null,
      notes: clubDraft.notes || null,
    };
    try {
      if (clubDraft.studentClubMembershipKey) {
        await apiFetch(`/api/Student/club-memberships/${clubDraft.studentClubMembershipKey}`, {
          method: "PUT",
          body: JSON.stringify({
            studentClubMembershipKey: clubDraft.studentClubMembershipKey,
            ...body,
          }),
        });
      } else {
        await apiFetch(`/api/Student/${student.studentKey}/club-memberships`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      toast.success("Club membership saved");
      setClubOpen(false);
      loadClubMemberships();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save club membership");
    } finally {
      setClubSaving(false);
    }
  };

  const deleteClub = async () => {
    if (!deleteClubTarget) return;
    try {
      await apiFetch(`/api/Student/club-memberships/${deleteClubTarget.studentClubMembershipKey}`, {
        method: "DELETE",
      });
      toast.success("Club membership removed");
      setDeleteClubTarget(null);
      loadClubMemberships();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove club membership");
    }
  };

  const openAddEngagement = () => {
    setEngagementDraft(emptyEngagementDraft());
    setEngagementOpen(true);
  };

  const openEditEngagement = (e: ParentEngagement) => {
    setEngagementDraft({
      studentParentEngagementKey: e.studentParentEngagementKey,
      engagementType: e.engagementType,
      engagementDate: e.engagementDate?.slice(0, 10) ?? "",
      guardianName: e.guardianName ?? "",
      mode: e.mode ?? "",
      subject: e.subject ?? "",
      summary: e.summary ?? "",
      outcomeStatus: e.outcomeStatus,
      followUpDate: e.followUpDate?.slice(0, 10) ?? "",
      conductedBy: e.conductedBy ?? "",
      academicYearKey: e.academicYearKey ?? "",
    });
    setEngagementOpen(true);
  };

  const saveEngagement = async () => {
    if (!student || !engagementDraft.engagementDate) {
      toast.error("Engagement date is required.");
      return;
    }
    setEngagementSaving(true);
    const body = {
      engagementType: engagementDraft.engagementType,
      engagementDate: engagementDraft.engagementDate,
      guardianName: engagementDraft.guardianName || null,
      mode: engagementDraft.mode || null,
      subject: engagementDraft.subject || null,
      summary: engagementDraft.summary || null,
      outcomeStatus: engagementDraft.outcomeStatus,
      followUpDate: engagementDraft.followUpDate || null,
      conductedBy: engagementDraft.conductedBy || null,
      academicYearKey: engagementDraft.academicYearKey || null,
    };
    try {
      if (engagementDraft.studentParentEngagementKey) {
        await apiFetch(`/api/Student/parent-engagements/${engagementDraft.studentParentEngagementKey}`, {
          method: "PUT",
          body: JSON.stringify({
            studentParentEngagementKey: engagementDraft.studentParentEngagementKey,
            ...body,
          }),
        });
      } else {
        await apiFetch(`/api/Student/${student.studentKey}/parent-engagements`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      toast.success("Parent engagement record saved");
      setEngagementOpen(false);
      loadParentEngagements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save parent engagement record");
    } finally {
      setEngagementSaving(false);
    }
  };

  const deleteEngagement = async () => {
    if (!deleteEngagementTarget) return;
    try {
      await apiFetch(`/api/Student/parent-engagements/${deleteEngagementTarget.studentParentEngagementKey}`, {
        method: "DELETE",
      });
      toast.success("Parent engagement record removed");
      setDeleteEngagementTarget(null);
      loadParentEngagements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove parent engagement record");
    }
  };

  const openAddPortfolio = () => {
    setPortfolioDraft(emptyPortfolioDraft());
    setPortfolioOpen(true);
  };

  const openEditPortfolio = (p: PortfolioItem) => {
    setPortfolioDraft({
      studentPortfolioItemKey: p.studentPortfolioItemKey,
      itemType: p.itemType,
      title: p.title,
      description: p.description ?? "",
      itemDate: p.itemDate?.slice(0, 10) ?? "",
      academicYearKey: p.academicYearKey ?? "",
      mediaUrl: p.mediaUrl ?? "",
      issuedBy: p.issuedBy ?? "",
      isFeatured: p.isFeatured,
    });
    setPortfolioOpen(true);
  };

  const savePortfolio = async () => {
    if (!student || !portfolioDraft.title.trim() || !portfolioDraft.itemDate) {
      toast.error("Title and date are required.");
      return;
    }
    setPortfolioSaving(true);
    const body = {
      itemType: portfolioDraft.itemType,
      title: portfolioDraft.title,
      description: portfolioDraft.description || null,
      itemDate: portfolioDraft.itemDate,
      academicYearKey: portfolioDraft.academicYearKey || null,
      mediaUrl: portfolioDraft.mediaUrl || null,
      issuedBy: portfolioDraft.issuedBy || null,
      isFeatured: portfolioDraft.isFeatured,
    };
    try {
      if (portfolioDraft.studentPortfolioItemKey) {
        await apiFetch(`/api/Student/portfolio-items/${portfolioDraft.studentPortfolioItemKey}`, {
          method: "PUT",
          body: JSON.stringify({
            studentPortfolioItemKey: portfolioDraft.studentPortfolioItemKey,
            ...body,
          }),
        });
      } else {
        await apiFetch(`/api/Student/${student.studentKey}/portfolio-items`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      toast.success("Portfolio item saved");
      setPortfolioOpen(false);
      loadPortfolioItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save portfolio item");
    } finally {
      setPortfolioSaving(false);
    }
  };

  const deletePortfolio = async () => {
    if (!deletePortfolioTarget) return;
    try {
      await apiFetch(`/api/Student/portfolio-items/${deletePortfolioTarget.studentPortfolioItemKey}`, {
        method: "DELETE",
      });
      toast.success("Portfolio item removed");
      setDeletePortfolioTarget(null);
      loadPortfolioItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove portfolio item");
    }
  };

  const openAddTalent = () => {
    setTalentDraft(emptyTalentDraft());
    setTalentOpen(true);
  };

  const openEditTalent = (t: TalentRecord) => {
    setTalentDraft({
      studentTalentRecordKey: t.studentTalentRecordKey,
      talentArea: t.talentArea,
      proficiencyLevel: t.proficiencyLevel,
      identifiedDate: t.identifiedDate?.slice(0, 10) ?? "",
      identifiedBy: t.identifiedBy ?? "",
      evidence: t.evidence ?? "",
      scholarshipRecommended: t.scholarshipRecommended,
      scholarshipDetails: t.scholarshipDetails ?? "",
      academicYearKey: t.academicYearKey ?? "",
      notes: t.notes ?? "",
    });
    setTalentOpen(true);
  };

  const saveTalent = async () => {
    if (!student || !talentDraft.identifiedDate) {
      toast.error("Identified date is required.");
      return;
    }
    setTalentSaving(true);
    const body = {
      talentArea: talentDraft.talentArea,
      proficiencyLevel: talentDraft.proficiencyLevel,
      identifiedDate: talentDraft.identifiedDate,
      identifiedBy: talentDraft.identifiedBy || null,
      evidence: talentDraft.evidence || null,
      scholarshipRecommended: talentDraft.scholarshipRecommended,
      scholarshipDetails: talentDraft.scholarshipDetails || null,
      academicYearKey: talentDraft.academicYearKey || null,
      notes: talentDraft.notes || null,
    };
    try {
      if (talentDraft.studentTalentRecordKey) {
        await apiFetch(`/api/Student/talent-records/${talentDraft.studentTalentRecordKey}`, {
          method: "PUT",
          body: JSON.stringify({
            studentTalentRecordKey: talentDraft.studentTalentRecordKey,
            ...body,
          }),
        });
      } else {
        await apiFetch(`/api/Student/${student.studentKey}/talent-records`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      toast.success("Talent record saved");
      setTalentOpen(false);
      loadTalentRecords();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save talent record");
    } finally {
      setTalentSaving(false);
    }
  };

  const deleteTalent = async () => {
    if (!deleteTalentTarget) return;
    try {
      await apiFetch(`/api/Student/talent-records/${deleteTalentTarget.studentTalentRecordKey}`, {
        method: "DELETE",
      });
      toast.success("Talent record removed");
      setDeleteTalentTarget(null);
      loadTalentRecords();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove talent record");
    }
  };

  const openAddCareer = () => {
    setCareerDraft(emptyCareerDraft());
    setCareerOpen(true);
  };

  const openEditCareer = (c: CareerReadinessRecord) => {
    setCareerDraft({
      studentCareerReadinessRecordKey: c.studentCareerReadinessRecordKey,
      recordType: c.recordType,
      title: c.title,
      recordDate: c.recordDate?.slice(0, 10) ?? "",
      counsellorName: c.counsellorName ?? "",
      details: c.details ?? "",
      targetInstitution: c.targetInstitution ?? "",
      status: c.status,
      academicYearKey: c.academicYearKey ?? "",
      notes: c.notes ?? "",
    });
    setCareerOpen(true);
  };

  const saveCareer = async () => {
    if (!student || !careerDraft.title.trim() || !careerDraft.recordDate) {
      toast.error("Title and date are required.");
      return;
    }
    setCareerSaving(true);
    const body = {
      recordType: careerDraft.recordType,
      title: careerDraft.title,
      recordDate: careerDraft.recordDate,
      counsellorName: careerDraft.counsellorName || null,
      details: careerDraft.details || null,
      targetInstitution: careerDraft.targetInstitution || null,
      status: careerDraft.status,
      academicYearKey: careerDraft.academicYearKey || null,
      notes: careerDraft.notes || null,
    };
    try {
      if (careerDraft.studentCareerReadinessRecordKey) {
        await apiFetch(`/api/Student/career-readiness-records/${careerDraft.studentCareerReadinessRecordKey}`, {
          method: "PUT",
          body: JSON.stringify({
            studentCareerReadinessRecordKey: careerDraft.studentCareerReadinessRecordKey,
            ...body,
          }),
        });
      } else {
        await apiFetch(`/api/Student/${student.studentKey}/career-readiness-records`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      toast.success("Career readiness record saved");
      setCareerOpen(false);
      loadCareerRecords();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save career readiness record");
    } finally {
      setCareerSaving(false);
    }
  };

  const deleteCareer = async () => {
    if (!deleteCareerTarget) return;
    try {
      await apiFetch(`/api/Student/career-readiness-records/${deleteCareerTarget.studentCareerReadinessRecordKey}`, {
        method: "DELETE",
      });
      toast.success("Career readiness record removed");
      setDeleteCareerTarget(null);
      loadCareerRecords();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove career readiness record");
    }
  };

  const openAlumniForm = () => {
    if (alumniRecord) {
      setAlumniDraft({
        studentAlumniRecordKey: alumniRecord.studentAlumniRecordKey,
        graduationDate: alumniRecord.graduationDate?.slice(0, 10) ?? "",
        graduationAcademicYearKey: alumniRecord.graduationAcademicYearKey ?? "",
        higherEducationInstitution: alumniRecord.higherEducationInstitution ?? "",
        courseOfStudy: alumniRecord.courseOfStudy ?? "",
        currentOccupation: alumniRecord.currentOccupation ?? "",
        currentEmployer: alumniRecord.currentEmployer ?? "",
        contactEmail: alumniRecord.contactEmail ?? "",
        contactMobile: alumniRecord.contactMobile ?? "",
        linkedInUrl: alumniRecord.linkedInUrl ?? "",
        mentorshipParticipation: alumniRecord.mentorshipParticipation,
        mentorshipDetails: alumniRecord.mentorshipDetails ?? "",
        institutionEngagementNotes: alumniRecord.institutionEngagementNotes ?? "",
        notes: alumniRecord.notes ?? "",
      });
    } else {
      setAlumniDraft(emptyAlumniDraft());
    }
    setAlumniOpen(true);
  };

  const saveAlumni = async () => {
    if (!student) return;
    setAlumniSaving(true);
    const body = {
      graduationDate: alumniDraft.graduationDate || null,
      graduationAcademicYearKey: alumniDraft.graduationAcademicYearKey || null,
      higherEducationInstitution: alumniDraft.higherEducationInstitution || null,
      courseOfStudy: alumniDraft.courseOfStudy || null,
      currentOccupation: alumniDraft.currentOccupation || null,
      currentEmployer: alumniDraft.currentEmployer || null,
      contactEmail: alumniDraft.contactEmail || null,
      contactMobile: alumniDraft.contactMobile || null,
      linkedInUrl: alumniDraft.linkedInUrl || null,
      mentorshipParticipation: alumniDraft.mentorshipParticipation,
      mentorshipDetails: alumniDraft.mentorshipDetails || null,
      institutionEngagementNotes: alumniDraft.institutionEngagementNotes || null,
      notes: alumniDraft.notes || null,
    };
    try {
      if (alumniDraft.studentAlumniRecordKey) {
        await apiFetch(`/api/Student/alumni-record/${alumniDraft.studentAlumniRecordKey}`, {
          method: "PUT",
          body: JSON.stringify({
            studentAlumniRecordKey: alumniDraft.studentAlumniRecordKey,
            ...body,
          }),
        });
      } else {
        await apiFetch(`/api/Student/${student.studentKey}/alumni-record`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      toast.success("Alumni record saved");
      setAlumniOpen(false);
      loadAlumniRecord();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save alumni record");
    } finally {
      setAlumniSaving(false);
    }
  };

  const deleteAlumni = async () => {
    if (!alumniRecord) return;
    try {
      await apiFetch(`/api/Student/alumni-record/${alumniRecord.studentAlumniRecordKey}`, {
        method: "DELETE",
      });
      toast.success("Alumni record removed");
      setDeleteAlumniConfirmOpen(false);
      loadAlumniRecord();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove alumni record");
    }
  };

  const openChangeStatus = () => {
    if (!student) return;
    setStatusDraft(student.studentStatus);
    setStatusOpen(true);
  };

  const saveStatus = async () => {
    if (!id) return;
    setStatusSaving(true);
    try {
      await apiFetch(`/api/Student/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ studentStatus: statusDraft }),
      });
      toast.success("Student status updated");
      setStatusOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  };

  if (loading) {
    return <PageLoader label="Loading student..." />;
  }

  if (!student) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Student not found.
      </div>
    );
  }

  const currentEnrollment = enrollments[0];

  const openIncidentCount = behaviorRecords.filter(
    (b) => b.followUpRequired && b.followUpStatus !== "RESOLVED",
  ).length;
  const disciplinaryCount = behaviorRecords.filter(
    (b) => b.recordType === "DISCIPLINARY_INCIDENT",
  ).length;
  const behaviorOverall =
    behaviorRecords.length === 0
      ? "—"
      : openIncidentCount > 0
        ? "Needs Follow-up"
        : disciplinaryCount === 0
          ? "Excellent"
          : "Good";

  const feesTotalBalance = demands.reduce((s, d) => s + d.balanceAmount, 0);
  const feesStatus = feeLoading
    ? "—"
    : demands.length === 0
      ? "No Demands"
      : feesTotalBalance <= 0
        ? "Paid"
        : `₹${feesTotalBalance.toFixed(0)} Due`;

  // Student Success Score (Module 18 §14) — a developmental indicator, not a
  // ranking: averages only the dimensions that actually have data on file,
  // so a student with no exam/attendance history yet isn't penalized.
  const successComponents: { label: string; value: number }[] = [];
  if (attendanceSummary?.attendancePercent != null) {
    successComponents.push({ label: "Attendance", value: attendanceSummary.attendancePercent });
  }
  if (behaviorRecords.length > 0) {
    const positiveCount = behaviorRecords.filter((b) => b.recordType === "POSITIVE_RECOGNITION").length;
    const behaviorScore = Math.max(
      0,
      Math.min(100, 100 - disciplinaryCount * 10 - openIncidentCount * 15 + positiveCount * 5),
    );
    successComponents.push({ label: "Behavior", value: behaviorScore });
  }
  if (achievements.length > 0) {
    successComponents.push({ label: "Achievements", value: Math.min(100, achievements.length * 15) });
  }
  const participationCount = leadershipRoles.length + clubMemberships.length + sportsRecords.length;
  if (participationCount > 0) {
    successComponents.push({
      label: "Participation & Leadership",
      value: Math.min(100, participationCount * 12),
    });
  }
  const successScore =
    successComponents.length === 0
      ? null
      : Math.round(successComponents.reduce((s, c) => s + c.value, 0) / successComponents.length);
  const successBand =
    successScore == null
      ? null
      : successScore >= 85
        ? "Excellent"
        : successScore >= 70
          ? "Good"
          : successScore >= 50
            ? "Developing"
            : "Needs Support";
  const successBandStyle =
    successScore == null
      ? "bg-muted text-muted-foreground"
      : successScore >= 85
        ? "bg-success/15 text-success"
        : successScore >= 70
          ? "bg-info/15 text-info"
          : successScore >= 50
            ? "bg-warning/25 text-[oklch(0.45_0.12_65)]"
            : "bg-destructive/15 text-destructive";

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        className="mb-4 gap-1.5 rounded-md"
        onClick={() => navigate({ to: "/students" })}
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Directory
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative mb-5 overflow-hidden rounded-md border border-border bg-gradient-to-br from-primary/15 via-primary/5 to-background p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-4px_rgba(16,24,40,0.06)]"
      >
        <BookOpen className="pointer-events-none absolute right-10 top-4 h-16 w-16 text-primary/10" />
        <Sparkles className="pointer-events-none absolute right-40 top-10 h-8 w-8 text-primary/10" />
        <Atom className="pointer-events-none absolute right-64 bottom-2 h-12 w-12 text-primary/10" />
        <Star className="pointer-events-none absolute right-24 bottom-4 h-6 w-6 text-primary/10" />

        <div className="relative flex flex-wrap items-center gap-4">
          <div className="relative h-20 w-20 shrink-0">
            <StudentAvatar
              photoUrl={student.photoUrl}
              gender={student.gender}
              studentName={student.studentName}
              className="h-20 w-20 border-4 border-background shadow-[0_2px_8px_rgba(16,24,40,0.08)]"
              iconClassName="h-8 w-8"
            />
            {student.studentStatus === "ENROLLED" && (
              <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-background bg-success" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="text-xl font-semibold">{student.studentName}</h1>
              {student.studentStatus === "ENROLLED" && (
                <BadgeCheck className="h-5 w-5 fill-primary text-primary-foreground" />
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-background/80 px-2 py-0.5 font-mono text-xs font-medium text-muted-foreground">
                {student.admissionNumber}
              </span>
              <Badge
                className={cn(
                  "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                  STATUS_STYLES[student.studentStatus],
                )}
              >
                {student.studentStatus.replace(/_/g, " ")}
              </Badge>
              {student.rteStatus && (
                <Badge className="rounded-md border-0 bg-[oklch(0.75_0.17_300)]/15 px-2 py-0.5 text-xs font-medium text-[oklch(0.55_0.2_300)]">
                  RTE
                </Badge>
              )}
            </div>
            <div className="mt-1.5 text-sm text-muted-foreground">
              {currentEnrollment
                ? `${currentEnrollment.className ?? "—"}${currentEnrollment.sectionLabel ? ` · Section ${currentEnrollment.sectionLabel}` : ""}${currentEnrollment.rollNumber ? ` · Roll No. ${currentEnrollment.rollNumber}` : ""} · ${currentEnrollment.academicYearName ?? ""}`
                : "Not currently enrolled in an active academic year"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              className="h-10 gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-[0_4px_12px_-2px_rgba(255,107,0,0.35)] transition-transform hover:scale-[1.02] hover:from-primary hover:to-primary"
              onClick={() => navigate({ to: "/student-edit", search: { id } })}
            >
              <Pencil className="h-3.5 w-3.5" /> Edit Profile
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 gap-1.5 rounded-xl bg-background shadow-sm transition-transform hover:scale-[1.02]"
                >
                  More Actions <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={openChangeStatus}>Change Status</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b border-border bg-transparent p-0">
          <TabsTrigger
            value="profile"
            className="relative gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2.5 text-muted-foreground transition-colors data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <User className="h-3.5 w-3.5" /> Overview
            {activeTab === "profile" && (
              <motion.div
                layoutId="tab-underline"
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
              />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="enrollment"
            className="relative gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2.5 text-muted-foreground transition-colors data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <GraduationCap className="h-3.5 w-3.5" /> Enrollment
            {activeTab === "enrollment" && (
              <motion.div
                layoutId="tab-underline"
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
              />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="guardians"
            className="relative gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2.5 text-muted-foreground transition-colors data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <Users className="h-3.5 w-3.5" /> Guardians
            {activeTab === "guardians" && (
              <motion.div
                layoutId="tab-underline"
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
              />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="siblings"
            className="relative gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2.5 text-muted-foreground transition-colors data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Siblings
            {activeTab === "siblings" && (
              <motion.div
                layoutId="tab-underline"
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
              />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="documents"
            className="relative gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2.5 text-muted-foreground transition-colors data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <FileText className="h-3.5 w-3.5" /> Documents
            {activeTab === "documents" && (
              <motion.div
                layoutId="tab-underline"
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
              />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="development"
            className="relative gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2.5 text-muted-foreground transition-colors data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <Sparkles className="h-3.5 w-3.5" /> Development
            {activeTab === "development" && (
              <motion.div
                layoutId="tab-underline"
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
              />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="fees"
            className="relative gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2.5 text-muted-foreground transition-colors data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <Wallet className="h-3.5 w-3.5" /> Fees
            {activeTab === "fees" && (
              <motion.div
                layoutId="tab-underline"
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
              />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4 pt-4">
          <div className="relative overflow-hidden rounded-md border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_20px_-6px_rgba(16,24,40,0.06)]">
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex items-center gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <Gauge className="h-6 w-6" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-foreground">Student Success Indicator</div>
                  <div className="text-xs text-muted-foreground">
                    A developmental snapshot, not a class ranking
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-3xl font-bold">
                  {successScore != null ? successScore : "—"}
                </span>
                {successBand && (
                  <Badge className={cn("rounded-md border-0 px-2 py-0.5 text-xs font-medium", successBandStyle)}>
                    {successBand}
                  </Badge>
                )}
              </div>
              {successComponents.length > 0 && (
                <div className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-2">
                  {successComponents.map((c) => (
                    <div key={c.label} className="min-w-[140px] flex-1">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{c.label}</span>
                        <span className="font-medium">{Math.round(c.value)}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.min(100, c.value)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {successComponents.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Not enough activity on file yet — this fills in as attendance, behavior,
                  achievements and participation records are added.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ViewSection title="Personal Information" icon={User} tone="primary">
              <ViewRow label="Full Name" value={student.studentName} />
              <ViewRow label="Date of Birth" value={student.dateOfBirth?.slice(0, 10)} />
              <ViewRow label="Gender" value={student.gender} />
              <ViewRow label="Nationality" value={student.nationality} />
              <ViewRow label="Religion" value={student.religion} />
              <ViewRow label="Mother Tongue" value={student.motherTongue} />
              <ViewRow label="Blood Group" value={student.bloodGroup} />
              <ViewRow
                label="Aadhar Number"
                value={
                  student.aadharNumberMasked ? (
                    <span className="flex items-center gap-2">
                      {aadharRevealed ?? student.aadharNumberMasked}
                      {!aadharRevealed && (
                        <button
                          type="button"
                          onClick={revealAadhar}
                          disabled={aadharRevealing}
                          className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                        >
                          {aadharRevealing ? "Revealing…" : "Reveal"}
                        </button>
                      )}
                    </span>
                  ) : null
                }
              />
            </ViewSection>

            <ViewSection title="Academic Information" icon={Building2} tone="purple">
              <ViewRow label="Academic Year" value={currentEnrollment?.academicYearName} />
              <ViewRow label="Class" value={currentEnrollment?.className} />
              <ViewRow label="Section" value={currentEnrollment?.sectionLabel} />
              <ViewRow label="Roll Number" value={currentEnrollment?.rollNumber} />
              <ViewRow
                label="Student Category"
                value={student.isResidential ? "Residential" : "Day Scholar"}
              />
              <ViewRow label="House" value={currentEnrollment?.house} />
              <ViewRow label="Board" value={currentEnrollment?.boardName} />
              <ViewRow
                label="Admission Type"
                value={currentEnrollment?.admissionType.replace(/_/g, " ")}
              />
            </ViewSection>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ViewSection
              title="Address"
              icon={MapPin}
              tone="primary"
              rightSlot={
                <div className="hidden h-full min-h-[88px] w-32 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40 sm:flex">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
              }
            >
              <ViewRow
                label="Current Address"
                value={[
                  student.currentAddressLine1,
                  student.currentAddressLine2,
                  student.currentCity,
                  student.currentDistrict,
                  student.currentState,
                  student.currentPincode,
                ]
                  .filter(Boolean)
                  .join(", ")}
                colSpan
              />
            </ViewSection>

            <ViewSection title="Government & Compliance" icon={ShieldCheck} tone="success">
              <ViewRow label="Community Category" value={student.communityCategory} />
              <ViewRow label="Minority Status" value={student.minorityStatus ? "Yes" : "No"} />
              <ViewRow
                label="First Generation Learner"
                value={student.firstGenerationLearner ? "Yes" : "No"}
              />
              <ViewRow
                label="Economically Weaker Section"
                value={student.economicallyWeakerSection ? "Yes" : "No"}
              />
              <ViewRow label="EMIS Number" value={student.emisNumber} />
              <ViewRow label="Student PEN Number" value={student.studentPENNumber} />
              <ViewRow label="Govt Scholarship Number" value={student.govtScholarshipNumber} />
              <ViewRow
                label="Disability"
                value={
                  student.disabilityCategory !== "NONE"
                    ? `${student.disabilityCategory} (${student.disabilityPercentage ?? "—"}%)`
                    : "None"
                }
              />
            </ViewSection>
          </div>

          <ViewSection title="Medical">
            <ViewRow label="Known Allergies" value={student.knownAllergies} />
            <ViewRow label="Chronic Conditions" value={student.chronicConditions} />
            <ViewRow label="Emergency Contact" value={student.emergencyContactName} />
            <ViewRow label="Emergency Mobile" value={student.emergencyContactMobile} />
          </ViewSection>

          <div className="rounded-md border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4 text-primary" /> Certificates
            </h3>

            <div className="mb-4 flex flex-wrap items-end gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="cert-request-type">Certificate Type</Label>
                <select
                  id="cert-request-type"
                  value={certificateRequestType}
                  onChange={(e) => setCertificateRequestType(e.target.value)}
                  className="h-9 w-56 rounded-md border border-input bg-card px-3 text-sm shadow-sm"
                >
                  {CERTIFICATE_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="min-w-[200px] flex-1 space-y-1.5">
                <Label htmlFor="cert-request-reason">Reason (optional)</Label>
                <Input
                  id="cert-request-reason"
                  value={certificateRequestReason}
                  onChange={(e) => setCertificateRequestReason(e.target.value)}
                  placeholder="e.g. Family relocating"
                  className="h-9 rounded-md"
                />
              </div>
              <Button
                type="button"
                size="sm"
                className="h-9 gap-1.5 rounded-md"
                disabled={certificateRequesting}
                onClick={requestCertificate}
              >
                {certificateRequesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Request
              </Button>
            </div>

            {certificatesLoading ? (
              <p className="text-sm text-muted-foreground">Loading certificates...</p>
            ) : certificates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No certificates requested yet.</p>
            ) : (
              <div className="space-y-2">
                {certificates.map((c) => (
                  <div key={c.studentCertificateKey} className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/20 px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">
                          {CERTIFICATE_TYPE_OPTIONS.find((o) => o.value === c.certificateType)?.label ?? c.certificateType}
                        </span>
                        <Badge
                          className={cn(
                            "rounded-md border-0 px-1.5 py-0 text-[10px] font-medium",
                            c.approvalStatus === "APPROVED"
                              ? "bg-success/15 text-success"
                              : c.approvalStatus === "REJECTED"
                                ? "bg-destructive/15 text-destructive"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
                          {c.approvalStatus}
                        </Badge>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {c.certificateNumber} · {c.issueDate?.slice(0, 10)}
                        {c.rejectionReason ? ` · ${c.rejectionReason}` : ""}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {c.approvalStatus === "PENDING" && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-md"
                            disabled={certificateActioningId === c.studentCertificateKey}
                            onClick={() => approveCertificate(c.studentCertificateKey)}
                          >
                            {certificateActioningId === c.studentCertificateKey ? "Generating..." : "Approve"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-md border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            disabled={certificateActioningId === c.studentCertificateKey}
                            onClick={() => setRejectCertificateTarget(c)}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {c.approvalStatus === "APPROVED" && c.fileUrl && (
                        <a
                          href={`${API_BASE_URL}${c.fileUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary hover:bg-primary/10"
                          aria-label="Download certificate"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ViewSection title="Record History" icon={History} tone="info">
            <ViewRow label="Created By" value={student.createdBy as string | undefined} />
            <ViewRow label="Created On" value={(student.createdOn as string | undefined)?.slice(0, 10)} />
            <ViewRow label="Last Modified By" value={(student.modifiedBy as string | undefined) ?? "—"} />
            <ViewRow label="Last Modified On" value={(student.modifiedOn as string | undefined)?.slice(0, 10) ?? "—"} />
          </ViewSection>

          <div className="rounded-md border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <History className="h-4 w-4 text-primary" /> Audit Trail
            </h3>
            {auditLogLoading ? (
              <p className="text-sm text-muted-foreground">Loading audit trail...</p>
            ) : auditLog.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit history recorded for this student yet.</p>
            ) : (
              <div className="space-y-2">
                {auditLog.map((a) => (
                  <div key={a.akiraAuditLogKey} className="flex items-start justify-between gap-3 rounded-md border border-border bg-secondary/20 px-3 py-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Badge className="rounded-md border-0 bg-primary/10 px-1.5 py-0 text-[10px] font-medium text-primary">
                          {a.action}
                        </Badge>
                        <span className="text-sm font-medium">{a.userName ?? "System"}</span>
                      </div>
                      {a.newValue && (
                        <div className="mt-1 truncate text-xs text-muted-foreground">{a.newValue}</div>
                      )}
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                      {a.timestamp?.slice(0, 16).replace("T", " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="enrollment" className="space-y-4 pt-4">
          {attendanceSummary && (
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Attendance — Current Year
                </h3>
                <Badge
                  className={cn(
                    "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                    attendanceSummary.attendancePercent != null &&
                      attendanceSummary.attendancePercent < attendanceSummary.requiredPercent
                      ? "bg-destructive/15 text-destructive"
                      : "bg-success/15 text-success",
                  )}
                >
                  {attendanceSummary.attendancePercent != null
                    ? `${attendanceSummary.attendancePercent}%`
                    : "No data"}{" "}
                  (min {attendanceSummary.requiredPercent}%)
                </Badge>
              </div>
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                <div>
                  <div className="text-sm font-semibold">{attendanceSummary.totalMarkedDays}</div>
                  <div className="text-muted-foreground">Marked</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-destructive">
                    {attendanceSummary.absentDays}
                  </div>
                  <div className="text-muted-foreground">Absent</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-[oklch(0.55_0.12_65)]">
                    {attendanceSummary.lateDays}
                  </div>
                  <div className="text-muted-foreground">Late</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-info">
                    {attendanceSummary.halfDays}
                  </div>
                  <div className="text-muted-foreground">Half Day</div>
                </div>
                <div>
                  <div className="text-sm font-semibold">{attendanceSummary.excusedDays}</div>
                  <div className="text-muted-foreground">Excused</div>
                </div>
              </div>
            </div>
          )}

          {enrollments.length === 0 && (
            <p className="text-sm text-muted-foreground">No enrollment history yet.</p>
          )}
          <div className="space-y-2">
            {enrollments.map((e) => (
              <div key={e.studentEnrollmentKey} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium">
                    {e.academicYearName} — {e.className}
                    {e.sectionLabel ? ` · ${e.sectionLabel}` : ""}
                  </div>
                  <Badge
                    className={cn(
                      "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                      ENROLLMENT_STATUS_STYLES[e.status] ?? "bg-muted text-muted-foreground",
                    )}
                  >
                    {e.status}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Board: {e.boardName ?? "—"} · Roll: {e.rollNumber ?? "Unassigned"} · House:{" "}
                  {e.house ?? "—"} · Medium: {e.mediumOfInstruction ?? "—"} ·{" "}
                  {e.admissionType.replace(/_/g, " ")}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="guardians" className="pt-4">
          <div className="mb-3 flex justify-end">
            <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={openAddGuardian}>
              <Plus className="h-3.5 w-3.5" /> Add Guardian
            </Button>
          </div>
          {guardians.length === 0 && (
            <p className="text-sm text-muted-foreground">No guardians on file yet.</p>
          )}
          <div className="space-y-2">
            {guardians.map((g) => (
              <div key={g.studentGuardianKey} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">{g.fullName}</span>
                      <Badge
                        className={cn(
                          "rounded-md border-0 px-1.5 py-0 text-[10px] font-medium",
                          RELATIONSHIP_STYLES[g.relationshipType] ??
                            "bg-muted text-muted-foreground",
                        )}
                      >
                        {g.relationshipType.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" /> {g.mobileNumber ?? "—"}{" "}
                      {g.emailAddress ? `· ${g.emailAddress}` : ""}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {g.isPrimaryGuardian && (
                        <Badge className="rounded-md border-0 bg-primary/15 px-1.5 py-0 text-[10px] font-medium text-primary">
                          <Star className="mr-0.5 h-2.5 w-2.5" />
                          Primary
                        </Badge>
                      )}
                      {g.isSecondaryGuardian && (
                        <Badge className="rounded-md border-0 bg-[oklch(0.55_0.1_200)]/15 px-1.5 py-0 text-[10px] font-medium text-[oklch(0.4_0.12_200)]">
                          Secondary
                        </Badge>
                      )}
                      {g.isEmergencyContact && (
                        <Badge className="rounded-md border-0 bg-destructive/15 px-1.5 py-0 text-[10px] font-medium text-destructive">
                          Emergency
                        </Badge>
                      )}
                      {g.isFinancialGuardian && (
                        <Badge className="rounded-md border-0 bg-success/15 px-1.5 py-0 text-[10px] font-medium text-success">
                          Financial
                        </Badge>
                      )}
                      {g.isAcademicGuardian && (
                        <Badge className="rounded-md border-0 bg-info/15 px-1.5 py-0 text-[10px] font-medium text-info">
                          Academic
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => openEditGuardian(g)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-destructive hover:text-destructive"
                      onClick={() => setDeleteGuardianTarget(g)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="siblings" className="space-y-4 pt-4">
          <InfoAlert tone="info" title="Sibling links power fee concessions">
            Confirming a sibling relationship here unlocks the sibling concession category in Fee
            Management for both students.
          </InfoAlert>

          <div className="space-y-2">
            {siblings.length === 0 && (
              <p className="text-sm text-muted-foreground">No siblings linked yet.</p>
            )}
            {siblings.map((s) => (
              <div
                key={s.studentRelationshipKey}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <div className="text-sm font-medium">{s.siblingName}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {s.siblingAdmissionNumber}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-md text-destructive hover:text-destructive"
                  onClick={() => removeSibling(s.studentRelationshipKey)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <div className="relative space-y-1.5">
            <Label>Link a Sibling</Label>
            <Input
              placeholder="Search by student name or admission number..."
              className="rounded-md"
              value={siblingQuery}
              onChange={(e) => searchSiblings(e.target.value)}
            />
            {siblingQuery.length >= 2 && (
              <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover p-1 shadow-md">
                {siblingSearching && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">Searching...</div>
                )}
                {!siblingSearching && siblingResults.length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">No matches.</div>
                )}
                {siblingResults.map((r) => (
                  <button
                    key={r.studentKey}
                    className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => addSibling(r.studentKey)}
                  >
                    <span>{r.studentName}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {r.admissionNumber}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4 pt-4">
          <div className="rounded-md border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="document-upload-type">Document Type</Label>
                <Select value={documentUploadType} onValueChange={setDocumentUploadType}>
                  <SelectTrigger id="document-upload-type" className="h-9 w-56 rounded-md">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Label
                htmlFor="student-detail-document-input"
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                <Upload className="h-3.5 w-3.5" />
                {documentUploading ? "Uploading..." : "Upload Document"}
              </Label>
              <input
                id="student-detail-document-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                disabled={documentUploading}
                onChange={uploadDocument}
              />
              <p className="text-xs text-muted-foreground">JPG, PNG, WEBP or PDF, up to 10MB.</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Document Type</th>
                  <th className="px-3 py-2">File Name</th>
                  <th className="px-3 py-2">Uploaded On</th>
                  <th className="px-3 py-2 text-right">Actions</th>
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
                        <td className="px-3 py-2 text-muted-foreground">{d.createdOn?.slice(0, 10)}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <a
                              href={`${API_BASE_URL}${d.fileUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              download={d.fileName}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary hover:bg-primary/10"
                              aria-label={`Download ${d.fileName}`}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-md text-destructive hover:text-destructive"
                              onClick={() => setDeleteDocumentTarget(d)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="development" className="pt-4">
          <Tabs value={activeDevTab} onValueChange={setActiveDevTab} className="w-full">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 gap-2 rounded-md border-primary/30 bg-primary/5 px-3 text-sm font-medium text-foreground hover:bg-primary/10"
                >
                  {(() => {
                    const active = DEV_SUBSECTIONS.find((s) => s.value === activeDevTab);
                    const ActiveIcon = active?.icon ?? Sparkles;
                    return (
                      <>
                        <ActiveIcon className="h-4 w-4 text-primary" />
                        {active?.label ?? "Select section"}
                      </>
                    );
                  })()}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {DEV_SUBSECTIONS.map((s) => (
                  <DropdownMenuItem
                    key={s.value}
                    className={cn("gap-2", activeDevTab === s.value && "bg-primary/10 text-primary")}
                    onClick={() => setActiveDevTab(s.value)}
                  >
                    <s.icon className="h-3.5 w-3.5" /> {s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

        <TabsContent value="achievements" className="pt-4">
          <div className="mb-3 flex justify-end">
            <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={openAddAchievement}>
              <Plus className="h-3.5 w-3.5" /> Add Achievement
            </Button>
          </div>
          {achievements.length === 0 && (
            <p className="text-sm text-muted-foreground">No achievements on file yet.</p>
          )}
          <div className="space-y-2">
            {achievements.map((a) => (
              <div key={a.studentAchievementKey} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium">{a.title}</span>
                      <Badge
                        className={cn(
                          "rounded-md border-0 px-1.5 py-0 text-[10px] font-medium",
                          ACHIEVEMENT_CATEGORY_STYLES[a.category] ?? "bg-muted text-muted-foreground",
                        )}
                      >
                        {a.category.replace(/_/g, " ")}
                      </Badge>
                      {a.level && (
                        <Badge className="rounded-md border-0 bg-muted px-1.5 py-0 text-[10px] font-medium text-muted-foreground">
                          {a.level}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {a.achievementDate?.slice(0, 10)}
                      {a.position ? ` · ${a.position}` : ""}
                      {a.awardingBody ? ` · ${a.awardingBody}` : ""}
                      {a.academicYearName ? ` · ${a.academicYearName}` : ""}
                    </div>
                    {a.description && (
                      <div className="mt-1 text-xs text-muted-foreground">{a.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => openEditAchievement(a)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-destructive hover:text-destructive"
                      onClick={() => setDeleteAchievementTarget(a)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="behavior" className="pt-4">
          <div className="mb-3 flex justify-end">
            <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={openAddBehavior}>
              <Plus className="h-3.5 w-3.5" /> Add Record
            </Button>
          </div>
          {behaviorRecords.length === 0 && (
            <p className="text-sm text-muted-foreground">No behavior records on file yet.</p>
          )}
          <div className="space-y-2">
            {behaviorRecords.map((b) => (
              <div key={b.studentBehaviorRecordKey} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium">{b.title}</span>
                      <Badge
                        className={cn(
                          "rounded-md border-0 px-1.5 py-0 text-[10px] font-medium",
                          BEHAVIOR_RECORD_TYPE_STYLES[b.recordType] ?? "bg-muted text-muted-foreground",
                        )}
                      >
                        {b.recordType.replace(/_/g, " ")}
                      </Badge>
                      {b.severity && (
                        <Badge
                          className={cn(
                            "rounded-md border-0 px-1.5 py-0 text-[10px] font-medium",
                            BEHAVIOR_SEVERITY_STYLES[b.severity] ?? "bg-muted text-muted-foreground",
                          )}
                        >
                          {b.severity}
                        </Badge>
                      )}
                      {b.followUpRequired && (
                        <Badge
                          className={cn(
                            "rounded-md border-0 px-1.5 py-0 text-[10px] font-medium",
                            b.followUpStatus === "RESOLVED"
                              ? "bg-success/15 text-success"
                              : "bg-warning/25 text-[oklch(0.45_0.12_65)]",
                          )}
                        >
                          Follow-up: {b.followUpStatus ?? "OPEN"}
                        </Badge>
                      )}
                      {b.parentNotified && (
                        <Badge className="rounded-md border-0 bg-info/15 px-1.5 py-0 text-[10px] font-medium text-info">
                          Parent Notified
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {b.incidentDate?.slice(0, 10)}
                      {b.reportedByStaffName ? ` · Reported by ${b.reportedByStaffName}` : ""}
                      {b.academicYearName ? ` · ${b.academicYearName}` : ""}
                    </div>
                    {b.description && (
                      <div className="mt-1 text-xs text-muted-foreground">{b.description}</div>
                    )}
                    {b.actionTaken && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium">Action taken:</span> {b.actionTaken}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => openEditBehavior(b)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-destructive hover:text-destructive"
                      onClick={() => setDeleteBehaviorTarget(b)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leadership" className="pt-4">
          <div className="mb-3 flex justify-end">
            <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={openAddLeadership}>
              <Plus className="h-3.5 w-3.5" /> Add Role
            </Button>
          </div>
          {leadershipRoles.length === 0 && (
            <p className="text-sm text-muted-foreground">No leadership roles on file yet.</p>
          )}
          <div className="space-y-2">
            {leadershipRoles.map((r) => (
              <div key={r.studentLeadershipRoleKey} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium">{r.roleTitle.replace(/_/g, " ")}</span>
                      {r.scope && (
                        <Badge className="rounded-md border-0 bg-primary/15 px-1.5 py-0 text-[10px] font-medium text-primary">
                          {r.scope}
                        </Badge>
                      )}
                      {!r.endDate && (
                        <Badge className="rounded-md border-0 bg-success/15 px-1.5 py-0 text-[10px] font-medium text-success">
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {r.startDate?.slice(0, 10)}
                      {r.endDate ? ` – ${r.endDate.slice(0, 10)}` : " – Present"}
                      {r.academicYearName ? ` · ${r.academicYearName}` : ""}
                    </div>
                    {r.responsibilities && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium">Responsibilities:</span> {r.responsibilities}
                      </div>
                    )}
                    {r.notes && (
                      <div className="mt-1 text-xs text-muted-foreground">{r.notes}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => openEditLeadership(r)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-destructive hover:text-destructive"
                      onClick={() => setDeleteLeadershipTarget(r)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="counselling" className="pt-4">
          <div className="mb-3 flex justify-end">
            <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={openAddCounselling}>
              <Plus className="h-3.5 w-3.5" /> Add Record
            </Button>
          </div>
          {counsellingRecords.length === 0 && (
            <p className="text-sm text-muted-foreground">No counselling records on file yet.</p>
          )}
          <div className="space-y-2">
            {counsellingRecords.map((c) => (
              <div key={c.studentCounsellingRecordKey} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium">
                        {c.supportArea.replace(/_/g, " ")}
                      </span>
                      <Badge
                        className={cn(
                          "rounded-md border-0 px-1.5 py-0 text-[10px] font-medium",
                          OUTCOME_STATUS_STYLES[c.outcomeStatus] ?? "bg-muted text-muted-foreground",
                        )}
                      >
                        {c.outcomeStatus.replace(/_/g, " ")}
                      </Badge>
                      {c.parentInformed && (
                        <Badge className="rounded-md border-0 bg-info/15 px-1.5 py-0 text-[10px] font-medium text-info">
                          Parent Informed
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {c.sessionDate?.slice(0, 10)}
                      {c.counsellorName ? ` · ${c.counsellorName}` : ""}
                      {c.referredBy ? ` · Referred by ${c.referredBy}` : ""}
                      {c.academicYearName ? ` · ${c.academicYearName}` : ""}
                    </div>
                    {c.reasonForReferral && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium">Reason:</span> {c.reasonForReferral}
                      </div>
                    )}
                    {c.sessionNotes && (
                      <div className="mt-1 text-xs text-muted-foreground">{c.sessionNotes}</div>
                    )}
                    {c.interventionPlan && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium">Intervention Plan:</span> {c.interventionPlan}
                      </div>
                    )}
                    {c.followUpDate && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium">Follow-up:</span> {c.followUpDate.slice(0, 10)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => openEditCounselling(c)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-destructive hover:text-destructive"
                      onClick={() => setDeleteCounsellingTarget(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sports" className="pt-4">
          <div className="mb-3 flex justify-end">
            <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={openAddSports}>
              <Plus className="h-3.5 w-3.5" /> Add Record
            </Button>
          </div>
          {sportsRecords.length === 0 && (
            <p className="text-sm text-muted-foreground">No sports records on file yet.</p>
          )}
          <div className="space-y-2">
            {sportsRecords.map((s) => (
              <div key={s.studentSportsRecordKey} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium">{s.sportName}</span>
                      <Badge
                        className={cn(
                          "rounded-md border-0 px-1.5 py-0 text-[10px] font-medium",
                          SPORTS_RECORD_TYPE_STYLES[s.recordType] ?? "bg-muted text-muted-foreground",
                        )}
                      >
                        {s.recordType.replace(/_/g, " ")}
                      </Badge>
                      {s.level && (
                        <Badge className="rounded-md border-0 bg-muted px-1.5 py-0 text-[10px] font-medium text-muted-foreground">
                          {s.level}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {s.eventDate?.slice(0, 10)}
                      {s.position ? ` · ${s.position}` : ""}
                      {s.coachName ? ` · Coach: ${s.coachName}` : ""}
                      {s.academicYearName ? ` · ${s.academicYearName}` : ""}
                    </div>
                    {s.fitnessScore != null && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium">Fitness Score:</span> {s.fitnessScore}
                        {s.fitnessParameters ? ` (${s.fitnessParameters})` : ""}
                      </div>
                    )}
                    {s.scholarshipAmount != null && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium">Scholarship:</span> ₹{s.scholarshipAmount}
                      </div>
                    )}
                    {s.description && (
                      <div className="mt-1 text-xs text-muted-foreground">{s.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => openEditSports(s)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-destructive hover:text-destructive"
                      onClick={() => setDeleteSportsTarget(s)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="clubs" className="pt-4">
          <div className="mb-3 flex justify-end">
            <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={openAddClub}>
              <Plus className="h-3.5 w-3.5" /> Add Membership
            </Button>
          </div>
          {clubMemberships.length === 0 && (
            <p className="text-sm text-muted-foreground">No club memberships on file yet.</p>
          )}
          <div className="space-y-2">
            {clubMemberships.map((c) => (
              <div key={c.studentClubMembershipKey} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium">{c.clubName}</span>
                      <Badge className="rounded-md border-0 bg-primary/15 px-1.5 py-0 text-[10px] font-medium text-primary">
                        {c.roleInClub.replace(/_/g, " ")}
                      </Badge>
                      {!c.leaveDate && (
                        <Badge className="rounded-md border-0 bg-success/15 px-1.5 py-0 text-[10px] font-medium text-success">
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {c.joinDate?.slice(0, 10)}
                      {c.leaveDate ? ` – ${c.leaveDate.slice(0, 10)}` : " – Present"}
                      {c.academicYearName ? ` · ${c.academicYearName}` : ""}
                    </div>
                    {c.achievements && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium">Achievements:</span> {c.achievements}
                      </div>
                    )}
                    {c.notes && (
                      <div className="mt-1 text-xs text-muted-foreground">{c.notes}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => openEditClub(c)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-destructive hover:text-destructive"
                      onClick={() => setDeleteClubTarget(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="parent-engagement" className="pt-4">
          <div className="mb-3 flex justify-end">
            <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={openAddEngagement}>
              <Plus className="h-3.5 w-3.5" /> Add Record
            </Button>
          </div>
          {parentEngagements.length === 0 && (
            <p className="text-sm text-muted-foreground">No parent engagement history on file yet.</p>
          )}
          <div className="space-y-2">
            {parentEngagements.map((e) => (
              <div key={e.studentParentEngagementKey} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium">
                        {e.subject || e.engagementType.replace(/_/g, " ")}
                      </span>
                      <Badge className="rounded-md border-0 bg-primary/15 px-1.5 py-0 text-[10px] font-medium text-primary">
                        {e.engagementType.replace(/_/g, " ")}
                      </Badge>
                      <Badge
                        className={cn(
                          "rounded-md border-0 px-1.5 py-0 text-[10px] font-medium",
                          ENGAGEMENT_OUTCOME_STYLES[e.outcomeStatus] ?? "bg-muted text-muted-foreground",
                        )}
                      >
                        {e.outcomeStatus.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {e.engagementDate?.slice(0, 10)}
                      {e.mode ? ` · ${e.mode.replace(/_/g, " ")}` : ""}
                      {e.guardianName ? ` · ${e.guardianName}` : ""}
                      {e.conductedBy ? ` · Conducted by ${e.conductedBy}` : ""}
                      {e.academicYearName ? ` · ${e.academicYearName}` : ""}
                    </div>
                    {e.summary && (
                      <div className="mt-1 text-xs text-muted-foreground">{e.summary}</div>
                    )}
                    {e.followUpDate && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium">Follow-up:</span> {e.followUpDate.slice(0, 10)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => openEditEngagement(e)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-destructive hover:text-destructive"
                      onClick={() => setDeleteEngagementTarget(e)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="portfolio" className="pt-4">
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/40 p-3 sm:grid-cols-5">
            <div className="text-center">
              <div className="text-lg font-semibold">{achievements.length}</div>
              <div className="text-[11px] text-muted-foreground">Achievements</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{sportsRecords.length}</div>
              <div className="text-[11px] text-muted-foreground">Sports Records</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{leadershipRoles.length}</div>
              <div className="text-[11px] text-muted-foreground">Leadership Roles</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{clubMemberships.length}</div>
              <div className="text-[11px] text-muted-foreground">Club Memberships</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{portfolioItems.length}</div>
              <div className="text-[11px] text-muted-foreground">Portfolio Items</div>
            </div>
          </div>

          <div className="mb-3 flex justify-end">
            <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={openAddPortfolio}>
              <Plus className="h-3.5 w-3.5" /> Add Item
            </Button>
          </div>
          {portfolioItems.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No standalone portfolio items yet — projects, artwork, digital badges and
              certificates go here. Achievements, sports records, leadership roles and clubs
              (counted above) already show up in their own sections.
            </p>
          )}
          <div className="space-y-2">
            {portfolioItems.map((p) => (
              <div key={p.studentPortfolioItemKey} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium">{p.title}</span>
                      <Badge
                        className={cn(
                          "rounded-md border-0 px-1.5 py-0 text-[10px] font-medium",
                          PORTFOLIO_ITEM_TYPE_STYLES[p.itemType] ?? "bg-muted text-muted-foreground",
                        )}
                      >
                        {p.itemType.replace(/_/g, " ")}
                      </Badge>
                      {p.isFeatured && (
                        <Badge className="rounded-md border-0 bg-primary/15 px-1.5 py-0 text-[10px] font-medium text-primary">
                          <Star className="mr-0.5 h-2.5 w-2.5" /> Featured
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {p.itemDate?.slice(0, 10)}
                      {p.issuedBy ? ` · ${p.issuedBy}` : ""}
                      {p.academicYearName ? ` · ${p.academicYearName}` : ""}
                    </div>
                    {p.description && (
                      <div className="mt-1 text-xs text-muted-foreground">{p.description}</div>
                    )}
                    {p.mediaUrl && (
                      <a
                        href={p.mediaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs text-primary hover:underline"
                      >
                        View media
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => openEditPortfolio(p)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-destructive hover:text-destructive"
                      onClick={() => setDeletePortfolioTarget(p)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="talent" className="pt-4">
          <div className="mb-3 flex justify-end">
            <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={openAddTalent}>
              <Plus className="h-3.5 w-3.5" /> Add Talent Record
            </Button>
          </div>
          {talentRecords.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No talent or scholarship recommendations on file yet.
            </p>
          )}
          <div className="space-y-2">
            {talentRecords.map((t) => (
              <div key={t.studentTalentRecordKey} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium">
                        {t.talentArea.replace(/_/g, " ")}
                      </span>
                      <Badge
                        className={cn(
                          "rounded-md border-0 px-1.5 py-0 text-[10px] font-medium",
                          PROFICIENCY_LEVEL_STYLES[t.proficiencyLevel] ?? "bg-muted text-muted-foreground",
                        )}
                      >
                        {t.proficiencyLevel}
                      </Badge>
                      {t.scholarshipRecommended && (
                        <Badge className="rounded-md border-0 bg-primary/15 px-1.5 py-0 text-[10px] font-medium text-primary">
                          <Star className="mr-0.5 h-2.5 w-2.5" /> Scholarship Recommended
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t.identifiedDate?.slice(0, 10)}
                      {t.identifiedBy ? ` · Identified by ${t.identifiedBy}` : ""}
                      {t.academicYearName ? ` · ${t.academicYearName}` : ""}
                    </div>
                    {t.evidence && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium">Evidence:</span> {t.evidence}
                      </div>
                    )}
                    {t.scholarshipDetails && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium">Scholarship Notes:</span> {t.scholarshipDetails}
                      </div>
                    )}
                    {t.notes && (
                      <div className="mt-1 text-xs text-muted-foreground">{t.notes}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => openEditTalent(t)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-destructive hover:text-destructive"
                      onClick={() => setDeleteTalentTarget(t)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="career" className="pt-4">
          <div className="mb-3 flex justify-end">
            <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={openAddCareer}>
              <Plus className="h-3.5 w-3.5" /> Add Record
            </Button>
          </div>
          {careerRecords.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No career readiness records on file yet — interests, assessments, guidance sessions,
              entrance exam prep, college aspirations and mentorship go here.
            </p>
          )}
          <div className="space-y-2">
            {careerRecords.map((c) => (
              <div key={c.studentCareerReadinessRecordKey} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium">{c.title}</span>
                      <Badge className="rounded-md border-0 bg-primary/15 px-1.5 py-0 text-[10px] font-medium text-primary">
                        {c.recordType.replace(/_/g, " ")}
                      </Badge>
                      <Badge
                        className={cn(
                          "rounded-md border-0 px-1.5 py-0 text-[10px] font-medium",
                          CAREER_STATUS_STYLES[c.status] ?? "bg-muted text-muted-foreground",
                        )}
                      >
                        {c.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {c.recordDate?.slice(0, 10)}
                      {c.counsellorName ? ` · ${c.counsellorName}` : ""}
                      {c.targetInstitution ? ` · ${c.targetInstitution}` : ""}
                      {c.academicYearName ? ` · ${c.academicYearName}` : ""}
                    </div>
                    {c.details && (
                      <div className="mt-1 text-xs text-muted-foreground">{c.details}</div>
                    )}
                    {c.notes && (
                      <div className="mt-1 text-xs text-muted-foreground">{c.notes}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => openEditCareer(c)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-destructive hover:text-destructive"
                      onClick={() => setDeleteCareerTarget(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alumni" className="pt-4">
          <div className="mb-3 flex justify-end gap-2">
            {alumniRecord && (
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 rounded-md border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setDeleteAlumniConfirmOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            )}
            <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={openAlumniForm}>
              {alumniRecord ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {alumniRecord ? "Edit Alumni Record" : "Add Alumni Record"}
            </Button>
          </div>
          {!alumniRecord ? (
            <p className="text-sm text-muted-foreground">
              No alumni record yet — graduation details, higher education, career and mentorship
              participation go here once the student transitions to alumni status.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border p-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Graduation &amp; Higher Education
                </h3>
                <div className="space-y-1.5 text-sm">
                  <div>
                    <span className="text-muted-foreground">Graduation Date: </span>
                    {alumniRecord.graduationDate?.slice(0, 10) ?? "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Graduating Year: </span>
                    {alumniRecord.graduationAcademicYearName ?? "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Institution: </span>
                    {alumniRecord.higherEducationInstitution ?? "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Course: </span>
                    {alumniRecord.courseOfStudy ?? "—"}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border p-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Career &amp; Contact
                </h3>
                <div className="space-y-1.5 text-sm">
                  <div>
                    <span className="text-muted-foreground">Occupation: </span>
                    {alumniRecord.currentOccupation ?? "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Employer: </span>
                    {alumniRecord.currentEmployer ?? "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email: </span>
                    {alumniRecord.contactEmail ?? "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Mobile: </span>
                    {alumniRecord.contactMobile ?? "—"}
                  </div>
                  {alumniRecord.linkedInUrl && (
                    <a
                      href={alumniRecord.linkedInUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <Linkedin className="h-3.5 w-3.5" /> LinkedIn Profile
                    </a>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 md:col-span-2">
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Mentorship &amp; Institution Engagement
                  {alumniRecord.mentorshipParticipation && (
                    <Badge className="rounded-md border-0 bg-success/15 px-1.5 py-0 text-[10px] font-medium text-success">
                      Mentorship Active
                    </Badge>
                  )}
                </h3>
                {alumniRecord.mentorshipDetails && (
                  <p className="mb-1.5 text-sm text-muted-foreground">
                    {alumniRecord.mentorshipDetails}
                  </p>
                )}
                {alumniRecord.institutionEngagementNotes && (
                  <p className="mb-1.5 text-sm text-muted-foreground">
                    {alumniRecord.institutionEngagementNotes}
                  </p>
                )}
                {alumniRecord.notes && (
                  <p className="text-sm text-muted-foreground">{alumniRecord.notes}</p>
                )}
              </div>
            </div>
          )}
        </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="fees" className="space-y-5 pt-4">
          {feeLoading && <p className="text-sm text-muted-foreground">Loading fee records...</p>}

          {!feeLoading && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-xs text-muted-foreground">Total Billed</div>
                  <div className="mt-1 text-lg font-semibold">
                    ₹{demands.reduce((s, d) => s + d.netAmount, 0).toFixed(2)}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-xs text-muted-foreground">Total Paid</div>
                  <div className="mt-1 text-lg font-semibold text-success">
                    ₹{demands.reduce((s, d) => s + d.paidAmount, 0).toFixed(2)}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-xs text-muted-foreground">Outstanding Balance</div>
                  <div className="mt-1 text-lg font-semibold text-destructive">
                    ₹{demands.reduce((s, d) => s + d.balanceAmount, 0).toFixed(2)}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Concessions
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 rounded-md"
                    onClick={openAssignConcession}
                  >
                    <BadgePercent className="h-3.5 w-3.5" /> Assign Concession
                  </Button>
                </div>
                {concessions.length === 0 && (
                  <p className="text-sm text-muted-foreground">No concessions assigned.</p>
                )}
                <div className="space-y-2">
                  {concessions.map((c) => (
                    <div
                      key={c.studentConcessionKey}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {c.categoryName} —{" "}
                          {c.discountType === "PERCENTAGE"
                            ? `${c.discountValue}%`
                            : `₹${c.discountValue}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {c.academicYearName}
                          {c.remarks ? ` · ${c.remarks}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          className={cn(
                            "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                            CONCESSION_STATUS_STYLES[c.approvalStatus],
                          )}
                        >
                          {c.approvalStatus}
                        </Badge>
                        {c.approvalStatus === "PENDING" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-md"
                              title="Approve"
                              onClick={() => updateConcessionApproval(c, "APPROVED")}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-md"
                              title="Reject"
                              onClick={() => updateConcessionApproval(c, "REJECTED")}
                            >
                              <XCircle className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-md text-destructive hover:text-destructive"
                          title="Remove"
                          onClick={() => removeConcession(c)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Fee Demands
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 rounded-md"
                    onClick={generateDemands}
                    disabled={generating}
                  >
                    <Receipt className="h-3.5 w-3.5" />{" "}
                    {generating ? "Generating..." : "Generate Demands"}
                  </Button>
                </div>
                {demands.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No fee demands yet. Generate them from the current class/year's fee structure.
                  </p>
                )}
                <div className="space-y-1.5">
                  {demands.map((d) => (
                    <div
                      key={d.feeDemandKey}
                      className="flex items-center gap-3 rounded-lg border border-border p-3"
                    >
                      {d.balanceAmount > 0 && d.status !== "CANCELLED" && (
                        <Checkbox
                          checked={selectedDemandKeys.includes(d.feeDemandKey)}
                          onCheckedChange={() => toggleDemandSelection(d.feeDemandKey)}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">
                          {d.feeHeadName}
                          {d.installmentLabel ? ` — ${d.installmentLabel}` : ""}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Due {d.dueDate?.slice(0, 10)} · Gross ₹{d.grossAmount} · Concession ₹
                          {d.concessionAmount} · Paid ₹{d.paidAmount}
                        </div>
                      </div>
                      <div className="text-right text-sm font-medium">
                        ₹{d.balanceAmount.toFixed(2)}
                      </div>
                      <Badge
                        className={cn(
                          "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                          DEMAND_STATUS_STYLES[d.status],
                        )}
                      >
                        {d.status.replace(/_/g, " ")}
                      </Badge>
                      {d.status !== "PAID" && d.status !== "WAIVED" && d.status !== "CANCELLED" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-md"
                          title="Waive"
                          onClick={() => {
                            setWaiveTarget(d);
                            setWaiveReason("");
                          }}
                        >
                          <Ban className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {selectedDemandKeys.length > 0 && (
                  <div className="mt-3 space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>{selectedDemandKeys.length} installment(s) selected</span>
                      <span>Total: ₹{selectedTotal.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-normal text-muted-foreground">
                          Payment Mode
                        </Label>
                        <Select
                          value={paymentDraft.paymentMode}
                          onValueChange={(v) =>
                            setPaymentDraft({ ...paymentDraft, paymentMode: v })
                          }
                        >
                          <SelectTrigger className="h-9 rounded-md">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["CASH", "CHEQUE", "ONLINE", "CARD", "DD", "UPI"].map((m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-normal text-muted-foreground">
                          Reference
                        </Label>
                        <Input
                          className="h-9 rounded-md"
                          value={paymentDraft.paymentReference}
                          onChange={(e) =>
                            setPaymentDraft({ ...paymentDraft, paymentReference: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-normal text-muted-foreground">Remarks</Label>
                        <Input
                          className="h-9 rounded-md"
                          value={paymentDraft.remarks}
                          onChange={(e) =>
                            setPaymentDraft({ ...paymentDraft, remarks: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 rounded-md"
                        onClick={() => setSelectedDemandKeys([])}
                        disabled={collecting}
                      >
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        className="h-9 gap-1.5 rounded-md"
                        onClick={collectPayment}
                        disabled={collecting}
                      >
                        <Wallet className="h-3.5 w-3.5" />{" "}
                        {collecting ? "Collecting..." : "Collect Payment"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Receipts
                </h3>
                {receipts.length === 0 && (
                  <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                )}
                <div className="space-y-1.5">
                  {receipts.map((r) => (
                    <div
                      key={r.feeReceiptKey}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div>
                        <div className="font-mono text-sm font-medium">{r.receiptNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.receiptDate?.slice(0, 10)} · {r.paymentMode}
                          {r.paymentReference ? ` · ${r.paymentReference}` : ""}
                        </div>
                        {r.status === "CANCELLED" && r.cancelReason && (
                          <div className="text-xs text-destructive">
                            Cancelled: {r.cancelReason}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">₹{r.totalAmount.toFixed(2)}</span>
                        <Badge
                          className={cn(
                            "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                            r.status === "ACTIVE"
                              ? "bg-success/15 text-success"
                              : "bg-destructive/15 text-destructive",
                          )}
                        >
                          {r.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-md text-primary hover:text-primary"
                          title="Download Receipt PDF"
                          onClick={() => downloadReceiptPdf(r.feeReceiptKey, r.receiptNumber)}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        {r.status === "ACTIVE" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-md text-destructive hover:text-destructive"
                            title="Cancel Receipt"
                            onClick={() => {
                              setCancelReceiptTarget(r);
                              setCancelReason("");
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-5 grid grid-cols-2 gap-3 rounded-md border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_20px_-6px_rgba(16,24,40,0.06)] sm:grid-cols-5">
        <StatTile
          icon={CalendarCheck}
          tone="primary"
          label="Attendance"
          value={
            attendanceSummary?.attendancePercent != null
              ? `${attendanceSummary.attendancePercent}%`
              : "—"
          }
          hint="This Year"
        />
        <StatTile icon={Percent} tone="info" label="Average Marks" value="—" hint="This Term" />
        <StatTile
          icon={Award}
          tone="purple"
          label="Achievements"
          value={String(achievements.length)}
          hint="Total"
        />
        <StatTile icon={Star} tone="primary" label="Behavior" value={behaviorOverall} hint="Overall" />
        <StatTile
          icon={Wallet}
          tone={feesTotalBalance > 0 ? "destructive" : "success"}
          label="Fees Status"
          value={feesStatus}
          hint={feesTotalBalance > 0 ? "Balance Due" : "Up to date"}
        />
      </div>

      <FormDialog
        open={concessionOpen}
        onOpenChange={setConcessionOpen}
        title="Assign Concession"
        description="Concessions marked as requiring approval start PENDING until an admin approves them."
        submitLabel={concessionSaving ? "Saving..." : "Assign"}
        onSubmit={saveConcession}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Concession Category</Label>
            <Select
              value={concessionDraft.concessionCategoryKey}
              onValueChange={(v) =>
                setConcessionDraft({ ...concessionDraft, concessionCategoryKey: v })
              }
            >
              <SelectTrigger className="rounded-md">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {concessionCategories.map((c) => (
                  <SelectItem key={c.concessionCategoryKey} value={c.concessionCategoryKey}>
                    {c.categoryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label required>Academic Year</Label>
            <Select
              value={concessionDraft.academicYearKey}
              onValueChange={(v) => setConcessionDraft({ ...concessionDraft, academicYearKey: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y.academicYearKey} value={y.academicYearKey}>
                    {y.yearName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Input
              className="rounded-md"
              value={concessionDraft.remarks}
              onChange={(e) => setConcessionDraft({ ...concessionDraft, remarks: e.target.value })}
            />
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!waiveTarget} onOpenChange={(v) => !v && setWaiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Waive Fee Demand?</AlertDialogTitle>
            <AlertDialogDescription>
              Waives the remaining balance of {waiveTarget?.feeHeadName}
              {waiveTarget?.installmentLabel ? ` — ${waiveTarget.installmentLabel}` : ""}. A reason
              is required.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="Reason for waiver"
            className="rounded-md"
            value={waiveReason}
            onChange={(e) => setWaiveReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={waiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={waiving}
              onClick={(e) => {
                e.preventDefault();
                confirmWaive();
              }}
            >
              {waiving ? "Waiving..." : "Waive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!cancelReceiptTarget}
        onOpenChange={(v) => !v && setCancelReceiptTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Receipt?</AlertDialogTitle>
            <AlertDialogDescription>
              Reverses {cancelReceiptTarget?.receiptNumber} and restores the balance on every fee
              demand it settled. The receipt number is never reused. A reason is required.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="Reason for cancellation"
            className="rounded-md"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Receipt</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelling}
              onClick={(e) => {
                e.preventDefault();
                confirmCancelReceipt();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? "Cancelling..." : "Cancel Receipt"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FormDialog
        open={guardianOpen}
        onOpenChange={setGuardianOpen}
        title={guardianDraft.studentGuardianKey ? "Edit Guardian" : "Add Guardian"}
        description="Multiple guardians can be linked; priority flags decide who receives which communications."
        submitLabel="Save Guardian"
        onSubmit={saveGuardian}
        submitting={guardianSaving}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label required>Relationship</Label>
            <Select
              value={guardianDraft.relationshipType}
              onValueChange={(v) => setGuardianDraft({ ...guardianDraft, relationshipType: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label required>Full Name</Label>
            <Input
              className="rounded-md"
              value={guardianDraft.fullName}
              onChange={(e) => setGuardianDraft({ ...guardianDraft, fullName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Mobile</Label>
            <Input
              className="rounded-md"
              value={guardianDraft.mobileNumber}
              onChange={(e) => setGuardianDraft({ ...guardianDraft, mobileNumber: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Alternate Mobile</Label>
            <Input
              className="rounded-md"
              value={guardianDraft.alternateMobileNumber}
              onChange={(e) =>
                setGuardianDraft({ ...guardianDraft, alternateMobileNumber: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              className="rounded-md"
              value={guardianDraft.emailAddress}
              onChange={(e) => setGuardianDraft({ ...guardianDraft, emailAddress: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Occupation</Label>
            <Input
              className="rounded-md"
              value={guardianDraft.occupation}
              onChange={(e) => setGuardianDraft({ ...guardianDraft, occupation: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Employer</Label>
            <Input
              className="rounded-md"
              value={guardianDraft.employer}
              onChange={(e) => setGuardianDraft({ ...guardianDraft, employer: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Annual Income</Label>
            <Input
              type="number"
              className="rounded-md"
              value={guardianDraft.annualIncome}
              onChange={(e) => setGuardianDraft({ ...guardianDraft, annualIncome: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Education Qualification</Label>
            <Input
              className="rounded-md"
              value={guardianDraft.educationQualification}
              onChange={(e) =>
                setGuardianDraft({ ...guardianDraft, educationQualification: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Preferred Language</Label>
            <Input
              className="rounded-md"
              value={guardianDraft.preferredLanguage}
              onChange={(e) =>
                setGuardianDraft({ ...guardianDraft, preferredLanguage: e.target.value })
              }
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Address</Label>
            <Input
              className="rounded-md"
              value={guardianDraft.addressLine1}
              onChange={(e) => setGuardianDraft({ ...guardianDraft, addressLine1: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>City</Label>
            <Input
              className="rounded-md"
              value={guardianDraft.city}
              onChange={(e) => setGuardianDraft({ ...guardianDraft, city: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>State</Label>
            <Input
              className="rounded-md"
              value={guardianDraft.state}
              onChange={(e) => setGuardianDraft({ ...guardianDraft, state: e.target.value })}
            />
          </div>

          <div className="col-span-2 mt-1 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={guardianDraft.isPrimaryGuardian}
                onCheckedChange={(v) =>
                  setGuardianDraft({ ...guardianDraft, isPrimaryGuardian: !!v })
                }
              />{" "}
              Primary Guardian
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={guardianDraft.isSecondaryGuardian}
                onCheckedChange={(v) =>
                  setGuardianDraft({ ...guardianDraft, isSecondaryGuardian: !!v })
                }
              />{" "}
              Secondary Guardian
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={guardianDraft.isEmergencyContact}
                onCheckedChange={(v) =>
                  setGuardianDraft({ ...guardianDraft, isEmergencyContact: !!v })
                }
              />{" "}
              Emergency Contact
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={guardianDraft.isFinancialGuardian}
                onCheckedChange={(v) =>
                  setGuardianDraft({ ...guardianDraft, isFinancialGuardian: !!v })
                }
              />{" "}
              Financial Guardian
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={guardianDraft.isAcademicGuardian}
                onCheckedChange={(v) =>
                  setGuardianDraft({ ...guardianDraft, isAcademicGuardian: !!v })
                }
              />{" "}
              Academic Guardian
            </label>
          </div>
        </div>
      </FormDialog>

      <FormDialog
        open={achievementOpen}
        onOpenChange={setAchievementOpen}
        title={achievementDraft.studentAchievementKey ? "Edit Achievement" : "Add Achievement"}
        description="Achievements become a permanent part of the student's development portfolio."
        submitLabel="Save Achievement"
        onSubmit={saveAchievement}
        submitting={achievementSaving}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label required>Category</Label>
            <Select
              value={achievementDraft.category}
              onValueChange={(v) => setAchievementDraft({ ...achievementDraft, category: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACHIEVEMENT_CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label required>Title</Label>
            <Input
              className="rounded-md"
              value={achievementDraft.title}
              onChange={(e) => setAchievementDraft({ ...achievementDraft, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label required>Achievement Date</Label>
            <Input
              type="date"
              className="rounded-md"
              value={achievementDraft.achievementDate}
              onChange={(e) =>
                setAchievementDraft({ ...achievementDraft, achievementDate: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Level</Label>
            <Select
              value={achievementDraft.level}
              onValueChange={(v) => setAchievementDraft({ ...achievementDraft, level: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {ACHIEVEMENT_LEVEL_OPTIONS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Position / Rank</Label>
            <Input
              className="rounded-md"
              placeholder="e.g. 1st Place, Gold Medal"
              value={achievementDraft.position}
              onChange={(e) => setAchievementDraft({ ...achievementDraft, position: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Awarding Body</Label>
            <Input
              className="rounded-md"
              value={achievementDraft.awardingBody}
              onChange={(e) =>
                setAchievementDraft({ ...achievementDraft, awardingBody: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Academic Year</Label>
            <Select
              value={achievementDraft.academicYearKey}
              onValueChange={(v) => setAchievementDraft({ ...achievementDraft, academicYearKey: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y.academicYearKey} value={y.academicYearKey}>
                    {y.yearName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Certificate URL</Label>
            <Input
              className="rounded-md"
              value={achievementDraft.certificateUrl}
              onChange={(e) =>
                setAchievementDraft({ ...achievementDraft, certificateUrl: e.target.value })
              }
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Description</Label>
            <Input
              className="rounded-md"
              value={achievementDraft.description}
              onChange={(e) =>
                setAchievementDraft({ ...achievementDraft, description: e.target.value })
              }
            />
          </div>
        </div>
      </FormDialog>

      <AlertDialog
        open={!!deleteAchievementTarget}
        onOpenChange={(v) => !v && setDeleteAchievementTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Achievement?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes "{deleteAchievementTarget?.title}" from this student's achievement record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteAchievement();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FormDialog
        open={behaviorOpen}
        onOpenChange={setBehaviorOpen}
        title={behaviorDraft.studentBehaviorRecordKey ? "Edit Behavior Record" : "Add Behavior Record"}
        description="Tracks both positive recognition and corrective/disciplinary history for this student."
        submitLabel="Save Record"
        onSubmit={saveBehavior}
        submitting={behaviorSaving}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label required>Record Type</Label>
            <Select
              value={behaviorDraft.recordType}
              onValueChange={(v) => setBehaviorDraft({ ...behaviorDraft, recordType: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BEHAVIOR_RECORD_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Severity</Label>
            <Select
              value={behaviorDraft.severity}
              onValueChange={(v) => setBehaviorDraft({ ...behaviorDraft, severity: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue placeholder="Applies to disciplinary incidents" />
              </SelectTrigger>
              <SelectContent>
                {BEHAVIOR_SEVERITY_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label required>Title</Label>
            <Input
              className="rounded-md"
              value={behaviorDraft.title}
              onChange={(e) => setBehaviorDraft({ ...behaviorDraft, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label required>Date</Label>
            <Input
              type="date"
              className="rounded-md"
              value={behaviorDraft.incidentDate}
              onChange={(e) => setBehaviorDraft({ ...behaviorDraft, incidentDate: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Reported By</Label>
            <Input
              className="rounded-md"
              value={behaviorDraft.reportedByStaffName}
              onChange={(e) =>
                setBehaviorDraft({ ...behaviorDraft, reportedByStaffName: e.target.value })
              }
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Description</Label>
            <Input
              className="rounded-md"
              value={behaviorDraft.description}
              onChange={(e) => setBehaviorDraft({ ...behaviorDraft, description: e.target.value })}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Action Taken</Label>
            <Input
              className="rounded-md"
              value={behaviorDraft.actionTaken}
              onChange={(e) => setBehaviorDraft({ ...behaviorDraft, actionTaken: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Academic Year</Label>
            <Select
              value={behaviorDraft.academicYearKey}
              onValueChange={(v) => setBehaviorDraft({ ...behaviorDraft, academicYearKey: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y.academicYearKey} value={y.academicYearKey}>
                    {y.yearName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 mt-1 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={behaviorDraft.parentNotified}
                onCheckedChange={(v) => setBehaviorDraft({ ...behaviorDraft, parentNotified: !!v })}
              />{" "}
              Parent Notified
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={behaviorDraft.followUpRequired}
                onCheckedChange={(v) =>
                  setBehaviorDraft({ ...behaviorDraft, followUpRequired: !!v })
                }
              />{" "}
              Follow-up Required
            </label>
          </div>
          {behaviorDraft.followUpRequired && (
            <>
              <div className="space-y-1.5">
                <Label>Follow-up Status</Label>
                <Select
                  value={behaviorDraft.followUpStatus}
                  onValueChange={(v) => setBehaviorDraft({ ...behaviorDraft, followUpStatus: v })}
                >
                  <SelectTrigger className="rounded-md">
                    <SelectValue placeholder="OPEN" />
                  </SelectTrigger>
                  <SelectContent>
                    {BEHAVIOR_FOLLOWUP_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Follow-up Date</Label>
                <Input
                  type="date"
                  className="rounded-md"
                  value={behaviorDraft.followUpDate}
                  onChange={(e) =>
                    setBehaviorDraft({ ...behaviorDraft, followUpDate: e.target.value })
                  }
                />
              </div>
            </>
          )}
        </div>
      </FormDialog>

      <AlertDialog
        open={!!deleteBehaviorTarget}
        onOpenChange={(v) => !v && setDeleteBehaviorTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Behavior Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes "{deleteBehaviorTarget?.title}" from this student's behavior history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteBehavior();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FormDialog
        open={leadershipOpen}
        onOpenChange={setLeadershipOpen}
        title={leadershipDraft.studentLeadershipRoleKey ? "Edit Leadership Role" : "Add Leadership Role"}
        description="Captaincies, prefectships and club/event leadership become part of the student's permanent record."
        submitLabel="Save Role"
        onSubmit={saveLeadership}
        submitting={leadershipSaving}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label required>Role</Label>
            <Select
              value={leadershipDraft.roleTitle}
              onValueChange={(v) => setLeadershipDraft({ ...leadershipDraft, roleTitle: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEADERSHIP_ROLE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Scope</Label>
            <Input
              className="rounded-md"
              placeholder="e.g. Blue House, Science Club"
              value={leadershipDraft.scope}
              onChange={(e) => setLeadershipDraft({ ...leadershipDraft, scope: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label required>Start Date</Label>
            <Input
              type="date"
              className="rounded-md"
              value={leadershipDraft.startDate}
              onChange={(e) => setLeadershipDraft({ ...leadershipDraft, startDate: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>End Date</Label>
            <Input
              type="date"
              className="rounded-md"
              value={leadershipDraft.endDate}
              onChange={(e) => setLeadershipDraft({ ...leadershipDraft, endDate: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Academic Year</Label>
            <Select
              value={leadershipDraft.academicYearKey}
              onValueChange={(v) => setLeadershipDraft({ ...leadershipDraft, academicYearKey: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y.academicYearKey} value={y.academicYearKey}>
                    {y.yearName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Responsibilities</Label>
            <Input
              className="rounded-md"
              value={leadershipDraft.responsibilities}
              onChange={(e) =>
                setLeadershipDraft({ ...leadershipDraft, responsibilities: e.target.value })
              }
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Notes</Label>
            <Input
              className="rounded-md"
              value={leadershipDraft.notes}
              onChange={(e) => setLeadershipDraft({ ...leadershipDraft, notes: e.target.value })}
            />
          </div>
        </div>
      </FormDialog>

      <AlertDialog
        open={!!deleteLeadershipTarget}
        onOpenChange={(v) => !v && setDeleteLeadershipTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Leadership Role?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes "{deleteLeadershipTarget?.roleTitle.replace(/_/g, " ")}" from this
              student's leadership history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteLeadership();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FormDialog
        open={counsellingOpen}
        onOpenChange={setCounsellingOpen}
        title={counsellingDraft.studentCounsellingRecordKey ? "Edit Counselling Record" : "Add Counselling Record"}
        description="Support interventions and outcomes become part of the student's confidential support history."
        submitLabel="Save Record"
        onSubmit={saveCounselling}
        submitting={counsellingSaving}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label required>Support Area</Label>
            <Select
              value={counsellingDraft.supportArea}
              onValueChange={(v) => setCounsellingDraft({ ...counsellingDraft, supportArea: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORT_AREA_OPTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label required>Session Date</Label>
            <Input
              type="date"
              className="rounded-md"
              value={counsellingDraft.sessionDate}
              onChange={(e) => setCounsellingDraft({ ...counsellingDraft, sessionDate: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Counsellor Name</Label>
            <Input
              className="rounded-md"
              value={counsellingDraft.counsellorName}
              onChange={(e) =>
                setCounsellingDraft({ ...counsellingDraft, counsellorName: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Referred By</Label>
            <Input
              className="rounded-md"
              value={counsellingDraft.referredBy}
              onChange={(e) => setCounsellingDraft({ ...counsellingDraft, referredBy: e.target.value })}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Reason for Referral</Label>
            <Input
              className="rounded-md"
              value={counsellingDraft.reasonForReferral}
              onChange={(e) =>
                setCounsellingDraft({ ...counsellingDraft, reasonForReferral: e.target.value })
              }
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Session Notes</Label>
            <Input
              className="rounded-md"
              value={counsellingDraft.sessionNotes}
              onChange={(e) =>
                setCounsellingDraft({ ...counsellingDraft, sessionNotes: e.target.value })
              }
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Intervention Plan</Label>
            <Input
              className="rounded-md"
              value={counsellingDraft.interventionPlan}
              onChange={(e) =>
                setCounsellingDraft({ ...counsellingDraft, interventionPlan: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Outcome Status</Label>
            <Select
              value={counsellingDraft.outcomeStatus}
              onValueChange={(v) => setCounsellingDraft({ ...counsellingDraft, outcomeStatus: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTCOME_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Follow-up Date</Label>
            <Input
              type="date"
              className="rounded-md"
              value={counsellingDraft.followUpDate}
              onChange={(e) =>
                setCounsellingDraft({ ...counsellingDraft, followUpDate: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Academic Year</Label>
            <Select
              value={counsellingDraft.academicYearKey}
              onValueChange={(v) => setCounsellingDraft({ ...counsellingDraft, academicYearKey: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y.academicYearKey} value={y.academicYearKey}>
                    {y.yearName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 mt-1 flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={counsellingDraft.parentInformed}
                onCheckedChange={(v) =>
                  setCounsellingDraft({ ...counsellingDraft, parentInformed: !!v })
                }
              />{" "}
              Parent Informed
            </label>
          </div>
        </div>
      </FormDialog>

      <AlertDialog
        open={!!deleteCounsellingTarget}
        onOpenChange={(v) => !v && setDeleteCounsellingTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Counselling Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes this "{deleteCounsellingTarget?.supportArea.replace(/_/g, " ")}" record
              from this student's support history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteCounselling();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FormDialog
        open={sportsOpen}
        onOpenChange={setSportsOpen}
        title={sportsDraft.studentSportsRecordKey ? "Edit Sports Record" : "Add Sports Record"}
        description="Team membership, competitions, fitness assessments and sports scholarships become part of the student's permanent record."
        submitLabel="Save Record"
        onSubmit={saveSports}
        submitting={sportsSaving}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label required>Record Type</Label>
            <Select
              value={sportsDraft.recordType}
              onValueChange={(v) => setSportsDraft({ ...sportsDraft, recordType: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPORTS_RECORD_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label required>Sport</Label>
            <Input
              className="rounded-md"
              placeholder="e.g. Basketball, Athletics, Swimming"
              value={sportsDraft.sportName}
              onChange={(e) => setSportsDraft({ ...sportsDraft, sportName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label required>Event Date</Label>
            <Input
              type="date"
              className="rounded-md"
              value={sportsDraft.eventDate}
              onChange={(e) => setSportsDraft({ ...sportsDraft, eventDate: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Level</Label>
            <Select
              value={sportsDraft.level}
              onValueChange={(v) => setSportsDraft({ ...sportsDraft, level: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {ACHIEVEMENT_LEVEL_OPTIONS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Position / Rank</Label>
            <Input
              className="rounded-md"
              placeholder="e.g. 1st Place, Team Captain"
              value={sportsDraft.position}
              onChange={(e) => setSportsDraft({ ...sportsDraft, position: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Coach Name</Label>
            <Input
              className="rounded-md"
              value={sportsDraft.coachName}
              onChange={(e) => setSportsDraft({ ...sportsDraft, coachName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fitness Score</Label>
            <Input
              type="number"
              className="rounded-md"
              value={sportsDraft.fitnessScore}
              onChange={(e) => setSportsDraft({ ...sportsDraft, fitnessScore: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fitness Parameters</Label>
            <Input
              className="rounded-md"
              placeholder="e.g. BMI, endurance, flexibility"
              value={sportsDraft.fitnessParameters}
              onChange={(e) =>
                setSportsDraft({ ...sportsDraft, fitnessParameters: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Scholarship Amount</Label>
            <Input
              type="number"
              className="rounded-md"
              value={sportsDraft.scholarshipAmount}
              onChange={(e) =>
                setSportsDraft({ ...sportsDraft, scholarshipAmount: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Academic Year</Label>
            <Select
              value={sportsDraft.academicYearKey}
              onValueChange={(v) => setSportsDraft({ ...sportsDraft, academicYearKey: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y.academicYearKey} value={y.academicYearKey}>
                    {y.yearName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Description</Label>
            <Input
              className="rounded-md"
              value={sportsDraft.description}
              onChange={(e) => setSportsDraft({ ...sportsDraft, description: e.target.value })}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Certificate URL</Label>
            <Input
              className="rounded-md"
              value={sportsDraft.certificateUrl}
              onChange={(e) => setSportsDraft({ ...sportsDraft, certificateUrl: e.target.value })}
            />
          </div>
        </div>
      </FormDialog>

      <AlertDialog
        open={!!deleteSportsTarget}
        onOpenChange={(v) => !v && setDeleteSportsTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Sports Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes "{deleteSportsTarget?.sportName}" from this student's sports history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteSports();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FormDialog
        open={clubOpen}
        onOpenChange={setClubOpen}
        title={clubDraft.studentClubMembershipKey ? "Edit Club Membership" : "Add Club Membership"}
        description="Co-curricular participation history stays on the student's permanent record, even after the membership ends."
        submitLabel="Save Membership"
        onSubmit={saveClub}
        submitting={clubSaving}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label required>Club</Label>
            <Select
              value={clubDraft.clubName}
              onValueChange={(v) => setClubDraft({ ...clubDraft, clubName: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLUB_NAME_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label required>Role</Label>
            <Select
              value={clubDraft.roleInClub}
              onValueChange={(v) => setClubDraft({ ...clubDraft, roleInClub: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLUB_ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label required>Join Date</Label>
            <Input
              type="date"
              className="rounded-md"
              value={clubDraft.joinDate}
              onChange={(e) => setClubDraft({ ...clubDraft, joinDate: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Leave Date</Label>
            <Input
              type="date"
              className="rounded-md"
              value={clubDraft.leaveDate}
              onChange={(e) => setClubDraft({ ...clubDraft, leaveDate: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Academic Year</Label>
            <Select
              value={clubDraft.academicYearKey}
              onValueChange={(v) => setClubDraft({ ...clubDraft, academicYearKey: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y.academicYearKey} value={y.academicYearKey}>
                    {y.yearName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Achievements</Label>
            <Input
              className="rounded-md"
              value={clubDraft.achievements}
              onChange={(e) => setClubDraft({ ...clubDraft, achievements: e.target.value })}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Notes</Label>
            <Input
              className="rounded-md"
              value={clubDraft.notes}
              onChange={(e) => setClubDraft({ ...clubDraft, notes: e.target.value })}
            />
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteClubTarget} onOpenChange={(v) => !v && setDeleteClubTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Club Membership?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes "{deleteClubTarget?.clubName}" from this student's co-curricular history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteClub();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FormDialog
        open={engagementOpen}
        onOpenChange={setEngagementOpen}
        title={engagementDraft.studentParentEngagementKey ? "Edit Engagement Record" : "Add Engagement Record"}
        description="Every school-parent touchpoint becomes part of the student's engagement timeline."
        submitLabel="Save Record"
        onSubmit={saveEngagement}
        submitting={engagementSaving}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label required>Type</Label>
            <Select
              value={engagementDraft.engagementType}
              onValueChange={(v) => setEngagementDraft({ ...engagementDraft, engagementType: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENGAGEMENT_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label required>Date</Label>
            <Input
              type="date"
              className="rounded-md"
              value={engagementDraft.engagementDate}
              onChange={(e) =>
                setEngagementDraft({ ...engagementDraft, engagementDate: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Guardian</Label>
            <Input
              className="rounded-md"
              value={engagementDraft.guardianName}
              onChange={(e) => setEngagementDraft({ ...engagementDraft, guardianName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Mode</Label>
            <Select
              value={engagementDraft.mode}
              onValueChange={(v) => setEngagementDraft({ ...engagementDraft, mode: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                {ENGAGEMENT_MODE_OPTIONS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Subject</Label>
            <Input
              className="rounded-md"
              value={engagementDraft.subject}
              onChange={(e) => setEngagementDraft({ ...engagementDraft, subject: e.target.value })}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Summary</Label>
            <Input
              className="rounded-md"
              value={engagementDraft.summary}
              onChange={(e) => setEngagementDraft({ ...engagementDraft, summary: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Outcome</Label>
            <Select
              value={engagementDraft.outcomeStatus}
              onValueChange={(v) => setEngagementDraft({ ...engagementDraft, outcomeStatus: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENGAGEMENT_OUTCOME_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Follow-up Date</Label>
            <Input
              type="date"
              className="rounded-md"
              value={engagementDraft.followUpDate}
              onChange={(e) =>
                setEngagementDraft({ ...engagementDraft, followUpDate: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Conducted By</Label>
            <Input
              className="rounded-md"
              value={engagementDraft.conductedBy}
              onChange={(e) => setEngagementDraft({ ...engagementDraft, conductedBy: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Academic Year</Label>
            <Select
              value={engagementDraft.academicYearKey}
              onValueChange={(v) => setEngagementDraft({ ...engagementDraft, academicYearKey: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y.academicYearKey} value={y.academicYearKey}>
                    {y.yearName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>

      <AlertDialog
        open={!!deleteEngagementTarget}
        onOpenChange={(v) => !v && setDeleteEngagementTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Engagement Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes this record from the student's parent engagement timeline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteEngagement();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FormDialog
        open={portfolioOpen}
        onOpenChange={setPortfolioOpen}
        title={portfolioDraft.studentPortfolioItemKey ? "Edit Portfolio Item" : "Add Portfolio Item"}
        description="Projects, artwork, digital badges and certificates that make up the student's digital portfolio."
        submitLabel="Save Item"
        onSubmit={savePortfolio}
        submitting={portfolioSaving}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label required>Type</Label>
            <Select
              value={portfolioDraft.itemType}
              onValueChange={(v) => setPortfolioDraft({ ...portfolioDraft, itemType: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PORTFOLIO_ITEM_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label required>Title</Label>
            <Input
              className="rounded-md"
              value={portfolioDraft.title}
              onChange={(e) => setPortfolioDraft({ ...portfolioDraft, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label required>Date</Label>
            <Input
              type="date"
              className="rounded-md"
              value={portfolioDraft.itemDate}
              onChange={(e) => setPortfolioDraft({ ...portfolioDraft, itemDate: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Issued By</Label>
            <Input
              className="rounded-md"
              placeholder="e.g. Coursera, School Science Fair"
              value={portfolioDraft.issuedBy}
              onChange={(e) => setPortfolioDraft({ ...portfolioDraft, issuedBy: e.target.value })}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Description</Label>
            <Input
              className="rounded-md"
              value={portfolioDraft.description}
              onChange={(e) => setPortfolioDraft({ ...portfolioDraft, description: e.target.value })}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Media URL</Label>
            <Input
              className="rounded-md"
              placeholder="Link to image, document or project"
              value={portfolioDraft.mediaUrl}
              onChange={(e) => setPortfolioDraft({ ...portfolioDraft, mediaUrl: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Academic Year</Label>
            <Select
              value={portfolioDraft.academicYearKey}
              onValueChange={(v) => setPortfolioDraft({ ...portfolioDraft, academicYearKey: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y.academicYearKey} value={y.academicYearKey}>
                    {y.yearName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={portfolioDraft.isFeatured}
                onCheckedChange={(v) => setPortfolioDraft({ ...portfolioDraft, isFeatured: !!v })}
              />{" "}
              Featured
            </label>
          </div>
        </div>
      </FormDialog>

      <AlertDialog
        open={!!deletePortfolioTarget}
        onOpenChange={(v) => !v && setDeletePortfolioTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Portfolio Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes "{deletePortfolioTarget?.title}" from this student's portfolio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deletePortfolio();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FormDialog
        open={talentOpen}
        onOpenChange={setTalentOpen}
        title={talentDraft.studentTalentRecordKey ? "Edit Talent Record" : "Add Talent Record"}
        description="Identified talent and scholarship recommendations, for talent-nurturing and admissions decisions."
        submitLabel="Save Record"
        onSubmit={saveTalent}
        submitting={talentSaving}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label required>Talent Area</Label>
            <Select
              value={talentDraft.talentArea}
              onValueChange={(v) => setTalentDraft({ ...talentDraft, talentArea: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TALENT_AREA_OPTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Proficiency Level</Label>
            <Select
              value={talentDraft.proficiencyLevel}
              onValueChange={(v) => setTalentDraft({ ...talentDraft, proficiencyLevel: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROFICIENCY_LEVEL_OPTIONS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label required>Identified Date</Label>
            <Input
              type="date"
              className="rounded-md"
              value={talentDraft.identifiedDate}
              onChange={(e) => setTalentDraft({ ...talentDraft, identifiedDate: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Identified By</Label>
            <Input
              className="rounded-md"
              value={talentDraft.identifiedBy}
              onChange={(e) => setTalentDraft({ ...talentDraft, identifiedBy: e.target.value })}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Evidence</Label>
            <Input
              className="rounded-md"
              value={talentDraft.evidence}
              onChange={(e) => setTalentDraft({ ...talentDraft, evidence: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Academic Year</Label>
            <Select
              value={talentDraft.academicYearKey}
              onValueChange={(v) => setTalentDraft({ ...talentDraft, academicYearKey: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y.academicYearKey} value={y.academicYearKey}>
                    {y.yearName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={talentDraft.scholarshipRecommended}
                onCheckedChange={(v) =>
                  setTalentDraft({ ...talentDraft, scholarshipRecommended: !!v })
                }
              />{" "}
              Scholarship Recommended
            </label>
          </div>
          {talentDraft.scholarshipRecommended && (
            <div className="col-span-2 space-y-1.5">
              <Label>Scholarship Notes</Label>
              <Input
                className="rounded-md"
                value={talentDraft.scholarshipDetails}
                onChange={(e) =>
                  setTalentDraft({ ...talentDraft, scholarshipDetails: e.target.value })
                }
              />
            </div>
          )}
          <div className="col-span-2 space-y-1.5">
            <Label>Notes</Label>
            <Input
              className="rounded-md"
              value={talentDraft.notes}
              onChange={(e) => setTalentDraft({ ...talentDraft, notes: e.target.value })}
            />
          </div>
        </div>
      </FormDialog>

      <AlertDialog
        open={!!deleteTalentTarget}
        onOpenChange={(v) => !v && setDeleteTalentTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Talent Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes this "{deleteTalentTarget?.talentArea.replace(/_/g, " ")}" record from
              this student's talent history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteTalent();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FormDialog
        open={careerOpen}
        onOpenChange={setCareerOpen}
        title={careerDraft.studentCareerReadinessRecordKey ? "Edit Career Record" : "Add Career Record"}
        description="Career interests, assessments, guidance sessions and mentorship activities for long-term planning."
        submitLabel="Save Record"
        onSubmit={saveCareer}
        submitting={careerSaving}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label required>Type</Label>
            <Select
              value={careerDraft.recordType}
              onValueChange={(v) => setCareerDraft({ ...careerDraft, recordType: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAREER_RECORD_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label required>Title</Label>
            <Input
              className="rounded-md"
              placeholder="e.g. Interest in Engineering, JEE Main Prep"
              value={careerDraft.title}
              onChange={(e) => setCareerDraft({ ...careerDraft, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label required>Date</Label>
            <Input
              type="date"
              className="rounded-md"
              value={careerDraft.recordDate}
              onChange={(e) => setCareerDraft({ ...careerDraft, recordDate: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={careerDraft.status}
              onValueChange={(v) => setCareerDraft({ ...careerDraft, status: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAREER_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Counsellor</Label>
            <Input
              className="rounded-md"
              value={careerDraft.counsellorName}
              onChange={(e) => setCareerDraft({ ...careerDraft, counsellorName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Target Institution</Label>
            <Input
              className="rounded-md"
              value={careerDraft.targetInstitution}
              onChange={(e) =>
                setCareerDraft({ ...careerDraft, targetInstitution: e.target.value })
              }
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Details</Label>
            <Input
              className="rounded-md"
              value={careerDraft.details}
              onChange={(e) => setCareerDraft({ ...careerDraft, details: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Academic Year</Label>
            <Select
              value={careerDraft.academicYearKey}
              onValueChange={(v) => setCareerDraft({ ...careerDraft, academicYearKey: v })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y.academicYearKey} value={y.academicYearKey}>
                    {y.yearName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Notes</Label>
            <Input
              className="rounded-md"
              value={careerDraft.notes}
              onChange={(e) => setCareerDraft({ ...careerDraft, notes: e.target.value })}
            />
          </div>
        </div>
      </FormDialog>

      <AlertDialog
        open={!!deleteCareerTarget}
        onOpenChange={(v) => !v && setDeleteCareerTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Career Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes "{deleteCareerTarget?.title}" from this student's career readiness
              history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteCareer();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FormDialog
        open={alumniOpen}
        onOpenChange={setAlumniOpen}
        title={alumniRecord ? "Edit Alumni Record" : "Add Alumni Record"}
        description="Graduation, higher education, career and institution-engagement details for the alumni relationship."
        submitLabel="Save Record"
        onSubmit={saveAlumni}
        submitting={alumniSaving}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Graduation Date</Label>
            <Input
              type="date"
              className="rounded-md"
              value={alumniDraft.graduationDate}
              onChange={(e) => setAlumniDraft({ ...alumniDraft, graduationDate: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Graduating Year</Label>
            <Select
              value={alumniDraft.graduationAcademicYearKey}
              onValueChange={(v) =>
                setAlumniDraft({ ...alumniDraft, graduationAcademicYearKey: v })
              }
            >
              <SelectTrigger className="rounded-md">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y.academicYearKey} value={y.academicYearKey}>
                    {y.yearName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Higher Education Institution</Label>
            <Input
              className="rounded-md"
              value={alumniDraft.higherEducationInstitution}
              onChange={(e) =>
                setAlumniDraft({ ...alumniDraft, higherEducationInstitution: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Course of Study</Label>
            <Input
              className="rounded-md"
              value={alumniDraft.courseOfStudy}
              onChange={(e) => setAlumniDraft({ ...alumniDraft, courseOfStudy: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Current Occupation</Label>
            <Input
              className="rounded-md"
              value={alumniDraft.currentOccupation}
              onChange={(e) =>
                setAlumniDraft({ ...alumniDraft, currentOccupation: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Current Employer</Label>
            <Input
              className="rounded-md"
              value={alumniDraft.currentEmployer}
              onChange={(e) => setAlumniDraft({ ...alumniDraft, currentEmployer: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Contact Email</Label>
            <Input
              type="email"
              className="rounded-md"
              value={alumniDraft.contactEmail}
              onChange={(e) => setAlumniDraft({ ...alumniDraft, contactEmail: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Contact Mobile</Label>
            <Input
              className="rounded-md"
              value={alumniDraft.contactMobile}
              onChange={(e) => setAlumniDraft({ ...alumniDraft, contactMobile: e.target.value })}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>LinkedIn URL</Label>
            <Input
              className="rounded-md"
              value={alumniDraft.linkedInUrl}
              onChange={(e) => setAlumniDraft({ ...alumniDraft, linkedInUrl: e.target.value })}
            />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={alumniDraft.mentorshipParticipation}
                onCheckedChange={(v) =>
                  setAlumniDraft({ ...alumniDraft, mentorshipParticipation: !!v })
                }
              />{" "}
              Participates in Mentorship
            </label>
          </div>
          {alumniDraft.mentorshipParticipation && (
            <div className="col-span-2 space-y-1.5">
              <Label>Mentorship Details</Label>
              <Input
                className="rounded-md"
                value={alumniDraft.mentorshipDetails}
                onChange={(e) =>
                  setAlumniDraft({ ...alumniDraft, mentorshipDetails: e.target.value })
                }
              />
            </div>
          )}
          <div className="col-span-2 space-y-1.5">
            <Label>Institution Engagement Notes</Label>
            <Input
              className="rounded-md"
              placeholder="Alumni events attended, guest lectures, donations, etc."
              value={alumniDraft.institutionEngagementNotes}
              onChange={(e) =>
                setAlumniDraft({ ...alumniDraft, institutionEngagementNotes: e.target.value })
              }
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Notes</Label>
            <Input
              className="rounded-md"
              value={alumniDraft.notes}
              onChange={(e) => setAlumniDraft({ ...alumniDraft, notes: e.target.value })}
            />
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={deleteAlumniConfirmOpen} onOpenChange={setDeleteAlumniConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Alumni Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the alumni relationship record for this student.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteAlumni();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteGuardianTarget}
        onOpenChange={(v) => !v && setDeleteGuardianTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Guardian?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {deleteGuardianTarget?.fullName} from this student's guardian list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteGuardian();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteDocumentTarget}
        onOpenChange={(v) => !v && setDeleteDocumentTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes {deleteDocumentTarget?.fileName} from this student's records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={documentDeleting}
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteDocument();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {documentDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!rejectCertificateTarget}
        onOpenChange={(v) => !v && setRejectCertificateTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Certificate Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Rejects the {rejectCertificateTarget?.certificateNumber} request. A reason is required and will be
              shown on the request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="Reason for rejection"
            className="rounded-md"
            value={rejectCertificateReason}
            onChange={(e) => setRejectCertificateReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={certificateActioningId === rejectCertificateTarget?.studentCertificateKey}>
              Keep Request
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={certificateActioningId === rejectCertificateTarget?.studentCertificateKey}
              onClick={(e) => {
                e.preventDefault();
                confirmRejectCertificate();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {certificateActioningId === rejectCertificateTarget?.studentCertificateKey ? "Rejecting..." : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FormDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        title="Change Student Status"
        description="Moves the student out of ENROLLED — exits are recorded here, never as a deletion."
        submitLabel={statusSaving ? "Saving..." : "Update Status"}
        onSubmit={saveStatus}
        submitting={statusSaving}
      >
        <div className="space-y-1.5">
          <Label required>Status</Label>
          <Select value={statusDraft} onValueChange={setStatusDraft}>
            <SelectTrigger className="rounded-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(STATUS_STYLES).map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FormDialog>
    </div>
  );
}

const TONE_STYLES: Record<string, string> = {
  primary: "bg-primary/15 text-primary",
  info: "bg-info/15 text-info",
  success: "bg-success/15 text-success",
  warning: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  destructive: "bg-destructive/15 text-destructive",
  purple: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
};

function ViewSection({
  title,
  icon: Icon,
  tone = "primary",
  rightSlot,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  tone?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="relative overflow-hidden rounded-md border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_20px_-6px_rgba(16,24,40,0.06)] transition-shadow hover:shadow-[0_2px_4px_rgba(16,24,40,0.06),0_12px_28px_-6px_rgba(16,24,40,0.1)]"
    >
      <h3 className="mb-4 flex items-center gap-2.5 text-sm font-semibold text-foreground">
        {Icon && (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              TONE_STYLES[tone],
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
        {title}
      </h3>
      {rightSlot ? (
        <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 self-start">{children}</div>
          {rightSlot}
        </div>
      ) : (
        <>
          <div className="relative grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>
          {Icon && (
            <div
              className={cn(
                "pointer-events-none absolute -bottom-4 -right-4 flex h-20 w-20 items-center justify-center rounded-full opacity-40",
                TONE_STYLES[tone],
              )}
            >
              <Icon className="h-8 w-8" />
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

function StatTile({
  icon: Icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  tone: string;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.02 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "flex items-center gap-3 rounded-2xl p-3.5",
        TONE_STYLES[tone].split(" ")[0],
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card shadow-sm",
          TONE_STYLES[tone].split(" ")[1],
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-xs font-medium text-muted-foreground">{label}</div>
        <div className="truncate text-lg font-semibold leading-tight text-foreground">{value}</div>
        <div className="truncate text-[11px] text-muted-foreground">{hint}</div>
      </div>
    </motion.div>
  );
}

function ViewRow({
  label,
  value,
  colSpan,
}: {
  label: string;
  value: React.ReactNode;
  colSpan?: boolean;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className={colSpan ? "col-span-2" : undefined}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
