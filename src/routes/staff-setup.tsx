import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/erp/DataTable";
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
import { Plus, Pencil, Trash2, BookMarked, User, Eye } from "lucide-react";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff-setup")({
  head: () => ({
    meta: [
      { title: "Staff List — Akira School ERP" },
      {
        name: "description",
        content: "Manage staff profiles, contact details and subject expertise.",
      },
    ],
  }),
  component: StaffSetupPage,
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
type Department = { departmentKey: string; departmentName: string };
type Subject = { subjectKey: string; subjectName: string };

const DESIGNATION_STYLES: Record<string, string> = {
  PGT: "bg-info/15 text-info",
  TGT: "bg-success/15 text-success",
  PRT: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  PRINCIPAL: "bg-primary/15 text-primary",
  VICE_PRINCIPAL: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
  COORDINATOR: "bg-[oklch(0.55_0.1_200)]/15 text-[oklch(0.4_0.12_200)]",
};

function StaffSetupPage() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<StaffRow | null>(null);

  const [expertiseFor, setExpertiseFor] = useState<StaffRow | null>(null);
  const [expertiseKeys, setExpertiseKeys] = useState<Set<string>>(new Set());
  const [expertiseSaving, setExpertiseSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/StaffProfile"),
      apiFetch("/api/Department"),
      apiFetch("/api/Subject"),
    ])
      .then(([sp, d, subj]) => {
        setStaff(sp);
        setDepartments(d);
        setSubjects(subj);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load staff"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => {
    navigate({ to: "/staff-add" });
  };
  const openEdit = (s: StaffRow) => {
    navigate({ to: "/staff-edit", search: { id: s.staffProfileKey } });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/StaffProfile/${deleteTarget.staffProfileKey}`, { method: "DELETE" });
      toast.success("Staff profile removed");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove staff profile");
    }
  };

  const openExpertise = (s: StaffRow) => {
    setExpertiseFor(s);
    apiFetch(`/api/StaffProfile/${s.akiraUserKey}/expertise`)
      .then((d: { subjectKey: string }[]) => setExpertiseKeys(new Set(d.map((x) => x.subjectKey))))
      .catch(() => setExpertiseKeys(new Set()));
  };

  const toggleExpertise = (key: string) => {
    setExpertiseKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const saveExpertise = async () => {
    if (!expertiseFor) return;
    setExpertiseSaving(true);
    try {
      await apiFetch("/api/StaffProfile/expertise", {
        method: "PUT",
        body: JSON.stringify({
          akiraUserKey: expertiseFor.akiraUserKey,
          subjectKeys: Array.from(expertiseKeys),
        }),
      });
      toast.success("Subject expertise saved");
      setExpertiseFor(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save expertise");
    } finally {
      setExpertiseSaving(false);
    }
  };

  const staffColumns: Column<StaffRow>[] = [
    {
      key: "userName",
      header: "Staff",
      sortable: true,
      accessor: (s) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-primary">
            {s.profileImagePath ? (
              <img
                src={`${API_BASE_URL}${s.profileImagePath}`}
                alt={s.userName}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-4 w-4" />
            )}
          </div>
          <div>
            <div className="font-medium">{s.userName}</div>
            <div className="font-mono text-xs text-muted-foreground">{s.employeeId}</div>
          </div>
        </div>
      ),
    },
    {
      key: "designation",
      header: "Designation",
      sortable: true,
      accessor: (s) => (
        <Badge
          className={cn(
            "rounded-md border-0",
            DESIGNATION_STYLES[s.designation] ?? "bg-muted text-muted-foreground",
          )}
        >
          {s.designation}
        </Badge>
      ),
    },
    {
      key: "departmentName",
      header: "Department",
      sortable: true,
      accessor: (s) => s.departmentName ?? "—",
    },
    {
      key: "reportsToName",
      header: "Reports To",
      sortable: true,
      accessor: (s) => s.reportsToName ?? "—",
    },
    { key: "employmentType", header: "Employment", sortable: true },
    { key: "maxWeeklyPeriods", header: "Max Periods/wk", sortable: true },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      accessor: (s) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md"
            onClick={() => navigate({ to: "/staff-detail", search: { id: s.staffProfileKey } })}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-md"
            onClick={() => openExpertise(s)}
          >
            <BookMarked className="h-3.5 w-3.5" /> Expertise
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md text-purple-600 hover:text-purple-700"
            onClick={() => openEdit(s)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md text-destructive"
            onClick={() => setDeleteTarget(s)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Staff List"
        breadcrumbs={[{ label: "Staff" }, { label: "Staff List" }]}
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> New Staff Member
          </Button>
        }
      />

      <DataTable
        data={staff}
        columns={staffColumns}
        rowKey={(s) => s.staffProfileKey}
        searchPlaceholder="Search staff by name, employee ID, designation..."
        searchFields={(s) =>
          `${s.userName} ${s.employeeId} ${s.designation} ${s.departmentName ?? ""} ${s.reportsToName ?? ""} ${s.email}`
        }
        storageKey="staff-list"
        emptyMessage={loading ? "Loading..." : "No staff profiles yet."}
      />

      {/* Expertise dialog */}
      <FormDialog
        open={!!expertiseFor}
        onOpenChange={(v) => !v && setExpertiseFor(null)}
        title={`Subject Expertise — ${expertiseFor?.userName ?? ""}`}
        submitLabel="Save"
        onSubmit={saveExpertise}
        submitting={expertiseSaving}
        size="md"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {subjects.map((s) => (
            <label key={s.subjectKey} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={expertiseKeys.has(s.subjectKey)}
                onCheckedChange={() => toggleExpertise(s.subjectKey)}
              />
              {s.subjectName}
            </label>
          ))}
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove staff profile for "{deleteTarget?.userName}"?
            </AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
