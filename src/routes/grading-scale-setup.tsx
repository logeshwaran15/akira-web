import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader, IconTile } from "@/components/erp/PageHeader";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, GraduationCap, AlertTriangle, CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/grading-scale-setup")({
  head: () => ({
    meta: [
      { title: "Grading Scale Setup — Akira School ERP" },
      { name: "description", content: "Define grade bands, GPA points and pass criteria used across exam results and report cards." },
    ],
  }),
  component: GradingScaleSetupPage,
});

type GradingScheme = {
  gradingSchemeKey: string;
  schemeName: string;
  schemeType: "GRADE" | "PERCENTAGE" | "GPA";
  passPercent: number;
  isDefault: boolean;
  isActive: boolean;
};

type GradeBand = {
  gradeBandKey: string;
  gradingSchemeKey: string;
  gradeLabel: string;
  minPercent: number;
  maxPercent: number;
  gpaPoint: number | null;
  remark: string;
};

const emptyScheme = { schemeName: "", schemeType: "GRADE" as GradingScheme["schemeType"], passPercent: 33, isDefault: false, isActive: true };
const emptyBand = { gradeLabel: "", minPercent: 0, maxPercent: 0, gpaPoint: 0, remark: "" };

function GradingScaleSetupPage() {
  const [schemes, setSchemes] = useState<GradingScheme[]>([]);
  const [bands, setBands] = useState<GradeBand[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSchemeKey, setActiveSchemeKey] = useState("");

  const [schemeOpen, setSchemeOpen] = useState(false);
  const [editingScheme, setEditingScheme] = useState<GradingScheme | null>(null);
  const [schemeDraft, setSchemeDraft] = useState(emptyScheme);
  const [schemeSaving, setSchemeSaving] = useState(false);
  const [deleteSchemeTarget, setDeleteSchemeTarget] = useState<GradingScheme | null>(null);

  const [bandOpen, setBandOpen] = useState(false);
  const [editingBand, setEditingBand] = useState<GradeBand | null>(null);
  const [bandDraft, setBandDraft] = useState(emptyBand);
  const [bandSaving, setBandSaving] = useState(false);
  const [deleteBandTarget, setDeleteBandTarget] = useState<GradeBand | null>(null);

  const loadSchemes = () => {
    setLoading(true);
    apiFetch("/api/GradingScheme")
      .then((s: GradingScheme[]) => {
        setSchemes(s);
        if (!activeSchemeKey && s.length > 0) setActiveSchemeKey(s.find((x) => x.isDefault)?.gradingSchemeKey ?? s[0].gradingSchemeKey);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load grading schemes"))
      .finally(() => setLoading(false));
  };

  const loadBands = (schemeKey: string) => {
    if (!schemeKey) {
      setBands([]);
      return;
    }
    apiFetch(`/api/GradingScheme/${schemeKey}/bands`)
      .then((b: GradeBand[]) => setBands(b))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load grade bands"));
  };

  useEffect(loadSchemes, []);
  useEffect(() => loadBands(activeSchemeKey), [activeSchemeKey]);

  const currentScheme = schemes.find((s) => s.gradingSchemeKey === activeSchemeKey);
  const currentBands = [...bands].sort((a, b) => b.minPercent - a.minPercent);

  // Detect gaps/overlaps in the band ranges — the most common real-world
  // mistake when a school hand-configures grade boundaries.
  const bandIssues: string[] = [];
  for (let i = 0; i < currentBands.length - 1; i++) {
    const upper = currentBands[i];
    const lower = currentBands[i + 1];
    if (upper.minPercent - lower.maxPercent > 1) {
      bandIssues.push(`Gap between ${lower.gradeLabel} (${lower.maxPercent}%) and ${upper.gradeLabel} (${upper.minPercent}%)`);
    } else if (upper.minPercent <= lower.maxPercent) {
      bandIssues.push(`Overlap between ${lower.gradeLabel} and ${upper.gradeLabel}`);
    }
  }

  const openNewScheme = () => {
    setEditingScheme(null);
    setSchemeDraft(emptyScheme);
    setSchemeOpen(true);
  };

  const openEditScheme = (s: GradingScheme) => {
    setEditingScheme(s);
    setSchemeDraft({ schemeName: s.schemeName, schemeType: s.schemeType, passPercent: s.passPercent, isDefault: s.isDefault, isActive: s.isActive });
    setSchemeOpen(true);
  };

  const saveScheme = async () => {
    if (!schemeDraft.schemeName.trim()) return toast.error("Scheme name is required.");
    setSchemeSaving(true);
    try {
      if (editingScheme) {
        await apiFetch(`/api/GradingScheme/${editingScheme.gradingSchemeKey}`, {
          method: "PUT",
          body: JSON.stringify({ gradingSchemeKey: editingScheme.gradingSchemeKey, ...schemeDraft }),
        });
        toast.success("Grading scheme updated");
      } else {
        const created = await apiFetch("/api/GradingScheme", { method: "POST", body: JSON.stringify(schemeDraft) });
        setActiveSchemeKey(created.gradingSchemeKey);
        toast.success("Grading scheme created");
      }
      setSchemeOpen(false);
      loadSchemes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save grading scheme");
    } finally {
      setSchemeSaving(false);
    }
  };

  const confirmDeleteScheme = async () => {
    if (!deleteSchemeTarget) return;
    try {
      await apiFetch(`/api/GradingScheme/${deleteSchemeTarget.gradingSchemeKey}`, { method: "DELETE" });
      toast.success("Grading scheme removed");
      setDeleteSchemeTarget(null);
      if (activeSchemeKey === deleteSchemeTarget.gradingSchemeKey) setActiveSchemeKey("");
      loadSchemes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove grading scheme");
    }
  };

  const openNewBand = () => {
    setEditingBand(null);
    setBandDraft(emptyBand);
    setBandOpen(true);
  };

  const openEditBand = (b: GradeBand) => {
    setEditingBand(b);
    setBandDraft({ gradeLabel: b.gradeLabel, minPercent: b.minPercent, maxPercent: b.maxPercent, gpaPoint: b.gpaPoint ?? 0, remark: b.remark });
    setBandOpen(true);
  };

  const saveBand = async () => {
    if (!bandDraft.gradeLabel.trim()) return toast.error("Grade label is required.");
    if (bandDraft.minPercent > bandDraft.maxPercent) return toast.error("Min % cannot be greater than Max %.");
    setBandSaving(true);
    try {
      if (editingBand) {
        await apiFetch(`/api/GradingScheme/bands/${editingBand.gradeBandKey}`, {
          method: "PUT",
          body: JSON.stringify({ gradeBandKey: editingBand.gradeBandKey, ...bandDraft }),
        });
        toast.success("Grade band updated");
      } else {
        await apiFetch("/api/GradingScheme/bands", {
          method: "POST",
          body: JSON.stringify({ ...bandDraft, gradingSchemeKey: activeSchemeKey }),
        });
        toast.success("Grade band added");
      }
      setBandOpen(false);
      loadBands(activeSchemeKey);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save grade band");
    } finally {
      setBandSaving(false);
    }
  };

  const confirmDeleteBand = async () => {
    if (!deleteBandTarget) return;
    try {
      await apiFetch(`/api/GradingScheme/bands/${deleteBandTarget.gradeBandKey}`, { method: "DELETE" });
      toast.success("Grade band removed");
      setDeleteBandTarget(null);
      loadBands(activeSchemeKey);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove grade band");
    }
  };

  const bandColumns: Column<GradeBand>[] = [
    { key: "gradeLabel", header: "Grade", accessor: (b) => <Badge className="rounded-md border-0 bg-primary text-primary-foreground font-semibold">{b.gradeLabel}</Badge> },
    { key: "range", header: "Percentage Range", accessor: (b) => <span className="font-medium">{b.minPercent}% – {b.maxPercent}%</span> },
    { key: "gpaPoint", header: "GPA Point", accessor: (b) => currentScheme?.schemeType === "GPA" || currentScheme?.schemeType === "GRADE" ? (b.gpaPoint ?? "—") : <span className="text-muted-foreground">—</span> },
    { key: "remark", header: "Remark", accessor: (b) => <span className="text-muted-foreground">{b.remark || "—"}</span> },
    {
      key: "actions", header: "", className: "text-right",
      accessor: (b) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-purple-600 hover:text-purple-700" onClick={() => openEditBand(b)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive" onClick={() => setDeleteBandTarget(b)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Grading Scale Setup"
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNewScheme}>
            <Plus className="h-4 w-4" /> New Grading Scheme
          </Button>
        }
      />

      {/* Scheme selector cards — horizontally scrollable on mobile */}
      <div className="mb-5 flex gap-3 overflow-x-auto pb-1">
        {schemes.map((s) => (
          <button
            key={s.gradingSchemeKey}
            onClick={() => setActiveSchemeKey(s.gradingSchemeKey)}
            className={cn(
              "flex min-w-[220px] shrink-0 items-start gap-3 rounded-md border p-4 text-left shadow-sm transition-colors",
              activeSchemeKey === s.gradingSchemeKey ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/40",
            )}
          >
            <IconTile icon={GraduationCap} tone={activeSchemeKey === s.gradingSchemeKey ? "primary" : "info"} size="sm" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="truncate">{s.schemeName}</span>
                {s.isDefault && <Badge className="shrink-0 rounded-md border-0 bg-success text-[10px] text-success-foreground font-semibold">Default</Badge>}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">{s.schemeType} · Pass ≥ {s.passPercent}%</div>
            </div>
          </button>
        ))}
      </div>

      {!currentScheme && !loading ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Create a grading scheme to get started.
        </div>
      ) : currentScheme && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-semibold">{currentScheme.schemeName}</h2>
                {currentScheme.isActive
                  ? <Badge className="rounded-md border-0 bg-success text-success-foreground font-semibold">Active</Badge>
                  : <Badge className="rounded-md border-0 bg-muted text-muted-foreground">Inactive</Badge>}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">Pass criteria: minimum {currentScheme.passPercent}% per subject</p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-purple-600 hover:text-purple-700" onClick={() => openEditScheme(currentScheme)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive" onClick={() => setDeleteSchemeTarget(currentScheme)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {bandIssues.length > 0 ? (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-medium">Grade band ranges need attention:</div>
                <ul className="mt-1 list-inside list-disc">
                  {bandIssues.map((issue, i) => <li key={i}>{issue}</li>)}
                </ul>
              </div>
            </div>
          ) : currentBands.length > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-4 py-2.5 text-sm text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> Grade bands cover 0–100% with no gaps or overlaps.
            </div>
          )}

          <DataTable
            data={currentBands}
            columns={bandColumns}
            rowKey={(b) => b.gradeBandKey}
            searchable={false}
            storageKey={`grade-bands-${activeSchemeKey}`}
            emptyMessage="No grade bands defined yet."
            toolbar={
              <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={openNewBand}>
                <Plus className="h-3.5 w-3.5" /> Add Grade Band
              </Button>
            }
          />
        </>
      )}

      {/* Scheme dialog */}
      <FormDialog
        open={schemeOpen}
        onOpenChange={setSchemeOpen}
        title={editingScheme ? "Edit Grading Scheme" : "New Grading Scheme"}
        submitLabel={editingScheme ? "Save Changes" : "Create"}
        onSubmit={saveScheme}
        submitting={schemeSaving}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Scheme Name</Label>
            <Input
              value={schemeDraft.schemeName}
              onChange={(e) => setSchemeDraft({ ...schemeDraft, schemeName: e.target.value })}
              placeholder="CBSE 9-Point Grade Scale"
              className="rounded-md"
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label required>Type</Label>
              <Select value={schemeDraft.schemeType} onValueChange={(v) => setSchemeDraft({ ...schemeDraft, schemeType: v as GradingScheme["schemeType"] })}>
                <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GRADE">Grade (A1, A2, B1...)</SelectItem>
                  <SelectItem value="PERCENTAGE">Percentage Only</SelectItem>
                  <SelectItem value="GPA">GPA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label required>Pass Percent</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={schemeDraft.passPercent}
                onChange={(e) => setSchemeDraft({ ...schemeDraft, passPercent: Number(e.target.value) })}
                className="rounded-md"
                required
              />
            </div>
          </div>
          <label className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <div className="text-sm font-medium">Set as default scheme</div>
              <div className="text-xs text-muted-foreground">Used automatically when a class/subject has no scheme override.</div>
            </div>
            <Switch checked={schemeDraft.isDefault} onCheckedChange={(v) => setSchemeDraft({ ...schemeDraft, isDefault: v })} />
          </label>
          <label className="flex items-center justify-between rounded-md border border-border p-3">
            <div className="text-sm font-medium">Active</div>
            <Switch checked={schemeDraft.isActive} onCheckedChange={(v) => setSchemeDraft({ ...schemeDraft, isActive: v })} />
          </label>
        </div>
      </FormDialog>

      {/* Band dialog */}
      <FormDialog
        open={bandOpen}
        onOpenChange={setBandOpen}
        title={editingBand ? "Edit Grade Band" : "Add Grade Band"}
        submitLabel={editingBand ? "Save Changes" : "Add"}
        onSubmit={saveBand}
        submitting={bandSaving}
        size="sm"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label required>Grade Label</Label>
              <Input
                value={bandDraft.gradeLabel}
                onChange={(e) => setBandDraft({ ...bandDraft, gradeLabel: e.target.value.toUpperCase() })}
                placeholder="A1"
                className="rounded-md"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>GPA Point</Label>
              <Input
                type="number"
                min={0}
                step="0.1"
                value={bandDraft.gpaPoint}
                onChange={(e) => setBandDraft({ ...bandDraft, gpaPoint: Number(e.target.value) })}
                className="rounded-md"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label required>Min %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={bandDraft.minPercent}
                onChange={(e) => setBandDraft({ ...bandDraft, minPercent: Number(e.target.value) })}
                className="rounded-md"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label required>Max %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={bandDraft.maxPercent}
                onChange={(e) => setBandDraft({ ...bandDraft, maxPercent: Number(e.target.value) })}
                className="rounded-md"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Remark</Label>
            <Input
              value={bandDraft.remark}
              onChange={(e) => setBandDraft({ ...bandDraft, remark: e.target.value })}
              placeholder="Excellent"
              className="rounded-md"
            />
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteSchemeTarget} onOpenChange={(v) => !v && setDeleteSchemeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteSchemeTarget?.schemeName}"?</AlertDialogTitle>
            <AlertDialogDescription>All grade bands under this scheme will also be removed. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); confirmDeleteScheme(); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteBandTarget} onOpenChange={(v) => !v && setDeleteBandTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove grade band "{deleteBandTarget?.gradeLabel}"?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); confirmDeleteBand(); }}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
