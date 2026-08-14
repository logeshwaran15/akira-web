import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/roles")({
  head: () => ({
    meta: [
      { title: "Roles — Akira School ERP" },
      { name: "description", content: "Manage roles for your school." },
    ],
  }),
  component: RolesPage,
});

type RoleRow = {
  akiraRoleKey: string;
  akiraTenantKey: string;
  roleCode: string;
  roleName: string;
  description: string | null;
  isActive: boolean;
  createdOn: string;
};

type RoleDraft = {
  akiraRoleKey: string;
  roleCode: string;
  roleName: string;
  description: string;
  isActive: boolean;
};

const empty: RoleDraft = { akiraRoleKey: "", roleCode: "", roleName: "", description: "", isActive: true };

function RolesPage() {
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [draft, setDraft] = useState<RoleDraft>(empty);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoleRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch("/api/Role/manage")
      .then((data: RoleRow[]) => setRows(data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load roles"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => { setEditing(null); setDraft(empty); setOpen(true); };
  const openEdit = (r: RoleRow) => {
    setEditing(r);
    setDraft({
      akiraRoleKey: r.akiraRoleKey,
      roleCode: r.roleCode,
      roleName: r.roleName,
      description: r.description ?? "",
      isActive: r.isActive,
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        roleCode: draft.roleCode,
        roleName: draft.roleName,
        description: draft.description || null,
      };

      if (editing) {
        await apiFetch(`/api/Role/${editing.akiraRoleKey}`, {
          method: "PUT",
          body: JSON.stringify({ akiraRoleKey: editing.akiraRoleKey, ...body, isActive: draft.isActive }),
        });
        toast.success("Role updated");
      } else {
        await apiFetch("/api/Role", { method: "POST", body: JSON.stringify(body) });
        toast.success("Role created");
      }

      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/Role/${deleteTarget.akiraRoleKey}`, { method: "DELETE" });
      toast.success("Role deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete role");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<RoleRow>[] = [
    {
      key: "roleName", header: "Role", sortable: true,
      accessor: (r) => (
        <div>
          <div className="font-medium">{r.roleName}</div>
          <div className="font-mono text-xs text-muted-foreground">{r.roleCode}</div>
        </div>
      ),
    },
    { key: "description", header: "Description", accessor: (r) => <span className="text-sm text-muted-foreground">{r.description ?? "—"}</span> },
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
        title="Roles"
        breadcrumbs={[{ label: "System" }, { label: "Roles" }]}
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> New Role
          </Button>
        }
      />

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.akiraRoleKey}
        selectable
        storageKey="roles"
        searchPlaceholder="Search roles..."
        searchFields={(r) => `${r.roleName} ${r.roleCode}`}
        dateField={(r) => r.createdOn}
        dateFilterLabel="Created"
        emptyMessage={loading ? "Loading roles..." : "No roles yet."}
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Role" : "New Role"}
        description={editing ? "Update this role." : "Create a new role for your tenant."}
        submitLabel={editing ? "Save Changes" : "Create Role"}
        onSubmit={save}
        submitting={saving}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Role Name</Label>
            <Input value={draft.roleName} onChange={(e) => setDraft({ ...draft, roleName: e.target.value })} placeholder="Class Coordinator" className="rounded-md" required />
          </div>
          <div className="space-y-1.5">
            <Label required>Role Code</Label>
            <Input value={draft.roleCode} onChange={(e) => setDraft({ ...draft, roleCode: e.target.value.toUpperCase() })} placeholder="CLASS_COORDINATOR" className="rounded-md" required />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="rounded-md" rows={3} />
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.roleName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Users currently assigned to this role must be moved to another role first. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
