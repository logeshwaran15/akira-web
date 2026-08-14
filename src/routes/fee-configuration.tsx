import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Save, Loader2, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/fee-configuration")({
  head: () => ({
    meta: [
      { title: "Fee Configuration — Akira School ERP" },
      {
        name: "description",
        content: "Manage fee heads, class-wise fee slabs, concessions and late fee rules.",
      },
    ],
  }),
  component: FeeConfigurationPage,
});

type FeeHead = {
  feeHeadKey: string;
  feeHeadName: string;
  feeHeadCode: string;
  frequencyType: string;
  isRefundable: boolean;
};
type SchoolClass = { schoolClassKey: string; className: string };
type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type Slab = {
  feeSlabKey: string | null;
  feeHeadKey: string;
  feeHeadName: string;
  frequencyType: string;
  amount: number;
  priorYearAmount: number | null;
};
type Concession = {
  concessionCategoryKey: string;
  categoryName: string;
  discountType: string;
  discountValue: number;
  requiresApproval: boolean;
  isStackable: boolean;
};
type Settings = {
  lateFeeAmountPerDay: number;
  lateFeeMaxCapPerMonth: number;
  lateFeeGraceDays: number;
  maxAnnualFeeIncreasePercent: number;
};

const FREQUENCY_TYPES = ["MONTHLY", "TERMLY", "ANNUAL", "ONE_TIME", "CONDITIONAL"];

const FREQUENCY_STYLES: Record<string, string> = {
  MONTHLY: "bg-info/15 text-info",
  TERMLY: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  ANNUAL: "bg-success/15 text-success",
  ONE_TIME: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
  CONDITIONAL: "bg-[oklch(0.55_0.1_200)]/15 text-[oklch(0.4_0.12_200)]",
};

