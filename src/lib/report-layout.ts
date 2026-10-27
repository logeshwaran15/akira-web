export type ColumnDef = {
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

export type StatTone = "primary" | "success" | "info" | "warning" | "purple" | "teal";

export type LegacyChartConfig = {
  type: "none" | "bar" | "line" | "pie" | "area";
  xField: string;
  yField: string;
};

export type ReportWidget =
  | {
      type: "StatCard";
      key: string;
      title: string;
      agg: "count" | "sum" | "avg" | "distinct";
      field?: string;
      tone?: StatTone;
    }
  | { type: "Table"; key: string; title?: string; columns?: string[] }
  | {
      type: "Chart";
      key: string;
      title: string;
      chartType: "bar" | "line" | "area" | "pie";
      xField: string;
      yField: string;
      agg?: "sum" | "count";
    }
  | { type: "CategoryBreakdown"; key: string; title?: string; field: string };

export type ReportTab = { tabName: string; tabItems: ReportWidget[] };

export type ReportLayoutConfig = {
  layoutVersion?: 1 | 2;
  legacyChart?: LegacyChartConfig;
  tabs?: ReportTab[];
};

function isLegacyChartShape(v: unknown): v is LegacyChartConfig {
  return (
    !!v &&
    typeof v === "object" &&
    "type" in v &&
    "xField" in v &&
    "yField" in v &&
    !("layoutVersion" in v) &&
    !("tabs" in v)
  );
}

/** Parses the report's chartConfigJson into a ReportLayoutConfig, transparently
 * migrating the pre-existing {type,xField,yField} shape into `legacyChart`. */
export function parseReportLayout(json: string | null | undefined): ReportLayoutConfig {
  const fallback: ReportLayoutConfig = {
    layoutVersion: 1,
    legacyChart: { type: "none", xField: "", yField: "" },
  };
  if (!json) return fallback;
  try {
    const parsed = JSON.parse(json) as unknown;
    if (isLegacyChartShape(parsed)) {
      return { layoutVersion: 1, legacyChart: parsed };
    }
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Partial<ReportLayoutConfig>;
      return {
        layoutVersion: obj.layoutVersion === 2 ? 2 : 1,
        legacyChart: obj.legacyChart ?? fallback.legacyChart,
        tabs: Array.isArray(obj.tabs) ? obj.tabs : undefined,
      };
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function serializeReportLayout(config: ReportLayoutConfig): string {
  return JSON.stringify(config);
}

function toNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function computeStatCardValue(
  rows: Record<string, unknown>[],
  agg: "count" | "sum" | "avg" | "distinct",
  field?: string,
): string {
  if (agg === "count") return rows.length.toLocaleString("en-IN");
  if (!field) return "—";
  if (agg === "distinct") {
    const distinct = new Set(rows.map((r) => String(r[field] ?? ""))).size;
    return distinct.toLocaleString("en-IN");
  }
  const values = rows.map((r) => toNumber(r[field]));
  if (agg === "sum") return values.reduce((a, b) => a + b, 0).toLocaleString("en-IN");
  const sum = values.reduce((a, b) => a + b, 0);
  return values.length > 0
    ? (sum / values.length).toLocaleString("en-IN", { maximumFractionDigits: 1 })
    : "0";
}

export type CategoryCount = { value: string; count: number; pct: number };

export function computeCategoryBreakdown(
  rows: Record<string, unknown>[],
  field: string,
): CategoryCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const raw = row[field];
    const val = raw === null || raw === undefined || raw === "" ? null : String(raw);
    if (val === null) continue;
    counts.set(val, (counts.get(val) ?? 0) + 1);
  }
  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  return Array.from(counts.entries())
    .map(([value, count]) => ({
      value,
      count,
      pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export type ChartPoint = { name: string; value: number };

export function computeChartSeries(
  rows: Record<string, unknown>[],
  xField: string,
  yField: string,
  agg: "sum" | "count" = "sum",
): ChartPoint[] {
  if (!xField || !yField || rows.length === 0) return [];
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = String(row[xField] ?? "—");
    const val = agg === "count" ? 1 : toNumber(row[yField]);
    map.set(key, (map.get(key) ?? 0) + val);
  }
  return Array.from(map.entries())
    .slice(0, 15)
    .map(([name, value]) => ({ name, value }));
}
