import { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/erp/PageHeader";
import { StatCard } from "@/components/erp/StatCard";
import { RefreshCw, Columns3, LineChart as LineChartIcon, Table2, Download } from "lucide-react";
import type { ColumnDef } from "@/lib/report-layout";
import { computeCategoryBreakdown, computeChartSeries } from "@/lib/report-layout";
import { ChartPanel, ConfiguredChart } from "@/components/erp/report-widgets/ChartWidget";
import { CategoryBreakdownWidget } from "@/components/erp/report-widgets/CategoryBreakdownWidget";
import { buildDataTableColumns } from "@/components/erp/report-widgets/TableWidget";
import { DataTable } from "@/components/erp/DataTable";
import type { ReportViewerProps } from "./types";
import { ParamsBar, ReportHeaderActions, makeExportRows } from "./shared";

type CategoryStat = {
  column: ColumnDef;
  counts: { value: string; count: number; pct: number }[];
  distinct: number;
};

export function ReportViewerV1(props: ReportViewerProps) {
  const {
    id,
    preview,
    meta,
    rows,
    hasRun,
    executing,
    generate,
    isFavorite,
    toggleFavorite,
    saveView,
    resetView,
    visibleCols,
    setVisibleCols,
    effectiveColumns,
    formatDate,
    layoutConfig,
  } = props;

  const [activeTab, setActiveTab] = useState("analytics");
  const chartConfig = layoutConfig.legacyChart ?? { type: "none" as const, xField: "", yField: "" };

  const dataTableColumns = useMemo(
    () =>
      buildDataTableColumns(
        effectiveColumns.filter((c) => visibleCols.has(c.key)),
        visibleCols,
        formatDate,
      ),
    [effectiveColumns, visibleCols, formatDate],
  );

  const numericColumns = effectiveColumns.filter(
    (c) => c.dataType === "number" || c.dataType === "currency",
  );

  const categoricalStats: CategoryStat[] = useMemo(() => {
    if (rows.length === 0) return [];
    const candidates = effectiveColumns.filter(
      (c) => c.dataType === "text" || c.dataType === "boolean",
    );
    const stats: CategoryStat[] = [];
    for (const col of candidates) {
      const counts =
        col.dataType === "boolean"
          ? computeCategoryBreakdown(
              rows.map((r) => ({ ...r, [col.key]: r[col.key] ? "Yes" : "No" })),
              col.key,
            )
          : computeCategoryBreakdown(rows, col.key);
      const distinct = counts.length;
      if (distinct >= 2 && distinct <= 15) {
        stats.push({ column: col, distinct, counts });
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
      icon: Icons.LucideIcon;
      tone: "primary" | "success" | "info" | "warning" | "purple" | "teal";
    }[] = [];
    cards.push({
      label: "Total Records",
      value: rows.length.toLocaleString("en-IN"),
      icon: Icons.Database,
      tone: "primary",
    });
    if (binaryStat) {
      binaryStat.counts.forEach((c, i) => {
        cards.push({
          label: `${c.value} (${binaryStat.column.label})`,
          value: c.count.toLocaleString("en-IN"),
          icon: i === 0 ? Icons.UserCheck : Icons.User,
          tone: i === 0 ? "info" : "purple",
        });
      });
    }
    if (extraDistinctStat) {
      cards.push({
        label: `Total ${extraDistinctStat.label} Groups`,
        value: String(extraDistinctStat.distinct),
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
        icon: Icons.ShieldCheck,
        tone: "warning",
      });
    });
    if (ageStat) {
      cards.push({
        label: `Average ${ageStat.label.replace(/date of birth/i, "Age").replace(/dob/i, "Age")}`,
        value: `${ageStat.average} Years`,
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
        icon: Icons.TrendingUp,
        tone: "success",
      });
    });
    return cards.slice(0, 8);
  }, [rows, binaryStat, extraDistinctStat, effectiveColumns, ageStat, numericColumns]);

  const chartData = useMemo(
    () => computeChartSeries(rows, chartConfig.xField, chartConfig.yField, "sum"),
    [rows, chartConfig],
  );

  const previewColumns = effectiveColumns.filter((c) => visibleCols.has(c.key)).slice(0, 7);
  const exportRows = makeExportRows(
    meta.displayName,
    dataTableColumns.map((c) => ({ key: c.key, header: c.header })),
    rows,
  );

  const iconKey = (meta.icon && meta.icon in Icons ? meta.icon : "BarChart3") as keyof typeof Icons;
  const Icon = Icons[iconKey] as Icons.LucideIcon;

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
          <ReportHeaderActions
            meta={meta}
            isFavorite={isFavorite}
            toggleFavorite={toggleFavorite}
            executing={executing}
            generate={generate}
            exportRows={exportRows}
            saveView={saveView}
            resetView={resetView}
          />
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

      <ParamsBar {...props} />

      {!hasRun ? (
        <div className="rounded-md border border-dashed border-border bg-card p-12 text-center">
          {executing ? (
            <>
              <RefreshCw className="mx-auto mb-3 h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading report...</p>
            </>
          ) : (
            <>
              <Icon className="mx-auto mb-3 h-10 w-10 text-primary" />
              <p className="text-sm text-muted-foreground">
                This report has required filters — set them above, then click{" "}
                <span className="font-medium">Refresh</span> to run it.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0">
            <TabsList className="grid w-full grid-cols-2 sm:w-[320px]">
              <TabsTrigger
                value="analytics"
                className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <LineChartIcon className="h-3.5 w-3.5" /> Analytics
              </TabsTrigger>
              <TabsTrigger
                value="data"
                className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
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
                    <CategoryBreakdownWidget
                      key={stat.column.key}
                      title={`${stat.column.label} Distribution`}
                      counts={stat.counts}
                      preferPie={stat.distinct <= 4 || i % 2 === 0}
                    />
                  ))}
                  {ageStat && ageStat.chartData.length > 0 && (
                    <ChartPanel title={`${ageStat.label} Distribution`}>
                      <ConfiguredChart type="area" data={ageStat.chartData} />
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
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 gap-1.5 rounded-md border-success/30 bg-success/15 text-success hover:bg-success/20"
                        >
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
                        className="h-9 gap-1.5 rounded-md border-success/30 bg-success/15 text-success hover:bg-success/20"
                        onClick={exportRows}
                      >
                        <Download className="h-3.5 w-3.5" /> Export
                      </Button>
                    )}
                  </>
                }
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
