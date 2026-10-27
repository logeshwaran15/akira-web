import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Download, Search,
  ArrowUp, ArrowDown, ChevronsUpDown, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ALL, DEFAULT_FILTERS,
  filterFeeReports, getFeeReports, sortFeeReports,
  type FeeReportFilters, type FeeReportRecord, type FeeReportSort, type FeeReportSortKey,
  type FeeStatus,
} from "@/lib/fee-reports";

export const Route = createFileRoute("/fee-reports")({
  head: () => ({
    meta: [
      { title: "Fee Reports — Akira School ERP" },
      { name: "description", content: "View, filter and export detailed fee collection, payment and outstanding reports." },
    ],
  }),
  component: FeeReportsPage,
});

// ---------- Formatting ----------

const currency = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const fmtLong = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

// ---------- Status badge ----------

const SHINE = "text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)]";

const STATUS_STYLE: Record<FeeStatus, string> = {
  Paid: `bg-[#178750] dark:bg-[#1FA05F] ${SHINE}`,
  Partial: `bg-[#B45C00] dark:bg-[#D6790A] ${SHINE}`,
  Pending: `bg-[#C62828] dark:bg-[#E03B3B] ${SHINE}`,
  Refunded: `bg-[#6D28D9] dark:bg-[#7C3AED] ${SHINE}`,
};

function StatusBadge({ status }: { status: FeeStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_STYLE[status])}>
      {status}
    </span>
  );
}

// ---------- Pagination helper ----------

function pageWindow(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, Math.min(page - 1, pages - 4));
  const end = Math.min(pages - 1, start + 2);
  if (start > 2) out.push("…");
  for (let p = start; p <= end; p++) out.push(p);
  if (end < pages - 1) out.push("…");
  out.push(pages);
  return out;
}

// ---------- Receipt helpers ----------

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Page ----------


