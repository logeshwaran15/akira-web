// Fee Reports data layer. Mock data today; swap the bodies of the get* functions
// for apiFetch calls later — the page only depends on these signatures.

export type FeeType = "Tuition Fee" | "Transport Fee" | "Exam Fee" | "Admission Fee" | "Other Fee";
export type FeeStatus = "Paid" | "Partial" | "Pending" | "Refunded";
export type FeePaymentMode = "Online (UPI)" | "Card" | "Net Banking" | "Cash";

export interface FeeReportRecord {
  id: string;
  receiptNo: string;
  student: string;
  admissionNo: string;
  phone: string;
  className: string;
  section: string;
  academicYear: string;
  feeType: FeeType;
  amount: number;
  /** Amount still owed (Pending = full amount, Partial = remainder). */
  balance: number;
  paidDate: string; // ISO yyyy-mm-dd
  paymentMode: FeePaymentMode;
  status: FeeStatus;
  collectedBy: string | null;
}

export interface FeeReportFilters {
  academicYear: string;
  className: string;
  section: string;
  feeType: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  paymentMode: string;
  search: string;
}

export type FeeReportSortKey = "receiptNo" | "student" | "admissionNo" | "amount" | "paidDate" | "status";
export interface FeeReportSort { key: FeeReportSortKey; dir: "asc" | "desc" }

export interface FeeReportSummary {
  totalCollected: number;
  thisMonth: number;
  outstanding: number;
  refunds: number;
  monthLabel: string;
}

export interface FeeTypeCollection { feeType: FeeType; amount: number; percent: number }

export const ALL = "all";
export const FEE_TYPES: FeeType[] = ["Tuition Fee", "Transport Fee", "Exam Fee", "Admission Fee", "Other Fee"];
export const STATUSES: FeeStatus[] = ["Paid", "Partial", "Pending", "Refunded"];
export const PAYMENT_MODES: FeePaymentMode[] = ["Online (UPI)", "Card", "Net Banking", "Cash"];
export const CLASSES = ["Class I", "Class II", "Class III", "Class IV", "Class V", "Class VI", "Class VII", "Class VIII", "Class IX", "Class X"];
export const SECTIONS = ["A", "B", "C"];
export const ACADEMIC_YEARS = ["2026-27", "2025-26"];

export const DEFAULT_FILTERS: FeeReportFilters = {
  academicYear: "2026-27",
  className: ALL,
  section: ALL,
  feeType: ALL,
  status: ALL,
  dateFrom: "2026-09-01",
  dateTo: "2026-09-30",
  paymentMode: ALL,
  search: "",
};

// ---------- Mock dataset (deterministic, 248 records) ----------

const FIRST = ["Aditya", "Ananya", "Rohan", "Diya", "Karthik", "Ishita", "Arjun", "Saanvi", "Vivaan", "Meera", "Kabir", "Aarav", "Riya", "Neha", "Siddharth", "Tara", "Yash", "Pooja", "Dev", "Nisha"];
const LAST = ["Bose", "Sharma", "Kumar", "Nair", "R", "Verma", "Mehta", "Reddy", "Patel", "Iyer", "Singh", "Das", "Gupta", "Menon", "Joshi"];
const FEE_AMOUNT: Record<FeeType, number> = {
  "Tuition Fee": 18000, "Transport Fee": 12000, "Exam Fee": 8500, "Admission Fee": 25000, "Other Fee": 4000,
};
const COLLECTORS = ["Admin", "Finance User", "Cashier"];
const FEE_WEIGHTS: FeeType[] = [
  "Tuition Fee", "Tuition Fee", "Tuition Fee", "Transport Fee", "Transport Fee", "Exam Fee", "Admission Fee", "Other Fee",
];

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

