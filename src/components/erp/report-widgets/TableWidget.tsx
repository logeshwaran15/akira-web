import { DataTable, type Column } from "@/components/erp/DataTable";
import type { ColumnDef } from "@/lib/report-layout";

export function buildDataTableColumns(
  columns: ColumnDef[],
  visibleKeys: Set<string>,
  formatDate: (v: string) => string,
): Column<Record<string, unknown>>[] {
  return columns
    .filter((c) => visibleKeys.has(c.key))
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
      accessor: (r: Record<string, unknown>) => {
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
}

export function TableWidget({
  title,
  rows,
  columns,
  visibleKeys,
  formatDate,
  storageKey,
  pageSizes,
  toolbar,
}: {
  title?: string;
  rows: Record<string, unknown>[];
  columns: ColumnDef[];
  visibleKeys: Set<string>;
  formatDate: (v: string) => string;
  storageKey: string;
  pageSizes: number[];
  toolbar?: React.ReactNode;
}) {
  const dataTableColumns = buildDataTableColumns(columns, visibleKeys, formatDate);
  return (
    <div className="space-y-2">
      {title && <div className="text-sm font-semibold">{title}</div>}
      <DataTable
        data={rows}
        columns={dataTableColumns}
        rowKey={(r) => JSON.stringify(r)}
        searchPlaceholder="Search results..."
        storageKey={storageKey}
        pageSizes={pageSizes}
        toolbar={toolbar}
      />
    </div>
  );
}
