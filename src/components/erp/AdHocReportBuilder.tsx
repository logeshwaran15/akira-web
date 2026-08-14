import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Plus, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { exportToCsv } from "@/lib/csv";
import { useFormatDate } from "@/hooks/use-tenant-setting";

type FieldType = "text" | "number" | "boolean" | "date";
type FieldMeta = { key: string; label: string; type: FieldType };

type DatasetDef = {
  label: string;
  needsDateRange?: boolean;
  buildUrl: (ctx: {
    academicYearKey: string;
    classKey: string;
    sectionKey: string;
    fromDate: string;
    toDate: string;
  }) => string | null;
  fields: FieldMeta[];
  defaultVisible: string[];
};

const DATASETS: Record<string, DatasetDef> = {
  students: {
    label: "Students",
    buildUrl: ({ academicYearKey, classKey, sectionKey }) => {
      const p = new URLSearchParams();
      if (academicYearKey) p.set("academicYearId", academicYearKey);
      if (classKey !== "all") p.set("classId", classKey);
      if (sectionKey !== "all") p.set("sectionId", sectionKey);
      return `/api/Student?${p.toString()}`;
    },
    fields: [
      { key: "admissionNumber", label: "Admission No.", type: "text" },
      { key: "studentName", label: "Student Name", type: "text" },
      { key: "gender", label: "Gender", type: "text" },
      { key: "dateOfBirth", label: "Date of Birth", type: "date" },
      { key: "bloodGroup", label: "Blood Group", type: "text" },
      { key: "studentStatus", label: "Status", type: "text" },
      { key: "communityCategory", label: "Community", type: "text" },
      { key: "rteStatus", label: "RTE", type: "boolean" },
      { key: "minorityStatus", label: "Minority", type: "boolean" },
      { key: "economicallyWeakerSection", label: "EWS", type: "boolean" },
      { key: "disabilityCategory", label: "Disability", type: "text" },
      { key: "academicYearName", label: "Academic Year", type: "text" },
      { key: "className", label: "Class", type: "text" },
      { key: "sectionLabel", label: "Section", type: "text" },
      { key: "rollNumber", label: "Roll No.", type: "text" },
      { key: "primaryGuardianName", label: "Guardian", type: "text" },
      { key: "primaryGuardianMobile", label: "Guardian Mobile", type: "text" },
    ],
    defaultVisible: [
      "admissionNumber",
      "studentName",
      "className",
      "sectionLabel",
      "rollNumber",
      "studentStatus",
    ],
  },
  inquiries: {
    label: "Admission Inquiries",
    buildUrl: ({ academicYearKey, classKey }) => {
      const p = new URLSearchParams();
      if (academicYearKey) p.set("academicYearApplyingForId", academicYearKey);
      if (classKey !== "all") p.set("classApplyingForId", classKey);
      return `/api/Inquiry?${p.toString()}`;
    },
    fields: [
      { key: "studentName", label: "Student Name", type: "text" },
      { key: "inquiryDate", label: "Inquiry Date", type: "date" },
      { key: "gender", label: "Gender", type: "text" },
      { key: "classApplyingForName", label: "Class Applying For", type: "text" },
      { key: "academicYearName", label: "Academic Year", type: "text" },
      { key: "primaryMobile", label: "Mobile", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "locality", label: "Locality", type: "text" },
      { key: "sourceOfInquiry", label: "Source", type: "text" },
      { key: "status", label: "Status", type: "text" },
      { key: "nextFollowUpDate", label: "Next Follow-up", type: "date" },
      { key: "dropReason", label: "Drop Reason", type: "text" },
    ],
    defaultVisible: [
      "studentName",
      "inquiryDate",
      "classApplyingForName",
      "primaryMobile",
      "sourceOfInquiry",
      "status",
    ],
  },
  applications: {
    label: "Admission Applications",
    buildUrl: ({ academicYearKey }) => {
      const p = new URLSearchParams();
      if (academicYearKey) p.set("academicYearId", academicYearKey);
      return `/api/Application?${p.toString()}`;
    },
    fields: [
      { key: "applicationNumber", label: "Application No.", type: "text" },
      { key: "applicationDate", label: "Application Date", type: "date" },
      { key: "status", label: "Status", type: "text" },
      { key: "academicYearName", label: "Academic Year", type: "text" },
      { key: "classApplyingForName", label: "Class Applying For", type: "text" },
      { key: "fullName", label: "Student Name", type: "text" },
      { key: "gender", label: "Gender", type: "text" },
      { key: "fatherName", label: "Father Name", type: "text" },
      { key: "fatherMobile", label: "Father Mobile", type: "text" },
      { key: "motherName", label: "Mother Name", type: "text" },
      { key: "prevSchoolName", label: "Previous School", type: "text" },
      { key: "admissionQuota", label: "Admission Quota", type: "text" },
      { key: "waitlistPosition", label: "Waitlist Position", type: "number" },
      { key: "applicationFeePaid", label: "Application Fee Paid", type: "boolean" },
    ],
    defaultVisible: [
      "applicationNumber",
      "applicationDate",
      "fullName",
      "classApplyingForName",
      "status",
    ],
  },
  feeReceipts: {
    label: "Fee Receipts",
    needsDateRange: true,
    buildUrl: ({ fromDate, toDate }) => {
      if (!fromDate || !toDate) return null;
      return `/api/Fee/receipts?fromDate=${fromDate}&toDate=${toDate}`;
    },
    fields: [
      { key: "receiptNumber", label: "Receipt No.", type: "text" },
      { key: "receiptDate", label: "Receipt Date", type: "date" },
      { key: "admissionNumber", label: "Admission No.", type: "text" },
      { key: "studentName", label: "Student Name", type: "text" },
      { key: "paymentMode", label: "Payment Mode", type: "text" },
      { key: "totalAmount", label: "Amount", type: "number" },
      { key: "status", label: "Status", type: "text" },
    ],
    defaultVisible: [
      "receiptNumber",
      "receiptDate",
      "studentName",
      "paymentMode",
      "totalAmount",
      "status",
    ],
  },
  attendance: {
    label: "Attendance Summary",
    needsDateRange: true,
    buildUrl: ({ academicYearKey, classKey, sectionKey, fromDate, toDate }) => {
      if (!academicYearKey || !fromDate || !toDate) return null;
      const p = new URLSearchParams({ academicYearId: academicYearKey, fromDate, toDate });
      if (classKey !== "all") p.set("classId", classKey);
      if (sectionKey !== "all") p.set("sectionId", sectionKey);
      return `/api/Report/attendance-summary?${p.toString()}`;
    },
    fields: [
      { key: "admissionNumber", label: "Admission No.", type: "text" },
      { key: "studentName", label: "Student Name", type: "text" },
      { key: "className", label: "Class", type: "text" },
      { key: "sectionLabel", label: "Section", type: "text" },
      { key: "rollNumber", label: "Roll No.", type: "text" },
      { key: "totalMarkedDays", label: "Marked Days", type: "number" },
      { key: "presentDays", label: "Present Days", type: "number" },
      { key: "absentDays", label: "Absent Days", type: "number" },
      { key: "lateDays", label: "Late Days", type: "number" },
      { key: "attendancePercent", label: "Attendance %", type: "number" },
    ],
    defaultVisible: [
      "admissionNumber",
      "studentName",
      "className",
      "totalMarkedDays",
      "presentDays",
      "attendancePercent",
    ],
  },
};

