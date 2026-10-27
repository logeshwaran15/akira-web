import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ChevronDown, ChevronRight, Search, Network, X, Info,
  Mail, Phone, GraduationCap, CalendarDays, Building2, ArrowUp,
  Users2, UserCog, Layers, Expand, Shrink, Download, SlidersHorizontal,
  List, LayoutGrid, GitBranch, MoreVertical, AlertTriangle, RotateCw, Lightbulb,
} from "lucide-react";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reporting-structure")({
  head: () => ({
    meta: [
      { title: "Reporting Structure — Akira School ERP" },
      { name: "description", content: "A live org chart built from each staff member's Reports To assignment." },
    ],
  }),
  component: ReportingStructurePage,
});

/* ------------------------------------------------------------------ */
/* Types, tree-building and search — unchanged business logic          */
/* ------------------------------------------------------------------ */

type StaffRow = {
  staffProfileKey: string;
  akiraUserKey: string;
  userName: string;
  email: string;
  mobileNo: string | null;
  designation: string;
  qualification: string | null;
  departmentName: string | null;
  profileImagePath: string | null;
  reportsToUserKey: string | null;
  joiningDate: string | null;
  isActive: boolean;
};

type TreeNode = StaffRow & { children: TreeNode[]; depth: number };

const DESIGNATION_STYLES: Record<string, string> = {
  PGT: "bg-info/15 text-info",
  TGT: "bg-success/15 text-success",
  PRT: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  PRINCIPAL: "bg-primary/15 text-primary",
  VICE_PRINCIPAL: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
  COORDINATOR: "bg-[oklch(0.55_0.1_200)]/15 text-[oklch(0.4_0.12_200)]",
};

const initialsOf = (name: string) =>
  name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso.slice(0, 10));
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

