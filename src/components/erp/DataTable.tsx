import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  accessor?: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  sortable?: boolean;
  className?: string;
};

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFields?: (row: T) => string;
  selectable?: boolean;
  pageSizes?: number[];
  toolbar?: ReactNode;
  emptyMessage?: string;
  /** When set, filter/sort/page state persists in localStorage under this key. */
  storageKey?: string;
  /** Returns a date (or date-like string) for a row; enables the From/To date filter in the toolbar. */
  dateField?: (row: T) => string | Date | null | undefined;
  dateFilterLabel?: string;
}

type SortState = { key: string; dir: "asc" | "desc" } | null;
type PersistState = { query: string; sort: SortState; pageSize: number; page: number; dateFrom: string; dateTo: string };

const readPersisted = (key?: string): Partial<PersistState> => {
  if (!key || typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(`dt:${key}`);
    return raw ? (JSON.parse(raw) as Partial<PersistState>) : {};
  } catch {
    return {};
  }
};

export function DataTable<T>({
  data,
  columns,
  rowKey,
  searchable = true,
  searchPlaceholder = "Search records...",
  searchFields,
  selectable = false,
  pageSizes = [10, 25, 50, 100],
  toolbar,
  emptyMessage = "No records found.",
  storageKey,
  dateField,
  dateFilterLabel = "Date",
}: DataTableProps<T>) {
  const initial = useMemo(() => readPersisted(storageKey), [storageKey]);
  const [query, setQuery] = useState<string>(initial.query ?? "");
  const [sort, setSort] = useState<SortState>(initial.sort ?? null);
  const [pageSize, setPageSize] = useState<number>(initial.pageSize ?? pageSizes[0]);
  const [page, setPage] = useState<number>(initial.page ?? 1);
  const [selected, setSelected] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<string>(initial.dateFrom ?? "");
  const [dateTo, setDateTo] = useState<string>(initial.dateTo ?? "");

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        `dt:${storageKey}`,
        JSON.stringify({ query, sort, pageSize, page, dateFrom, dateTo }),
      );
    } catch {
      /* ignore quota errors */
    }
  }, [storageKey, query, sort, pageSize, page, dateFrom, dateTo]);

  const searched = useMemo(() => {
    if (!query) return data;
    const q = query.toLowerCase();
    return data.filter((row) => {
      const hay = searchFields
        ? searchFields(row)
        : columns.map((c) => String(c.accessor ? "" : (row as any)[c.key] ?? "")).join(" ");
      return hay.toLowerCase().includes(q);
    });
  }, [data, query, searchFields, columns]);

  const filtered = useMemo(() => {
    if (!dateField || (!dateFrom && !dateTo)) return searched;
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;
    if (to) to.setHours(23, 59, 59, 999);
    return searched.filter((row) => {
      const raw = dateField(row);
      if (!raw) return false;
      const d = raw instanceof Date ? raw : new Date(raw);
      if (Number.isNaN(d.getTime())) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [searched, dateField, dateFrom, dateTo]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    const get = col.sortValue ?? ((r: T) => (r as any)[col.key]);
    return [...filtered].sort((a, b) => {
      const av = get(a) ?? "";
      const bv = get(b) ?? "";
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (key: string) => {
    setSort((s) =>
      s?.key === key
        ? s.dir === "asc" ? { key, dir: "desc" } : null
        : { key, dir: "asc" },
    );
  };

  const pageIds = paged.map(rowKey);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

  return (
    <div className="rounded-md border border-border bg-card shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        {searchable && (
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
        )}
        {dateField && (
          <>
            <DatePicker
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(v) => { setDateFrom(v); setPage(1); }}
              className="w-[168px] shrink-0 truncate sm:w-[190px]"
              placeholder={`${dateFilterLabel} From`}
            />
            <DatePicker
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(v) => { setDateTo(v); setPage(1); }}
              className="w-[168px] shrink-0 truncate sm:w-[190px]"
              placeholder={`${dateFilterLabel} To`}
            />
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 rounded-md text-muted-foreground"
                onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}
              >
                Clear
              </Button>
            )}
          </>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">{toolbar}</div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {selectable && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allChecked}
                    onCheckedChange={(v) =>
                      setSelected(v ? Array.from(new Set([...selected, ...pageIds])) : selected.filter((id) => !pageIds.includes(id)))
                    }
                  />
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead key={col.key} className={cn("whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-muted-foreground", col.className)}>
                  {col.sortable ? (
                    <button
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {col.header}
                      {sort?.key === col.key
                        ? sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                    </button>
                  ) : col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="h-32 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : paged.map((row) => {
              const id = rowKey(row);
              return (
                <TableRow key={id} className="border-border">
                  {selectable && (
                    <TableCell>
                      <Checkbox
                        checked={selected.includes(id)}
                        onCheckedChange={(v) =>
                          setSelected(v ? [...selected, id] : selected.filter((x) => x !== id))
                        }
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.key} className={cn("text-sm", col.className)}>
                      {col.accessor ? col.accessor(row) : String((row as any)[col.key] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">Rows per page</span>
          <span className="sm:hidden">Rows</span>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="h-8 w-[72px] rounded-md"><SelectValue /></SelectTrigger>
            <SelectContent>
              {pageSizes.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="hidden md:block">
          Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sorted.length)} of {sorted.length}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-md" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => {
            const p = i + 1;
            return (
              <Button
                key={p}
                variant={p === currentPage ? "default" : "outline"}
                size="icon"
                className="h-8 w-8 rounded-md"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            );
          })}
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-md" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