function FeeReportsPage() {
  const [all, setAll] = useState<FeeReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<FeeReportFilters>(DEFAULT_FILTERS);
  const [applied, setApplied] = useState<FeeReportFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<FeeReportSort>({ key: "paidDate", dir: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    getFeeReports()
      .then(setAll)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load fee reports"))
      .finally(() => setLoading(false));
  }, []);

  // Search applies live (debounced); other filters apply on "Apply Filters".
  useEffect(() => {
    const t = setTimeout(() => {
      setApplied((a) => (a.search === draft.search ? a : { ...a, search: draft.search }));
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [draft.search]);

  const filtered = useMemo(() => filterFeeReports(all, applied), [all, applied]);
  const sorted = useMemo(() => sortFeeReports(filtered, sort), [filtered, sort]);


  const options = useMemo(() => {
    const uniq = (f: (r: FeeReportRecord) => string, rows = all) => [...new Set(rows.map(f))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const forClass = draft.className === ALL ? all : all.filter((r) => r.className === draft.className);
    return {
      academicYears: uniq((r) => r.academicYear).reverse(),
      classes: uniq((r) => r.className),
      sections: uniq((r) => r.section, forClass),
      feeTypes: uniq((r) => r.feeType),
      statuses: uniq((r) => r.status),
      paymentModes: uniq((r) => r.paymentMode),
    };
  }, [all, draft.className]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pages);
  const rows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const from = sorted.length ? (safePage - 1) * pageSize + 1 : 0;
  const to = Math.min(safePage * pageSize, sorted.length);

  const setDraftField = <K extends keyof FeeReportFilters>(k: K, v: FeeReportFilters[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const apply = () => { setApplied({ ...draft }); setPage(1); };
  const reset = () => { setDraft(DEFAULT_FILTERS); setApplied(DEFAULT_FILTERS); setPage(1); };

  const toggleSort = (key: FeeReportSortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
    setPage(1);
  };

  const exportCsv = () => {
    const head = ["Receipt No", "Student", "Admission No", "Class", "Fee Type", "Amount", "Paid Date", "Payment Mode", "Status", "Collected By"];
    const lines = sorted.map((r) =>
      [r.receiptNo, r.student, r.admissionNo, `${r.className}-${r.section}`, r.feeType, r.amount, fmtDate(r.paidDate), r.paymentMode, r.status, r.collectedBy ?? "-"]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
    );
    download("fee-report.csv", [head.join(","), ...lines].join("\n"), "text/csv");
    toast.success(`Exported ${sorted.length} records`);
  };

  // Active filter chips (only those differing from "all"/empty)
  const chips: { label: string; clear: () => void }[] = [];
  const clearField = (patch: Partial<FeeReportFilters>) => {
    setApplied((a) => ({ ...a, ...patch }));
    setDraft((d) => ({ ...d, ...patch }));
    setPage(1);
  };
  if (applied.academicYear !== ALL) chips.push({ label: `Academic Year: ${applied.academicYear}`, clear: () => clearField({ academicYear: ALL }) });
  if (applied.dateFrom || applied.dateTo) {
    chips.push({
      label: `Date: ${applied.dateFrom ? fmtLong(applied.dateFrom) : "…"} - ${applied.dateTo ? fmtLong(applied.dateTo) : "…"}`,
      clear: () => clearField({ dateFrom: "", dateTo: "" }),
    });
  }
  if (applied.className !== ALL) chips.push({ label: `Class: ${applied.className}`, clear: () => clearField({ className: ALL }) });
  if (applied.section !== ALL) chips.push({ label: `Section: ${applied.section}`, clear: () => clearField({ section: ALL }) });
  if (applied.feeType !== ALL) chips.push({ label: `Fee Type: ${applied.feeType}`, clear: () => clearField({ feeType: ALL }) });
  if (applied.status !== ALL) chips.push({ label: `Status: ${applied.status}`, clear: () => clearField({ status: ALL }) });
  if (applied.paymentMode !== ALL) chips.push({ label: `Mode: ${applied.paymentMode}`, clear: () => clearField({ paymentMode: ALL }) });

  const SortHead = ({ k, children, className }: { k: FeeReportSortKey; children: string; className?: string }) => {
    const active = sort.key === k;
    const Icon = !active ? ChevronsUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <th className={cn("whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground", className)}
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
        <button type="button" onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
          {children}
          <Icon className={cn("h-3 w-3", active ? "text-primary" : "opacity-50")} />
        </button>
      </th>
    );
  };

  const FilterSelect = ({ label, value, onChange, options, allLabel }: {
    label: string; value: string; onChange: (v: string) => void; options: string[]; allLabel?: string;
  }) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 rounded-md px-2 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {allLabel && <SelectItem value={ALL}>{allLabel}</SelectItem>}
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div>
      

      <PageHeader
        title="Fee Reports"
        actions={
          <>
            
            <Button className="gap-1.5 rounded-md bg-[#178750] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)] hover:bg-[#126b40] dark:bg-[#1FA05F] dark:hover:bg-[#178750]" onClick={exportCsv} disabled={!sorted.length}>
              <Download className="h-4 w-4" /> Export Report
            </Button>
          </>
        }
      />
      

      {/* Filters */}
      <div className="rounded-lg border border-border bg-card p-3">
        <h2 className="mb-2 font-display text-sm font-semibold">Filter Reports</h2>
        <div className="grid grid-cols-2 items-end gap-2 md:grid-cols-4 xl:grid-cols-[repeat(5,minmax(0,1fr))_minmax(0,2.2fr)_repeat(2,minmax(0,1fr))_auto]">
          <FilterSelect label="Academic Year" value={draft.academicYear} onChange={(v) => setDraftField("academicYear", v)} options={options.academicYears} />
          <FilterSelect label="Class" value={draft.className} onChange={(v) => setDraft((d) => ({ ...d, className: v, section: ALL }))} options={options.classes} allLabel="All Classes" />
          <FilterSelect label="Section" value={draft.section} onChange={(v) => setDraftField("section", v)} options={options.sections} allLabel="All Sections" />
          <FilterSelect label="Fee Type" value={draft.feeType} onChange={(v) => setDraftField("feeType", v)} options={options.feeTypes} allLabel="All Fee Types" />
          <FilterSelect label="Payment Status" value={draft.status} onChange={(v) => setDraftField("status", v)} options={options.statuses} allLabel="All Status" />
          <div className="col-span-2 space-y-1 md:col-span-2 xl:col-span-1">
            <Label className="text-xs text-muted-foreground">Date Range</Label>
            <div className="flex items-center gap-1">
              <DatePicker className="h-8 px-2 text-xs" placeholder="From" value={draft.dateFrom} max={draft.dateTo || undefined} onChange={(v) => setDraftField("dateFrom", v)} />
              <span className="text-muted-foreground">–</span>
              <DatePicker className="h-8 px-2 text-xs" placeholder="To" value={draft.dateTo} min={draft.dateFrom || undefined} onChange={(v) => setDraftField("dateTo", v)} />
            </div>
          </div>
          <FilterSelect label="Payment Mode" value={draft.paymentMode} onChange={(v) => setDraftField("paymentMode", v)} options={options.paymentModes} allLabel="All Modes" />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Search Student</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-8 rounded-md pl-7 text-xs" placeholder="Name, adm no, phone..."
                value={draft.search} onChange={(e) => setDraftField("search", e.target.value)}
              />
            </div>
          </div>
          <div className="col-span-2 flex justify-end gap-2 md:col-span-4 xl:col-span-1">
            <Button variant="outline" size="sm" className="h-8 rounded-md" onClick={reset}>Reset</Button>
            <Button size="sm" className="h-8 rounded-md" onClick={apply}>Apply</Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{from}–{to}</span> of{" "}
              <span className="font-semibold text-foreground">{sorted.length}</span> records
            </div>
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <span key={c.label} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px]">
                    {c.label}
                    <button type="button" aria-label={`Remove ${c.label}`} onClick={c.clear}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Show
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-8 w-[72px] rounded-md"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            entries
          </div>
        </div>

        <div className="overflow-x-auto border-t border-border">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/50">
              <tr>
                <SortHead k="receiptNo">Receipt No</SortHead>
                <SortHead k="student">Student</SortHead>
                <SortHead k="admissionNo">Admission No</SortHead>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Class</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Fee Type</th>
                <SortHead k="amount">Amount</SortHead>
                <SortHead k="paidDate">Paid Date</SortHead>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Payment Mode</th>
                <SortHead k="status">Status</SortHead>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Collected By</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={10} className="px-3 py-2"><Skeleton className="h-6 w-full" /></td></tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">No records match the selected filters.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium text-primary">{r.receiptNo}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium">{r.student}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">{r.admissionNo}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">{r.className}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">{r.feeType}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-semibold">{currency(r.amount)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">{fmtDate(r.paidDate)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">{r.paymentMode}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
                  <td className="whitespace-nowrap px-3 py-2.5">{r.collectedBy ?? "-"}</td>
                  
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-3">
          <span className="text-xs text-muted-foreground">Page {safePage} of {pages}</span>
          <div className="flex flex-wrap items-center gap-1">
            <Button variant="outline" size="sm" className="rounded-md" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Previous</Button>
            {pageWindow(safePage, pages).map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="px-1 text-muted-foreground">…</span>
              ) : (
                <Button key={p} size="sm" variant={p === safePage ? "default" : "outline"} className="h-8 w-8 rounded-md p-0" onClick={() => setPage(p)}>
                  {p}
                </Button>
              ),
            )}
            <Button variant="outline" size="sm" className="rounded-md" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}



