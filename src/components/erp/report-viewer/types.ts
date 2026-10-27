import type { ColumnDef, ReportLayoutConfig } from "@/lib/report-layout";

export type ParamDef = {
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

export type ViewerMeta = {
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

export type Option = { label: string; value: string };

export type ReportViewerProps = {
  id: string;
  preview: boolean;
  meta: ViewerMeta;
  params: ParamDef[];
  paramValues: Record<string, string>;
  setParamValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  academicYears: Option[];
  schoolClasses: Option[];
  departments: Option[];
  rows: Record<string, unknown>[];
  executing: boolean;
  hasRun: boolean;
  generate: () => void;
  isFavorite: boolean;
  toggleFavorite: () => void;
  saveView: () => void;
  resetView: () => void;
  visibleCols: Set<string>;
  setVisibleCols: React.Dispatch<React.SetStateAction<Set<string>>>;
  effectiveColumns: ColumnDef[];
  formatDate: (v: string) => string;
  layoutConfig: ReportLayoutConfig;
};
