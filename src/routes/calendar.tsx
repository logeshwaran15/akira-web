import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Download, Plus } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Akira School ERP" },
      { name: "description", content: "School calendar for events, meetings, and academic milestones." },
    ],
  }),
  component: CalendarPage,
});

type Category = "team" | "work" | "external";
type Event = { date: string; title: string; category: Category };

const initialEvents: Event[] = [
  { date: "2026-07-04", title: "Data Update", category: "external" },
  { date: "2026-07-06", title: "Meeting with Team Dev", category: "external" },
  { date: "2026-07-09", title: "Design System", category: "external" },
  { date: "2026-07-09", title: "Meeting with Team Dev", category: "work" },
  { date: "2026-07-12", title: "UI/UX Team Sync", category: "team" },
  { date: "2026-07-15", title: "Parent-Teacher Meet", category: "work" },
  { date: "2026-07-22", title: "Annual Sports Day", category: "team" },
];

const catStyles: Record<Category, string> = {
  team:     "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200",
  work:     "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200",
  external: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-200",
};

const catDot: Record<Category, string> = {
  team: "border-emerald-500",
  work: "border-amber-500",
  external: "border-rose-500",
};

const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarPage() {
  const [cursor, setCursor] = useState(new Date(2026, 6, 1)); // July 2026
  const [selected, setSelected] = useState<string>("2026-07-08");
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState(initialEvents);
  const [draft, setDraft] = useState<Event>({ date: "2026-07-08", title: "", category: "work" });

  const monthLabel = cursor.toLocaleString("en-US", { month: "long", year: "numeric" });

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = first.getDay();
    const start = new Date(first);
    start.setDate(first.getDate() - startOffset);
    return Array.from({ length: 42 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const changeMonth = (delta: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));

  return (
    <div>
      <PageHeader
        title="Calendar"
        breadcrumbs={[{ label: "Applications" }, { label: "Calendar" }]}
        actions={
          <>
            <div className="hidden h-10 items-center rounded-md border border-input bg-background px-3 text-sm md:flex">
              07/02/2026 - 07/08/2026
            </div>
            <Button variant="outline" className="h-10 gap-1.5 rounded-md"><Download className="h-4 w-4" /> Export</Button>
            <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Create
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Mini calendar + legend */}
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => changeMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-semibold">{monthLabel}</div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => changeMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
              {WEEK.map((d) => <div key={d}>{d.slice(0, 2)}</div>)}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1 text-center text-xs">
              {days.map((d) => {
                const key = iso(d);
                const inMonth = d.getMonth() === cursor.getMonth();
                const isSel = key === selected;
                return (
                  <button
                    key={key}
                    onClick={() => setSelected(key)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md",
                      !inMonth && "text-muted-foreground/40",
                      isSel && "bg-primary text-primary-foreground font-semibold",
                      !isSel && inMonth && "hover:bg-secondary",
                    )}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-semibold">Event</div>
              <button
                onClick={() => setOpen(true)}
                className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">Drag and drop your event or click in the calendar</p>
            <div className="space-y-2">
              {(["team","work","external"] as Category[]).map((c) => (
                <div key={c} className={cn("flex items-center gap-2 rounded-md border-l-4 bg-secondary/40 px-3 py-2 text-sm capitalize", catDot[c])}>
                  <span className={cn("h-3 w-3 rounded-full border-2", catDot[c])} />
                  {c === "team" ? "Team Events" : c === "work" ? "Work" : "External"}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="rounded-md border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-3">
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" className="h-8 rounded-md" onClick={() => setCursor(new Date(2026, 6, 8))}>Today</Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => changeMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => changeMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="font-display text-base font-semibold">{monthLabel}</div>
            <div className="flex items-center gap-1 rounded-md border border-input p-0.5">
              {["Month","Week","Day"].map((v, i) => (
                <button key={v} className={cn("rounded-md px-3 py-1 text-xs font-medium", i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-semibold text-muted-foreground">
            {WEEK.map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>

          <div className="grid grid-cols-7">
            {days.map((d) => {
              const key = iso(d);
              const inMonth = d.getMonth() === cursor.getMonth();
              const dayEvents = events.filter((e) => e.date === key);
              const isSel = key === selected;
              return (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={cn(
                    "min-h-[92px] border-b border-r border-border p-1.5 text-left align-top",
                    !inMonth && "bg-muted/20 text-muted-foreground/50",
                    isSel && "bg-amber-50 dark:bg-amber-950/20",
                  )}
                >
                  <div className="text-xs font-medium">{d.getDate()}</div>
                  <div className="mt-1 space-y-1">
                    {dayEvents.map((e, i) => (
                      <div key={i} className={cn("truncate rounded-md border px-1.5 py-0.5 text-[11px]", catStyles[e.category])}>
                        {e.title}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Create Event"
        description="Add a new event to the school calendar."
        submitLabel="Create Event"
        onSubmit={() => {
          if (draft.title) setEvents([...events, draft]);
          setDraft({ date: selected, title: "", category: "work" });
          setOpen(false);
        }}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Event name" className="rounded-md" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <DatePicker value={draft.date} onChange={(v) => setDraft({ ...draft, date: v })} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v as Category })}>
                <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">Team Events</SelectItem>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="external">External</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