const OPERATORS: Record<FieldType, { value: string; label: string }[]> = {
  text: [
    { value: "contains", label: "contains" },
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "not equals" },
  ],
  number: [
    { value: "eq", label: "=" },
    { value: "neq", label: "≠" },
    { value: "gt", label: ">" },
    { value: "gte", label: "≥" },
    { value: "lt", label: "<" },
    { value: "lte", label: "≤" },
  ],
  boolean: [{ value: "is", label: "is" }],
  date: [
    { value: "on", label: "on" },
    { value: "before", label: "before" },
    { value: "after", label: "after" },
  ],
};

type FilterRow = { id: string; field: string; operator: string; value: string };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function firstOfMonthIso() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function matchesFilter(
  row: Record<string, unknown>,
  field: FieldMeta,
  operator: string,
  rawValue: string,
): boolean {
  const cell = row[field.key];

  if (field.type === "boolean") {
    const want = rawValue === "true";
    return !!cell === want;
  }
  if (field.type === "number") {
    const num = Number(cell);
    const val = Number(rawValue);
    if (Number.isNaN(num) || Number.isNaN(val)) return false;
    switch (operator) {
      case "eq":
        return num === val;
      case "neq":
        return num !== val;
      case "gt":
        return num > val;
      case "gte":
        return num >= val;
      case "lt":
        return num < val;
      case "lte":
        return num <= val;
      default:
        return true;
    }
  }
  if (field.type === "date") {
    if (!cell || !rawValue) return false;
    const cellDate = new Date(String(cell)).setHours(0, 0, 0, 0);
    const valDate = new Date(rawValue).setHours(0, 0, 0, 0);
    switch (operator) {
      case "on":
        return cellDate === valDate;
      case "before":
        return cellDate < valDate;
      case "after":
        return cellDate > valDate;
      default:
        return true;
    }
  }
  // text
  const cellStr = (cell === null || cell === undefined ? "" : String(cell)).toLowerCase();
  const valStr = rawValue.toLowerCase();
  switch (operator) {
    case "contains":
      return cellStr.includes(valStr);
    case "equals":
      return cellStr === valStr;
    case "not_equals":
      return cellStr !== valStr;
    default:
      return true;
  }
}

