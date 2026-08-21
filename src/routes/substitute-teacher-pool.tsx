import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/erp/DataTable";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, UserCog } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/substitute-teacher-pool")({
  head: () => ({
    meta: [
      { title: "Substitute Teacher Pool — Akira School ERP" },
      { name: "description", content: "Pre-approved backup teachers per subject or department." },
    ],
  }),
  component: SubstituteTeacherPoolPage,
});

type UserOption = { akiraUserKey: string; userName: string };
type SubjectOption = { subjectKey: string; subjectName: string };
type DepartmentOption = { departmentKey: string; departmentName: string };
type PoolRow = {
  substituteTeacherPoolKey: string;
  subjectKey: string | null;
  subjectName: string | null;
  departmentKey: string | null;
  departmentName: string | null;
  teacherUserKey: string;
  teacherName: string | null;
  isActive: boolean;
};

const emptyDraft = { scope: "subject" as "subject" | "department", subjectKey: "", departmentKey: "", teacherUserKey: "" };

function SubstituteTeacherPoolPage() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [pool, setPool] = useState<PoolRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PoolRow | null>(null);

  const load = () => {
    setLoading(true);
    apiFetch("/api/SubstituteTeacherPool")
      .then((d: PoolRow[]) => setPool(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load substitute pool"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    Promise.all([apiFetch("/api/User"), apiFetch("/api/Subject"), apiFetch("/api/Department")])
      .then(([u, s, d]) => {
        setUsers(u);
        setSubjects(s);
        setDepartments(d);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load setup data"));
    load();
  }, []);

  const openNew = () => {
    setDraft(emptyDraft);
    setOpen(true);
  };

  const save = async () => {
    if (!draft.teacherUserKey) {
      toast.error("Choose a teacher.");
      return;
    }
    if (draft.scope === "subject" && !draft.subjectKey) {
      toast.error("Choose a subject.");
      return;
    }
    if (draft.scope === "department" && !draft.departmentKey) {
      toast.error("Choose a department.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/api/SubstituteTeacherPool", {
        method: "POST",
        body: JSON.stringify({
          subjectKey: draft.scope === "subject" ? draft.subjectKey : null,
          departmentKey: draft.scope === "department" ? draft.departmentKey : null,
          teacherUserKey: draft.teacherUserKey,
        }),
      });
      toast.success("Added to substitute pool");
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add substitute");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: PoolRow, isActive: boolean) => {
    try {
      await apiFetch(`/api/SubstituteTeacherPool/${row.substituteTeacherPoolKey}/toggle-active`, {
        method: "PUT",
        body: JSON.stringify(isActive),
      });
      setPool((prev) => prev.map((p) => (p.substituteTeacherPoolKey === row.substituteTeacherPoolKey ? { ...p, isActive } : p)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/SubstituteTeacherPool/${deleteTarget.substituteTeacherPoolKey}`, { method: "DELETE" });
      toast.success("Removed from substitute pool");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    }
  };

  const columns: Column<PoolRow>[] = [
    { key: "teacherName", header: "Teacher", sortable: true, accessor: (p) => <span className="font-medium">{p.teacherName ?? "—"}</span> },
    {
      key: "scope",
      header: "Scope",
      sortable: true,
      sortValue: (p) => p.subjectName ?? p.departmentName ?? "",
      accessor: (p) =>
        p.subjectName ? (
          <Badge variant="outline" className="rounded-md">{p.subjectName}</Badge>
        ) : (
          <Badge variant="outline" className="rounded-md">{p.departmentName ?? "—"} (dept)</Badge>
        ),
    },
    {
      key: "isActive",
      header: "Active",
      sortable: true,
      accessor: (p) => <Switch checked={p.isActive} onCheckedChange={(v) => toggleActive(p, v)} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      accessor: (p) => (
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive" onClick={() => setDeleteTarget(p)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Substitute Teacher Pool"
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> Add Substitute
          </Button>
        }
      />

      <div className="mb-4 flex items-start gap-2 rounded-md border border-info/30 bg-info/10 px-4 py-2.5 text-sm text-info">
        <UserCog className="mt-0.5 h-4 w-4 shrink-0" />
        <span>A pre-approved backup teacher, scoped to either one subject or one department, ready before anyone actually goes absent.</span>
      </div>

      <DataTable
        data={pool}
        columns={columns}
        rowKey={(p) => p.substituteTeacherPoolKey}
        searchPlaceholder="Search substitutes..."
        searchFields={(p) => `${p.teacherName ?? ""} ${p.subjectName ?? ""} ${p.departmentName ?? ""}`}
        emptyMessage={loading ? "Loading..." : "No substitutes configured yet."}
        storageKey="substitute-teacher-pool"
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Add Substitute"
        submitLabel="Add"
        onSubmit={save}
        submitting={saving}
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Teacher</Label>
            <Select value={draft.teacherUserKey} onValueChange={(v) => setDraft({ ...draft, teacherUserKey: v })}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose a teacher" /></SelectTrigger>
              <SelectContent>
                {users.map((u) => <SelectItem key={u.akiraUserKey} value={u.akiraUserKey}>{u.userName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label required>Scope</Label>
            <Select value={draft.scope} onValueChange={(v) => setDraft({ ...draft, scope: v as "subject" | "department" })}>
              <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="subject">One Subject</SelectItem>
                <SelectItem value="department">One Department</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {draft.scope === "subject" ? (
            <div className="space-y-1.5">
              <Label required>Subject</Label>
              <Select value={draft.subjectKey} onValueChange={(v) => setDraft({ ...draft, subjectKey: v })}>
                <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose a subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => <SelectItem key={s.subjectKey} value={s.subjectKey}>{s.subjectName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label required>Department</Label>
              <Select value={draft.departmentKey} onValueChange={(v) => setDraft({ ...draft, departmentKey: v })}>
                <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose a department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d.departmentKey} value={d.departmentKey}>{d.departmentName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{deleteTarget?.teacherName}" from the substitute pool?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); confirmDelete(); }}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
