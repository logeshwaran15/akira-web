import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { BackButton } from "@/components/erp/BackButton";
import { PageLoader } from "@/components/erp/Spinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Pencil,
  BookMarked,
  Mail,
  Phone,
  Building2,
  Users,
  Calendar,
  IdCard,
  GraduationCap,
  Briefcase,
  Layers,
  ShieldCheck,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { useFormatDate } from "@/hooks/use-tenant-setting";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff-detail")({
  validateSearch: (search: Record<string, unknown>): { id: string } => ({
    id: typeof search.id === "string" ? search.id : "",
  }),
  head: () => ({
    meta: [
      { title: "Staff Details — Akira School ERP" },
      { name: "description", content: "Full profile details for a staff member." },
    ],
  }),
  component: StaffDetailPage,
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
  reportsToUserKey: string | null;
  reportsToName: string | null;
  joiningDate: string | null;
  employmentType: string;
  maxWeeklyPeriods: number;
  isActive: boolean;
};

type Subject = { subjectKey: string; subjectName: string };

const DESIGNATION_STYLES: Record<string, string> = {
  PGT: "bg-info/15 text-info",
  TGT: "bg-success/15 text-success",
  PRT: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  PRINCIPAL: "bg-primary/15 text-primary",
  VICE_PRINCIPAL: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
  COORDINATOR: "bg-[oklch(0.55_0.1_200)]/15 text-[oklch(0.4_0.12_200)]",
};

function StaffDetailPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const formatDate = useFormatDate();

  const [staff, setStaff] = useState<StaffRow | null>(null);
  const [expertise, setExpertise] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiFetch("/api/StaffProfile")
      .then(async (all: StaffRow[]) => {
        const found = all.find((s) => s.staffProfileKey === id) ?? null;
        setStaff(found);
        if (found) {
          try {
            const allSubjects: Subject[] = await apiFetch("/api/Subject");
            const keys: { subjectKey: string }[] = await apiFetch(`/api/StaffProfile/${found.akiraUserKey}/expertise`);
            const keySet = new Set(keys.map((k) => k.subjectKey));
            setExpertise(allSubjects.filter((s) => keySet.has(s.subjectKey)));
          } catch {
            setExpertise([]);
          }
        }
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load staff profile"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <PageLoader />;
  }

  if (!staff) {
    return (
      <div>
        <BackButton to="/staff-setup" />
        <p className="text-sm text-muted-foreground">Staff profile not found.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BackButton to="/staff-setup" className="mb-0" />
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link to="/staff-setup" className="hover:text-foreground">
              Staff
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">Staff Details</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-md"
            onClick={() => navigate({ to: "/staff-setup" })}
          >
            <BookMarked className="h-3.5 w-3.5" /> Manage Expertise
          </Button>
          <Button
            size="sm"
            className="h-9 gap-1.5 rounded-md bg-gradient-to-r from-primary to-primary/80 shadow-[0_4px_12px_-2px_rgba(255,107,0,0.35)] transition-transform hover:scale-[1.02] hover:from-primary hover:to-primary"
            onClick={() => navigate({ to: "/staff-edit", search: { id: staff.staffProfileKey } })}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative mb-5 overflow-hidden rounded-md border border-border bg-gradient-to-br from-primary/15 via-primary/5 to-background p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-4px_rgba(16,24,40,0.06)]"
      >
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-background bg-primary/15 text-primary shadow-[0_2px_8px_rgba(16,24,40,0.08)]">
            {staff.profileImagePath ? (
              <img
                src={`${API_BASE_URL}${staff.profileImagePath}`}
                alt={staff.userName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User className="h-8 w-8" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-semibold text-foreground">{staff.userName}</h1>
            <div className="mt-0.5 font-mono text-xs text-muted-foreground">{staff.employeeId}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge
                className={cn(
                  "rounded-md border-0",
                  DESIGNATION_STYLES[staff.designation] ?? "bg-muted text-muted-foreground",
                )}
              >
                {staff.designation}
              </Badge>
              <Badge variant={staff.isActive ? "success" : "secondary"} className="gap-1">
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", staff.isActive ? "bg-success" : "bg-muted-foreground")}
                />
                {staff.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DetailCard icon={User} title="Personal & Employment" subtitle="Basic information and employment details">
          <DetailRow icon={IdCard} label="Employee ID" value={staff.employeeId} />
          <DetailRow icon={GraduationCap} label="Qualification" value={staff.qualification ?? "—"} />
          <DetailRow
            icon={Calendar}
            label="Joining Date"
            value={staff.joiningDate ? formatDate(staff.joiningDate) : "—"}
          />
          <DetailRow icon={Briefcase} label="Employment Type" value={staff.employmentType} />
        </DetailCard>

        <DetailCard icon={Mail} title="Contact Information" subtitle="Reach out through the following details" tone="success">
          <DetailRow icon={Mail} label="Email" value={staff.email} tone="success" />
          <DetailRow icon={Phone} label="Mobile" value={staff.mobileNo ?? "—"} tone="success" />
        </DetailCard>

        <DetailCard
          icon={Users}
          title="Reporting & Work Details"
          subtitle="Department, role and reporting structure"
          tone="purple"
        >
          <DetailRow icon={Building2} label="Department" value={staff.departmentName ?? "—"} tone="purple" />
          <DetailRow icon={ShieldCheck} label="Role" value={staff.roleName ?? "—"} tone="purple" />
          <DetailRow icon={Users} label="Reports To" value={staff.reportsToName ?? "—"} tone="purple" />
          <DetailRow icon={Layers} label="Max Periods / Week" value={String(staff.maxWeeklyPeriods)} tone="purple" />
        </DetailCard>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[oklch(0.75_0.17_10)]/15 text-[oklch(0.55_0.2_10)]">
            <BookMarked className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Subject Expertise</div>
            <div className="text-xs text-muted-foreground">List of assigned subject expertise</div>
          </div>
        </div>

        {expertise.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <BookMarked className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No subject expertise assigned yet.</p>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {expertise.map((s) => (
              <Badge key={s.subjectKey} variant="outline" className="rounded-md">
                {s.subjectName}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const TONE_STYLES: Record<string, { icon: string; iconWrap: string }> = {
  primary: { icon: "text-primary", iconWrap: "bg-primary/15" },
  success: { icon: "text-success", iconWrap: "bg-success/15" },
  purple: { icon: "text-[oklch(0.55_0.2_300)]", iconWrap: "bg-[oklch(0.75_0.17_300)]/15" },
};

function DetailCard({
  icon: Icon,
  title,
  subtitle,
  tone = "primary",
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  tone?: "primary" | "success" | "purple";
  children: ReactNode;
}) {
  const t = TONE_STYLES[tone];
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-2.5">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", t.iconWrap, t.icon)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        </div>
      </div>
      <div className="mt-4 space-y-3.5">{children}</div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  tone = "primary",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "primary" | "success" | "purple";
}) {
  const t = TONE_STYLES[tone];
  return (
    <div className="flex items-center gap-2.5">
      <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", t.iconWrap, t.icon)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}
