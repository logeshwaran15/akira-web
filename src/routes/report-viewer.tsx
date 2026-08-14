import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { PageHeader } from "@/components/erp/PageHeader";
import { StatCard } from "@/components/erp/StatCard";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  PlayCircle,
  RefreshCw,
  Download,
  Printer,
  Share2,
  Columns3,
  LineChart as LineChartIcon,
  Table2,
  Star,
  FileSpreadsheet,
  FileText,
  Mail,
  CalendarClock,
  BookmarkPlus,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PageLoader } from "@/components/erp/Spinner";
import { exportToCsv } from "@/lib/csv";
import { useFormatDate } from "@/hooks/use-tenant-setting";

export const Route = createFileRoute("/report-viewer")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : "",
    preview: search.preview === true || search.preview === "true" || search.preview === "1",
  }),
  head: () => ({
    meta: [{ title: "Report Viewer — Akira School ERP" }],
  }),
  component: ReportViewerPage,
});

type ParamDef = {
  name: string;
  label: string;
  type:
    | "text"
    | "number"
    | "date"
    | "daterange"
    | "academicYear"
    | "schoolClass"
    | "department"
    | "select";
  required: boolean;
  allowMultiSelect: boolean;
  defaultValue: string;
  optionsCsv: string;
};

type ColumnDef = {
  key: string;
  label: string;
  width: number;
  align: "left" | "center" | "right";
  dataType: "text" | "number" | "boolean" | "date" | "currency";
  visible: boolean;
  sortable: boolean;
  filterable: boolean;
  exportable: boolean;
  frozen: boolean;
  isHyperlink: boolean;
  dateFormat: string;
};

type ViewerMeta = {
  tenantAdhocReportKey: string;
  displayName: string;
  category: string;
  module: string | null;
  description: string | null;
  icon: string | null;
  allowExport: boolean;
  allowPrint: boolean;
  allowEmail: boolean;
  allowCharts: boolean;
  defaultPageSize: number;
  isPublished: boolean;
  isActive: boolean;
  parametersJson: string | null;
  columnsJson: string | null;
  chartConfigJson: string | null;
};

type Option = { label: string; value: string };

const CHART_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#059669",
  "#d97706",
  "#dc2626",
  "#0891b2",
  "#db2777",
  "#65a30d",
];

function safeParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

type CategoryStat = {
  column: ColumnDef;
  counts: { value: string; count: number; pct: number }[];
  distinct: number;
};

