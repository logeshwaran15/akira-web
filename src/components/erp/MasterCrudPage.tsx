import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/erp/PageHeader";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export type MasterField<T> = {
  key: keyof T & string;
  label: string;
  type?: "text" | "number" | "select" | "date" | "textarea" | "time";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** Spans both columns of the form grid. */
  full?: boolean;
  upper?: boolean;
};

type Store<T> = {
  list: () => Promise<T[]>;
  create: (row: any) => Promise<T>;
  update: (key: string, patch: Partial<T>) => Promise<T>;
  remove: (key: string) => Promise<void>;
};

export interface MasterCrudPageProps<T extends { isActive: boolean }> {
  title: string;
  singular: string;
  keyField: keyof T & string;
  store: Store<T>;
  fields: MasterField<T>[];
  columns: Column<T>[];
  empty: Omit<T, keyof T> & Partial<T>;
  searchFields: (row: T) => string;
  storageKey: string;
  /** Extra form content rendered below the field grid (e.g. route-stop editor). */
  extraForm?: (draft: T, setDraft: (d: T) => void) => ReactNode;
  /** Return an error message to block the save. */
  validate?: (draft: T) => string | null;
  dialogSize?: "sm" | "md" | "lg" | "xl";
  toolbarExtra?: ReactNode;
  deleteHint?: string;
}

export function MasterCrudPage<T extends { isActive: boolean }>({
  title, singular, keyField, store, fields, columns, empty, searchFields, storageKey,
  extraForm, validate, dialogSize = "md", toolbarExtra, deleteHint,
}: MasterCrudPageProps<T>) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [draft, setDraft] = useState<T>(empty as T);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  const load = () => {
    setLoading(true);
    store
      .list()
      .then(setRows)
      .catch((err) => toast.error(err instanceof Error ? err.message : `Failed to load ${title.toLowerCase()}`))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => { setEditing(null); setDraft({ ...(empty as T) }); setOpen(true); };
  const openEdit = (r: T) => { setEditing(r); setDraft({ ...r }); setOpen(true); };

  const set = (key: string, value: unknown) => setDraft({ ...draft, [key]: value } as T);

  const save = async () => {
    for (const f of fields) {
      const v = draft[f.key] as unknown;
      if (f.required && (v === "" || v === null || v === undefined)) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    const problem = validate?.(draft);
    if (problem) { toast.error(problem); return; }

    setSaving(true);
    try {
      if (editing) {
        await store.update(editing[keyField] as string, draft);
        toast.success(`${singular} updated`);
      } else {
        await store.create(draft);
        toast.success(`${singular} created`);
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to save ${singular.toLowerCase()}`);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await store.remove(deleteTarget[keyField] as string);
      toast.success(`${singular} deleted`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to delete ${singular.toLowerCase()}`);
    }
  };

  const allColumns: Column<T>[] = [
    ...columns,
    {
      key: "isActive", header: "Status",
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

  const renderField = (f: MasterField<T>) => {
    const value = draft[f.key] as unknown;
    const str = value === null || value === undefined ? "" : String(value);
    let control: ReactNode;

    if (f.type === "select") {
      control = (
        <Select value={str || undefined} onValueChange={(v) => set(f.key, v)}>
          <SelectTrigger className="rounded-md"><SelectValue placeholder={f.placeholder ?? `Select ${f.label.toLowerCase()}`} /></SelectTrigger>
          <SelectContent>
            {(f.options ?? []).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    } else if (f.type === "date") {
      control = <DatePicker value={str} onChange={(v) => set(f.key, v)} className="h-10 w-full" />;
    } else if (f.type === "textarea") {
      control = <Textarea value={str} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} className="rounded-md" rows={3} />;
    } else if (f.type === "number") {
      control = (
        <Input
          type="number" step="any" value={str} placeholder={f.placeholder} className="rounded-md"
          onChange={(e) => set(f.key, e.target.value === "" ? "" : Number(e.target.value))}
        />
      );
    } else {
      control = (
        <Input
          type={f.type === "time" ? "time" : "text"} value={str} placeholder={f.placeholder} className="rounded-md"
          onChange={(e) => set(f.key, f.upper ? e.target.value.toUpperCase() : e.target.value)}
        />
      );
    }

    return (
      <div key={f.key} className={cn("space-y-1.5", f.full && "sm:col-span-2")}>
        <Label required={f.required}>{f.label}</Label>
        {control}
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title={title}
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> New {singular}
          </Button>
        }
      />

      {toolbarExtra}

      <DataTable
        data={rows}
        columns={allColumns}
        rowKey={(r) => r[keyField] as string}
        selectable
        storageKey={storageKey}
        searchPlaceholder={`Search ${title.toLowerCase()}...`}
        searchFields={searchFields}
        emptyMessage={loading ? `Loading ${title.toLowerCase()}...` : `No ${title.toLowerCase()} yet.`}
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? `Edit ${singular}` : `New ${singular}`}
        submitLabel={editing ? "Save Changes" : `Create ${singular}`}
        onSubmit={save}
        submitting={saving}
        size={dialogSize}
      >
        <div className="grid gap-4 sm:grid-cols-2">{fields.map(renderField)}</div>
        {extraForm?.(draft, setDraft)}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Active
        </label>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {singular.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>{deleteHint ?? "This cannot be undone."}</AlertDialogDescription>
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
