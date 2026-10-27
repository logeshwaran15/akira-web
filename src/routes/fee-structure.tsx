import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { DatePicker } from "@/components/ui/date-picker";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Eye, Wallet, Layers, IndianRupee, ListChecks, type LucideIcon } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/fee-structure")({
  head: () => ({
    meta: [
      { title: "Fee Structure — Akira School ERP" },
      { name: "description", content: "Define fee heads and per-class fee structures for the academic year." },
    ],
  }),
  component: FeeStructurePage,
});

// ---------- Types ----------

type ClassCatalogItem = { classCatalogKey: string; classCode: string; className: string };
type AcademicYear = { academicYearKey: string; yearName: string; status: string };

type FeeHead = {
  feeHeadKey: string;
  feeHeadName: string;
  feeHeadCode: string;
  isRecurring: boolean; // recurring per installment vs one-time (admission fee, etc.)
  isActive: boolean;
};

type FeeStructureItem = {
  feeStructureItemKey: string;
  feeHeadKey: string;
  feeHeadName: string;
  amount: number;
  frequency: "ONE_TIME" | "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "ANNUALLY";
  dueDate: string | null;
};

type FeeStructure = {
  feeStructureKey: string;
  academicYearKey: string;
  academicYearName: string;
  classCatalogKey: string;
  className: string;
  structureName: string;
  totalAmount: number;
  items: FeeStructureItem[];
  isActive: boolean;
};

type ItemDraft = {
  feeStructureItemKey: string;
  feeHeadKey: string;
  amount: string;
  frequency: FeeStructureItem["frequency"];
  dueDate: string;
};

type StructureDraft = {
  academicYearKey: string;
  classCatalogKey: string;
  structureName: string;
  items: ItemDraft[];
};

const FREQUENCIES: { value: FeeStructureItem["frequency"]; label: string }[] = [
  { value: "ONE_TIME", label: "One-time" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "HALF_YEARLY", label: "Half-Yearly" },
  { value: "ANNUALLY", label: "Annually" },
];

const emptyItem = (): ItemDraft => ({
  feeStructureItemKey: "",
  feeHeadKey: "",
  amount: "",
  frequency: "ANNUALLY",
  dueDate: "",
});

const emptyStructure = (): StructureDraft => ({
  academicYearKey: "",
  classCatalogKey: "",
  structureName: "",
  items: [emptyItem()],
});

const emptyFeeHead = { feeHeadName: "", feeHeadCode: "", isRecurring: false, isActive: true };

// Same treatment as Exam Timetable Builder's subject chips: a solid,
// saturated "pill" per fee head, hashed so each fee head keeps a stable
// color across the table, with a soft top-light shine highlight that reads
// clearly in both themes.
const FEE_HEAD_PALETTE = [
  "bg-rose-600 dark:bg-rose-500",
  "bg-sky-600 dark:bg-sky-500",
  "bg-emerald-600 dark:bg-emerald-500",
  "bg-amber-600 dark:bg-amber-500",
  "bg-violet-600 dark:bg-violet-500",
  "bg-cyan-600 dark:bg-cyan-500",
  "bg-orange-600 dark:bg-orange-500",
  "bg-indigo-600 dark:bg-indigo-500",
];

const FEE_HEAD_PILL_SHINE = "text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)]";

function feeHeadColor(feeHeadKey: string) {
  let hash = 0;
  for (let i = 0; i < feeHeadKey.length; i++) hash = (hash * 31 + feeHeadKey.charCodeAt(i)) >>> 0;
  return FEE_HEAD_PALETTE[hash % FEE_HEAD_PALETTE.length];
}

const currency = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

// Compact chevron-style stat segments -- same treatment as Exam Timetable
// Builder's KPI strip. Desktop draws an arrow point via clip-path; stacked
// vertically on mobile since the interlocking shape only reads correctly in
// one horizontal row.
function ChevronStat({
  icon: Icon, label, value, colorClass, position,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  colorClass: string;
  position: "first" | "middle" | "last";
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-[64px] flex-1 items-center gap-3 px-4 py-3 text-white shadow-sm sm:min-h-[68px]",
        colorClass,
        "rounded-md",
        position === "first" && "sm:[clip-path:polygon(0_0,calc(100%-13px)_0,100%_50%,calc(100%-13px)_100%,0_100%)]",
        position === "middle" && "sm:[clip-path:polygon(0_0,calc(100%-13px)_0,100%_50%,calc(100%-13px)_100%,0_100%,13px_50%)]",
        position === "last" && "sm:[clip-path:polygon(0_0,100%_0,100%_100%,0_100%,13px_50%)]",
      )}
    >
      <Icon className="h-5 w-5 shrink-0 opacity-90" />
      <div className="flex min-w-0 flex-col justify-center">
        <div className="text-xs font-medium leading-tight text-white/80">{label}</div>
        <div className="mt-1 whitespace-nowrap font-display text-xl font-extrabold leading-none tabular-nums sm:text-2xl">
          {value}
        </div>
      </div>
    </div>
  );
}