function ReportViewerPage() {
  const { id, preview } = Route.useSearch();
  const formatDate = useFormatDate();

  const [activeTab, setActiveTab] = useState("analytics");
  const [meta, setMeta] = useState<ViewerMeta | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [academicYears, setAcademicYears] = useState<Option[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);

  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [executing, setExecuting] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set());
  const [isFavorite, setIsFavorite] = useState(false);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<Date | null>(null);
  const [lastDurationMs, setLastDurationMs] = useState<number | null>(null);

  const params: ParamDef[] = useMemo(() => safeParse(meta?.parametersJson, []), [meta]);
  const columns: ColumnDef[] = useMemo(() => safeParse(meta?.columnsJson, []), [meta]);
  const chartConfig = useMemo(
    () => safeParse(meta?.chartConfigJson, { type: "none", xField: "", yField: "" }),
    [meta],
  );

  useEffect(() => {
    if (!id) return;
    setLoadingMeta(true);
    apiFetch(`/api/AdhocReport/${id}/viewer`)
      .then((d: ViewerMeta) => {
        setMeta(d);
        const p: ParamDef[] = safeParse(d.parametersJson, []);
        const defaults: Record<string, string> = {};
        p.forEach((param) => {
          if (param.defaultValue) defaults[param.name] = param.defaultValue;
        });
        setParamValues(defaults);
        const c: ColumnDef[] = safeParse(d.columnsJson, []);
        setVisibleCols(new Set(c.filter((x) => x.visible).map((x) => x.key)));
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load report"))
      .finally(() => setLoadingMeta(false));

    apiFetch("/api/AdhocReport/favorites")
      .then((f: string[]) => setIsFavorite(f.includes(id)))
      .catch(() => {});
  }, [id]);

  // Apply a previously saved view (filters + visible columns) on top of the defaults, once metadata has loaded.
  useEffect(() => {
    if (!id || !meta) return;
    const saved = localStorage.getItem(`report-view-${id}`);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as {
        paramValues?: Record<string, string>;
        visibleCols?: string[];
      };
      if (parsed.paramValues) setParamValues((s) => ({ ...s, ...parsed.paramValues }));
      if (parsed.visibleCols) setVisibleCols(new Set(parsed.visibleCols));
    } catch {
      // ignore corrupt saved view
    }
  }, [id, meta]);

  useEffect(() => {
    if (params.some((p) => p.type === "academicYear")) {
      apiFetch("/api/AcademicYear")
        .then((y: { academicYearKey: string; yearName: string }[]) =>
          setAcademicYears(y.map((x) => ({ label: x.yearName, value: x.academicYearKey }))),
        )
        .catch(() => {});
    }
    if (params.some((p) => p.type === "schoolClass")) {
      apiFetch("/api/SchoolClass")
        .then((c: { schoolClassKey: string; className: string }[]) =>
          setSchoolClasses(c.map((x) => ({ label: x.className, value: x.schoolClassKey }))),
        )
        .catch(() => {});
    }
    if (params.some((p) => p.type === "department")) {
      apiFetch("/api/Department")
        .then((d: { departmentKey: string; departmentName: string }[]) =>
          setDepartments(d.map((x) => ({ label: x.departmentName, value: x.departmentKey }))),
        )
        .catch(() => {});
    }
  }, [params]);

  const generate = async () => {
    if (!id) return;
    for (const p of params) {
      if (p.required && p.type !== "daterange" && !paramValues[p.name]) {
        toast.error(`${p.label} is required.`);
        return;
      }
      if (
        p.required &&
        p.type === "daterange" &&
        (!paramValues[`${p.name}From`] || !paramValues[`${p.name}To`])
      ) {
        toast.error(`${p.label} is required.`);
        return;
      }
    }

    setExecuting(true);
    try {
      const parameters: Record<string, string | null> = {};
      params.forEach((p) => {
        if (p.type === "daterange") {
          parameters[`${p.name}From`] = paramValues[`${p.name}From`] || null;
          parameters[`${p.name}To`] = paramValues[`${p.name}To`] || null;
        } else {
          parameters[p.name] = paramValues[p.name] || null;
        }
      });

      const r: { rows: Record<string, unknown>[]; durationMs: number } = await apiFetch(
        `/api/AdhocReport/${id}/execute`,
        {
          method: "POST",
          body: JSON.stringify({ parameters }),
        },
      );
      setRows(r.rows);
      setHasRun(true);
      setLastGeneratedAt(new Date());
      setLastDurationMs(r.durationMs);
      if (columns.length === 0 && r.rows.length > 0) {
        setVisibleCols(new Set(Object.keys(r.rows[0])));
      }
      toast.success(`Report generated — ${r.rows.length} row(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to execute report");
    } finally {
      setExecuting(false);
    }
  };

  const toggleFavorite = async () => {
    if (!id) return;
    try {
      const r: { isFavorite: boolean } = await apiFetch(`/api/AdhocReport/${id}/favorite`, {
        method: "POST",
      });
      setIsFavorite(r.isFavorite);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update favorite");
    }
  };

  const saveView = () => {
    if (!id) return;
    localStorage.setItem(
      `report-view-${id}`,
      JSON.stringify({ paramValues, visibleCols: Array.from(visibleCols) }),
    );
    toast.success("View saved — your filters and columns will load automatically next time.");
  };

  const resetView = () => {
    if (!id) return;
    localStorage.removeItem(`report-view-${id}`);
    const c: ColumnDef[] = safeParse(meta?.columnsJson, []);
    setVisibleCols(new Set(c.filter((x) => x.visible).map((x) => x.key)));
    toast.success("View reset to the report's default columns and filters.");
  };

  const effectiveColumns: ColumnDef[] = useMemo(
    () =>
      columns.length > 0
        ? columns
        : rows.length > 0
          ? Object.keys(rows[0]).map((k) => ({
              key: k,
              label: k,
              width: 150,
              align: "left" as const,
              dataType: "text" as const,
              visible: true,
              sortable: true,
              filterable: true,
              exportable: true,
              frozen: false,
              isHyperlink: false,
              dateFormat: "",
            }))
          : [],
    [columns, rows],
  );

  const dataTableColumns: Column<Record<string, unknown>>[] = effectiveColumns
    .filter((c) => visibleCols.has(c.key))
    .map((c) => ({
      key: c.key,
      header: c.label,
      sortable: c.sortable,
      className: [
        c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
        c.frozen && "sticky left-0 z-10 bg-card",
      ]
        .filter(Boolean)
        .join(" "),
      accessor: (r) => {
        const v = r[c.key];
        let display: string;
        if (v === null || v === undefined || v === "") display = "—";
        else if (c.dataType === "boolean") display = v ? "Yes" : "No";
        else if (c.dataType === "currency") display = `₹${Number(v).toLocaleString("en-IN")}`;
        else if (c.dataType === "date") display = formatDate(String(v));
        else display = String(v);
        return c.isHyperlink && typeof v === "string" && v.startsWith("http") ? (
          <a
            href={v}
            target="_blank"
            rel="noreferrer"
            className="whitespace-nowrap text-primary underline"
          >
            {display}
          </a>
        ) : (
          <span className="whitespace-nowrap">{display}</span>
        );
      },
    }));

  const numericColumns = effectiveColumns.filter(
    (c) => c.dataType === "number" || c.dataType === "currency",
  );

  // ---------- Dynamic analytics derived from whatever this report's columns/rows actually contain ----------

  const categoricalStats: CategoryStat[] = useMemo(() => {
    if (rows.length === 0) return [];
    const candidates = effectiveColumns.filter(
      (c) => c.dataType === "text" || c.dataType === "boolean",
    );
    const stats: CategoryStat[] = [];
    for (const col of candidates) {
      const counts = new Map<string, number>();
      for (const row of rows) {
        const raw = row[col.key];
        const val =
          col.dataType === "boolean"
            ? raw
              ? "Yes"
              : "No"
            : raw === null || raw === undefined || raw === ""
              ? null
              : String(raw);
        if (val === null) continue;
        counts.set(val, (counts.get(val) ?? 0) + 1);
      }
      const distinct = counts.size;
      if (distinct >= 2 && distinct <= 15) {
        const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
        stats.push({
          column: col,
          distinct,
          counts: Array.from(counts.entries())
            .map(([value, count]) => ({
              value,
              count,
              pct: Math.round((count / total) * 1000) / 10,
            }))
            .sort((a, b) => b.count - a.count),
        });
      }
    }
    return stats;
  }, [rows, effectiveColumns]);

  const binaryStat = categoricalStats.find((s) => s.distinct === 2);
  const chartStats = categoricalStats.slice(0, 4);

  const ageStat = useMemo(() => {
    const dobCol = effectiveColumns.find(
      (c) => c.dataType === "date" && /dob|birth/i.test(c.key + c.label),
    );
    if (!dobCol || rows.length === 0) return null;
    const buckets = [
      { label: "5-10", min: 5, max: 10 },
      { label: "11-15", min: 11, max: 15 },
      { label: "16-20", min: 16, max: 20 },
      { label: "21-25", min: 21, max: 25 },
      { label: "26+", min: 26, max: 200 },
    ];
    const ages: number[] = [];
    const counts = buckets.map(() => 0);
    for (const row of rows) {
      const raw = row[dobCol.key];
      if (!raw) continue;
      const dob = new Date(String(raw));
      if (Number.isNaN(dob.getTime())) continue;
      const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
      ages.push(age);
      const idx = buckets.findIndex((b) => age >= b.min && age <= b.max);
      if (idx >= 0) counts[idx] += 1;
    }
    if (ages.length === 0) return null;
    return {
      label: dobCol.label,
      average: Math.round((ages.reduce((a, b) => a + b, 0) / ages.length) * 10) / 10,
      chartData: buckets
        .map((b, i) => ({ name: b.label, value: counts[i] }))
        .filter((d) => d.value > 0),
    };
  }, [rows, effectiveColumns]);

  const extraDistinctStat = useMemo(() => {
    const candidate = categoricalStats.find((s) => s.distinct >= 3 && s !== binaryStat);
    if (!candidate) return null;
    return { label: candidate.column.label, distinct: candidate.distinct };
  }, [categoricalStats, binaryStat]);

  const statCards = useMemo(() => {
    const cards: {
      label: string;
      value: string;
      sub: string;
      icon: Icons.LucideIcon;
      tone: "primary" | "success" | "info" | "warning" | "purple" | "teal";
    }[] = [];
    cards.push({
      label: "Total Records",
      value: rows.length.toLocaleString("en-IN"),
      sub: "100% of total",
      icon: Icons.Database,
      tone: "primary",
    });
    if (binaryStat) {
      binaryStat.counts.forEach((c, i) => {
        cards.push({
          label: `${c.value} (${binaryStat.column.label})`,
          value: c.count.toLocaleString("en-IN"),
          sub: `${c.pct}% of total`,
          icon: i === 0 ? Icons.UserCheck : Icons.User,
          tone: i === 0 ? "info" : "purple",
        });
      });
    }
    if (extraDistinctStat) {
      cards.push({
        label: `Total ${extraDistinctStat.label} Groups`,
        value: String(extraDistinctStat.distinct),
        sub: "distinct values",
        icon: Icons.Layers,
        tone: "teal",
      });
    }
    const boolCols = effectiveColumns.filter((c) => c.dataType === "boolean").slice(0, 2);
    boolCols.forEach((c) => {
      const count = rows.filter((r) => !!r[c.key]).length;
      cards.push({
        label: c.label,
        value: count.toLocaleString("en-IN"),
        sub: `${Math.round((count / Math.max(rows.length, 1)) * 100)}% of total`,
        icon: Icons.ShieldCheck,
        tone: "warning",
      });
    });
    if (ageStat) {
      cards.push({
        label: `Average ${ageStat.label.replace(/date of birth/i, "Age").replace(/dob/i, "Age")}`,
        value: `${ageStat.average} Years`,
        sub: "computed from " + ageStat.label,
        icon: Icons.CalendarClock,
        tone: "success",
      });
    }
    numericColumns.slice(0, 2).forEach((c) => {
      const sum = rows.reduce((acc, r) => acc + (Number(r[c.key]) || 0), 0);
      cards.push({
        label: `Total ${c.label}`,
        value:
          c.dataType === "currency"
            ? `₹${sum.toLocaleString("en-IN")}`
            : sum.toLocaleString("en-IN"),
        sub: "sum across records",
        icon: Icons.TrendingUp,
        tone: "success",
      });
    });
    return cards.slice(0, 8);
  }, [rows, binaryStat, extraDistinctStat, effectiveColumns, ageStat, numericColumns]);

  const chartData = useMemo(() => {
    if (
      chartConfig.type === "none" ||
      !chartConfig.xField ||
      !chartConfig.yField ||
      rows.length === 0
    )
      return [];
    const map = new Map<string, number>();
    for (const row of rows) {
      const key = String(row[chartConfig.xField] ?? "—");
      const val = Number(row[chartConfig.yField]) || 0;
      map.set(key, (map.get(key) ?? 0) + val);
    }
    return Array.from(map.entries())
      .slice(0, 15)
      .map(([name, value]) => ({ name, value }));
  }, [rows, chartConfig]);

  const previewColumns = effectiveColumns.filter((c) => visibleCols.has(c.key)).slice(0, 7);

  const iconKey = (
    meta?.icon && meta.icon in Icons ? meta.icon : "BarChart3"
  ) as keyof typeof Icons;
  const Icon = Icons[iconKey] as Icons.LucideIcon;

  if (loadingMeta) {
    return <PageLoader label="Loading report..." />;
  }
  if (!meta) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Report not found or you don't have access.
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={meta.displayName}
        breadcrumbs={[
          { label: "Reports", to: "/reports" },
          { label: meta.category },
          { label: meta.displayName },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-md"
              onClick={toggleFavorite}
            >
              <Star className={isFavorite ? "h-4 w-4 fill-warning text-warning" : "h-4 w-4"} />
            </Button>
            <Button
              variant="outline"
              className="gap-1.5 rounded-md border-info/40 text-info hover:bg-info hover:text-info-foreground"
              disabled={executing}
              onClick={generate}
            >
              <RefreshCw className={executing ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Refresh
            </Button>
            {meta.allowExport && (
              <Button
                variant="outline"
                className="gap-1.5 rounded-md"
                onClick={() =>
                  exportToCsv(
                    `${meta.displayName}.csv`,
                    dataTableColumns.map((c) => ({ key: c.key, header: c.header })),
                    rows,
                  )
                }
              >
                <Download className="h-4 w-4" /> Export
              </Button>
            )}
            {meta.allowPrint && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-md"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-md"
              onClick={() => toast.info("Sharing is coming soon.")}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {preview && (
        <div className="mb-4 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-[oklch(0.45_0.12_65)]">
          Preview mode —{" "}
          {meta.isPublished
            ? "this report is published."
            : "this report is a draft and is not visible to end users yet."}
        </div>
      )}

      {meta.description && <p className="mb-4 text-sm text-muted-foreground">{meta.description}</p>}

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
        {params.map((p) => (
          <div key={p.name} className="min-w-[160px] space-y-1.5">
            <Label required={p.required}>{p.label}</Label>
            {p.type === "date" ? (
              <DatePicker
                value={paramValues[p.name] ?? ""}
                onChange={(v) => setParamValues((s) => ({ ...s, [p.name]: v }))}
              />
            ) : p.type === "daterange" ? (
              <div className="flex gap-1.5">
                <DatePicker
                  value={paramValues[`${p.name}From`] ?? ""}
                  onChange={(v) => setParamValues((s) => ({ ...s, [`${p.name}From`]: v }))}
                  placeholder="From"
                />
                <DatePicker
                  value={paramValues[`${p.name}To`] ?? ""}
                  onChange={(v) => setParamValues((s) => ({ ...s, [`${p.name}To`]: v }))}
                  placeholder="To"
                />
              </div>
            ) : p.type === "number" ? (
              <Input
                type="number"
                className="rounded-md"
                value={paramValues[p.name] ?? ""}
                onChange={(e) => setParamValues((s) => ({ ...s, [p.name]: e.target.value }))}
              />
            ) : p.type === "academicYear" ||
              p.type === "schoolClass" ||
              p.type === "department" ||
              p.type === "select" ? (
              <Select
                value={paramValues[p.name] ?? ""}
                onValueChange={(v) => setParamValues((s) => ({ ...s, [p.name]: v }))}
              >
                <SelectTrigger className="w-[160px] rounded-md">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {(p.type === "academicYear"
                    ? academicYears
                    : p.type === "schoolClass"
                      ? schoolClasses
                      : p.type === "department"
                        ? departments
                        : p.optionsCsv
                            .split(",")
                            .filter(Boolean)
                            .map((o) => ({ label: o.trim(), value: o.trim() }))
                  ).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                className="rounded-md"
                value={paramValues[p.name] ?? ""}
                onChange={(e) => setParamValues((s) => ({ ...s, [p.name]: e.target.value }))}
              />
            )}
          </div>
        ))}
        <Button
          className="ml-auto gap-1.5 rounded-md"
          size="lg"
          disabled={executing}
          onClick={generate}
        >
          {executing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <PlayCircle className="h-4 w-4" />
          )}{" "}
          Generate
        </Button>
      </div>

      {!hasRun ? (
        <div className="rounded-md border border-dashed border-border bg-card p-12 text-center">
          <Icon className="mx-auto mb-3 h-10 w-10 text-primary" />
          <p className="mb-4 text-sm text-muted-foreground">
            Set your filters above and click Generate to run this report.
          </p>
          <Button className="gap-1.5 rounded-md" disabled={executing} onClick={generate}>
            {executing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}{" "}
            Generate
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:w-[320px]">
              <TabsTrigger value="analytics" className="gap-1.5">
                <LineChartIcon className="h-3.5 w-3.5" /> Analytics
              </TabsTrigger>
              <TabsTrigger value="data" className="gap-1.5">
                <Table2 className="h-3.5 w-3.5" /> Data View
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {statCards.map((c) => (
                  <StatCard
                    key={c.label}
                    label={c.label}
                    value={c.value}
                    icon={c.icon}
                    tone={c.tone}
                  />
                ))}
              </div>

              {meta.allowCharts && (chartStats.length > 0 || chartData.length > 0 || ageStat) && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {chartConfig.type !== "none" && chartData.length > 0 && (
                    <ChartPanel title={`${chartConfig.yField} by ${chartConfig.xField}`}>
                      <ConfiguredChart type={chartConfig.type} data={chartData} />
                    </ChartPanel>
                  )}
                  {chartStats.map((stat, i) => (
                    <ChartPanel key={stat.column.key} title={`${stat.column.label} Distribution`}>
                      {stat.distinct <= 4 || i % 2 === 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                          <PieChart>
                            <Pie
                              data={stat.counts}
                              dataKey="count"
                              nameKey="value"
                              innerRadius={55}
                              outerRadius={95}
                              paddingAngle={2}
                            >
                              {stat.counts.map((_, idx) => (
                                <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={stat.counts}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="value" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </ChartPanel>
                  ))}
                  {ageStat && ageStat.chartData.length > 0 && (
                    <ChartPanel title={`${ageStat.label} Distribution`}>
                      <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={ageStat.chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Area type="monotone" dataKey="value" stroke="#d97706" fill="#d9770633" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartPanel>
                  )}
                </div>
              )}

              {rows.length > 0 && (
                <div className="rounded-md border border-border bg-card shadow-sm">
                  <div className="flex items-center justify-between border-b border-border p-4">
                    <div className="text-sm font-semibold">Recent Records</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 rounded-md text-primary"
                      onClick={() => setActiveTab("data")}
                    >
                      View All <Icons.ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30">
                        <tr>
                          {previewColumns.map((c) => (
                            <th
                              key={c.key}
                              className="whitespace-nowrap px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                            >
                              {c.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 8).map((row, i) => (
                          <tr key={i} className="border-t border-border">
                            {previewColumns.map((c) => {
                              const v = row[c.key];
                              const display =
                                v === null || v === undefined || v === ""
                                  ? "—"
                                  : c.dataType === "boolean"
                                    ? v
                                      ? "Yes"
                                      : "No"
                                    : c.dataType === "date"
                                      ? formatDate(String(v))
                                      : c.dataType === "currency"
                                        ? `₹${Number(v).toLocaleString("en-IN")}`
                                        : String(v);
                              return (
                                <td key={c.key} className="whitespace-nowrap px-4 py-2">
                                  {display}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="data">
              <DataTable
                data={rows}
                columns={dataTableColumns}
                rowKey={(r) => JSON.stringify(r)}
                searchPlaceholder="Search results..."
                storageKey={`report-viewer-${id}`}
                pageSizes={[meta.defaultPageSize, 50, 100, 200]}
                toolbar={
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-md">
                          <Columns3 className="h-3.5 w-3.5" /> Columns
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
                        {effectiveColumns.map((c) => (
                          <DropdownMenuCheckboxItem
                            key={c.key}
                            checked={visibleCols.has(c.key)}
                            onCheckedChange={(v) =>
                              setVisibleCols((prev) => {
                                const next = new Set(prev);
                                if (v) next.add(c.key);
                                else next.delete(c.key);
                                return next;
                              })
                            }
                          >
                            {c.label}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {meta.allowExport && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5 rounded-md"
                        onClick={() =>
                          exportToCsv(
                            `${meta.displayName}.csv`,
                            dataTableColumns.map((c) => ({ key: c.key, header: c.header })),
                            rows,
                          )
                        }
                      >
                        <Download className="h-3.5 w-3.5" /> Export
                      </Button>
                    )}
                  </>
                }
              />
            </TabsContent>
          </Tabs>

          <div className="space-y-5">
            <SidePanel title="Actions" icon={Icons.Zap}>
              <div className="grid grid-cols-2 gap-2">
                {meta.allowExport && (
                  <ActionButton
                    icon={FileSpreadsheet}
                    label="Export Excel"
                    onClick={() =>
                      exportToCsv(
                        `${meta.displayName}.csv`,
                        dataTableColumns.map((c) => ({ key: c.key, header: c.header })),
                        rows,
                      )
                    }
                  />
                )}
                {meta.allowPrint && (
                  <ActionButton icon={FileText} label="Export PDF" onClick={() => window.print()} />
                )}
                {meta.allowEmail && (
                  <ActionButton
                    icon={Mail}
                    label="Email Report"
                    onClick={() => toast.info("Emailing reports is coming soon.")}
                  />
                )}
                {meta.allowPrint && (
                  <ActionButton
                    icon={Printer}
                    label="Print Report"
                    onClick={() => window.print()}
                  />
                )}
                <ActionButton
                  icon={CalendarClock}
                  label="Schedule Report"
                  onClick={() => toast.info("Scheduled reports are coming soon.")}
                />
                <ActionButton icon={BookmarkPlus} label="Save View" onClick={saveView} />
                <ActionButton icon={Icons.RotateCcw} label="Reset View" onClick={resetView} />
              </div>
            </SidePanel>
          </div>
        </div>
      )}
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}

function ConfiguredChart({
  type,
  data,
}: {
  type: string;
  data: { name: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      {type === "bar" ? (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      ) : type === "line" ? (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} />
        </LineChart>
      ) : type === "area" ? (
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Area type="monotone" dataKey="value" stroke="#2563eb" fill="#2563eb33" />
        </AreaChart>
      ) : (
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={110} label>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      )}
    </ResponsiveContainer>
  );
}

function SidePanel({
  title,
  icon: PanelIcon,
  children,
}: {
  title: string;
  icon: Icons.LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <PanelIcon className="h-4 w-4 text-primary" />
        <div className="text-sm font-semibold">{title}</div>
      </div>
      {children}
    </div>
  );
}

function ActionButton({
  icon: BtnIcon,
  label,
  onClick,
}: {
  icon: Icons.LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-md border border-border p-3 text-center text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
    >
      <BtnIcon className="h-4 w-4" />
      {label}
    </button>
  );
}
