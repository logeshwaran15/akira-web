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
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ListTree } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/config-types")({
  head: () => ({
    meta: [
      { title: "Config Types — Akira School ERP" },
      { name: "description", content: "Manage lookup/status types (Leave Type, Attendance Status, etc.) and their coded values." },
    ],
  }),
  component: ConfigTypesPage,
});

type ConfigTypeRow = {
  configTypeKey: string;
  typeCode: string;
  typeName: string;
  description: string | null;
  detailCount: number;
  isActive: boolean;
};

type ConfigTypeDetailRow = {
  configTypeDetailKey: string;
  configTypeKey: string;
  detailCode: string;
  detailName: string;
  detailValue: number;
  sortOrder: number;
  isActive: boolean;
};

type TypeDraft = { typeCode: string; typeName: string; description: string };
type DetailDraft = { detailCode: string; detailName: string; detailValue: string; sortOrder: string };

const emptyType: TypeDraft = { typeCode: "", typeName: "", description: "" };
const emptyDetail: DetailDraft = { detailCode: "", detailName: "", detailValue: "", sortOrder: "0" };

function ConfigTypesPage() {
  const [rows, setRows] = useState<ConfigTypeRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Config Type dialog
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ConfigTypeRow | null>(null);
  const [draft, setDraft] = useState<TypeDraft>(emptyType);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ConfigTypeRow | null>(null);

  // Config Type Detail (manage values) dialog
  const [detailsFor, setDetailsFor] = useState<ConfigTypeRow | null>(null);
  const [details, setDetails] = useState<ConfigTypeDetailRow[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState<ConfigTypeDetailRow | null>(null);
  const [detailDraft, setDetailDraft] = useState<DetailDraft>(emptyDetail);
  const [detailSaving, setDetailSaving] = useState(false);
  const [deleteDetailTarget, setDeleteDetailTarget] = useState<ConfigTypeDetailRow | null>(null);

  const load = () => {
    setLoading(true);
    apiFetch("/api/ConfigType")
      .then((d: ConfigTypeRow[]) => setRows(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load config types"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => { setEditing(null); setDraft(emptyType); setOpen(true); };
  const openEdit = (r: ConfigTypeRow) => {
    setEditing(r);
    setDraft({ typeCode: r.typeCode, typeName: r.typeName, description: r.description ?? "" });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        typeCode: draft.typeCode.toUpperCase().trim(),
        typeName: draft.typeName.trim(),
        description: draft.description.trim() || null,
      };
      if (editing) {
        await apiFetch(`/api/ConfigType/${editing.configTypeKey}`, {
          method: "PUT",
          body: JSON.stringify({ configTypeKey: editing.configTypeKey, ...body, isActive: editing.isActive }),
        });
        toast.success("Config type updated");
      } else {
        await apiFetch("/api/ConfigType", { method: "POST", body: JSON.stringify(body) });
        toast.success("Config type created");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save config type");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/ConfigType/${deleteTarget.configTypeKey}`, { method: "DELETE" });
      toast.success("Config type deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete config type");
    }
  };

  const toggleTypeActive = async (r: ConfigTypeRow, value: boolean) => {
    setRows((rs) => rs.map((x) => (x.configTypeKey === r.configTypeKey ? { ...x, isActive: value } : x)));
    try {
      await apiFetch(`/api/ConfigType/${r.configTypeKey}`, {
        method: "PUT",
        body: JSON.stringify({ configTypeKey: r.configTypeKey, typeCode: r.typeCode, typeName: r.typeName, description: r.description, isActive: value }),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
      load();
    }
  };

  // ---- Details ----

  const loadDetails = (type: ConfigTypeRow) => {
    setDetailsLoading(true);
    apiFetch(`/api/ConfigType/${type.configTypeKey}/details`)
      .then((d: ConfigTypeDetailRow[]) => setDetails(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load values"))
      .finally(() => setDetailsLoading(false));
  };

  const openManageDetails = (type: ConfigTypeRow) => {
    setDetailsFor(type);
    loadDetails(type);
  };

  const openNewDetail = () => {
    const nextValue = details.length > 0 ? Math.max(...details.map((d) => d.detailValue)) + 1 : 1;
    setEditingDetail(null);
    setDetailDraft({ detailCode: "", detailName: "", detailValue: String(nextValue), sortOrder: String(details.length) });
    setDetailOpen(true);
  };

  const openEditDetail = (d: ConfigTypeDetailRow) => {
    setEditingDetail(d);
    setDetailDraft({ detailCode: d.detailCode, detailName: d.detailName, detailValue: String(d.detailValue), sortOrder: String(d.sortOrder) });
    setDetailOpen(true);
  };

  const saveDetail = async () => {
    if (!detailsFor) return;
    setDetailSaving(true);
    try {
      const body = {
        configTypeKey: detailsFor.configTypeKey,
        detailCode: detailDraft.detailCode.toUpperCase().trim(),
        detailName: detailDraft.detailName.trim(),
        detailValue: Number(detailDraft.detailValue),
        sortOrder: Number(detailDraft.sortOrder) || 0,
      };
      if (editingDetail) {
        await apiFetch(`/api/ConfigTypeDetail/${editingDetail.configTypeDetailKey}`, {
          method: "PUT",
          body: JSON.stringify({ configTypeDetailKey: editingDetail.configTypeDetailKey, ...body, isActive: editingDetail.isActive }),
        });
        toast.success("Value updated");
      } else {
        await apiFetch("/api/ConfigTypeDetail", { method: "POST", body: JSON.stringify(body) });
        toast.success("Value added");
      }
      setDetailOpen(false);
      loadDetails(detailsFor);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save value");
    } finally {
      setDetailSaving(false);
    }
  };

  const confirmDeleteDetail = async () => {
    if (!deleteDetailTarget || !detailsFor) return;
    try {
      await apiFetch(`/api/ConfigTypeDetail/${deleteDetailTarget.configTypeDetailKey}`, { method: "DELETE" });
      toast.success("Value deleted");
      setDeleteDetailTarget(null);
      loadDetails(detailsFor);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete value");
    }
  };

  const toggleDetailActive = async (d: ConfigTypeDetailRow, value: boolean) => {
    if (!detailsFor) return;
    setDetails((ds) => ds.map((x) => (x.configTypeDetailKey === d.configTypeDetailKey ? { ...x, isActive: value } : x)));
    try {
      await apiFetch(`/api/ConfigTypeDetail/${d.configTypeDetailKey}`, {
        method: "PUT",
        body: JSON.stringify({
          configTypeDetailKey: d.configTypeDetailKey, configTypeKey: d.configTypeKey,
          detailCode: d.detailCode, detailName: d.detailName, detailValue: d.detailValue,
          sortOrder: d.sortOrder, isActive: value,
        }),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
      loadDetails(detailsFor);
    }
  };

  const columns: Column<ConfigTypeRow>[] = [
    {
      key: "typeName", header: "Config Type", sortable: true,
      accessor: (r) => (
        <div>
          <div className="font-medium">{r.typeName}</div>
          <div className="font-mono text-xs text-muted-foreground">{r.typeCode}</div>
        </div>
      ),
    },
    { key: "description", header: "Description", accessor: (r) => r.description ?? <span className="text-muted-foreground">—</span> },
    {
      key: "detailCount", header: "Values", sortable: true,
      accessor: (r) => (
        <Button variant="outline" size="sm" className="h-7 gap-1.5 rounded-md" onClick={() => openManageDetails(r)}>
          <ListTree className="h-3.5 w-3.5" /> {r.detailCount} {r.detailCount === 1 ? "value" : "values"}
        </Button>
      ),
    },
    {
      key: "isActive", header: "Status",
      accessor: (r) => (
        <div className="flex items-center gap-2">
          <Switch checked={r.isActive} onCheckedChange={(v) => toggleTypeActive(r, v)} />
          <span className="text-xs text-muted-foreground">{r.isActive ? "Active" : "Inactive"}</span>
        </div>
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
        title="Config Types"
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> New Config Type
          </Button>
        }
      />

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.configTypeKey}
        selectable
        storageKey="config-types"
        searchPlaceholder="Search config types..."
        searchFields={(r) => `${r.typeName} ${r.typeCode} ${r.description ?? ""}`}
        emptyMessage={loading ? "Loading config types..." : "No config types yet. Create one to define statuses like Leave Type or Attendance Status."}
      />

      {/* Create / Edit Config Type */}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Config Type" : "New Config Type"}
        description="A config type groups a set of coded status values, e.g. Leave Type (Casual, Sick) or Attendance (Check-In, Check-Out)."
        submitLabel={editing ? "Save Changes" : "Create Config Type"}
        onSubmit={save}
        submitting={saving}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Type Name</Label>
            <Input value={draft.typeName} onChange={(e) => setDraft({ ...draft, typeName: e.target.value })} placeholder="Leave Type" className="rounded-md" required />
          </div>
          <div className="space-y-1.5">
            <Label required>Type Code</Label>
            <Input value={draft.typeCode} onChange={(e) => setDraft({ ...draft, typeCode: e.target.value.toUpperCase() })} placeholder="LEAVE_TYPE" className="rounded-md font-mono" required />
            <p className="text-xs text-muted-foreground">Unique machine code used to reference this type from other modules.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Types of staff/student leave" className="rounded-md" />
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.typeName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Blocked if any modules still reference its values. This also removes all {deleteTarget?.detailCount ?? 0} configured value(s). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); confirmDelete(); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Values (Config Type Details) */}
      <FormDialog
        open={!!detailsFor}
        onOpenChange={(v) => !v && setDetailsFor(null)}
        title={`Values — ${detailsFor?.typeName ?? ""}`}
        description={`Coded values for ${detailsFor?.typeCode ?? ""}, e.g. 1 = Casual, 2 = Sick.`}
        submitLabel="Done"
        cancelLabel="Close"
        onSubmit={() => setDetailsFor(null)}
        size="lg"
      >
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button type="button" size="sm" className="h-9 gap-1.5 rounded-md" onClick={openNewDetail}>
              <Plus className="h-3.5 w-3.5" /> Add Value
            </Button>
          </div>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Value</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-24">Order</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailsLoading ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">Loading...</TableCell></TableRow>
                ) : details.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">No values yet. Add one above.</TableCell></TableRow>
                ) : (
                  [...details].sort((a, b) => a.sortOrder - b.sortOrder).map((d) => (
                    <TableRow key={d.configTypeDetailKey}>
                      <TableCell><Badge variant="outline" className="rounded-md font-mono">{d.detailValue}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{d.detailCode}</TableCell>
                      <TableCell className="font-medium">{d.detailName}</TableCell>
                      <TableCell className="text-muted-foreground">{d.sortOrder}</TableCell>
                      <TableCell>
                        <Badge className={cn("rounded-md border-0", d.isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                          {d.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-md text-purple-600 hover:text-purple-700" onClick={() => openEditDetail(d)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-md text-destructive" onClick={() => setDeleteDetailTarget(d)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </FormDialog>

      {/* Create / Edit a single value */}
      <FormDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={editingDetail ? "Edit Value" : "Add Value"}
        submitLabel={editingDetail ? "Save Changes" : "Add Value"}
        onSubmit={saveDetail}
        submitting={detailSaving}
        size="sm"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label required>Value</Label>
              <Input type="number" value={detailDraft.detailValue} onChange={(e) => setDetailDraft({ ...detailDraft, detailValue: e.target.value })} placeholder="1" className="rounded-md" required />
            </div>
            <div className="space-y-1.5">
              <Label>Sort Order</Label>
              <Input type="number" value={detailDraft.sortOrder} onChange={(e) => setDetailDraft({ ...detailDraft, sortOrder: e.target.value })} className="rounded-md" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label required>Code</Label>
            <Input value={detailDraft.detailCode} onChange={(e) => setDetailDraft({ ...detailDraft, detailCode: e.target.value.toUpperCase() })} placeholder="CASUAL" className="rounded-md font-mono" required />
          </div>
          <div className="space-y-1.5">
            <Label required>Name</Label>
            <Input value={detailDraft.detailName} onChange={(e) => setDetailDraft({ ...detailDraft, detailName: e.target.value })} placeholder="Casual Leave" className="rounded-md" required />
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteDetailTarget} onOpenChange={(v) => !v && setDeleteDetailTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteDetailTarget?.detailName}"?</AlertDialogTitle>
            <AlertDialogDescription>Blocked if any records still reference this value. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); confirmDeleteDetail(); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
