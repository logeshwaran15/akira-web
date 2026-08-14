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

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menu Management — Akira School ERP" },
      { name: "description", content: "Manage sidebar menu items." },
    ],
  }),
  component: MenuPage,
});

type MenuRow = {
  akiraMenuKey: string;
  menuName: string;
  menuCode: string;
  icon: string | null;
  url: string | null;
  parentMenuKey: string | null;
  sortOrder: number;
  createdOn: string;
};

type MenuDraft = {
  akiraMenuKey: string;
  menuName: string;
  menuCode: string;
  icon: string;
  url: string;
  parentMenuKey: string; // "" means top-level
  sortOrder: number;
  isActive: boolean;
};

const ICON_OPTIONS = [
  "LayoutDashboard", "GraduationCap", "Users", "BookOpen", "CalendarCheck",
  "CalendarDays", "CalendarClock", "ClipboardList", "Wallet", "Library",
  "Bus", "Settings", "Settings2", "Blocks", "Bell", "Mail", "Building2", "ShieldCheck", "KeyRound",
];

const empty: MenuDraft = {
  akiraMenuKey: "", menuName: "", menuCode: "", icon: "", url: "",
  parentMenuKey: "", sortOrder: 0, isActive: true,
};

function MenuPage() {
  const [rows, setRows] = useState<MenuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MenuRow | null>(null);
  const [draft, setDraft] = useState<MenuDraft>(empty);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MenuRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch("/api/Menu")
      .then((data: MenuRow[]) => setRows(data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load menus"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const parentOptions = rows.filter((r) => !r.parentMenuKey);
  const menuNameOf = (key: string | null) =>
    rows.find((r) => r.akiraMenuKey === key)?.menuName ?? "—";

  const openNew = () => { setEditing(null); setDraft(empty); setOpen(true); };
  const openEdit = (r: MenuRow) => {
    setEditing(r);
    setDraft({
      akiraMenuKey: r.akiraMenuKey,
      menuName: r.menuName,
      menuCode: r.menuCode,
      icon: r.icon ?? "",
      url: r.url ?? "",
      parentMenuKey: r.parentMenuKey ?? "",
      sortOrder: r.sortOrder,
      isActive: true,
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        menuName: draft.menuName,
        menuCode: draft.menuCode,
        icon: draft.icon || null,
        url: draft.url || null,
        parentMenuKey: draft.parentMenuKey || null,
        sortOrder: draft.sortOrder,
      };

      if (editing) {
        await apiFetch(`/api/Menu/${editing.akiraMenuKey}`, {
          method: "PUT",
          body: JSON.stringify({ akiraMenuKey: editing.akiraMenuKey, ...body, isActive: draft.isActive }),
        });
        toast.success("Menu updated");
      } else {
        await apiFetch("/api/Menu", { method: "POST", body: JSON.stringify(body) });
        toast.success("Menu created");
      }

      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save menu");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/Menu/${deleteTarget.akiraMenuKey}`, { method: "DELETE" });
      toast.success("Menu deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete menu");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<MenuRow>[] = [
    { key: "menuName", header: "Menu Name", sortable: true, accessor: (r) => <span className="font-medium">{r.menuName}</span> },
    { key: "menuCode", header: "Code", sortable: true, className: "font-mono text-xs" },
    { key: "url", header: "URL", accessor: (r) => r.url || "—" },
    {
      key: "parentMenuKey", header: "Parent",
      accessor: (r) => r.parentMenuKey
        ? <Badge variant="outline" className="rounded-md">{menuNameOf(r.parentMenuKey)}</Badge>
        : <Badge className="rounded-md border-0 bg-primary/15 text-primary">Section</Badge>,
    },
    { key: "sortOrder", header: "Order", sortable: true },
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
        title="Menu Management"
        breadcrumbs={[{ label: "System" }, { label: "Menu" }]}
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> New Menu
          </Button>
        }
      />

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.akiraMenuKey}
        selectable
        storageKey="menu"
        searchPlaceholder="Search menu name, code, url..."
        searchFields={(r) => `${r.menuName} ${r.menuCode} ${r.url ?? ""}`}
        emptyMessage={loading ? "Loading menus..." : "No menu items found."}
        dateField={(r) => r.createdOn}
        dateFilterLabel="Created"
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Menu" : "New Menu"}
        description={editing ? "Update this sidebar menu item." : "Add a new sidebar menu item or section."}
        submitLabel={editing ? "Save Changes" : "Create Menu"}
        onSubmit={save}
        submitting={saving}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label required>Menu Name</Label>
            <Input value={draft.menuName} onChange={(e) => setDraft({ ...draft, menuName: e.target.value })} className="rounded-md" required />
          </div>
          <div className="space-y-1.5">
            <Label required>Menu Code</Label>
            <Input value={draft.menuCode} onChange={(e) => setDraft({ ...draft, menuCode: e.target.value.toUpperCase() })} className="rounded-md" required />
          </div>
          <div className="space-y-1.5">
            <Label>URL</Label>
            <Input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="/students" className="rounded-md" />
          </div>
          <div className="space-y-1.5">
            <Label>Sort Order</Label>
            <Input type="number" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} className="rounded-md" />
          </div>
          <div className="space-y-1.5">
            <Label>Icon</Label>
            <Select value={draft.icon || "none"} onValueChange={(v) => setDraft({ ...draft, icon: v === "none" ? "" : v })}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Select icon" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {ICON_OPTIONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Parent (Section)</Label>
            <Select value={draft.parentMenuKey || "none"} onValueChange={(v) => setDraft({ ...draft, parentMenuKey: v === "none" ? "" : v })}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Top-level (section header)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Top-level (section header)</SelectItem>
                {parentOptions
                  .filter((p) => p.akiraMenuKey !== editing?.akiraMenuKey)
                  .map((p) => <SelectItem key={p.akiraMenuKey} value={p.akiraMenuKey}>{p.menuName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.menuName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the menu item from the sidebar for every role that had access to it. This action cannot be undone.
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
