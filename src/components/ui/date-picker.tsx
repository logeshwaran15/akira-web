import { useState } from "react";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  /** ISO date string, e.g. "2026-07-12", matching native <input type="date"> value format. */
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
}

function toDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const YEARS_PER_PAGE = 12;
const MONTH_NAMES = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString(undefined, { month: "short" }),
);

type View = "days" | "months" | "years";

export function DatePicker({
  value, onChange, placeholder = "Pick a date", className, min, max, disabled, required,
}: DatePickerProps) {
  const selected = toDate(value);
  const [month, setMonth] = useState<Date>(selected ?? new Date());
  const [view, setView] = useState<View>("days");
  const [decadeStart, setDecadeStart] = useState(() => Math.floor((selected ?? new Date()).getFullYear() / YEARS_PER_PAGE) * YEARS_PER_PAGE);

  const openYearView = () => {
    setDecadeStart(Math.floor(month.getFullYear() / YEARS_PER_PAGE) * YEARS_PER_PAGE);
    setView("years");
  };

  const pickYear = (year: number) => {
    setMonth(new Date(year, month.getMonth(), 1));
    setView("months");
  };

  const pickMonth = (monthIndex: number) => {
    setMonth(new Date(month.getFullYear(), monthIndex, 1));
    setView("days");
  };

  const headerLabel = () => {
    if (view === "years") return `${decadeStart} – ${decadeStart + YEARS_PER_PAGE - 1}`;
    if (view === "months") return String(month.getFullYear());
    return month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  };

  const stepBack = () => {
    if (view === "days") setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
    else if (view === "months") setMonth(new Date(month.getFullYear() - 1, month.getMonth(), 1));
    else setDecadeStart((d) => d - YEARS_PER_PAGE);
  };

  const stepForward = () => {
    if (view === "days") setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
    else if (view === "months") setMonth(new Date(month.getFullYear() + 1, month.getMonth(), 1));
    else setDecadeStart((d) => d + YEARS_PER_PAGE);
  };

  const onHeaderClick = () => {
    if (view === "days") setView("months");
    else if (view === "months") openYearView();
    else setView("days");
  };

  return (
    <Popover onOpenChange={(open) => { if (open) setView("days"); }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-start gap-2 rounded-md border-input px-3 text-left text-sm font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" />
          {selected
            ? selected.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {/* Custom header: click the label to drill into a month grid, then a year grid -- no native <select>. */}
        <div className="flex items-center justify-between border-b border-border px-2 py-2">
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={stepBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button
            type="button"
            onClick={onHeaderClick}
            className="rounded-md px-2 py-1 text-sm font-medium hover:bg-accent"
          >
            {headerLabel()}
          </button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={stepForward}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {view === "years" && (
          <div className="grid grid-cols-3 gap-1.5 p-3">
            {Array.from({ length: YEARS_PER_PAGE }, (_, i) => decadeStart + i).map((year) => (
              <Button
                key={year}
                type="button"
                variant={year === month.getFullYear() ? "default" : "ghost"}
                className="h-9 rounded-md text-sm"
                onClick={() => pickYear(year)}
              >
                {year}
              </Button>
            ))}
          </div>
        )}

        {view === "months" && (
          <div className="grid grid-cols-3 gap-1.5 p-3">
            {MONTH_NAMES.map((name, i) => (
              <Button
                key={name}
                type="button"
                variant={i === month.getMonth() ? "default" : "ghost"}
                className="h-9 rounded-md text-sm"
                onClick={() => pickMonth(i)}
              >
                {name}
              </Button>
            ))}
          </div>
        )}

        {view === "days" && (
          <Calendar
            mode="single"
            captionLayout="label"
            month={month}
            onMonthChange={setMonth}
            selected={selected}
            onSelect={(date: Date | undefined) => date && onChange(toIso(date))}
            disabled={(date) => {
              if (min && date < toDate(min)!) return true;
              if (max && date > toDate(max)!) return true;
              return false;
            }}
            required={required}
            components={{ MonthCaption: () => <></>, Nav: () => <></> }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
