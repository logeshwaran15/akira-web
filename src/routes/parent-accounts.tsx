import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/parent-accounts")({
  head: () => ({
    meta: [
      { title: "Parent Accounts — Akira School ERP" },
      { name: "description", content: "Create parent logins and link them to their children." },
    ],
  }),
  component: ParentAccountsPage,
});

// NOTE: backed by /api/Parent (GET, POST, PUT /{key}, DELETE /{key}). The backend
// creates the login with the PARENT role and stores the parent -> student links.
type LinkedChild = {
  studentKey: string;
  studentName: string;
  admissionNumber: string;
  className: string | null;
  relationshipType: string;
};

type ParentRow = {
  parentKey: string;
  fullName: string;
  email: string;
  mobileNo: string;
  isActive: boolean;
  createdOn: string;
  children: LinkedChild[];
};

type StudentOption = {
  studentKey: string;
  studentName: string;
  admissionNumber: string;
  className: string | null;
};

type ParentDraft = {
  fullName: string;
  email: string;
  mobileNo: string;
  password: string;
  isActive: boolean;
  // studentKey -> relationship
  links: Record<string, string>;
};

const RELATIONSHIPS = ["FATHER", "MOTHER", "LEGAL_GUARDIAN", "OTHER"];
const relLabel = (r: string) => r.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

const empty: ParentDraft = {
  fullName: "", email: "", mobileNo: "", password: "", isActive: true, links: {},
};

