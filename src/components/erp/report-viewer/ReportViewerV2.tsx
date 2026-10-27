import { useMemo, useRef, useState, useTransition } from "react";
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
import { RefreshCw, Columns3, Table2, Download } from "lucide-react";
import { WidgetRenderer } from "@/components/erp/report-widgets/WidgetRenderer";
import { buildDataTableColumns } from "@/components/erp/report-widgets/TableWidget";
import { DataTable } from "@/components/erp/DataTable";
import type { ReportWidget } from "@/lib/report-layout";
import type { ReportViewerProps } from "./types";
import { ParamsBar, ReportHeaderActions, makeExportRows } from "./shared";

/** Widget-driven viewer: tabs come from layoutConfig.tabs, each rendered through
 * the WidgetRenderer dispatch table. Since one report == one query, "per-tab
 * caching" here means: (1) derived widget computations are memoized per
 * (tab index, rows reference, widget) so switching tabs never recomputes, and
 * (2) a fresh Generate() runs in a transition so the previously rendered tab
 * stays on screen instead of flashing blank while new rows load. */
export function ReportViewerV2(props: ReportViewerProps) {
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

  const tabs = layoutConfig.tabs ?? [];
  const [activeTab, setActiveTab] = useState(tabs[0]?.tabName ?? "data");
  const [, startTransition] = useTransition();

  // key: `${tabName}::${rowsRef}::${JSON.stringify(widget)}` -> cached React node
  const widgetCache = useRef(new Map<string, React.ReactNode>());
  const rowsRef = useRef(rows);
  if (rowsRef.current !== rows) {
    widgetCache.current.clear();
    rowsRef.current = rows;
  }

  const runGenerate = () => {
    startTransition(() => {
      generate();
    });
  };

  const dataTableColumns = useMemo(
    () =>
      buildDataTableColumns(
        effectiveColumns.filter((c) => visibleCols.has(c.key)),
        visibleCols,
        formatDate,
      ),
    [effectiveColumns, visibleCols, formatDate],
  );
  const exportRows = makeExportRows(
    meta.displayName,
    dataTableColumns.map((c) => ({ key: c.key, header: c.header })),
    rows,
  );

  const renderWidget = (tabName: string, widget: ReportWidget) => {
    const cacheKey = `${tabName}::${JSON.stringify(widget)}`;
    const cached = widgetCache.current.get(cacheKey);
    if (cached !== undefined) return cached;
    const node = (
      <WidgetRenderer
        key={widget.key}
        widget={widget}
        rows={rows}
        columns={effectiveColumns}
        visibleKeys={visibleCols}
        formatDate={formatDate}
        storageKeyPrefix={`report-viewer-${id}-${tabName}`}
      />
    );
    widgetCache.current.set(cacheKey, node);
    return node;
  };

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
            generate={runGenerate}
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
            <TabsList className="flex w-full flex-wrap justify-start gap-1">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.tabName}
                  value={tab.tabName}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {tab.tabName}
                </TabsTrigger>
              ))}
              <TabsTrigger
                value="data"
                className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Table2 className="h-3.5 w-3.5" /> Data
              </TabsTrigger>
            </TabsList>

            {tabs.map((tab) => (
              <TabsContent key={tab.tabName} value={tab.tabName} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {tab.tabItems
                    .filter((w) => w.type === "StatCard")
                    .map((w) => (
                      <div key={w.key}>{renderWidget(tab.tabName, w)}</div>
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {tab.tabItems
                    .filter((w) => w.type !== "StatCard" && w.type !== "Table")
                    .map((w) => (
                      <div key={w.key}>{renderWidget(tab.tabName, w)}</div>
                    ))}
                </div>
                {tab.tabItems
                  .filter((w) => w.type === "Table")
                  .map((w) => (
                    <div key={w.key}>{renderWidget(tab.tabName, w)}</div>
                  ))}
              </TabsContent>
            ))}

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