function buildData(): FeeReportRecord[] {
  const total = 248;
  const out: FeeReportRecord[] = [];
  for (let i = 0; i < total; i++) {
    const n = total - i; // newest first
    const feeType = FEE_WEIGHTS[(i * 5 + (i >> 2)) % FEE_WEIGHTS.length];
    const base = FEE_AMOUNT[feeType];
    const status: FeeStatus = (["Paid", "Paid", "Paid", "Partial", "Pending", "Paid", "Refunded", "Paid", "Pending", "Paid"] as FeeStatus[])[(i * 7 + (i >> 3)) % 10];
    // spread from 30 Sep 2026 backwards ~ 1 day per 0.9 record, capped at Apr
    const dayOffset = Math.floor(i * 0.72);
    const d = new Date(Date.UTC(2026, 8, 30 - dayOffset));
    const first = FIRST[(i * 3) % FIRST.length];
    const last = LAST[(i * 7 + 2) % LAST.length];
    const amount = status === "Partial" ? Math.round(base * 0.6) : base;
    out.push({
      id: `fr-${n}`,
      receiptNo: `RCPT${pad(n, 7)}`,
      student: `${first} ${last}`,
      admissionNo: `ADM${pad(124 + ((i * 11) % 180), 5)}`,
      phone: `9${pad(800000000 + ((i * 7919) % 199999999), 9)}`,
      className: CLASSES[(i * 3 + 4) % CLASSES.length],
      section: SECTIONS[i % SECTIONS.length],
      academicYear: dayOffset > 183 ? "2025-26" : "2026-27",
      feeType,
      amount,
      balance: status === "Pending" ? base : status === "Partial" ? base - amount : 0,
      paidDate: d.toISOString().slice(0, 10),
      paymentMode: PAYMENT_MODES[(i * 5 + 1) % PAYMENT_MODES.length],
      status,
      collectedBy: status === "Pending" ? null : COLLECTORS[i % COLLECTORS.length],
    });
  }
  return out;
}

const feeReportData: FeeReportRecord[] = buildData();

// ---------- Pure processing ----------

export function filterFeeReports(rows: FeeReportRecord[], f: FeeReportFilters): FeeReportRecord[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.academicYear !== ALL && r.academicYear !== f.academicYear) return false;
    if (f.className !== ALL && r.className !== f.className) return false;
    if (f.section !== ALL && r.section !== f.section) return false;
    if (f.feeType !== ALL && r.feeType !== f.feeType) return false;
    if (f.status !== ALL && r.status !== f.status) return false;
    if (f.paymentMode !== ALL && r.paymentMode !== f.paymentMode) return false;
    if (f.dateFrom && r.paidDate < f.dateFrom) return false;
    if (f.dateTo && r.paidDate > f.dateTo) return false;
    if (q && !(
      r.student.toLowerCase().includes(q) ||
      r.admissionNo.toLowerCase().includes(q) ||
      r.receiptNo.toLowerCase().includes(q) ||
      r.phone.includes(q)
    )) return false;
    return true;
  });
}

const STATUS_ORDER: Record<FeeStatus, number> = { Paid: 0, Partial: 1, Pending: 2, Refunded: 3 };

export function sortFeeReports(rows: FeeReportRecord[], sort: FeeReportSort): FeeReportRecord[] {
  const m = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    switch (sort.key) {
      case "amount": return (a.amount - b.amount) * m;
      case "status": return (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) * m;
      default: return a[sort.key].localeCompare(b[sort.key], undefined, { numeric: true }) * m;
    }
  });
}

export function summarize(rows: FeeReportRecord[], monthKey: string, monthLabel: string): FeeReportSummary {
  let totalCollected = 0, thisMonth = 0, outstanding = 0, refunds = 0;
  for (const r of rows) {
    if (r.status === "Paid" || r.status === "Partial") {
      totalCollected += r.amount;
      if (r.paidDate.startsWith(monthKey)) thisMonth += r.amount;
    }
    outstanding += r.balance;
    if (r.status === "Refunded") refunds += r.amount;
  }
  return { totalCollected, thisMonth, outstanding, refunds, monthLabel };
}

export function groupByFeeType(rows: FeeReportRecord[]): FeeTypeCollection[] {
  const totals = new Map<FeeType, number>(FEE_TYPES.map((t) => [t, 0]));
  for (const r of rows) {
    if (r.status === "Paid" || r.status === "Partial") totals.set(r.feeType, (totals.get(r.feeType) ?? 0) + r.amount);
  }
  const sum = [...totals.values()].reduce((a, b) => a + b, 0);
  return FEE_TYPES.map((feeType) => {
    const amount = totals.get(feeType) ?? 0;
    return { feeType, amount, percent: sum ? (amount / sum) * 100 : 0 };
  });
}

// ---------- API-shaped accessors (replace bodies with apiFetch later) ----------

export async function getFeeReports(): Promise<FeeReportRecord[]> {
  return feeReportData;
}

export async function getFeeReportSummary(rows: FeeReportRecord[], monthKey: string, monthLabel: string): Promise<FeeReportSummary> {
  return summarize(rows, monthKey, monthLabel);
}

export async function getCollectionByFeeType(rows: FeeReportRecord[]): Promise<FeeTypeCollection[]> {
  return groupByFeeType(rows);
}