function FeeStructurePage() {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
  const [classes, setClasses] = useState<ClassCatalogItem[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);

  // Structure form
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FeeStructure | null>(null);
  const [draft, setDraft] = useState<StructureDraft>(emptyStructure());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FeeStructure | null>(null);
  const [viewTarget, setViewTarget] = useState<FeeStructure | null>(null);

  // Fee head CRUD
  const [headOpen, setHeadOpen] = useState(false);
  const [editingHead, setEditingHead] = useState<FeeHead | null>(null);
  const [headDraft, setHeadDraft] = useState(emptyFeeHead);
  const [savingHead, setSavingHead] = useState(false);
  const [deleteHeadTarget, setDeleteHeadTarget] = useState<FeeHead | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/FeeStructure"),
      apiFetch("/api/FeeHead"),
      apiFetch("/api/ClassCatalog"),
      apiFetch("/api/AcademicYear"),
    ])
      .then(([s, h, c, y]) => { setStructures(s ?? []); setFeeHeads(h ?? []); setClasses(c ?? []); setYears(y ?? []); })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load fee structures"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const activeYear = useMemo(() => years.find((y) => y.status.toUpperCase() === "ACTIVE") ?? years[0], [years]);

  // ---------- Structure CRUD ----------

  const openNew = () => {
    setEditing(null);
    setDraft({ ...emptyStructure(), academicYearKey: activeYear?.academicYearKey ?? "" });
    setOpen(true);
  };

  const openEdit = (r: FeeStructure) => {
    setEditing(r);
    setDraft({
      academicYearKey: r.academicYearKey,
      classCatalogKey: r.classCatalogKey,
      structureName: r.structureName,
      items: r.items.length
        ? r.items.map((i) => ({
            feeStructureItemKey: i.feeStructureItemKey,
            feeHeadKey: i.feeHeadKey,
            amount: String(i.amount),
            frequency: i.frequency,
            dueDate: i.dueDate ?? "",
          }))
        : [emptyItem()],
    });
    setOpen(true);
  };

  const addItemRow = () => setDraft((d) => ({ ...d, items: [...d.items, emptyItem()] }));
  const removeItemRow = (idx: number) =>
    setDraft((d) => ({ ...d, items: d.items.length > 1 ? d.items.filter((_, i) => i !== idx) : d.items }));
  const updateItemRow = (idx: number, patch: Partial<ItemDraft>) =>
    setDraft((d) => ({ ...d, items: d.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }));

  const draftTotal = useMemo(
    () => draft.items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0),
    [draft.items],
  );

  const save = async () => {
    if (!draft.academicYearKey || !draft.classCatalogKey || !draft.structureName.trim()) {
      toast.error("Academic year, class and structure name are required");
      return;
    }
    const validItems = draft.items.filter((i) => i.feeHeadKey && Number(i.amount) > 0);
    if (validItems.length === 0) {
      toast.error("Add at least one fee head with an amount");
      return;
    }

    setSaving(true);
    try {
      const body = {
        academicYearKey: draft.academicYearKey,
        classCatalogKey: draft.classCatalogKey,
        structureName: draft.structureName.trim(),
        items: validItems.map((i) => ({
          feeHeadKey: i.feeHeadKey,
          amount: Number(i.amount),
          frequency: i.frequency,
          dueDate: i.dueDate || null,
        })),
      };

      if (editing) {
        await apiFetch(`/api/FeeStructure/${editing.feeStructureKey}`, {
          method: "PUT",
          body: JSON.stringify({ feeStructureKey: editing.feeStructureKey, ...body, isActive: editing.isActive }),
        });
        toast.success("Fee structure updated");
      } else {
        await apiFetch("/api/FeeStructure", { method: "POST", body: JSON.stringify(body) });
        toast.success("Fee structure created");
      }

      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save fee structure");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/FeeStructure/${deleteTarget.feeStructureKey}`, { method: "DELETE" });
      toast.success("Fee structure deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete fee structure");
    }
  };

  // ---------- Fee head CRUD ----------

  const openNewHead = () => {
    setEditingHead(null);
    setHeadDraft(emptyFeeHead);
    setHeadOpen(true);
  };

  const openEditHead = (h: FeeHead) => {
    setEditingHead(h);
    setHeadDraft({ feeHeadName: h.feeHeadName, feeHeadCode: h.feeHeadCode, isRecurring: h.isRecurring, isActive: h.isActive });
    setHeadOpen(true);
  };

  const saveFeeHead = async () => {
    if (!headDraft.feeHeadName.trim() || !headDraft.feeHeadCode.trim()) {
      toast.error("Fee head name and code are required");
      return;
    }
    setSavingHead(true);
    try {
      const body = {
        feeHeadName: headDraft.feeHeadName.trim(),
        feeHeadCode: headDraft.feeHeadCode.toUpperCase().trim(),
        isRecurring: headDraft.isRecurring,
        isActive: headDraft.isActive,
      };
      if (editingHead) {
        await apiFetch(`/api/FeeHead/${editingHead.feeHeadKey}`, {
          method: "PUT",
          body: JSON.stringify({ feeHeadKey: editingHead.feeHeadKey, ...body }),
        });
        toast.success("Fee head updated");
      } else {
        await apiFetch("/api/FeeHead", { method: "POST", body: JSON.stringify(body) });
        toast.success("Fee head created");
      }
      setHeadOpen(false);
      setHeadDraft(emptyFeeHead);
      const h = await apiFetch("/api/FeeHead");
      setFeeHeads(h ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save fee head");
    } finally {
      setSavingHead(false);
    }
  };

  const confirmDeleteHead = async () => {
    if (!deleteHeadTarget) return;
    try {
      await apiFetch(`/api/FeeHead/${deleteHeadTarget.feeHeadKey}`, { method: "DELETE" });
      toast.success("Fee head deleted");
      setDeleteHeadTarget(null);
      const h = await apiFetch("/api/FeeHead");
      setFeeHeads(h ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete fee head");
    }
  };

  // ---------- Stats ----------

  const totalCollectable = structures.reduce((sum, s) => sum + s.totalAmount, 0);
  const activeCount = structures.filter((s) => s.isActive).length;

  const columns: Column<FeeStructure>[] = [
    {
      key: "structureName", header: "Structure", sortable: true,
      accessor: (r) => (
        <div>
          <div className="font-medium">{r.structureName}</div>
          <div className="text-xs text-muted-foreground">{r.className} &middot; {r.academicYearName}</div>
        </div>
      ),
    },
    {
      key: "items", header: "Fee Heads",
      accessor: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.items.slice(0, 3).map((i) => (
            <span
              key={i.feeStructureItemKey}
              className={cn("inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold", feeHeadColor(i.feeHeadKey), FEE_HEAD_PILL_SHINE)}
            >
              {i.feeHeadName}
            </span>
          ))}
          {r.items.length > 3 && (
            <Badge variant="outline" className="rounded-md font-normal">+{r.items.length - 3} more</Badge>
          )}
        </div>
      ),
    },
    {
      key: "totalAmount", header: "Total / Student", sortable: true,
      sortValue: (r) => r.totalAmount,
      accessor: (r) => <span className="font-medium">{currency(r.totalAmount)}</span>,
    },
    {
      key: "isActive", header: "Status",
      accessor: (r) => (
        <Badge className={cn("rounded-md border-0 font-semibold", r.isActive ? "bg-emerald-600 dark:bg-emerald-500" : "bg-slate-600 dark:bg-slate-500", FEE_HEAD_PILL_SHINE)}>
          {r.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions", header: "Actions",
      accessor: (r) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground" onClick={() => setViewTarget(r)}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
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

  const headColumns: Column<FeeHead>[] = [
    {
      key: "feeHeadName", header: "Fee Head", sortable: true,
      accessor: (h) => (
        <span className={cn("inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold", feeHeadColor(h.feeHeadKey), FEE_HEAD_PILL_SHINE)}>
          {h.feeHeadName}
        </span>
      ),
    },
    {
      key: "feeHeadCode", header: "Code", sortable: true,
      accessor: (h) => <span className="font-mono text-xs text-muted-foreground">{h.feeHeadCode}</span>,
    },
    {
      key: "isRecurring", header: "Type",
      accessor: (h) => (
        <Badge variant="outline" className="rounded-md font-normal">{h.isRecurring ? "Recurring" : "One-time"}</Badge>
      ),
    },
    {
      key: "isActive", header: "Status",
      accessor: (h) => (
        <Badge className={cn("rounded-md border-0 font-semibold", h.isActive ? "bg-emerald-600 dark:bg-emerald-500" : "bg-slate-600 dark:bg-slate-500", FEE_HEAD_PILL_SHINE)}>
          {h.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions", header: "Actions",
      accessor: (h) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-purple-600 hover:text-purple-700" onClick={() => openEditHead(h)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive" onClick={() => setDeleteHeadTarget(h)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Fee Structure" />

      <Tabs defaultValue="heads" className="w-full">
        <TabsList className="mb-4 h-10 gap-1 rounded-lg bg-muted p-1">
          <TabsTrigger
            value="heads"
            className="rounded-md px-4 font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            Fee Heads
          </TabsTrigger>
          <TabsTrigger
            value="structures"
            className="rounded-md px-4 font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            Fee Structures
          </TabsTrigger>
        </TabsList>

        <TabsContent value="heads" className="mt-0 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Fee heads are the individual fee types (Tuition, Transport, Lab, etc.) used across fee structures.
            </p>
            <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNewHead}>
              <Plus className="h-4 w-4" /> New Fee Head
            </Button>
          </div>

          <DataTable
            data={feeHeads}
            columns={headColumns}
            rowKey={(h) => h.feeHeadKey}
            storageKey="fee-heads"
            searchPlaceholder="Search fee heads..."
            searchFields={(h) => `${h.feeHeadName} ${h.feeHeadCode}`}
            emptyMessage={loading ? "Loading fee heads..." : "No fee heads yet. Create one to get started."}
          />
        </TabsContent>

        <TabsContent value="structures" className="mt-0 space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <ChevronStat icon={Layers} label="Fee Structures" value={structures.length} colorClass="bg-primary" position="first" />
            <ChevronStat icon={ListChecks} label="Active Structures" value={activeCount} colorClass="bg-success" position="middle" />
            <ChevronStat icon={Wallet} label="Fee Heads Defined" value={feeHeads.length} colorClass="bg-[oklch(0.6_0.19_300)]" position="middle" />
            <ChevronStat icon={IndianRupee} label="Total Collectable" value={currency(totalCollectable)} colorClass="bg-info" position="last" />
          </div>

          <div className="flex justify-end">
            <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew}>
              <Plus className="h-4 w-4" /> New Fee Structure
            </Button>
          </div>

          <DataTable
            data={structures}
            columns={columns}
            rowKey={(r) => r.feeStructureKey}
            selectable
            storageKey="fee-structures"
            searchPlaceholder="Search fee structures..."
            searchFields={(r) => `${r.structureName} ${r.className} ${r.academicYearName}`}
            emptyMessage={loading ? "Loading fee structures..." : "No fee structures yet. Create one to get started."}
          />
        </TabsContent>
      </Tabs>

      {/* Fee Structure form */}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Fee Structure" : "New Fee Structure"}
        description="Define the fee heads, amounts and due dates that apply to a class for an academic year."
        submitLabel={editing ? "Save Changes" : "Create Structure"}
        onSubmit={save}
        submitting={saving}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label required>Academic Year</Label>
              <Select value={draft.academicYearKey} onValueChange={(v) => setDraft({ ...draft, academicYearKey: v })}>
                <SelectTrigger className="rounded-md"><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => <SelectItem key={y.academicYearKey} value={y.academicYearKey}>{y.yearName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label required>Class</Label>
              <Select value={draft.classCatalogKey} onValueChange={(v) => setDraft({ ...draft, classCatalogKey: v })}>
                <SelectTrigger className="rounded-md"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.classCatalogKey} value={c.classCatalogKey}>{c.className}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label required>Structure Name</Label>
            <Input
              value={draft.structureName}
              onChange={(e) => setDraft({ ...draft, structureName: e.target.value })}
              placeholder="e.g. Class V — General Fee Structure 2026-27"
              className="rounded-md"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Fee Heads</Label>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1 rounded-md" onClick={addItemRow}>
                <Plus className="h-3.5 w-3.5" /> Add Fee Head
              </Button>
            </div>

            <div className="space-y-2 rounded-md border border-border p-3">
              {draft.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 gap-2 border-b border-border pb-2 last:border-0 last:pb-0 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
                  <Select value={item.feeHeadKey} onValueChange={(v) => updateItemRow(idx, { feeHeadKey: v })}>
                    <SelectTrigger className="rounded-md"><SelectValue placeholder="Fee head" /></SelectTrigger>
                    <SelectContent>
                      {feeHeads.map((h) => <SelectItem key={h.feeHeadKey} value={h.feeHeadKey}>{h.feeHeadName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    value={item.amount}
                    onChange={(e) => updateItemRow(idx, { amount: e.target.value })}
                    placeholder="Amount"
                    className="rounded-md"
                  />
                  <Select value={item.frequency} onValueChange={(v) => updateItemRow(idx, { frequency: v as FeeStructureItem["frequency"] })}>
                    <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <DatePicker
                    value={item.dueDate}
                    onChange={(v) => updateItemRow(idx, { dueDate: v })}
                    placeholder="Due date"
                    className="w-full"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-md text-destructive justify-self-end sm:justify-self-auto"
                    onClick={() => removeItemRow(idx)}
                    disabled={draft.items.length === 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 rounded-md bg-muted/40 px-3 py-2">
              <span className="text-sm text-muted-foreground">Total per student:</span>
              <span className="font-display text-lg font-bold">{currency(draftTotal)}</span>
            </div>
          </div>
        </div>
      </FormDialog>

      {/* Fee head form */}
      <FormDialog
        open={headOpen}
        onOpenChange={setHeadOpen}
        title={editingHead ? "Edit Fee Head" : "New Fee Head"}
        description="Fee heads are the individual fee types (Tuition, Transport, Lab, etc.) used across fee structures."
        submitLabel={editingHead ? "Save Changes" : "Create Fee Head"}
        onSubmit={saveFeeHead}
        submitting={savingHead}
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Fee Head Name</Label>
            <Input
              value={headDraft.feeHeadName}
              onChange={(e) => setHeadDraft({ ...headDraft, feeHeadName: e.target.value })}
              placeholder="Tuition Fee"
              className="rounded-md"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label required>Fee Head Code</Label>
            <Input
              value={headDraft.feeHeadCode}
              onChange={(e) => setHeadDraft({ ...headDraft, feeHeadCode: e.target.value.toUpperCase() })}
              placeholder="TUITION"
              className="rounded-md"
              required
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label>Recurring</Label>
              <p className="text-xs text-muted-foreground">Applies per installment rather than a one-time charge.</p>
            </div>
            <Switch checked={headDraft.isRecurring} onCheckedChange={(v) => setHeadDraft({ ...headDraft, isRecurring: v })} />
          </div>
          {editingHead && (
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Inactive fee heads can't be added to new fee structures.</p>
              </div>
              <Switch checked={headDraft.isActive} onCheckedChange={(v) => setHeadDraft({ ...headDraft, isActive: v })} />
            </div>
          )}
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.structureName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Blocked if students are already assigned to this fee structure. This cannot be undone.
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

      <AlertDialog open={!!deleteHeadTarget} onOpenChange={(v) => !v && setDeleteHeadTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteHeadTarget?.feeHeadName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Blocked if this fee head is used in any fee structure. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); confirmDeleteHead(); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fee structure read-only view */}
      <Dialog open={!!viewTarget} onOpenChange={(v) => !v && setViewTarget(null)}>
        <DialogContent className="rounded-md sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">{viewTarget?.structureName}</DialogTitle>
            <DialogDescription>{viewTarget?.className} &middot; {viewTarget?.academicYearName}</DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge className={cn("rounded-md border-0 font-semibold", viewTarget.isActive ? "bg-emerald-600 dark:bg-emerald-500" : "bg-slate-600 dark:bg-slate-500", FEE_HEAD_PILL_SHINE)}>
                  {viewTarget.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2">Fee Head</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Frequency</th>
                      <th className="px-3 py-2">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewTarget.items.map((i) => (
                      <tr key={i.feeStructureItemKey} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">
                          <span className={cn("inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold", feeHeadColor(i.feeHeadKey), FEE_HEAD_PILL_SHINE)}>
                            {i.feeHeadName}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium">{currency(i.amount)}</td>
                        <td className="px-3 py-2 text-muted-foreground">{FREQUENCIES.find((f) => f.value === i.frequency)?.label ?? i.frequency}</td>
                        <td className="px-3 py-2 text-muted-foreground">{i.dueDate ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-2 rounded-md bg-muted/40 px-3 py-2">
                <span className="text-sm text-muted-foreground">Total per student:</span>
                <span className="font-display text-lg font-bold">{currency(viewTarget.totalAmount)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
