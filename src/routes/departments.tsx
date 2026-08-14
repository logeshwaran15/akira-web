import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/departments")({
  head: () => ({
    meta: [
      { title: "Departments — Akira School ERP" },
      { name: "description", content: "Manage your school's departments and HOD assignments." },
    ],
  }),
  component: DepartmentsPage,
});

type DepartmentRow = {
  departmentKey: string;
  departmentName: string;
  departmentCode: string;
  hodUserKey: string | null;
  hodName: string | null;
  isActive: boolean;
};

type DepartmentDraft = { departmentKey: string; departmentName: string; departmentCode: string; hodUserKey: string };
type UserOption = { akiraUserKey: string; userName: string };

const empty: DepartmentDraft = { departmentKey: "", departmentName: "", departmentCode: "", hodUserKey: "" };

function DepartmentsPage() {
  const [rows, setRows] = useState<DepartmentRow[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentRow | null>(null);
  const [draft, setDraft] = useState<DepartmentDraft>(empty);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentRow | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([apiFetch("/api/Department"), apiFetch("/api/User")])
      .then(([d, u]) => { setRows(d); setUsers(u); })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load departments"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => { setEditing(null); setDraft(empty); setOpen(true); };
  const openEdit = (r: DepartmentRow) => {
    setEditing(r);
    setDraft({ departmentKey: r.departmentKey, departmentName: r.departmentName, departmentCode: r.departmentCode, hodUserKey: r.hodUserKey ?? "" });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        departmentName: draft.departmentName,
        departmentCode: draft.departmentCode.toUpperCase(),
        hodUserKey: draft.hodUserKey || null,
      };

      if (editing) {
        await apiFetch(`/api/Department/${editing.departmentKey}`, {
          method: "PUT",
          body: JSON.stringify({ departmentKey: editing.departmentKey, ...body, isActive: editing.isActive }),
        });
        toast.success("Department updated");
      } else {
        await apiFetch("/api/Department", { method: "POST", body: JSON.stringify(body) });
        toast.success("Department created");
      }

      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save department");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/Department/${deleteTarget.departmentKey}`, { method: "DELETE" });
      toast.success("Department deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete department");
    }
  };

  const columns: Column<DepartmentRow>[] = [
    {
      key: "departmentName", header: "Department", sortable: true,
      accessor: (r) => (
        <div>
          <div className="font-medium">{r.departmentName}</div>
          <div className="font-mono text-xs text-muted-foreground">{r.departmentCode}</div>
        </div>
      ),
    },
    { key: "hodName", header: "Head of Department", accessor: (r) => r.hodName ?? <span className="text-muted-foreground">Unassigned</span> },
    {
      key: "isActive", header: "Status",
      accessor: (r) => (
        <Badge className={cn("rounded-md border-0", r.isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
          {r.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions", header: "Actions",
      accessor: (r) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => openEdit(r)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive" onClick={() => setDeleteTarget(r)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Departments"
        breadcrumbs={[{ label: "School Setup" }, { label: "Departments" }]}
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> New Department
          </Button>
        }
      />

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.departmentKey}
        selectable
        storageKey="departments"
        searchPlaceholder="Search departments..."
        searchFields={(r) => `${r.departmentName} ${r.departmentCode}`}
        emptyMessage={loading ? "Loading departments..." : "No departments yet."}
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Department" : "New Department"}
        submitLabel={editing ? "Save Changes" : "Create Department"}
        onSubmit={save}
        submitting={saving}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Department Name</Label>
            <Input value={draft.departmentName} onChange={(e) => setDraft({ ...draft, departmentName: e.target.value })} placeholder="Mathematics" className="rounded-md" required />
          </div>
          <div className="space-y-1.5">
            <Label required>Department Code</Label>
            <Input value={draft.departmentCode} onChange={(e) => setDraft({ ...draft, departmentCode: e.target.value.toUpperCase() })} placeholder="MATH" className="rounded-md" required />
          </div>
          <div className="space-y-1.5">
            <Label>Head of Department</Label>
            <Select value={draft.hodUserKey || "none"} onValueChange={(v) => setDraft({ ...draft, hodUserKey: v === "none" ? "" : v })}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose a staff member" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {users.map((u) => <SelectItem key={u.akiraUserKey} value={u.akiraUserKey}>{u.userName}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">A staff member can only lead one department.</p>
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.departmentName}"?</AlertDialogTitle>
            <AlertDialogDescription>Blocked if it still has subjects assigned to it. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); confirmDelete(); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
