import { format as formatWithDateFns, isValid, parseISO } from "date-fns";

export const DATE_FORMAT_OPTIONS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY", example: "31/12/2026" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY", example: "12/31/2026" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD", example: "2026-12-31" },
  { value: "DD-MMM-YYYY", label: "DD-MMM-YYYY", example: "31-Dec-2026" },
  { value: "DD MMM YYYY", label: "DD MMM YYYY", example: "31 Dec 2026" },
] as const;

export type TenantDateFormat = (typeof DATE_FORMAT_OPTIONS)[number]["value"];

export const DEFAULT_DATE_FORMAT: TenantDateFormat = "DD/MM/YYYY";

const DATE_FNS_PATTERNS: Record<TenantDateFormat, string> = {
  "DD/MM/YYYY": "dd/MM/yyyy",
  "MM/DD/YYYY": "MM/dd/yyyy",
  "YYYY-MM-DD": "yyyy-MM-dd",
  "DD-MMM-YYYY": "dd-MMM-yyyy",
  "DD MMM YYYY": "dd MMM yyyy",
};

/**
 * Formats a date value per the tenant's configured DateFormat setting
 * (Settings > Date Format). Accepts Date objects, ISO strings, or any
 * string the Date constructor can parse. Returns "—" for null/invalid.
 */
export function formatDate(
  value: string | Date | null | undefined,
  dateFormat: string = DEFAULT_DATE_FORMAT,
): string {
  if (!value) return "—";
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else {
    const parsed = parseISO(value);
    date = isValid(parsed) ? parsed : new Date(value);
  }
  if (!isValid(date)) return "—";
  const pattern =
    DATE_FNS_PATTERNS[dateFormat as TenantDateFormat] ?? DATE_FNS_PATTERNS[DEFAULT_DATE_FORMAT];
  return formatWithDateFns(date, pattern);
}
