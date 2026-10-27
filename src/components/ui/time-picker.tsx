import { useRef } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface TimePickerProps {
  /** 24h "HH:mm" string, matching native <input type="time"> value format. */
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

function parse(value?: string): { hour24: number; minute: number } {
  if (!value) return { hour24: 8, minute: 0 };
  const [h, m] = value.split(":").map(Number);
  return { hour24: Number.isFinite(h) ? h : 8, minute: Number.isFinite(m) ? m : 0 };
}

function toDisplay(hour24: number, minute: number) {
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
}

function toValue(hour24: number, minute: number) {
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

/** Same header/pill visual language as DatePicker, for a time-of-day value. */
export function TimePicker({ value, onChange, placeholder = "Pick a time", className, disabled, required }: TimePickerProps) {
  const { hour24, minute } = parse(value);
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const period = hour24 >= 12 ? "PM" : "AM";
  const listRefsHour = useRef<Record<number, HTMLButtonElement | null>>({});
  const listRefsMinute = useRef<Record<number, HTMLButtonElement | null>>({});

  const setHour12 = (h12: number) => {
    const isPM = period === "PM";
    const newHour24 = isPM ? (h12 % 12) + 12 : h12 % 12;
    onChange(toValue(newHour24, minute));
  };

  const setMinute = (m: number) => onChange(toValue(hour24, m));

  const setPeriod = (p: "AM" | "PM") => {
    const isPM = p === "PM";
    const newHour24 = isPM ? (hour12 % 12) + 12 : hour12 % 12;
    onChange(toValue(newHour24, minute));
  };

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) return;
        requestAnimationFrame(() => {
          listRefsHour.current[hour12]?.scrollIntoView({ block: "center" });
          listRefsMinute.current[Math.round(minute / 5) * 5]?.scrollIntoView({ block: "center" });
        });
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-start gap-2 rounded-md border-input px-3 text-left text-sm font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <Clock className="h-4 w-4 shrink-0 opacity-60" />
          {value ? toDisplay(hour24, minute) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden rounded-xl p-0 shadow-lg" align="start">
        <div
          className="flex items-center justify-center px-3 py-2.5 text-white"
          style={{ background: "linear-gradient(135deg, #FF6B35, #FF7A00)" }}
        >
          <span className="text-sm font-semibold tracking-tight">{toDisplay(hour24, minute)}</span>
        </div>

        <div className="flex bg-card">
          <div className="max-h-56 w-16 overflow-y-auto border-r border-border p-1.5">
            {HOURS_12.map((h) => (
              <button
                key={h}
                ref={(el) => { listRefsHour.current[h] = el; }}
                type="button"
                onClick={() => setHour12(h)}
                className={cn(
                  "mb-1 flex h-8 w-full items-center justify-center rounded-full text-sm transition-colors hover:bg-primary/10",
                  h === hour12 ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary" : "text-foreground",
                )}
              >
                {String(h).padStart(2, "0")}
              </button>
            ))}
          </div>
          <div className="max-h-56 w-16 overflow-y-auto border-r border-border p-1.5">
            {MINUTES.map((m) => (
              <button
                key={m}
                ref={(el) => { listRefsMinute.current[m] = el; }}
                type="button"
                onClick={() => setMinute(m)}
                className={cn(
                  "mb-1 flex h-8 w-full items-center justify-center rounded-full text-sm transition-colors hover:bg-primary/10",
                  m === Math.round(minute / 5) * 5 ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary" : "text-foreground",
                )}
              >
                {String(m).padStart(2, "0")}
              </button>
            ))}
          </div>
          <div className="flex w-14 flex-col gap-1.5 p-1.5">
            {(["AM", "PM"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  "flex h-8 w-full items-center justify-center rounded-full text-xs font-semibold transition-colors hover:bg-primary/10",
                  p === period ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary" : "text-foreground",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-border px-3 py-2">
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              onChange(toValue(now.getHours(), Math.round(now.getMinutes() / 5) * 5));
            }}
            className="rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
          >
            Now
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