function ParentAccountsPage() {
  const [rows, setRows] = useState<ParentRow[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ParentRow | null>(null);
  const [draft, setDraft] = useState<ParentDraft>(empty);
  const [studentSearch, setStudentSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ParentRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch("/api/Parent")
      .then((data: ParentRow[]) => setRows(data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load parent accounts"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    apiFetch("/api/Student?status=ENROLLED")
      .then((data: StudentOption[]) => setStudents(data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load students"));
  }, []);

  const openNew = () => {
    setEditing(null);
    setDraft(empty);
    setStudentSearch("");
    setOpen(true);
  };

  const openEdit = (r: ParentRow) => {
    setEditing(r);
    setDraft({
      fullName: r.fullName,
      email: r.email,
      mobileNo: r.mobileNo ?? "",
      password: "",
      isActive: r.isActive,
      links: Object.fromEntries(r.children.map((c) => [c.studentKey, c.relationshipType])),
    });
    setStudentSearch("");
    setOpen(true);
  };

  const toggleChild = (studentKey: string, checked: boolean) => {
    setDraft((d) => {
      const links = { ...d.links };
      if (checked) links[studentKey] = links[studentKey] ?? "FATHER";
      else delete links[studentKey];
      return { ...d, links };
    });
  };

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    const list = q
      ? students.filter((s) => `${s.studentName} ${s.admissionNumber} ${s.className ?? ""}`.toLowerCase().includes(q))
      : students;
    // Keep already-selected students on top so they're easy to review.
    return [...list].sort((a, b) => Number(!!draft.links[b.studentKey]) - Number(!!draft.links[a.studentKey]));
  }, [students, studentSearch, draft.links]);

  const save = async () => {
    if (!draft.fullName.trim() || !draft.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    if (!editing && draft.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (Object.keys(draft.links).length === 0) {
      toast.error("Link at least one child to this parent");
      return;
    }

    const children = Object.entries(draft.links).map(([studentKey, relationshipType]) => ({
      studentKey,
      relationshipType,
    }));

    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/Parent/${editing.parentKey}`, {
          method: "PUT",
          body: JSON.stringify({
            parentKey: editing.parentKey,
            fullName: draft.fullName,
            email: draft.email,
            mobileNo: draft.mobileNo,
            isActive: draft.isActive,
            children,
          }),
        });
        toast.success("Parent account updated");
      } else {
        await apiFetch("/api/Parent", {
          method: "POST",
          body: JSON.stringify({
            fullName: draft.fullName,
            email: draft.email,
            mobileNo: draft.mobileNo,
            password: draft.password,
            children,
          }),
        });
        toast.success("Parent account created");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save parent account");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/Parent/${deleteTarget.parentKey}`, { method: "DELETE" });
      toast.success("Parent account deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete parent account");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<ParentRow>[] = [
    {
      key: "fullName", header: "Parent", sortable: true,
      accessor: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
            {r.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-medium">{r.fullName}</div>
            <div className="text-xs text-muted-foreground">{r.email}</div>
          </div>
        </div>
      ),
    },
    { key: "mobileNo", header: "Mobile" },
    {
      key: "children", header: "Children",
      accessor: (r) =>
        r.children.length === 0 ? (
          <span className="text-xs text-muted-foreground">None linked</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {r.children.map((c) => (
              <Badge key={c.studentKey} variant="info">
                {c.studentName}
                {c.className ? ` · ${c.className}` : ""}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      key: "isActive", header: "Status", sortable: true,
      accessor: (r) => (
        <Badge variant={r.isActive ? "success" : "secondary"}>
          {r.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions", header: "Actions",
      accessor: (r) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-purple-600 hover:text-purple-700" onClick={() => openEdit(r)}>
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
        title="Parent Accounts"
        breadcrumbs={[{ label: "System" }, { label: "Parent Accounts" }]}
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> New Parent
          </Button>
        }
      />

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.parentKey}
        selectable
        storageKey="parent-accounts"
        searchPlaceholder="Search parent, email, child..."
        searchFields={(r) => `${r.fullName} ${r.email} ${r.mobileNo ?? ""} ${r.children.map((c) => c.studentName).join(" ")}`}
        emptyMessage={loading ? "Loading parent accounts..." : "No parent accounts found."}
        dateField={(r) => r.createdOn}
        dateFilterLabel="Created"
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Parent Account" : "New Parent Account"}
        description={
          editing
            ? "Update the parent's details and linked children."
            : "Create a parent login and link it to one or more children."
        }
        submitLabel={editing ? "Save Changes" : "Create Account"}
        onSubmit={save}
        submitting={saving}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label required>Full Name</Label>
            <Input value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} className="rounded-md" required />
          </div>
          <div className="space-y-1.5">
            <Label required>Email</Label>
            <Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className="rounded-md" required />
          </div>
          <div className="space-y-1.5">
            <Label>Mobile No</Label>
            <Input value={draft.mobileNo} onChange={(e) => setDraft({ ...draft, mobileNo: e.target.value })} className="rounded-md" />
          </div>
          {editing ? (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={draft.isActive ? "active" : "inactive"}
                onValueChange={(v) => setDraft({ ...draft, isActive: v === "active" })}
              >
                <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label required>Password</Label>
              <Input type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} className="rounded-md" required />
            </div>
          )}

          <div className="col-span-2 space-y-1.5">
            <Label required>
              Children ({Object.keys(draft.links).length} selected)
            </Label>
            <Input
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search by name, admission no. or class..."
              className="rounded-md"
            />
            <div className="max-h-56 divide-y divide-border overflow-y-auto rounded-md border border-border">
              {filteredStudents.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No students found.</div>
              ) : (
                filteredStudents.map((s) => {
                  const selected = draft.links[s.studentKey];
                  return (
                    <div key={s.studentKey} className="flex items-center gap-3 px-3 py-2">
                      <Checkbox
                        checked={!!selected}
                        onCheckedChange={(v) => toggleChild(s.studentKey, v === true)}
                      />
                      <div className="min-w-0 flex-1 text-sm">
                        <div className="truncate font-medium">{s.studentName}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.admissionNumber}
                          {s.className ? ` · ${s.className}` : ""}
                        </div>
                      </div>
                      {selected && (
                        <Select
                          value={selected}
                          onValueChange={(v) => setDraft({ ...draft, links: { ...draft.links, [s.studentKey]: v } })}
                        >
                          <SelectTrigger className="h-8 w-36 rounded-md text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {RELATIONSHIPS.map((r) => (
                              <SelectItem key={r} value={r}>{relLabel(r)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.fullName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the parent's login and their links to their children. The students themselves are not affected.
              This action cannot be undone.
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