export function AdHocReportBuilder({
  academicYearKey,
  classKey,
  sectionKey,
}: {
  academicYearKey: string;
  classKey: string;
  sectionKey: string;
}) {
  const formatDate = useFormatDate();
  const [datasetKey, setDatasetKey] = useState<keyof typeof DATASETS>("students");
  const dataset = DATASETS[datasetKey];

  const [fromDate, setFromDate] = useState(firstOfMonthIso());
  const [toDate, setToDate] = useState(todayIso());
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState<Set<string>>(new Set(dataset.defaultVisible));
  const [filters, setFilters] = useState<FilterRow[]>([]);

  useEffect(() => {
    setVisible(new Set(DATASETS[datasetKey].defaultVisible));
    setFilters([]);
  }, [datasetKey]);

  const load = () => {
    const url = dataset.buildUrl({ academicYearKey, classKey, sectionKey, fromDate, toDate });
    if (!url) {
      setRows([]);
      return;
    }
    setLoading(true);
    apiFetch(url)
      .then((d: Record<string, unknown>[]) => setRows(d))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load report data"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, [dataset, academicYearKey, classKey, sectionKey, fromDate, toDate]);

  const addFilter = () => {
    const firstField = dataset.fields[0];
    setFilters((f) => [
      ...f,
      {
        id: crypto.randomUUID(),
        field: firstField.key,
        operator: OPERATORS[firstField.type][0].value,
        value: "",
      },
    ]);
  };
  const updateFilter = (id: string, patch: Partial<FilterRow>) => {
    setFilters((f) => f.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const removeFilter = (id: string) => setFilters((f) => f.filter((r) => r.id !== id));

  const filteredRows = useMemo(() => {
    if (filters.length === 0) return rows;
    return rows.filter((row) =>
      filters.every((f) => {
        if (!f.value && dataset.fields.find((fl) => fl.key === f.field)?.type !== "boolean")
          return true;
        const field = dataset.fields.find((fl) => fl.key === f.field);
        if (!field) return true;
        return matchesFilter(row, field, f.operator, f.value);
      }),
    );
  }, [rows, filters, dataset.fields]);

  const columns: Column<Record<string, unknown>>[] = dataset.fields
    .filter((f) => visible.has(f.key))
    .map((f) => ({
      key: f.key,
      header: f.label,
      sortable: true,
      accessor: (r) => {
        const v = r[f.key];
        if (f.type === "boolean") return v ? "Yes" : "—";
        if (f.type === "date" && v) return formatDate(String(v));
        return v === null || v === undefined || v === "" ? "—" : String(v);
      },
    }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-3 shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Dataset
        </span>
        <Select value={datasetKey} onValueChange={(v) => setDatasetKey(v as keyof typeof DATASETS)}>
          <SelectTrigger className="h-9 w-[220px] rounded-md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DATASETS).map(([key, d]) => (
              <SelectItem key={key} value={key}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dataset.needsDateRange && (
          <>
            <DatePicker
              value={fromDate}
              max={toDate}
              onChange={setFromDate}
              className="w-[150px]"
              placeholder="From"
            />
            <DatePicker
              value={toDate}
              min={fromDate}
              onChange={setToDate}
              className="w-[150px]"
              placeholder="To"
            />
          </>
        )}
        <span className="text-xs text-muted-foreground">
          {loading ? "Loading..." : `${filteredRows.length} of ${rows.length} records`}
        </span>
      </div>

      <div className="rounded-md border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Columns
        </div>
        <div className="flex flex-wrap gap-3">
          {dataset.fields.map((f) => (
            <label key={f.key} className="flex items-center gap-1.5 text-sm">
              <Checkbox
                checked={visible.has(f.key)}
                onCheckedChange={(v) =>
                  setVisible((prev) => {
                    const next = new Set(prev);
                    if (v) next.add(f.key);
                    else next.delete(f.key);
                    return next;
                  })
                }
              />
              {f.label}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Filters
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-md"
            onClick={addFilter}
          >
            <Plus className="h-3.5 w-3.5" /> Add Filter
          </Button>
        </div>
        {filters.length === 0 ? (
          <p className="text-sm text-muted-foreground">No filters — showing all records.</p>
        ) : (
          <div className="space-y-2">
            {filters.map((f) => {
              const field = dataset.fields.find((fl) => fl.key === f.field) ?? dataset.fields[0];
              return (
                <div key={f.id} className="flex flex-wrap items-center gap-2">
                  <Select
                    value={f.field}
                    onValueChange={(v) => {
                      const newField = dataset.fields.find((fl) => fl.key === v)!;
                      updateFilter(f.id, {
                        field: v,
                        operator: OPERATORS[newField.type][0].value,
                        value: "",
                      });
                    }}
                  >
                    <SelectTrigger className="h-9 w-[180px] rounded-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dataset.fields.map((fl) => (
                        <SelectItem key={fl.key} value={fl.key}>
                          {fl.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={f.operator}
                    onValueChange={(v) => updateFilter(f.id, { operator: v })}
                  >
                    <SelectTrigger className="h-9 w-[130px] rounded-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATORS[field.type].map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.type === "boolean" ? (
                    <Select
                      value={f.value || "true"}
                      onValueChange={(v) => updateFilter(f.id, { value: v })}
                    >
                      <SelectTrigger className="h-9 w-[120px] rounded-md">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : field.type === "date" ? (
                    <DatePicker
                      value={f.value}
                      onChange={(v) => updateFilter(f.id, { value: v })}
                      className="w-[150px]"
                    />
                  ) : (
                    <Input
                      className="h-9 w-[180px] rounded-md"
                      type={field.type === "number" ? "number" : "text"}
                      value={f.value}
                      onChange={(e) => updateFilter(f.id, { value: e.target.value })}
                      placeholder="Value"
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-md text-muted-foreground"
                    onClick={() => removeFilter(f.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DataTable
        data={filteredRows}
        columns={columns}
        rowKey={(r) =>
          String(
            r.studentKey ??
              r.feeReceiptKey ??
              r.inquiryKey ??
              r.applicationKey ??
              JSON.stringify(r),
          )
        }
        searchPlaceholder="Search results..."
        emptyMessage={loading ? "Loading..." : "No records match this dataset/filters."}
        toolbar={
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-md"
            onClick={() =>
              exportToCsv(
                `${datasetKey}-adhoc-report.csv`,
                columns.map((c) => ({ key: c.key, header: c.header })),
                filteredRows,
              )
            }
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        }
      />
    </div>
  );
}