function buildForest(staff: StaffRow[]): TreeNode[] {
  const byKey = new Map<string, TreeNode>();
  staff.forEach((s) => byKey.set(s.akiraUserKey, { ...s, children: [], depth: 0 }));

  const roots: TreeNode[] = [];
  byKey.forEach((node) => {
    const parent = node.reportsToUserKey ? byKey.get(node.reportsToUserKey) : undefined;
    if (parent && parent.akiraUserKey !== node.akiraUserKey) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const assignDepth = (node: TreeNode, depth: number) => {
    node.depth = depth;
    node.children.sort((a, b) => a.userName.localeCompare(b.userName));
    node.children.forEach((c) => assignDepth(c, depth + 1));
  };
  roots.sort((a, b) => a.userName.localeCompare(b.userName));
  roots.forEach((r) => assignDepth(r, 0));

  return roots;
}

function collectMatchIds(nodes: TreeNode[], query: string): Set<string> {
  const ids = new Set<string>();
  const q = query.toLowerCase();

  const walk = (n: TreeNode, ancestors: string[]): boolean => {
    const selfMatch =
      n.userName.toLowerCase().includes(q) ||
      n.designation.toLowerCase().includes(q) ||
      (n.departmentName ?? "").toLowerCase().includes(q);
    let childMatch = false;
    n.children.forEach((c) => {
      if (walk(c, [...ancestors, n.akiraUserKey])) childMatch = true;
    });
    if (selfMatch || childMatch) {
      ids.add(n.akiraUserKey);
      ancestors.forEach((a) => ids.add(a));
      return true;
    }
    return false;
  };

  nodes.forEach((n) => walk(n, []));
  return ids;
}

/* ------------------------------------------------------------------ */
/* Client-side-only filters (Department / Designation / Status) --      */
/* derived purely from data already loaded, no new API calls.          */
/* ------------------------------------------------------------------ */

type Filters = { department: string; designation: string; status: string };
const emptyFilters: Filters = { department: "all", designation: "all", status: "all" };

function collectFilterIds(nodes: TreeNode[], filters: Filters): Set<string> | null {
  if (filters.department === "all" && filters.designation === "all" && filters.status === "all") {
    return null;
  }
  const ids = new Set<string>();

  const walk = (n: TreeNode, ancestors: string[]): boolean => {
    const selfMatch =
      (filters.department === "all" || (n.departmentName ?? "Unassigned") === filters.department) &&
      (filters.designation === "all" || n.designation === filters.designation) &&
      (filters.status === "all" || (filters.status === "active" ? n.isActive : !n.isActive));
    let childMatch = false;
    n.children.forEach((c) => {
      if (walk(c, [...ancestors, n.akiraUserKey])) childMatch = true;
    });
    if (selfMatch || childMatch) {
      ids.add(n.akiraUserKey);
      ancestors.forEach((a) => ids.add(a));
      return true;
    }
    return false;
  };

  nodes.forEach((n) => walk(n, []));
  return ids;
}

function intersect(a: Set<string> | null, b: Set<string> | null): Set<string> | null {
  if (!a) return b;
  if (!b) return a;
  const out = new Set<string>();
  a.forEach((v) => { if (b.has(v)) out.add(v); });
  return out;
}

function exportStaffCsv(staff: StaffRow[]) {
  const header = ["Name", "Designation", "Department", "Reports To", "Status"];
  const byKey = new Map(staff.map((s) => [s.akiraUserKey, s]));
  const rows = staff.map((s) => [
    s.userName,
    s.designation,
    s.departmentName ?? "",
    s.reportsToUserKey ? byKey.get(s.reportsToUserKey)?.userName ?? "" : "",
    s.isActive ? "Active" : "Inactive",
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reporting-structure.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

function ReportingStructurePage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [pendingFilters, setPendingFilters] = useState<Filters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError(false);
    apiFetch("/api/StaffProfile")
      .then((d: StaffRow[]) => {
        setStaff(d);
        if (d.length > 0) {
          const topRoot = [...d]
            .filter((s) => !s.reportsToUserKey)
            .sort((a, b) => a.userName.localeCompare(b.userName))[0];
          setFocusedKey((topRoot ?? d[0]).akiraUserKey);
        }
      })
      .catch((err) => {
        setLoadError(true);
        toast.error(err instanceof Error ? err.message : "Failed to load staff");
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const forest = useMemo(() => buildForest(staff), [staff]);
  const byKey = useMemo(() => {
    const map = new Map<string, TreeNode>();
    const walk = (n: TreeNode) => {
      map.set(n.akiraUserKey, n);
      n.children.forEach(walk);
    };
    forest.forEach(walk);
    return map;
  }, [forest]);

  const searchMatchIds = useMemo(() => (query.trim() ? collectMatchIds(forest, query.trim()) : null), [forest, query]);
  const filterMatchIds = useMemo(() => collectFilterIds(forest, filters), [forest, filters]);
  const matchIds = useMemo(() => intersect(searchMatchIds, filterMatchIds), [searchMatchIds, filterMatchIds]);

  const departmentOptions = useMemo(
    () => Array.from(new Set(staff.map((s) => s.departmentName ?? "Unassigned"))).sort(),
    [staff],
  );
  const designationOptions = useMemo(
    () => Array.from(new Set(staff.map((s) => s.designation))).sort(),
    [staff],
  );

  const managerCount = useMemo(
    () => staff.filter((s) => staff.some((x) => x.reportsToUserKey === s.akiraUserKey)).length,
    [staff],
  );
  const rootCount = forest.length;

  const toggle = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => {
    const all = new Set<string>();
    const walk = (n: TreeNode) => {
      if (n.children.length) all.add(n.akiraUserKey);
      n.children.forEach(walk);
    };
    forest.forEach(walk);
    setCollapsed(all);
  };

  const focused = focusedKey ? byKey.get(focusedKey) ?? null : null;
  const manager = focused?.reportsToUserKey ? byKey.get(focused.reportsToUserKey) ?? null : null;
  const detailPerson = detailKey ? byKey.get(detailKey) ?? null : null;

  const filtersActive = filters.department !== "all" || filters.designation !== "all" || filters.status !== "all";

  const openFilters = () => { setPendingFilters(filters); setFiltersOpen(true); };
  const applyFilters = () => { setFilters(pendingFilters); setFiltersOpen(false); };
  const clearFilters = () => { setFilters(emptyFilters); setPendingFilters(emptyFilters); setFiltersOpen(false); };

  const selectFocus = (key: string) => {
    setFocusedKey(key);
    setSidebarOpen(false);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="pb-6">
        <PageHeader title="Reporting Structure" />
        <p className="-mt-4 mb-5 max-w-2xl text-sm text-muted-foreground">
          View and manage the reporting hierarchy and relationships across your organization.
        </p>

        {/* Summary chips */}
        <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:max-w-2xl">
          <SummaryChip icon={Users2} label="Total Staff" value={staff.length} />
          <SummaryChip icon={UserCog} label="Managers" value={managerCount} />
          <SummaryChip icon={Network} label="Employees" value={Math.max(staff.length - managerCount, 0)} />
          <SummaryChip icon={Layers} label="Top-Level Staff" value={rootCount} />
        </div>

        {/* Toolbar */}
        <div className="mb-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, designation, department..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-8 text-sm outline-none focus:border-primary"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Popover open={filtersOpen} onOpenChange={(v) => (v ? openFilters() : setFiltersOpen(false))}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 gap-1.5 rounded-md">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filters
                  {filtersActive && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-primary" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 space-y-3 p-4">
                <FilterFields
                  filters={pendingFilters}
                  onChange={setPendingFilters}
                  departmentOptions={departmentOptions}
                  designationOptions={designationOptions}
                />
                <div className="flex justify-between gap-2 pt-1">
                  <Button variant="outline" size="sm" className="h-8 rounded-md" onClick={clearFilters}>Clear Filters</Button>
                  <Button size="sm" className="h-8 rounded-md" onClick={applyFilters}>Apply Filters</Button>
                </div>
              </PopoverContent>
            </Popover>

            <IconButton tooltip="Expand all hierarchy levels" onClick={expandAll}>
              <Expand className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Expand All</span>
            </IconButton>
            <IconButton tooltip="Collapse all hierarchy levels" onClick={collapseAll}>
              <Shrink className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Collapse All</span>
            </IconButton>
            <IconButton tooltip="Export the current staff list as CSV" onClick={() => exportStaffCsv(staff)} disabled={staff.length === 0}>
              <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Export</span>
            </IconButton>

            <ViewSwitcher />
          </div>
        </div>

        {/* Mobile: open organization panel */}
        <div className="mb-4 lg:hidden">
          <Button variant="outline" className="h-10 w-full gap-1.5 rounded-md" onClick={() => setSidebarOpen(true)}>
            <GitBranch className="h-3.5 w-3.5" /> Organization Panel
          </Button>
        </div>

        {loading ? (
          <LoadingState />
        ) : loadError ? (
          <ErrorState onRetry={load} />
        ) : forest.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-4 lg:flex-row">
            {/* Desktop sidebar */}
            <div className="hidden lg:block lg:w-[300px] lg:shrink-0">
              <OrganizationPanel
                forest={forest}
                collapsed={collapsed}
                onToggle={toggle}
                matchIds={matchIds}
                focusedKey={focusedKey}
                onSelect={selectFocus}
                total={staff.length}
              />
            </div>

            {/* Mobile sheet */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetContent side="left" className="w-[85%] max-w-sm p-0">
                <SheetHeader className="border-b border-border p-4 text-left">
                  <SheetTitle>Organization</SheetTitle>
                </SheetHeader>
                <div className="p-3">
                  <OrganizationPanel
                    forest={forest}
                    collapsed={collapsed}
                    onToggle={toggle}
                    matchIds={matchIds}
                    focusedKey={focusedKey}
                    onSelect={selectFocus}
                    total={staff.length}
                    bare
                  />
                </div>
              </SheetContent>
            </Sheet>

            {/* Org chart */}
            <div className="min-w-0 flex-1 overflow-x-auto rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              {!focused ? (
                <div className="flex h-full min-h-[300px] items-center justify-center text-sm text-muted-foreground">
                  Select a staff member from the organization panel.
                </div>
              ) : matchIds && !matchIds.has(focused.akiraUserKey) ? (
                <NoSearchResults />
              ) : (
                <div className="flex min-w-max flex-col items-center gap-0">
                  {manager && (
                    <>
                      <OrgCard
                        person={manager}
                        variant="manager"
                        onFocus={() => setFocusedKey(manager.akiraUserKey)}
                        onInfo={() => setDetailKey(manager.akiraUserKey)}
                      />
                      <div className="h-8 w-px bg-border" />
                    </>
                  )}

                  <OrgCard
                    person={focused}
                    variant="focused"
                    onInfo={() => setDetailKey(focused.akiraUserKey)}
                  />

                  {focused.children.length > 0 && (
                    <>
                      <div className="h-8 w-px bg-border" />
                      <div className="relative flex items-start justify-center">
                        {focused.children.length > 1 && (
                          <div className="absolute left-[10%] right-[10%] top-0 h-px bg-border" />
                        )}
                        <div className="flex flex-wrap items-start justify-center gap-4">
                          {focused.children.map((child) => (
                            <div key={child.akiraUserKey} className="flex flex-col items-center">
                              <div className="h-4 w-px bg-border" />
                              <OrgCard
                                person={child}
                                variant="report"
                                onFocus={() => setFocusedKey(child.akiraUserKey)}
                                onInfo={() => setDetailKey(child.akiraUserKey)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {focused.children.length === 0 && (
                    <div className="mt-3 text-xs text-muted-foreground">No direct reports</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <EmployeeDetailDrawer
          person={detailPerson}
          reportCount={detailPerson ? byKey.get(detailPerson.akiraUserKey)?.children.length ?? 0 : 0}
          onClose={() => setDetailKey(null)}
        />
      </div>
    </TooltipProvider>
  );
}

/* ------------------------------------------------------------------ */
/* Summary chip                                                        */
/* ------------------------------------------------------------------ */

function SummaryChip({ icon: Icon, label, value }: { icon: typeof Users2; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-base font-semibold leading-tight text-foreground">{value}</div>
        <div className="truncate text-[11px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function IconButton({
  children, onClick, tooltip, disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tooltip: string;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 gap-1.5 rounded-md" onClick={onClick} disabled={disabled}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function ViewSwitcher() {
  return (
    <div className="flex items-center rounded-md border border-input bg-background p-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="flex h-8 items-center gap-1.5 rounded-[5px] bg-primary/10 px-2.5 text-xs font-medium text-primary">
            <GitBranch className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Tree</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>Tree view (active)</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button disabled className="flex h-8 cursor-not-allowed items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-medium text-muted-foreground/50">
            <List className="h-3.5 w-3.5" /> <span className="hidden sm:inline">List</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>List view — coming soon</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button disabled className="flex h-8 cursor-not-allowed items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-medium text-muted-foreground/50">
            <LayoutGrid className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Cards</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>Card view — coming soon</TooltipContent>
      </Tooltip>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Filters                                                              */
/* ------------------------------------------------------------------ */

function FilterFields({
  filters, onChange, departmentOptions, designationOptions,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  departmentOptions: string[];
  designationOptions: string[];
}) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filters</div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Department</label>
        <Select value={filters.department} onValueChange={(v) => onChange({ ...filters, department: v })}>
          <SelectTrigger className="h-9 rounded-md"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departmentOptions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Designation</label>
        <Select value={filters.designation} onValueChange={(v) => onChange({ ...filters, designation: v })}>
          <SelectTrigger className="h-9 rounded-md"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Designations</SelectItem>
            {designationOptions.map((d) => <SelectItem key={d} value={d}>{d.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Status</label>
        <Select value={filters.status} onValueChange={(v) => onChange({ ...filters, status: v })}>
          <SelectTrigger className="h-9 rounded-md"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Organization panel (sidebar)                                        */
/* ------------------------------------------------------------------ */

function OrganizationPanel({
  forest, collapsed, onToggle, matchIds, focusedKey, onSelect, total, bare,
}: {
  forest: TreeNode[];
  collapsed: Set<string>;
  onToggle: (key: string) => void;
  matchIds: Set<string> | null;
  focusedKey: string | null;
  onSelect: (key: string) => void;
  total: number;
  bare?: boolean;
}) {
  const visibleCount = matchIds ? matchIds.size : total;

  const body = (
    <>
      <div className="max-h-[520px] overflow-y-auto p-2">
        {matchIds && matchIds.size === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Search className="h-6 w-6 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">No employees found</p>
          </div>
        ) : (
          forest.map((root) => (
            <SidebarRow
              key={root.akiraUserKey}
              node={root}
              collapsed={collapsed}
              onToggle={onToggle}
              matchIds={matchIds}
              focusedKey={focusedKey}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
      <TipsCard />
    </>
  );

  if (bare) {
    return <div className="space-y-3">{body}</div>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold">Organization</span>
          <span className="text-[11px] text-muted-foreground">
            {visibleCount} Employee{visibleCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      {body}
    </div>
  );
}

function TipsCard() {
  return (
    <div className="m-2 rounded-lg border border-dashed border-border bg-muted/30 p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Lightbulb className="h-3.5 w-3.5 text-warning" /> How to use
      </div>
      <ul className="space-y-1 text-[11px] leading-snug text-muted-foreground">
        <li>• Select an employee to focus the hierarchy.</li>
        <li>• Click a card to navigate up or down the structure.</li>
        <li>• Use expand/collapse to explore reporting levels.</li>
        <li>• Search to quickly locate an employee.</li>
      </ul>
    </div>
  );
}

function SidebarRow({
  node, collapsed, onToggle, matchIds, focusedKey, onSelect,
}: {
  node: TreeNode;
  collapsed: Set<string>;
  onToggle: (key: string) => void;
  matchIds: Set<string> | null;
  focusedKey: string | null;
  onSelect: (key: string) => void;
}) {
  if (matchIds && !matchIds.has(node.akiraUserKey)) return null;

  const hasChildren = node.children.length > 0;
  const isCollapsed = matchIds ? false : collapsed.has(node.akiraUserKey);
  const isFocused = focusedKey === node.akiraUserKey;
  const visibleChildren = matchIds ? node.children.filter((c) => matchIds.has(c.akiraUserKey)) : node.children;

  return (
    <div>
      <button
        onClick={() => onSelect(node.akiraUserKey)}
        style={{ paddingLeft: `${node.depth * 16 + 6}px` }}
        className={cn(
          "relative flex min-h-11 w-full items-center gap-2 rounded-md py-2 pr-2 text-left text-sm transition-colors hover:bg-accent",
          isFocused && "bg-primary/[0.08] font-medium text-primary",
        )}
      >
        {isFocused && <span className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-primary" />}

        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); hasChildren && onToggle(node.akiraUserKey); }}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded",
            hasChildren ? "text-muted-foreground hover:text-foreground" : "text-transparent",
          )}
        >
          {hasChildren && (isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
        </span>

        {node.profileImagePath ? (
          <img src={`${API_BASE_URL}${node.profileImagePath}`} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-border" />
        ) : (
          <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold", isFocused ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
            {initialsOf(node.userName)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="truncate leading-tight">{node.userName}</div>
          <div className="truncate text-[10px] font-normal text-muted-foreground">{node.designation.replace(/_/g, " ")}</div>
        </div>

        {hasChildren && (
          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{node.children.length}</span>
        )}
      </button>

      {hasChildren && !isCollapsed && (
        <div>
          {visibleChildren.map((child) => (
            <SidebarRow
              key={child.akiraUserKey}
              node={child}
              collapsed={collapsed}
              onToggle={onToggle}
              matchIds={matchIds}
              focusedKey={focusedKey}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Org chart card                                                       */
/* ------------------------------------------------------------------ */

function OrgCard({
  person, variant, onFocus, onInfo,
}: {
  person: TreeNode;
  variant: "manager" | "focused" | "report";
  onFocus?: () => void;
  onInfo: () => void;
}) {
  return (
    <div
      className={cn(
        "relative w-60 rounded-2xl border bg-background p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all",
        variant === "focused" ? "border-primary/50 ring-4 ring-primary/10 shadow-md" : "border-border",
        variant !== "focused" && onFocus && "cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
        !person.isActive && "opacity-70",
      )}
      onClick={variant !== "focused" ? onFocus : undefined}
    >
      <div className="absolute right-2 top-2 flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => { e.stopPropagation(); onInfo(); }}
              className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>View details</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => { e.stopPropagation(); onInfo(); }}
              className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>More options</TooltipContent>
        </Tooltip>
      </div>

      {variant === "manager" && (
        <div className="mb-1.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <ArrowUp className="h-3 w-3" /> Manager
        </div>
      )}

      <div className="flex items-center gap-2.5 pr-9">
        {person.profileImagePath ? (
          <img src={`${API_BASE_URL}${person.profileImagePath}`} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-background ring-offset-1 ring-offset-border" />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary ring-2 ring-background ring-offset-1 ring-offset-border">
            {initialsOf(person.userName)}
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold leading-tight">{person.userName}</div>
          <div className="truncate text-xs text-muted-foreground">{person.departmentName ?? "No department"}</div>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Badge className={cn("rounded-md border-0 px-2 py-0.5 text-[10px] font-medium", DESIGNATION_STYLES[person.designation] ?? "bg-muted text-muted-foreground")}>
          {person.designation.replace(/_/g, " ")}
        </Badge>
        {!person.isActive && (
          <Badge variant="outline" className="rounded-md px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Inactive
          </Badge>
        )}
        {person.children.length > 0 && (
          <span className="ml-auto text-[10px] text-muted-foreground">{person.children.length} report{person.children.length === 1 ? "" : "s"}</span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Employee detail drawer                                               */
/* ------------------------------------------------------------------ */

function EmployeeDetailDrawer({
  person, reportCount, onClose,
}: {
  person: TreeNode | null;
  reportCount: number;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!person} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-sm">
        {person && (
          <>
            <SheetHeader className="border-b border-border p-5 text-left">
              <SheetTitle className="text-base">Employee Details</SheetTitle>
            </SheetHeader>
            <div className="p-5">
              <div className="flex items-center gap-3.5">
                {person.profileImagePath ? (
                  <img src={`${API_BASE_URL}${person.profileImagePath}`} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover ring-1 ring-border" />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary">
                    {initialsOf(person.userName)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold">{person.userName}</div>
                  <Badge className={cn("mt-1 rounded-md border-0 px-2 py-0.5 text-[11px] font-medium", DESIGNATION_STYLES[person.designation] ?? "bg-muted text-muted-foreground")}>
                    {person.designation.replace(/_/g, " ")}
                  </Badge>
                  <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                    ID: {person.staffProfileKey.slice(0, 8).toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <DetailField icon={Building2} label="Department" value={person.departmentName ?? "—"} />
                <DetailField icon={Mail} label="Email" value={person.email} />
                <DetailField icon={Phone} label="Mobile" value={person.mobileNo ?? "—"} />
                <DetailField icon={GraduationCap} label="Qualification" value={person.qualification ?? "—"} />
                <DetailField icon={CalendarDays} label="Joined" value={formatDate(person.joiningDate)} />
                <DetailField icon={Network} label="Direct Reports" value={String(reportCount)} />
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailField({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 pt-1">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Loading / empty / error / no-results states                         */
/* ------------------------------------------------------------------ */

function LoadingState() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="hidden w-[300px] shrink-0 space-y-2 lg:block">
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="ml-6 h-11 w-[85%] rounded-xl" />
        <Skeleton className="ml-6 h-11 w-[85%] rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
      <div className="flex flex-1 flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <Skeleton className="h-24 w-60 rounded-2xl" />
        <Skeleton className="h-4 w-px" />
        <div className="flex gap-4">
          <Skeleton className="h-24 w-60 rounded-2xl" />
          <Skeleton className="h-24 w-60 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Network className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold">No reporting structure available</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        Add staff and assign their Reports To relationship to build the organization hierarchy.
      </p>
    </div>
  );
}

function NoSearchResults() {
  return (
    <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-2 text-center">
      <Search className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">No employees found</p>
      <p className="text-xs text-muted-foreground">Try a different name, designation or department.</p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-destructive/30 bg-destructive/5 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold">Unable to load reporting structure</p>
      <p className="text-xs text-muted-foreground">Please try again.</p>
      <Button variant="outline" size="sm" className="mt-2 h-9 gap-1.5 rounded-md" onClick={onRetry}>
        <RotateCw className="h-3.5 w-3.5" /> Retry
      </Button>
    </div>
  );
}
