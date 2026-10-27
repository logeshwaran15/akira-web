import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { PageLoader } from "@/components/erp/Spinner";
import { useFormatDate } from "@/hooks/use-tenant-setting";
import { parseReportLayout, type ColumnDef } from "@/lib/report-layout";
import { ReportViewerV1 } from "@/components/erp/report-viewer/ReportViewerV1";
import { ReportViewerV2 } from "@/components/erp/report-viewer/ReportViewerV2";
import type { Option, ParamDef, ViewerMeta } from "@/components/erp/report-viewer/types";

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

function safeParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

function ReportViewerPage() {
  const { id, preview } = Route.useSearch();
  const formatDate = useFormatDate();

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

  const params: ParamDef[] = useMemo(() => safeParse(meta?.parametersJson, []), [meta]);
  const columns: ColumnDef[] = useMemo(() => safeParse(meta?.columnsJson, []), [meta]);
  const layoutConfig = useMemo(() => parseReportLayout(meta?.chartConfigJson), [meta]);

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

        // Merge in a previously saved view (filters + visible columns), if any,
        // right here so the very first execute() call below already uses it —
        // no separate effect/render round-trip needed.
        let mergedParamValues = defaults;
        const c: ColumnDef[] = safeParse(d.columnsJson, []);
        let mergedVisibleCols = new Set(c.filter((x) => x.visible).map((x) => x.key));
        const saved = localStorage.getItem(`report-view-${id}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as {
              paramValues?: Record<string, string>;
              visibleCols?: string[];
            };
            if (parsed.paramValues) mergedParamValues = { ...defaults, ...parsed.paramValues };
            if (parsed.visibleCols) mergedVisibleCols = new Set(parsed.visibleCols);
          } catch {
            // ignore corrupt saved view
          }
        }

        setParamValues(mergedParamValues);
        setVisibleCols(mergedVisibleCols);

        // Auto-load the report data on open -- no Generate button. If required
        // filters aren't satisfiable from defaults/saved view, this silently
        // no-ops instead of run() and the user can trigger a run via the
        // header Refresh button once they've picked filter values.
        void run(id, p, mergedParamValues, c, { silent: true });
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load report"))
      .finally(() => setLoadingMeta(false));

    apiFetch("/api/AdhocReport/favorites")
      .then((f: string[]) => setIsFavorite(f.includes(id)))
      .catch(() => {});
  }, [id]);

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

  // Shared execute() call, usable both from the auto-load-on-open path (with
  // explicit params/columns passed in, before state has committed) and from
  // the header's manual Refresh button (reading current state via `generate`
  // below). `silent` skips the required-filter/error toasts on first auto-load.
  const run = async (
    reportId: string,
    activeParams: ParamDef[],
    activeParamValues: Record<string, string>,
    activeColumns: ColumnDef[],
    opts?: { silent?: boolean },
  ) => {
    for (const p of activeParams) {
      const missing =
        p.required &&
        (p.type === "daterange"
          ? !activeParamValues[`${p.name}From`] || !activeParamValues[`${p.name}To`]
          : !activeParamValues[p.name]);
      if (missing) {
        if (!opts?.silent) toast.error(`${p.label} is required.`);
        return;
      }
    }

    setExecuting(true);
    try {
      const parameters: Record<string, string | null> = {};
      activeParams.forEach((p) => {
        if (p.type === "daterange") {
          parameters[`${p.name}From`] = activeParamValues[`${p.name}From`] || null;
          parameters[`${p.name}To`] = activeParamValues[`${p.name}To`] || null;
        } else {
          parameters[p.name] = activeParamValues[p.name] || null;
        }
      });

      const r: { rows: Record<string, unknown>[]; durationMs: number } = await apiFetch(
        `/api/AdhocReport/${reportId}/execute`,
        {
          method: "POST",
          body: JSON.stringify({ parameters }),
        },
      );
      setRows(r.rows);
      setHasRun(true);
      if (activeColumns.length === 0 && r.rows.length > 0) {
        setVisibleCols(new Set(Object.keys(r.rows[0])));
      }
      if (!opts?.silent) toast.success(`Report generated — ${r.rows.length} row(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to execute report");
    } finally {
      setExecuting(false);
    }
  };

  const generate = () => run(id, params, paramValues, columns);

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

  const viewerProps = {
    id,
    preview,
    meta,
    params,
    paramValues,
    setParamValues,
    academicYears,
    schoolClasses,
    departments,
    rows,
    executing,
    hasRun,
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
  };

  return layoutConfig.layoutVersion === 2 && (layoutConfig.tabs?.length ?? 0) > 0 ? (
    <ReportViewerV2 {...viewerProps} />
  ) : (
    <ReportViewerV1 {...viewerProps} />
  );
}
