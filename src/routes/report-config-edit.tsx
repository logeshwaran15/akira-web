import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Save,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PageLoader } from "@/components/erp/Spinner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/report-config-edit")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Report Designer — Akira School ERP" },
      {
        name: "description",
        content: "Author a report definition: data source, columns, filters, permissions.",
      },
    ],
  }),
  component: ReportConfigEditPage,
});

const CATEGORY_OPTIONS = [
  "Student",
  "Attendance",
  "Fee",
  "Examination",
  "HR",
  "Library",
  "Transport",
  "Custom",
];
const ROLE_OPTIONS = ["ADMIN", "PRINCIPAL", "TEACHER", "ACCOUNTANT", "HR", "TRANSPORT", "LIBRARY"];

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

const emptyColumn = (key: string): ColumnDef => ({
  key,
  label: key,
  width: 150,
  align: "left",
  dataType: "text",
  visible: true,
  sortable: true,
  filterable: true,
  exportable: true,
  frozen: false,
  isHyperlink: false,
  dateFormat: "dd/MM/yyyy",
});

type ReportDetail = {
  reportName: string;
  displayName: string;
  category: string;
  module: string | null;
  description: string | null;
  icon: string | null;
  displayOrder: number;
  isActive: boolean;
  allowExport: boolean;
  allowPrint: boolean;
  allowEmail: boolean;
  allowCharts: boolean;
  defaultPageSize: number;
  dataSource: string | null;
  queryType: string;
  sqlQuery: string;
  maxRecords: number;
  executionTimeoutSeconds: number;
  columnsJson: string | null;
  chartConfigJson: string | null;
  parametersJson: string | null;
  permissionsJson: string | null;
};

const emptyParam = (): ParamDef => ({
  name: "",
  label: "",
  type: "text",
  required: false,
  allowMultiSelect: false,
  defaultValue: "",
  optionsCsv: "",
});

function guessDataType(value: unknown): ColumnDef["dataType"] {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return "date";
  return "text";
}

function formatSql(sql: string): string {
  const keywords = [
    "SELECT",
    "FROM",
    "WHERE",
    "AND",
    "OR",
    "JOIN",
    "INNER JOIN",
    "LEFT JOIN",
    "RIGHT JOIN",
    "GROUP BY",
    "ORDER BY",
    "HAVING",
    "ON",
    "AS",
    "WITH",
    "UNION ALL",
    "UNION",
  ];
  let out = sql.trim();
  for (const kw of keywords) {
    out = out.replace(new RegExp(`\\b${kw.replace(/ /g, "\\s+")}\\b`, "gi"), `\n${kw}`);
  }
  return out.replace(/\n{2,}/g, "\n").trim();
}

function SqlEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const lineCount = Math.max(value.split("\n").length, 12);
  const gutterRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const syncScroll = () => {
    if (gutterRef.current && taRef.current) gutterRef.current.scrollTop = taRef.current.scrollTop;
  };

  return (
    <div className="flex overflow-hidden rounded-md border border-border bg-[#1e1e2e] font-mono text-sm">
      <div
        ref={gutterRef}
        className="select-none overflow-hidden bg-[#181825] px-3 py-3 text-right text-[#585b70]"
        style={{ lineHeight: "1.5rem" }}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        spellCheck={false}
        placeholder="SELECT s.AdmissionNumber, s.StudentName FROM Student s WHERE s.AkiraTenantKey = @TenantKey"
        className="min-h-[280px] flex-1 resize-y bg-transparent px-3 py-3 text-[#cdd6f4] outline-none"
        style={{ lineHeight: "1.5rem" }}
      />
    </div>
  );
}

function ReportConfigEditPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // General
  const [reportName, setReportName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [category, setCategory] = useState("Custom");
  const [module, setModule] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("BarChart3");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [allowExport, setAllowExport] = useState(true);
  const [allowPrint, setAllowPrint] = useState(true);
  const [allowEmail, setAllowEmail] = useState(false);
  const [allowCharts, setAllowCharts] = useState(true);
  const [defaultPageSize, setDefaultPageSize] = useState(25);

  // Data source
  const [allowCustomSql, setAllowCustomSql] = useState(true);
  const [dataSource, setDataSource] = useState("");
  const [sqlQuery, setSqlQuery] = useState("");
  const [maxRecords, setMaxRecords] = useState(5000);
  const [executionTimeoutSeconds, setExecutionTimeoutSeconds] = useState(30);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<{
    isValid: boolean;
    errorMessage: string | null;
  } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);

  // Columns + chart
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [chartType, setChartType] = useState<"none" | "bar" | "line" | "pie" | "area">("bar");
  const [chartX, setChartX] = useState("");
  const [chartY, setChartY] = useState("");

  // Parameters
  const [params, setParams] = useState<ParamDef[]>([]);

  // Permissions
  const [allowRoleBasedAccess, setAllowRoleBasedAccess] = useState(false);
  const [permissionRoles, setPermissionRoles] = useState<Set<string>>(new Set(ROLE_OPTIONS));

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch(`/api/AdhocReport/${id}`)
      .then((r: ReportDetail) => {
        setReportName(r.reportName);
        setDisplayName(r.displayName);
        setCategory(r.category);
        setModule(r.module ?? "");
        setDescription(r.description ?? "");
        setIcon(r.icon ?? "BarChart3");
        setDisplayOrder(r.displayOrder ?? 0);
        setIsActive(r.isActive);
        setAllowExport(r.allowExport);
        setAllowPrint(r.allowPrint);
        setAllowEmail(r.allowEmail);
        setAllowCharts(r.allowCharts);
        setDefaultPageSize(r.defaultPageSize ?? 25);
        setDataSource(r.dataSource ?? "");
        setAllowCustomSql(r.queryType !== "TABLE");
        setSqlQuery(r.sqlQuery ?? "");
        setMaxRecords(r.maxRecords ?? 5000);
        setExecutionTimeoutSeconds(r.executionTimeoutSeconds ?? 30);
        if (r.columnsJson) {
          try {
            setColumns(JSON.parse(r.columnsJson));
          } catch {
            /* ignore */
          }
        }
        if (r.chartConfigJson) {
          try {
            const cc = JSON.parse(r.chartConfigJson);
            setChartType(cc.type ?? "bar");
            setChartX(cc.xField ?? "");
            setChartY(cc.yField ?? "");
          } catch {
            /* ignore */
          }
        }
        if (r.parametersJson) {
          try {
            setParams(JSON.parse(r.parametersJson));
          } catch {
            /* ignore */
          }
        }
        if (r.permissionsJson) {
          try {
            const p = JSON.parse(r.permissionsJson);
            setAllowRoleBasedAccess(true);
            setPermissionRoles(new Set(p.roles ?? ROLE_OPTIONS));
          } catch {
            /* ignore */
          }
        }
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load report"))
      .finally(() => setLoading(false));
  }, [id]);

  const validateSql = async () => {
    setValidating(true);
    setValidation(null);
    try {
      const r = await apiFetch("/api/AdhocReport/validate-sql", {
        method: "POST",
        body: JSON.stringify({ sqlQuery }),
      });
      setValidation(r);
    } catch (err) {
      setValidation({
        isValid: false,
        errorMessage: err instanceof Error ? err.message : "Validation failed",
      });
    } finally {
      setValidating(false);
    }
  };

  const testQuery = async () => {
    setPreviewing(true);
    try {
      const r: { rows: Record<string, unknown>[]; columnNames: string[] } = await apiFetch(
        "/api/AdhocReport/preview",
        {
          method: "POST",
          body: JSON.stringify({ sqlQuery, maxRecords: 20, executionTimeoutSeconds }),
        },
      );
      setPreviewRows(r.rows);
      setValidation({ isValid: true, errorMessage: null });
      if (columns.length === 0 && r.columnNames.length > 0) {
        setColumns(r.columnNames.map((k) => emptyColumn(k)));
      }
      if (r.rows.length > 0 && r.columnNames.length > 0) {
        setColumns((prev) =>
          prev.map((c) => {
            if (!(c.key in r.rows[0])) return c;
            return {
              ...c,
              dataType: c.dataType === "text" ? guessDataType(r.rows[0][c.key]) : c.dataType,
            };
          }),
        );
      }
      toast.success(`Query returned ${r.rows.length} sample row(s)`);
    } catch (err) {
      setValidation({
        isValid: false,
        errorMessage: err instanceof Error ? err.message : "Query failed",
      });
      toast.error(err instanceof Error ? err.message : "Query failed");
    } finally {
      setPreviewing(false);
    }
  };

  const effectiveSql = allowCustomSql ? sqlQuery : `SELECT * FROM ${dataSource}`;

  const save = async () => {
    if (!reportName.trim() || !displayName.trim()) {
      toast.error("Report Name and Display Name are required.");
      setActiveTab("general");
      return;
    }
    if (!effectiveSql.trim()) {
      toast.error("A data source query is required.");
      setActiveTab("datasource");
      return;
    }

    setSaving(true);
    try {
      const body = {
        reportName,
        displayName,
        category,
        module: module || null,
        description: description || null,
        dataSource: dataSource || null,
        queryType: allowCustomSql ? "SQL" : "TABLE",
        sqlQuery: effectiveSql,
        parametersJson: params.length > 0 ? JSON.stringify(params) : null,
        columnsJson: columns.length > 0 ? JSON.stringify(columns) : null,
        chartConfigJson: JSON.stringify({ type: chartType, xField: chartX, yField: chartY }),
        permissionsJson: allowRoleBasedAccess
          ? JSON.stringify({ roles: Array.from(permissionRoles) })
          : null,
        displayOrder,
        icon,
        allowExport,
        allowPrint,
        allowEmail,
        allowCharts,
        defaultPageSize,
        maxRecords,
        executionTimeoutSeconds,
      };

      if (isEditing && id) {
        await apiFetch(`/api/AdhocReport/${id}`, { method: "PUT", body: JSON.stringify(body) });
        toast.success("Report updated");
      } else {
        await apiFetch("/api/AdhocReport", { method: "POST", body: JSON.stringify(body) });
        toast.success("Report created as a draft — publish it from Configuration when ready");
      }
      navigate({ to: "/report-config" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save report");
    } finally {
      setSaving(false);
    }
  };

  const updateColumn = (key: string, patch: Partial<ColumnDef>) =>
    setColumns((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  const addParam = () => setParams((p) => [...p, emptyParam()]);
  const updateParam = (idx: number, patch: Partial<ParamDef>) =>
    setParams((p) => p.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  const removeParam = (idx: number) => setParams((p) => p.filter((_, i) => i !== idx));

  if (loading) {
    return <PageLoader label="Loading report..." />;
  }

  return (
    <div>
      <PageHeader
        title={isEditing ? `Edit Report — ${displayName || reportName}` : "New Report"}
        breadcrumbs={[
          { label: "Configuration" },
          { label: "Ad-hoc Report Configuration", to: "/report-config" },
          { label: isEditing ? "Edit" : "New" },
        ]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="datasource">Data Source</TabsTrigger>
          <TabsTrigger value="columns">Columns &amp; Chart</TabsTrigger>
          <TabsTrigger value="filters">Filters</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid grid-cols-2 gap-4 rounded-md border border-border bg-card p-5 shadow-sm">
            <div className="space-y-1.5">
              <Label required>Report Name</Label>
              <Input
                className="rounded-md font-mono text-sm"
                value={reportName}
                disabled={isEditing}
                onChange={(e) => setReportName(e.target.value.replace(/[^a-zA-Z0-9_]/g, "_"))}
                placeholder="STUDENT_MASTER_REPORT"
              />
              <p className="text-xs text-muted-foreground">
                Internal system name. Cannot be changed after creation.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label required>Display Name</Label>
              <Input
                className="rounded-md"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Student Master Report"
              />
            </div>
            <div className="space-y-1.5">
              <Label required>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Module</Label>
              <Input
                className="rounded-md"
                value={module}
                onChange={(e) => setModule(e.target.value)}
                placeholder="e.g. SIS, Fees, Examination"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Description</Label>
              <Textarea
                className="rounded-md"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Icon (Lucide name)</Label>
              <Input
                className="rounded-md"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="BarChart3"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Display Order</Label>
              <Input
                type="number"
                className="rounded-md"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Default Page Size</Label>
              <Input
                type="number"
                className="rounded-md"
                value={defaultPageSize}
                onChange={(e) => setDefaultPageSize(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <span className="text-sm">Status: Active</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
            <div className="col-span-2 grid grid-cols-4 gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={allowExport} onCheckedChange={(v) => setAllowExport(!!v)} />{" "}
                Allow Export
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={allowPrint} onCheckedChange={(v) => setAllowPrint(!!v)} /> Allow
                Print
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={allowEmail} onCheckedChange={(v) => setAllowEmail(!!v)} /> Allow
                Email
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={allowCharts} onCheckedChange={(v) => setAllowCharts(!!v)} />{" "}
                Allow Charts
              </label>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="datasource">
          <div className="space-y-4 rounded-md border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <div className="text-sm font-medium">Allow Custom SQL</div>
                <p className="text-xs text-muted-foreground">
                  Off: pick a table/view directly (SELECT * only). On: write a full SELECT query.
                </p>
              </div>
              <Switch checked={allowCustomSql} onCheckedChange={setAllowCustomSql} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Database Table / SQL View</Label>
                <Input
                  className="rounded-md font-mono text-sm"
                  value={dataSource}
                  onChange={(e) => setDataSource(e.target.value)}
                  placeholder="Student"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Maximum Records</Label>
                <Input
                  type="number"
                  className="rounded-md"
                  value={maxRecords}
                  onChange={(e) => setMaxRecords(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Execution Timeout (seconds)</Label>
                <Input
                  type="number"
                  className="rounded-md"
                  value={executionTimeoutSeconds}
                  onChange={(e) => setExecutionTimeoutSeconds(Number(e.target.value))}
                />
              </div>
            </div>

            {allowCustomSql && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>SQL Query Editor</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 rounded-md"
                      onClick={() => setSqlQuery(formatSql(sqlQuery))}
                    >
                      <Wand2 className="h-3.5 w-3.5" /> Format SQL
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 rounded-md"
                      disabled={validating}
                      onClick={validateSql}
                    >
                      {validating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}{" "}
                      Validate
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 gap-1.5 rounded-md"
                      disabled={previewing}
                      onClick={testQuery}
                    >
                      {previewing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <PlayCircle className="h-3.5 w-3.5" />
                      )}{" "}
                      Test Query
                    </Button>
                  </div>
                </div>
                <SqlEditor value={sqlQuery} onChange={setSqlQuery} />
                <p className="text-xs text-muted-foreground">
                  Only SELECT statements are allowed. INSERT / UPDATE / DELETE / DROP / ALTER /
                  TRUNCATE / EXEC are blocked. Reference filter parameters as{" "}
                  <code className="rounded bg-muted px-1">@ParameterName</code> — define them in the
                  Filters tab.
                </p>
                {validation && (
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-md border p-2.5 text-sm",
                      validation.isValid
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-destructive/30 bg-destructive/10 text-destructive",
                    )}
                  >
                    {validation.isValid ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    {validation.isValid ? "Query is valid." : validation.errorMessage}
                  </div>
                )}
              </div>
            )}

            {previewRows.length > 0 && (
              <div className="space-y-2">
                <Label>Preview Data ({previewRows.length} sample rows)</Label>
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40">
                      <tr>
                        {Object.keys(previewRows[0]).map((k) => (
                          <th
                            key={k}
                            className="whitespace-nowrap px-2 py-1.5 text-left font-semibold"
                          >
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-t border-border">
                          {Object.keys(previewRows[0]).map((k) => (
                            <td key={k} className="whitespace-nowrap px-2 py-1.5">
                              {String(row[k] ?? "—")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="columns">
          <div className="space-y-4 rounded-md border border-border bg-card p-5 shadow-sm">
            {columns.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Run <strong>Test Query</strong> in the Data Source tab to auto-detect columns, then
                configure them here.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="p-2 text-left">Visible</th>
                      <th className="p-2 text-left">Column</th>
                      <th className="p-2 text-left">Display Name</th>
                      <th className="p-2 text-left">Width</th>
                      <th className="p-2 text-left">Align</th>
                      <th className="p-2 text-left">Data Type</th>
                      <th className="p-2 text-left">Sortable</th>
                      <th className="p-2 text-left">Filterable</th>
                      <th className="p-2 text-left">Exportable</th>
                      <th className="p-2 text-left">Frozen</th>
                      <th className="p-2 text-left">Hyperlink</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((c) => (
                      <tr key={c.key} className="border-t border-border">
                        <td className="p-2">
                          <Checkbox
                            checked={c.visible}
                            onCheckedChange={(v) => updateColumn(c.key, { visible: !!v })}
                          />
                        </td>
                        <td className="p-2 font-mono text-xs text-muted-foreground">{c.key}</td>
                        <td className="p-2">
                          <Input
                            className="h-8 w-32 rounded-md"
                            value={c.label}
                            onChange={(e) => updateColumn(c.key, { label: e.target.value })}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            className="h-8 w-20 rounded-md"
                            value={c.width}
                            onChange={(e) => updateColumn(c.key, { width: Number(e.target.value) })}
                          />
                        </td>
                        <td className="p-2">
                          <Select
                            value={c.align}
                            onValueChange={(v) =>
                              updateColumn(c.key, { align: v as ColumnDef["align"] })
                            }
                          >
                            <SelectTrigger className="h-8 w-24 rounded-md">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Left</SelectItem>
                              <SelectItem value="center">Center</SelectItem>
                              <SelectItem value="right">Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Select
                            value={c.dataType}
                            onValueChange={(v) =>
                              updateColumn(c.key, { dataType: v as ColumnDef["dataType"] })
                            }
                          >
                            <SelectTrigger className="h-8 w-28 rounded-md">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="currency">Currency</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="boolean">Boolean</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Checkbox
                            checked={c.sortable}
                            onCheckedChange={(v) => updateColumn(c.key, { sortable: !!v })}
                          />
                        </td>
                        <td className="p-2">
                          <Checkbox
                            checked={c.filterable}
                            onCheckedChange={(v) => updateColumn(c.key, { filterable: !!v })}
                          />
                        </td>
                        <td className="p-2">
                          <Checkbox
                            checked={c.exportable}
                            onCheckedChange={(v) => updateColumn(c.key, { exportable: !!v })}
                          />
                        </td>
                        <td className="p-2">
                          <Checkbox
                            checked={c.frozen}
                            onCheckedChange={(v) => updateColumn(c.key, { frozen: !!v })}
                          />
                        </td>
                        <td className="p-2">
                          <Checkbox
                            checked={c.isHyperlink}
                            onCheckedChange={(v) => updateColumn(c.key, { isHyperlink: !!v })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-2 border-t border-border pt-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" /> Analytics Chart
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Chart Type</Label>
                  <Select
                    value={chartType}
                    onValueChange={(v) => setChartType(v as typeof chartType)}
                  >
                    <SelectTrigger className="rounded-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                      <SelectItem value="line">Line</SelectItem>
                      <SelectItem value="pie">Pie</SelectItem>
                      <SelectItem value="area">Area</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Category (X-Axis) Field</Label>
                  <Select value={chartX} onValueChange={setChartX}>
                    <SelectTrigger className="rounded-md">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((c) => (
                        <SelectItem key={c.key} value={c.key}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Value (Y-Axis) Field</Label>
                  <Select value={chartY} onValueChange={setChartY}>
                    <SelectTrigger className="rounded-md">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns
                        .filter((c) => c.dataType === "number" || c.dataType === "currency")
                        .map((c) => (
                          <SelectItem key={c.key} value={c.key}>
                            {c.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="filters">
          <div className="space-y-4 rounded-md border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Filter Parameters</div>
                <p className="text-xs text-muted-foreground">
                  Each parameter must be referenced in the SQL as{" "}
                  <code className="rounded bg-muted px-1">@Name</code>. Rendered as a filter control
                  in the Report Viewer.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-md"
                onClick={addParam}
              >
                <Plus className="h-3.5 w-3.5" /> Add Parameter
              </Button>
            </div>

            {params.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No parameters — report runs with no filters.
              </p>
            ) : (
              <div className="space-y-3">
                {params.map((p, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 items-end gap-2 rounded-md border border-border p-3"
                  >
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Name</Label>
                      <Input
                        className="h-8 rounded-md font-mono text-xs"
                        value={p.name}
                        onChange={(e) =>
                          updateParam(idx, { name: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })
                        }
                        placeholder="FromDate"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Label</Label>
                      <Input
                        className="h-8 rounded-md"
                        value={p.label}
                        onChange={(e) => updateParam(idx, { label: e.target.value })}
                        placeholder="From Date"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={p.type}
                        onValueChange={(v) => updateParam(idx, { type: v as ParamDef["type"] })}
                      >
                        <SelectTrigger className="h-8 rounded-md">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="daterange">Date Range</SelectItem>
                          <SelectItem value="academicYear">Academic Year</SelectItem>
                          <SelectItem value="schoolClass">Class</SelectItem>
                          <SelectItem value="department">Department</SelectItem>
                          <SelectItem value="select">Custom Select</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {p.type === "select" ? (
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Options (comma-separated)</Label>
                        <Input
                          className="h-8 rounded-md"
                          value={p.optionsCsv}
                          onChange={(e) => updateParam(idx, { optionsCsv: e.target.value })}
                          placeholder="ACTIVE,INACTIVE"
                        />
                      </div>
                    ) : (
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Default Value</Label>
                        <Input
                          className="h-8 rounded-md"
                          value={p.defaultValue}
                          onChange={(e) => updateParam(idx, { defaultValue: e.target.value })}
                        />
                      </div>
                    )}
                    <div className="col-span-1 flex items-center gap-1.5 pb-1.5">
                      <Checkbox
                        checked={p.required}
                        onCheckedChange={(v) => updateParam(idx, { required: !!v })}
                      />
                      <span className="text-xs">Required</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5 pb-1.5">
                      <Checkbox
                        checked={p.allowMultiSelect}
                        onCheckedChange={(v) => updateParam(idx, { allowMultiSelect: !!v })}
                        disabled={
                          p.type !== "select" && p.type !== "schoolClass" && p.type !== "department"
                        }
                      />
                      <span className="text-xs">Multi-Select</span>
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-md text-destructive"
                        onClick={() => removeParam(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="permissions">
          <div className="space-y-4 rounded-md border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <div className="text-sm font-medium">Allow Role Based Access</div>
                <p className="text-xs text-muted-foreground">
                  Off: every signed-in role can run this report once published.
                </p>
              </div>
              <Switch checked={allowRoleBasedAccess} onCheckedChange={setAllowRoleBasedAccess} />
            </div>

            {allowRoleBasedAccess && (
              <div className="grid grid-cols-4 gap-3">
                {ROLE_OPTIONS.map((role) => (
                  <label
                    key={role}
                    className="flex items-center gap-2 rounded-md border border-border p-2.5 text-sm"
                  >
                    <Checkbox
                      checked={permissionRoles.has(role)}
                      onCheckedChange={(v) =>
                        setPermissionRoles((prev) => {
                          const next = new Set(prev);
                          if (v) next.add(role);
                          else next.delete(role);
                          return next;
                        })
                      }
                    />
                    {role.charAt(0) + role.slice(1).toLowerCase()}
                  </label>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-4 flex items-center justify-between rounded-md border border-border bg-card p-4 shadow-sm">
        <Button
          variant="outline"
          className="rounded-md border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => navigate({ to: "/report-config" })}
        >
          Cancel
        </Button>
        <Button className="gap-1.5 rounded-md" disabled={saving} onClick={save}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save Report"}
        </Button>
      </div>
    </div>
  );
}
