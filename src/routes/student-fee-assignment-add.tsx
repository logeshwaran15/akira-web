import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { BackButton } from "@/components/erp/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { StudentAvatar } from "@/components/erp/StudentAvatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search, ChevronRight, Sparkles, Check,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/student-fee-assignment-add")({
  head: () => ({
    meta: [
      { title: "Assign Fee Structure — Akira School ERP" },
      { name: "description", content: "Select a fee structure, choose students and apply discounts if required." },
    ],
  }),
  component: AssignFeeStructurePage,
});

// ---------- Types ----------

type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type SchoolClass = { schoolClassKey: string; classCatalogKey: string; classCode: string; className: string };
type FeeStructure = { feeStructureKey: string; academicYearKey: string; classCatalogKey: string; structureName: string; totalAmount: number; isActive: boolean };

type UnassignedStudent = {
  studentKey: string;
  studentEnrollmentKey: string;
  studentName: string;
  admissionNumber: string;
  photoUrl: string | null;
  gender: string | null;
  rollNumber: string | null;
  sectionLabel: string | null;
};

type DiscountDraft = { type: "" | "PERCENTAGE" | "FLAT"; value: string; reason: string };

const currency = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function AssignFeeStructurePage() {
  const navigate = useNavigate();

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);

  const [yearKey, setYearKey] = useState("");
  const [classKey, setClassKey] = useState("");
  const [structureKey, setStructureKey] = useState("");
  const [unassigned, setUnassigned] = useState<UnassignedStudent[]>([]);
  const [loadingUnassigned, setLoadingUnassigned] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [bulkDiscount, setBulkDiscount] = useState<DiscountDraft>({ type: "", value: "", reason: "" });
  const [bulkDiscountOpen, setBulkDiscountOpen] = useState(false);
  const [perStudentDiscount, setPerStudentDiscount] = useState<Record<string, DiscountDraft>>({});
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/AcademicYear"),
      apiFetch("/api/SchoolClass"),
      apiFetch("/api/FeeStructure"),
    ])
      .then(([y, c, fs]) => {
        setYears(y ?? []);
        setClasses(c ?? []);
        setStructures(fs ?? []);
        const active = (y ?? []).find((x: AcademicYear) => x.status.toUpperCase() === "ACTIVE");
        setYearKey(active?.academicYearKey ?? y?.[0]?.academicYearKey ?? "");
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load fee assignment data"));
  }, []);

  const structuresForClass = useMemo(() => {
    const cls = classes.find((c) => c.schoolClassKey === classKey);
    if (!cls) return [];
    return structures.filter((s) => s.classCatalogKey === cls.classCatalogKey && s.academicYearKey === yearKey && s.isActive);
  }, [classes, structures, classKey, yearKey]);

  // Load unassigned students automatically as soon as year + class are picked —
  // no separate "Next" step; the list below just fills in.
  useEffect(() => {
    setUnassigned([]);
    setSelected([]);
    setPerStudentDiscount({});
    if (!yearKey || !classKey) return;
    setLoadingUnassigned(true);
    apiFetch(`/api/StudentFeeAssignment/unassigned?academicYearId=${yearKey}&schoolClassId=${classKey}`)
      .then((d: UnassignedStudent[]) => {
        setUnassigned(d ?? []);
        setSelected((d ?? []).map((s) => s.studentKey));
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load students"))
      .finally(() => setLoadingUnassigned(false));
  }, [yearKey, classKey]);

  const filteredUnassigned = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return unassigned;
    return unassigned.filter((s) =>
      `${s.studentName} ${s.admissionNumber} ${s.rollNumber ?? ""}`.toLowerCase().includes(q));
  }, [unassigned, studentSearch]);

  const toggleStudent = (key: string) =>
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));

  const allSelected = filteredUnassigned.length > 0 && filteredUnassigned.every((s) => selected.includes(s.studentKey));
  const toggleAll = () =>
    setSelected(allSelected
      ? selected.filter((k) => !filteredUnassigned.some((s) => s.studentKey === k))
      : Array.from(new Set([...selected, ...filteredUnassigned.map((s) => s.studentKey)])));

  const selectedStructure = structures.find((s) => s.feeStructureKey === structureKey);

  const effectiveDiscount = (studentKey: string): DiscountDraft =>
    perStudentDiscount[studentKey] ?? bulkDiscount;

  const discountForStudent = (studentKey: string) => {
    const base = selectedStructure?.totalAmount ?? 0;
    const d = effectiveDiscount(studentKey);
    if (!d.type || !d.value) return 0;
    const v = Number(d.value) || 0;
    const discount = d.type === "PERCENTAGE" ? (base * v) / 100 : v;
    return Math.min(discount, base);
  };

  const netForStudent = (studentKey: string) => {
    const base = selectedStructure?.totalAmount ?? 0;
    return Math.max(0, base - discountForStudent(studentKey));
  };

  const baseAmount = selectedStructure ? selectedStructure.totalAmount * selected.length : 0;
  const discountTotal = selected.reduce((sum, key) => sum + discountForStudent(key), 0);
  const netTotal = Math.max(0, baseAmount - discountTotal);

  const doAssign = async () => {
    if (!yearKey || !classKey || !structureKey) {
      toast.error("Select academic year, class and fee structure first");
      return;
    }
    if (selected.length === 0) {
      toast.error("Select at least one student");
      return;
    }
    setAssigning(true);
    try {
      const payload = {
        feeStructureKey: structureKey,
        academicYearKey: yearKey,
        students: selected.map((studentKey) => {
          const enrollment = unassigned.find((s) => s.studentKey === studentKey)?.studentEnrollmentKey;
          const d = effectiveDiscount(studentKey);
          return {
            studentKey,
            studentEnrollmentKey: enrollment,
            discountType: d.type || null,
            discountValue: d.type ? Number(d.value) || 0 : null,
            discountReason: d.type ? d.reason || null : null,
          };
        }),
      };

      const res = await apiFetch("/api/StudentFeeAssignment/bulk-assign", { method: "POST", body: JSON.stringify(payload) });
      toast.success(`Fee structure assigned to ${res?.assignedCount ?? selected.length} student(s)`);
      navigate({ to: "/student-fee-assignment" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign fee structure");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Assign Fee Structure"
        breadcrumbs={[{ label: "Student Fee Assignment", to: "/student-fee-assignment" }, { label: "Assign Fee Structure" }]}
        actions={<BackButton to="/student-fee-assignment" label="Back to Assignments" className="mb-0 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary" />}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="rounded-md border border-border bg-card p-5 shadow-sm">
        {/* ---------- Fee structure selection ---------- */}
        <div className="mb-4 text-sm font-semibold">1. Choose Fee Structure</div>
        <div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label required>Academic Year</Label>
              <Select value={yearKey} onValueChange={setYearKey}>
                <SelectTrigger className="rounded-md"><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => <SelectItem key={y.academicYearKey} value={y.academicYearKey}>{y.yearName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label required>Class</Label>
              <Select value={classKey} onValueChange={(v) => { setClassKey(v); setStructureKey(""); }}>
                <SelectTrigger className="rounded-md"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>{c.className}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <Label required>Fee Structure</Label>
            {(!classKey || !yearKey) ? (
              <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                Select {!yearKey && !classKey ? "an academic year and class" : !yearKey ? "an academic year" : "a class"} above to see available fee structures.
              </p>
            ) : structuresForClass.length === 0 ? (
              <p className="rounded-md border border-dashed border-warning/40 bg-warning/5 p-4 text-center text-xs text-warning-foreground">
                No active fee structure found for this class and year. Create one first on the Fee Structure page.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {structuresForClass.map((s) => {
                  const isSelected = structureKey === s.feeStructureKey;
                  return (
                    <button
                      type="button"
                      key={s.feeStructureKey}
                      onClick={() => setStructureKey(s.feeStructureKey)}
                      className={cn(
                        "flex items-start gap-2.5 rounded-md border p-3 text-left transition-colors",
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                      )}
                    >
                      <span className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                        isSelected ? "border-primary bg-primary" : "border-input",
                      )}>
                        {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{s.structureName}</div>
                        <div className="mt-0.5 text-sm font-medium text-primary">{currency(s.totalAmount)}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ---------- Student selection ---------- */}
        {classKey && yearKey && structureKey && (
          <div className="mt-5 border-t border-border pt-5">
            <div className="mb-4 text-sm font-semibold">2. Select Students</div>

            <div className="space-y-4">
              {/* Bulk discount (collapsible) */}
              <Collapsible open={bulkDiscountOpen} onOpenChange={setBulkDiscountOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-left text-sm font-medium"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" /> Apply Bulk Discount (Optional)
                    </span>
                    <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", bulkDiscountOpen && "rotate-90")} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 rounded-md border border-border p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1.5fr]">
                    <Select value={bulkDiscount.type || "none"} onValueChange={(v) => setBulkDiscount({ ...bulkDiscount, type: v === "none" ? "" : (v as any) })}>
                      <SelectTrigger className="h-9 rounded-md"><SelectValue placeholder="No discount" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No discount</SelectItem>
                        <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                        <SelectItem value="FLAT">Flat amount (₹)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="0"
                      placeholder={bulkDiscount.type === "PERCENTAGE" ? "e.g. 10" : "e.g. 2000"}
                      value={bulkDiscount.value}
                      onChange={(e) => setBulkDiscount({ ...bulkDiscount, value: e.target.value })}
                      disabled={!bulkDiscount.type}
                      className="h-9 rounded-md"
                    />
                    <Input
                      placeholder="Reason (e.g. Sibling discount)"
                      value={bulkDiscount.reason}
                      onChange={(e) => setBulkDiscount({ ...bulkDiscount, reason: e.target.value })}
                      disabled={!bulkDiscount.type}
                      className="h-9 rounded-md"
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Applies to every selected student unless you set a different discount for them individually below.
                  </p>
                </CollapsibleContent>
              </Collapsible>

              {/* Search + select all */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name, admission or roll no..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="ml-auto flex items-center gap-2 text-sm">
                  <span className="font-medium text-foreground">{selected.length} Selected</span>
                  {selected.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setSelected([])}>
                      Clear Selection
                    </Button>
                  )}
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                Select All <span className="text-muted-foreground">({filteredUnassigned.length} available)</span>
              </label>

              {/* Student list */}
              {loadingUnassigned ? (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Loading students...
                </div>
              ) : filteredUnassigned.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  {unassigned.length === 0
                    ? "Every enrolled student in this class already has a fee assignment for this year."
                    : "No students match your search."}
                </div>
              ) : (
                <div className="max-h-[420px] space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
                  {filteredUnassigned.map((s) => {
                    const isSelected = selected.includes(s.studentKey);
                    const d = effectiveDiscount(s.studentKey);
                    const hasOwnDiscount = !!perStudentDiscount[s.studentKey]?.type;
                    const discountAmt = discountForStudent(s.studentKey);
                    return (
                      <div
                        key={s.studentKey}
                        className={cn(
                          "flex items-center gap-2 rounded-md border p-2 transition-colors",
                          isSelected ? "border-primary/30 bg-primary/[0.04]" : "border-transparent bg-background hover:bg-muted/40",
                        )}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleStudent(s.studentKey)} />
                          <StudentAvatar photoUrl={s.photoUrl} gender={s.gender} studentName={s.studentName} className="h-7 w-7 border border-border" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{s.studentName}</div>
                            <div className="truncate text-[11px] text-muted-foreground">
                              {s.admissionNumber}{s.rollNumber ? ` · Roll ${s.rollNumber}` : ""}{s.sectionLabel ? ` · ${s.sectionLabel}` : ""}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="flex shrink-0 items-center gap-1">
                            <Select
                              value={d.type || "none"}
                              onValueChange={(v) =>
                                setPerStudentDiscount((p) => ({
                                  ...p,
                                  [s.studentKey]: v === "none" ? { type: "", value: "", reason: "" } : { ...d, type: v as any },
                                }))
                              }
                            >
                              <SelectTrigger className="h-6 w-[86px] rounded-md px-1.5 text-[10px]"><SelectValue placeholder="Discount" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">{hasOwnDiscount ? "No discount" : "Use bulk"}</SelectItem>
                                <SelectItem value="PERCENTAGE">% Percentage</SelectItem>
                                <SelectItem value="FLAT">₹ Flat</SelectItem>
                              </SelectContent>
                            </Select>
                            {hasOwnDiscount && (
                              <Input
                                type="number"
                                min="0"
                                value={d.value}
                                onChange={(e) => setPerStudentDiscount((p) => ({ ...p, [s.studentKey]: { ...d, value: e.target.value } }))}
                                className="h-6 w-12 rounded-md px-1.5 text-[10px]"
                                placeholder="Value"
                              />
                            )}
                            <div className="w-16 text-right text-[10px]">
                              {discountAmt > 0 && (
                                <div className="truncate text-muted-foreground line-through">{currency(selectedStructure?.totalAmount ?? 0)}</div>
                              )}
                              <div className="truncate font-semibold">{currency(netForStudent(s.studentKey))}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* ---------- Summary + submit (sticky right rail) ---------- */}
      {classKey && yearKey && structureKey && (
        <div className="h-fit rounded-md border border-border bg-card p-4 shadow-sm lg:sticky lg:top-4">
          <div className="mb-3 text-sm font-semibold">{selected.length} Student{selected.length === 1 ? "" : "s"} Selected</div>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Base Amount</span>
              <span className="font-medium">{currency(baseAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Discount</span>
              <span className="font-medium text-destructive">{discountTotal > 0 ? `-${currency(discountTotal)}` : currency(0)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2.5">
              <span className="text-xs font-medium text-muted-foreground">Net Payable</span>
              <span className="font-display text-lg font-bold text-primary">{currency(netTotal)}</span>
            </div>
          </div>
          <Button className="mt-4 h-10 w-full gap-1.5 rounded-md bg-success text-success-foreground hover:bg-success/90" onClick={doAssign} disabled={assigning || selected.length === 0}>
            {assigning ? "Assigning..." : `Assign to ${selected.length} Student${selected.length === 1 ? "" : "s"}`}
          </Button>
        </div>
      )}
      </div>
    </div>
  );
}
