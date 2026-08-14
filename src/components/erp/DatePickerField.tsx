import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function DatePickerField({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
}: {
  value?: Date;
  onChange?: (d: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}) {
  const [internal, setInternal] = useState<Date | undefined>(value);
  const date = value ?? internal;
  const handle = (d: Date | undefined) => {
    setInternal(d);
    onChange?.(d);
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/50",
            !date && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          {date ? format(date, "MMM yyyy") : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={handle} initialFocus />
      </PopoverContent>
    </Popover>
  );
}