function FeeConfigurationPage() {
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearKey, setYearKey] = useState("");
  const [classKey, setClassKey] = useState("");
  const [slabs, setSlabs] = useState<Slab[]>([]);
  const [slabsLoading, setSlabsLoading] = useState(false);
  const [savingSlabKey, setSavingSlabKey] = useState<string | null>(null);

  const [headOpen, setHeadOpen] = useState(false);
  const [headDraft, setHeadDraft] = useState({
    feeHeadName: "",
    feeHeadCode: "",
    frequencyType: "MONTHLY",
    isRefundable: false,
  });
  const [headSaving, setHeadSaving] = useState(false);
  const [deleteHeadTarget, setDeleteHeadTarget] = useState<FeeHead | null>(null);

  const [concessions, setConcessions] = useState<Concession[]>([]);
  const [concessionOpen, setConcessionOpen] = useState(false);
  const [concessionDraft, setConcessionDraft] = useState({
    categoryName: "",
    discountType: "PERCENTAGE",
    discountValue: 0,
    requiresApproval: false,
    isStackable: false,
  });
  const [concessionSaving, setConcessionSaving] = useState(false);
  const [deleteConcessionTarget, setDeleteConcessionTarget] = useState<Concession | null>(null);

  const [settings, setSettings] = useState<Settings>({
    lateFeeAmountPerDay: 0,
    lateFeeMaxCapPerMonth: 0,
    lateFeeGraceDays: 0,
    maxAnnualFeeIncreasePercent: 10,
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  const load = () => {
    Promise.all([
      apiFetch("/api/FeeHead"),
      apiFetch("/api/SchoolClass"),
      apiFetch("/api/AcademicYear"),
      apiFetch("/api/ConcessionCategory"),
      apiFetch("/api/ConcessionCategory/settings"),
    ])
      .then(([fh, sc, y, cc, s]) => {
        setFeeHeads(fh);
        setClasses(sc);
        setYears(y);
        setConcessions(cc);
        if (s) setSettings(s);
        const active = (y as AcademicYear[]).find((year) => year.status === "Active") ?? y[0];
        if (active) setYearKey(active.academicYearKey);
        if (sc.length > 0) setClassKey(sc[0].schoolClassKey);
      })
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load fee configuration"),
      );
  };

  useEffect(load, []);

  useEffect(() => {
    if (!classKey || !yearKey) return;
    setSlabsLoading(true);
    apiFetch(`/api/FeeHead/slabs?schoolClassId=${classKey}&academicYearId=${yearKey}`)
      .then((d: Slab[]) => setSlabs(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load fee slabs"))
      .finally(() => setSlabsLoading(false));
  }, [classKey, yearKey]);

  const updateSlab = (feeHeadKey: string, amount: number) => {
    setSlabs((rows) => rows.map((r) => (r.feeHeadKey === feeHeadKey ? { ...r, amount } : r)));
  };

  const saveSlab = async (s: Slab) => {
    setSavingSlabKey(s.feeHeadKey);
    try {
      await apiFetch("/api/FeeHead/slabs", {
        method: "PUT",
        body: JSON.stringify({
          feeHeadKey: s.feeHeadKey,
          schoolClassKey: classKey,
          academicYearKey: yearKey,
          amount: s.amount,
        }),
      });
      toast.success(`${s.feeHeadName} fee saved`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save fee slab");
    } finally {
      setSavingSlabKey(null);
    }
  };

  const exceedsCap = (s: Slab) => {
    if (!s.priorYearAmount || s.priorYearAmount === 0) return false;
    const increasePercent = ((s.amount - s.priorYearAmount) / s.priorYearAmount) * 100;
    return increasePercent > settings.maxAnnualFeeIncreasePercent;
  };

  const openNewHead = () => {
    setHeadDraft({
      feeHeadName: "",
      feeHeadCode: "",
      frequencyType: "MONTHLY",
      isRefundable: false,
    });
    setHeadOpen(true);
  };

  const saveHead = async () => {
    setHeadSaving(true);
    try {
      await apiFetch("/api/FeeHead", {
        method: "POST",
        body: JSON.stringify({ ...headDraft, feeHeadCode: headDraft.feeHeadCode.toUpperCase() }),
      });
      toast.success("Fee head created");
      setHeadOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create fee head");
    } finally {
      setHeadSaving(false);
    }
  };

  const confirmDeleteHead = async () => {
    if (!deleteHeadTarget) return;
    try {
      await apiFetch(`/api/FeeHead/${deleteHeadTarget.feeHeadKey}`, { method: "DELETE" });
      toast.success("Fee head deleted");
      setDeleteHeadTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete fee head");
    }
  };

  const openNewConcession = () => {
    setConcessionDraft({
      categoryName: "",
      discountType: "PERCENTAGE",
      discountValue: 0,
      requiresApproval: false,
      isStackable: false,
    });
    setConcessionOpen(true);
  };

  const saveConcession = async () => {
    setConcessionSaving(true);
    try {
      await apiFetch("/api/ConcessionCategory", {
        method: "POST",
        body: JSON.stringify(concessionDraft),
      });
      toast.success("Concession category created");
      setConcessionOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create concession category");
    } finally {
      setConcessionSaving(false);
    }
  };

  const confirmDeleteConcession = async () => {
    if (!deleteConcessionTarget) return;
    try {
      await apiFetch(`/api/ConcessionCategory/${deleteConcessionTarget.concessionCategoryKey}`, {
        method: "DELETE",
      });
      toast.success("Concession category removed");
      setDeleteConcessionTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove concession category");
    }
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      await apiFetch("/api/ConcessionCategory/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      toast.success("Fee settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save fee settings");
    } finally {
      setSettingsSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Fee Configuration"
        breadcrumbs={[{ label: "School Setup" }, { label: "Fee Configuration" }]}
      />

      {/* Fee Heads */}
      <div className="rounded-md border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-display text-base font-semibold">Fee Heads</h2>
          <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={openNewHead}>
            <Plus className="h-3.5 w-3.5" /> New Fee Head
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Refundable</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feeHeads.map((h) => (
              <TableRow key={h.feeHeadKey}>
                <TableCell>
                  <div className="font-medium">{h.feeHeadName}</div>
                  <div className="font-mono text-xs text-muted-foreground">{h.feeHeadCode}</div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "rounded-md border-0",
                      FREQUENCY_STYLES[h.frequencyType] ?? "bg-muted text-muted-foreground",
                    )}
                  >
                    {h.frequencyType.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell>{h.isRefundable ? "Yes" : "No"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-md text-destructive"
                    onClick={() => setDeleteHeadTarget(h)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Fee Slabs */}
      <div className="mt-6 rounded-md border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
          <h2 className="font-display text-base font-semibold">
            Fee Slabs (Class-wise, Year-wise)
          </h2>
          <div className="flex items-center gap-2">
            <Select value={classKey} onValueChange={setClassKey}>
              <SelectTrigger className="h-9 w-[160px] rounded-md">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>
                    {c.className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearKey} onValueChange={setYearKey}>
              <SelectTrigger className="h-9 w-[160px] rounded-md">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y.academicYearKey} value={y.academicYearKey}>
                    {y.yearName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fee Head</TableHead>
              <TableHead>Prior Year</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="text-right">Save</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slabsLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : slabs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">
                  No fee heads yet.
                </TableCell>
              </TableRow>
            ) : (
              slabs.map((s) => (
                <TableRow key={s.feeHeadKey}>
                  <TableCell className="font-medium">{s.feeHeadName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.priorYearAmount != null ? `₹${s.priorYearAmount}` : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        value={s.amount}
                        onChange={(e) => updateSlab(s.feeHeadKey, Number(e.target.value))}
                        className="h-9 w-32 rounded-md"
                      />
                      {exceedsCap(s) && (
                        <Badge className="gap-1 rounded-md border-0 bg-destructive/15 text-destructive">
                          <AlertTriangle className="h-3 w-3" /> Exceeds{" "}
                          {settings.maxAnnualFeeIncreasePercent}% cap
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => saveSlab(s)}
                      disabled={savingSlabKey === s.feeHeadKey}
                    >
                      {savingSlabKey === s.feeHeadKey ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Concessions */}
      <div className="mt-6 rounded-md border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-display text-base font-semibold">Concession Categories</h2>
          <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={openNewConcession}>
            <Plus className="h-3.5 w-3.5" /> New Category
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Approval</TableHead>
              <TableHead>Stackable</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {concessions.map((c) => (
              <TableRow key={c.concessionCategoryKey}>
                <TableCell className="font-medium">{c.categoryName}</TableCell>
                <TableCell>
                  {c.discountType === "PERCENTAGE" ? `${c.discountValue}%` : `₹${c.discountValue}`}
                </TableCell>
                <TableCell>
                  {c.requiresApproval ? (
                    <Badge className="rounded-md border-0 bg-warning/25 text-[oklch(0.45_0.12_65)]">
                      Required
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>{c.isStackable ? "Yes" : "No"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-md text-destructive"
                    onClick={() => setDeleteConcessionTarget(c)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Late fee & compliance */}
      <div className="mt-6 rounded-md border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold">Late Fee & Compliance</h2>
            <p className="text-xs text-muted-foreground">
              TN fee-revision cap flags any slab increase beyond this % year-over-year.
            </p>
          </div>
          <Button
            size="sm"
            className="h-9 gap-1.5 rounded-md"
            onClick={saveSettings}
            disabled={settingsSaving}
          >
            {settingsSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}{" "}
            Save
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Late Fee / Day</Label>
            <Input
              type="number"
              min={0}
              value={settings.lateFeeAmountPerDay}
              onChange={(e) =>
                setSettings({ ...settings, lateFeeAmountPerDay: Number(e.target.value) })
              }
              className="rounded-md"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max Cap / Month</Label>
            <Input
              type="number"
              min={0}
              value={settings.lateFeeMaxCapPerMonth}
              onChange={(e) =>
                setSettings({ ...settings, lateFeeMaxCapPerMonth: Number(e.target.value) })
              }
              className="rounded-md"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Grace Days</Label>
            <Input
              type="number"
              min={0}
              value={settings.lateFeeGraceDays}
              onChange={(e) =>
                setSettings({ ...settings, lateFeeGraceDays: Number(e.target.value) })
              }
              className="rounded-md"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max Annual Fee Increase %</Label>
            <Input
              type="number"
              min={0}
              value={settings.maxAnnualFeeIncreasePercent}
              onChange={(e) =>
                setSettings({ ...settings, maxAnnualFeeIncreasePercent: Number(e.target.value) })
              }
              className="rounded-md"
            />
          </div>
        </div>
      </div>

      {/* New fee head dialog */}
      <FormDialog
        open={headOpen}
        onOpenChange={setHeadOpen}
        title="New Fee Head"
        submitLabel="Create"
        onSubmit={saveHead}
        submitting={headSaving}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Name</Label>
            <Input
              value={headDraft.feeHeadName}
              onChange={(e) => setHeadDraft({ ...headDraft, feeHeadName: e.target.value })}
              placeholder="Sports Fee"
              className="rounded-md"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label required>Code</Label>
              <Input
                value={headDraft.feeHeadCode}
                onChange={(e) =>
                  setHeadDraft({ ...headDraft, feeHeadCode: e.target.value.toUpperCase() })
                }
                placeholder="SPORTS"
                className="rounded-md"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label required>Frequency</Label>
              <Select
                value={headDraft.frequencyType}
                onValueChange={(v) => setHeadDraft({ ...headDraft, frequencyType: v })}
              >
                <SelectTrigger className="rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_TYPES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={headDraft.isRefundable}
              onCheckedChange={(v) => setHeadDraft({ ...headDraft, isRefundable: !!v })}
            />{" "}
            Refundable (e.g. Caution Deposit)
          </label>
        </div>
      </FormDialog>

      {/* New concession dialog */}
      <FormDialog
        open={concessionOpen}
        onOpenChange={setConcessionOpen}
        title="New Concession Category"
        submitLabel="Create"
        onSubmit={saveConcession}
        submitting={concessionSaving}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Category Name</Label>
            <Input
              value={concessionDraft.categoryName}
              onChange={(e) =>
                setConcessionDraft({ ...concessionDraft, categoryName: e.target.value })
              }
              placeholder="Alumni Discount"
              className="rounded-md"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label required>Discount Type</Label>
              <Select
                value={concessionDraft.discountType}
                onValueChange={(v) => setConcessionDraft({ ...concessionDraft, discountType: v })}
              >
                <SelectTrigger className="rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  <SelectItem value="FLAT">Flat Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label required>Discount Value</Label>
              <Input
                type="number"
                min={0}
                value={concessionDraft.discountValue}
                onChange={(e) =>
                  setConcessionDraft({ ...concessionDraft, discountValue: Number(e.target.value) })
                }
                className="rounded-md"
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={concessionDraft.requiresApproval}
                onCheckedChange={(v) =>
                  setConcessionDraft({ ...concessionDraft, requiresApproval: !!v })
                }
              />{" "}
              Requires approval
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={concessionDraft.isStackable}
                onCheckedChange={(v) =>
                  setConcessionDraft({ ...concessionDraft, isStackable: !!v })
                }
              />{" "}
              Stackable
            </label>
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteHeadTarget} onOpenChange={(v) => !v && setDeleteHeadTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteHeadTarget?.feeHeadName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Blocked if it still has fee slabs. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteHead();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteConcessionTarget}
        onOpenChange={(v) => !v && setDeleteConcessionTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{deleteConcessionTarget?.categoryName}"?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteConcession();
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
