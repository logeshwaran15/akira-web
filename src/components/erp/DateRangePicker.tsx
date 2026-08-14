import { useMemo, useState } from "react";
import { Calendar as CalendarIcon, ChevronsUpDown } from "lucide-react";
import { format, addDays, startOfYear, endOfYear, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type DateRangeValue = DateRange | undefined;

type Preset = {
  key: string;
  label: string;
  getRange: (today: Date) => DateRange;
};

const PRESETS: Preset[] = [
  { key: "today", label: "Today", getRange: (t) => ({ from: t, to: t }) },
  {
    key: "yesterday",
    label: "Yesterday",
    getRange: (t) => ({ from: addDays(t, -1), to: addDays(t, -1) }),
  },
  {
    key: "last7",
    label: "Last 7 Days",
    getRange: (t) => ({ from: addDays(t, -6), to: t }),
  },
  {
    key: "last30",
    label: "Last 30 Days",
    getRange: (t) => ({ from: addDays(t, -29), to: t }),
  },
  {
    key: "thisYear",
    label: "This Year",
    getRange: (t) => ({ from: startOfYear(t), to: endOfYear(t) }),
  },
  {
    key: "nextYear",
    label: "Next Year",
    getRange: (t) => {
      const y = new Date(t.getFullYear() + 1, 0, 1);
      return { from: startOfYear(y), to: endOfYear(y) };
    },
  },
  { key: "custom", label: "Custom Range", getRange: (t) => ({ from: t, to: t }) },
];

const sameRange = (a?: DateRange, b?: DateRange) =>
  !!a?.from && !!b?.from && !!a?.to && !!b?.to &&
  startOfDay(a.from).getTime() === startOfDay(b.from).getTime() &&
  startOfDay(a.to).getTime() === startOfDay(b.to).getTime();

export interface DateRangePickerProps {
  value?: DateRangeValue;
  onChange?: (range: DateRangeValue) => void;
  placeholder?: string;
  className?: string;
  align?: "start" | "center" | "end";
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Pick a date range",
  className,
  align = "end",
}: DateRangePickerProps) {
  const [internal, setInternal] = useState<DateRangeValue>(value);
  const [activePreset, setActivePreset] = useState<string>("last7");
  const [month, setMonth] = useState<Date>(value?.from ?? new Date());
  const range = value ?? internal;
  const today = useMemo(() => startOfDay(new Date()), []);

  const commit = (r: DateRangeValue) => {
    setInternal(r);
    onChange?.(r);
    if (r?.from) setMonth(r.from);
  };

  const pickPreset = (p: Preset) => {
    setActivePreset(p.key);
    if (p.key === "custom") return;
    commit(p.getRange(today));
  };

  const label = range?.from
    ? range.to && startOfDay(range.from).getTime() !== startOfDay(range.to).getTime()
      ? `${format(range.from, "MM/dd/yyyy")} - ${format(range.to, "MM/dd/yyyy")}`
      : format(range.from, "MM/dd/yyyy")
    : placeholder;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/50",
            !range?.from && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span className="whitespace-nowrap">{label}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-auto max-w-[95vw] overflow-hidden rounded-md p-0 shadow-lg"
      >
        <div className="flex flex-col sm:flex-row">
          {/* Presets */}
          <ul className="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-2 sm:w-40 sm:flex-col sm:gap-0.5 sm:overflow-visible sm:border-b-0 sm:border-r sm:p-2">
            {PRESETS.map((p) => {
              const isActive =
                activePreset === p.key ||
                (p.key !== "custom" && sameRange(range, p.getRange(today)));
              return (
                <li key={p.key} className="shrink-0">
                  <button
                    onClick={() => pickPreset(p)}
                    className={cn(
                      "w-full whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-secondary",
                    )}
                  >
                    {p.label}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Calendar with month/year selects, two months on desktop */}
          <div className="pointer-events-auto p-2">
            <Calendar
              mode="range"
              selected={range}
              onSelect={(r) => {
                setActivePreset("custom");
                commit(r);
              }}
              month={month}
              onMonthChange={setMonth}
              captionLayout="dropdown"
              numberOfMonths={typeof window !== "undefined" && window.innerWidth >= 768 ? 2 : 1}
              className="pointer-events-auto"
              initialFocus
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
