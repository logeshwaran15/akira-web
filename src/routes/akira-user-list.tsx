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

export const Route = createFileRoute("/akira-user-list")({
  head: () => ({
    meta: [
      { title: "User Management — Akira School ERP" },
      { name: "description", content: "Manage Akira ERP user accounts and roles." },
    ],
  }),
  component: AkiraUserListPage,
});

type UserRow = {
  akiraUserKey: string;
  userName: string;
  email: string;
  mobileNo: string;
  roleCode: string;
  roleName: string;
  createdOn: string;
};

type Role = { akiraRoleKey: string; roleCode: string; roleName: string };

type UserDraft = {
  akiraUserKey: string;
  userName: string;
  password: string;
  email: string;
  mobileNo: string;
  roleCode: string;
};

const empty: UserDraft = {
  akiraUserKey: "", userName: "", password: "", email: "", mobileNo: "", roleCode: "",
};

function AkiraUserListPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [draft, setDraft] = useState<UserDraft>(empty);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch("/api/User")
      .then((data: UserRow[]) => setRows(data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load users"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    apiFetch("/api/Role")
      .then((data: Role[]) => setRoles(data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load roles"));
  }, []);

  const openNew = () => { setEditing(null); setDraft(empty); setOpen(true); };
  const openEdit = (r: UserRow) => {
    setEditing(r);
    setDraft({
      akiraUserKey: r.akiraUserKey,
      userName: r.userName,
      password: "",
      email: r.email,
      mobileNo: r.mobileNo,
      roleCode: r.roleCode,
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/User/${editing.akiraUserKey}`, {
          method: "PUT",
          body: JSON.stringify({
            akiraUserKey: editing.akiraUserKey,
            userName: draft.userName,
            email: draft.email,
            mobileNo: draft.mobileNo,
            roleCode: draft.roleCode,
          }),
        });
        toast.success("User updated");
      } else {
        await apiFetch("/api/User", {
          method: "POST",
          body: JSON.stringify({
            userName: draft.userName,
            password: draft.password,
            email: draft.email,
            mobileNo: draft.mobileNo,
            roleCode: draft.roleCode,
          }),
        });
        toast.success("User created");
      }

      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/User/${deleteTarget.akiraUserKey}`, { method: "DELETE" });
      toast.success("User deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<UserRow>[] = [
    {
      key: "userName", header: "User", sortable: true,
      accessor: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
            {r.userName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-medium">{r.userName}</div>
            <div className="text-xs text-muted-foreground">{r.email}</div>
          </div>
        </div>
      ),
    },
    { key: "mobileNo", header: "Mobile" },
    {
      key: "roleName", header: "Role", sortable: true,
      accessor: (r) => <Badge className="rounded-md border-0 bg-primary/15 text-primary">{r.roleName}</Badge>,
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
        title="User Management"
        breadcrumbs={[{ label: "System" }, { label: "Users" }]}
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> New User
          </Button>
        }
      />

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.akiraUserKey}
        selectable
        storageKey="akira-user-list"
        searchPlaceholder="Search users, email, role..."
        searchFields={(r) => `${r.userName} ${r.email} ${r.roleName}`}
        emptyMessage={loading ? "Loading users..." : "No users found."}
        dateField={(r) => r.createdOn}
        dateFilterLabel="Created"
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit User" : "New User"}
        description={editing ? "Update this user's account details." : "Create a new Akira ERP user account."}
        submitLabel={editing ? "Save Changes" : "Create User"}
        onSubmit={save}
        submitting={saving}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label required>Username</Label>
            <Input value={draft.userName} onChange={(e) => setDraft({ ...draft, userName: e.target.value })} className="rounded-md" required />
          </div>
          {!editing && (
            <div className="space-y-1.5">
              <Label required>Password</Label>
              <Input type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} className="rounded-md" required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label required>Email</Label>
            <Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className="rounded-md" required />
          </div>
          <div className="space-y-1.5">
            <Label>Mobile No</Label>
            <Input value={draft.mobileNo} onChange={(e) => setDraft({ ...draft, mobileNo: e.target.value })} className="rounded-md" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label required>Role</Label>
            <Select value={draft.roleCode} onValueChange={(v) => setDraft({ ...draft, roleCode: v })}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>
                {roles.map((r) => <SelectItem key={r.akiraRoleKey} value={r.roleCode}>{r.roleName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.userName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this user's access to Akira ERP. This action cannot be undone.
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
