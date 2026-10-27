import { StatCard } from "@/components/erp/StatCard";
import * as Icons from "lucide-react";
import type { ColumnDef, ReportWidget } from "@/lib/report-layout";
import {
  computeStatCardValue,
  computeCategoryBreakdown,
  computeChartSeries,
} from "@/lib/report-layout";
import { ChartPanel, ConfiguredChart } from "./ChartWidget";
import { CategoryBreakdownWidget } from "./CategoryBreakdownWidget";
import { TableWidget } from "./TableWidget";

export function WidgetRenderer({
  widget,
  rows,
  columns,
  visibleKeys,
  formatDate,
  storageKeyPrefix,
}: {
  widget: ReportWidget;
  rows: Record<string, unknown>[];
  columns: ColumnDef[];
  visibleKeys: Set<string>;
  formatDate: (v: string) => string;
  storageKeyPrefix: string;
}) {
  switch (widget.type) {
    case "StatCard":
      return (
        <StatCard
          label={widget.title}
          value={computeStatCardValue(rows, widget.agg, widget.field)}
          icon={Icons.Database}
          tone={widget.tone ?? "primary"}
        />
      );
    case "CategoryBreakdown": {
      const counts = computeCategoryBreakdown(rows, widget.field);
      if (counts.length === 0) return null;
      return <CategoryBreakdownWidget title={widget.title ?? widget.field} counts={counts} />;
    }
    case "Chart": {
      const data = computeChartSeries(rows, widget.xField, widget.yField, widget.agg ?? "sum");
      if (data.length === 0) return null;
      return (
        <ChartPanel title={widget.title}>
          <ConfiguredChart type={widget.chartType} data={data} />
        </ChartPanel>
      );
    }
    case "Table": {
      const cols = widget.columns
        ? columns.filter((c) => widget.columns!.includes(c.key))
        : columns;
      const keys = widget.columns ? new Set(widget.columns) : visibleKeys;
      return (
        <TableWidget
          title={widget.title}
          rows={rows}
          columns={cols}
          visibleKeys={keys}
          formatDate={formatDate}
          storageKey={`${storageKeyPrefix}-${widget.key}`}
          pageSizes={[25, 50, 100, 200]}
        />
      );
    }
    default:
      return null;
  }
}
