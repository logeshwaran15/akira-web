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

export const Route = createFileRoute("/schools")({
  head: () => ({
    meta: [
      { title: "Schools — Akira ERP" },
      { name: "description", content: "Manage schools operating under each tenant." },
    ],
  }),
  component: SchoolsPage,
});

type SchoolRow = {
  akiraSchoolKey: string;
  akiraTenantKey: string;
  tenantName: string | null;
  schoolName: string;
  schoolCode: string;
  boardType: string | null;
  emisCode: string | null;
  udiseCode: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdOn: string;
};

type SchoolDraft = {
  akiraSchoolKey: string;
  akiraTenantKey: string;
  schoolName: string;
  schoolCode: string;
  boardType: string;
  emisCode: string;
  udiseCode: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
};

type TenantOption = { tenantKey: string; tenantName: string };

const BOARD_TYPES = ["Tamil Nadu State Board", "CBSE", "ICSE", "IB", "IGCSE"];

const empty: SchoolDraft = {
  akiraSchoolKey: "", akiraTenantKey: "", schoolName: "", schoolCode: "",
  boardType: "", emisCode: "", udiseCode: "", email: "", phone: "", address: "", isActive: true,
};

function SchoolsPage() {
  const [rows, setRows] = useState<SchoolRow[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolRow | null>(null);
  const [draft, setDraft] = useState<SchoolDraft>(empty);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SchoolRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch("/api/School")
      .then((data: SchoolRow[]) => setRows(data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load schools"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    apiFetch("/api/Tenant")
      .then((data: TenantOption[]) => setTenants(data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load tenants"));
  }, []);

  const openNew = () => { setEditing(null); setDraft(empty); setOpen(true); };
  const openEdit = (r: SchoolRow) => {
    setEditing(r);
    setDraft({
      akiraSchoolKey: r.akiraSchoolKey,
      akiraTenantKey: r.akiraTenantKey,
      schoolName: r.schoolName,
      schoolCode: r.schoolCode,
      boardType: r.boardType ?? "",
      emisCode: r.emisCode ?? "",
      udiseCode: r.udiseCode ?? "",
      email: r.email ?? "",
      phone: r.phone ?? "",
      address: r.address ?? "",
      isActive: r.isActive,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.akiraTenantKey) {
      toast.error("Select a tenant first.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        akiraTenantKey: draft.akiraTenantKey,
        schoolName: draft.schoolName,
        schoolCode: draft.schoolCode,
        boardType: draft.boardType || null,
        emisCode: draft.emisCode || null,
        udiseCode: draft.udiseCode || null,
        email: draft.email || null,
        phone: draft.phone || null,
        address: draft.address || null,
      };

      if (editing) {
        await apiFetch(`/api/School/${editing.akiraSchoolKey}`, {
          method: "PUT",
          body: JSON.stringify({ akiraSchoolKey: editing.akiraSchoolKey, ...body, isActive: draft.isActive }),
        });
        toast.success("School updated");
      } else {
        await apiFetch("/api/School", { method: "POST", body: JSON.stringify(body) });
        toast.success("School created");
      }

      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save school");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/School/${deleteTarget.akiraSchoolKey}`, { method: "DELETE" });
      toast.success("School deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete school");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<SchoolRow>[] = [
    {
      key: "schoolName", header: "School", sortable: true,
      accessor: (r) => (
        <div>
          <div className="font-medium">{r.schoolName}</div>
          <div className="font-mono text-xs text-muted-foreground">{r.schoolCode}</div>
        </div>
      ),
    },
    {
      key: "tenantName", header: "Tenant", sortable: true,
      accessor: (r) => r.tenantName
        ? <Badge variant="outline" className="rounded-md">{r.tenantName}</Badge>
        : <span className="text-xs text-muted-foreground">—</span>,
    },
    { key: "boardType", header: "Board", accessor: (r) => r.boardType ?? "—" },
    { key: "phone", header: "Phone", accessor: (r) => r.phone ?? "—" },
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
        title="Schools"
        breadcrumbs={[{ label: "Platform" }, { label: "Schools" }]}
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> New School
          </Button>
        }
      />

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.akiraSchoolKey}
        selectable
        storageKey="schools"
        searchPlaceholder="Search schools, codes, tenants..."
        searchFields={(r) => `${r.schoolName} ${r.schoolCode} ${r.tenantName ?? ""}`}
        dateField={(r) => r.createdOn}
        dateFilterLabel="Created"
        emptyMessage={loading ? "Loading schools..." : "No schools yet."}
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit School" : "New School"}
        description={editing ? "Update this school's profile." : "Register a school under a tenant."}
        submitLabel={editing ? "Save Changes" : "Create School"}
        onSubmit={save}
        submitting={saving}
        size="xl"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label required>Tenant</Label>
            <Select value={draft.akiraTenantKey} onValueChange={(v) => setDraft({ ...draft, akiraTenantKey: v })}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Select tenant" /></SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.tenantKey} value={t.tenantKey}>{t.tenantName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label required>School Name</Label>
            <Input value={draft.schoolName} onChange={(e) => setDraft({ ...draft, schoolName: e.target.value })} className="rounded-md" required />
          </div>
          <div className="space-y-1.5">
            <Label required>School Code</Label>
            <Input value={draft.schoolCode} onChange={(e) => setDraft({ ...draft, schoolCode: e.target.value.toUpperCase() })} className="rounded-md" required />
          </div>
          <div className="space-y-1.5">
            <Label>Board Type</Label>
            <Select value={draft.boardType || "none"} onValueChange={(v) => setDraft({ ...draft, boardType: v === "none" ? "" : v })}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Select board" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {BOARD_TYPES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>EMIS Code</Label>
            <Input value={draft.emisCode} onChange={(e) => setDraft({ ...draft, emisCode: e.target.value })} className="rounded-md" />
          </div>
          <div className="space-y-1.5">
            <Label>UDISE Code</Label>
            <Input value={draft.udiseCode} onChange={(e) => setDraft({ ...draft, udiseCode: e.target.value })} className="rounded-md" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className="rounded-md" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} className="rounded-md" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Address</Label>
            <Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} className="rounded-md" />
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.schoolName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This school and its association to its tenant will be removed. This action cannot be undone.
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
