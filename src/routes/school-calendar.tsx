import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useFormatDate } from "@/hooks/use-tenant-setting";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/school-calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Akira School ERP" },
      { name: "description", content: "School events calendar — team events, work and external." },
    ],
  }),
  component: SchoolCalendarPage,
});

type SchoolEvent = {
  schoolEventKey: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  category: "TEAM" | "WORK" | "EXTERNAL" | "HOLIDAY";
  isHoliday?: boolean;
};

type AcademicYearOpt = { academicYearKey: string; yearName: string; status: string };
type Holiday = { holidayKey: string; holidayName: string; holidayDate: string };

type ViewMode = "Month" | "Week" | "Day";

const CATEGORIES: { code: SchoolEvent["category"]; label: string; dot: string; pill: string }[] = [
  { code: "TEAM", label: "Team Events", dot: "bg-success", pill: "bg-success/15 text-success" },
  {
    code: "WORK",
    label: "Work",
    dot: "bg-warning",
    pill: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  },
  {
    code: "EXTERNAL",
    label: "External",
    dot: "bg-destructive",
    pill: "bg-destructive/15 text-destructive",
  },
  {
    code: "HOLIDAY",
    label: "Holidays",
    dot: "bg-purple-500",
    pill: "bg-purple-500/15 text-purple-600",
  },
];
const categoryMeta = (c: string) => CATEGORIES.find((x) => x.code === c) ?? CATEGORIES[1];

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const emptyDraft = {
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  category: "WORK" as SchoolEvent["category"],
};

function SchoolCalendarPage() {
  const formatDate = useFormatDate();
  const [cursor, setCursor] = useState(new Date());
  const [miniCursor, setMiniCursor] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("Month");
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(
    new Set(["TEAM", "WORK", "EXTERNAL", "HOLIDAY"]),
  );
  const [holidays, setHolidays] = useState<SchoolEvent[]>([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolEvent | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SchoolEvent | null>(null);

  const rangeStart = useMemo(() => {
    const d = startOfMonth(cursor);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }, [cursor]);
  const rangeEnd = useMemo(() => {
    const d = endOfMonth(cursor);
    d.setDate(d.getDate() + (6 - d.getDay()));
    return d;
  }, [cursor]);

  const load = () => {
    setLoading(true);
    apiFetch(
      `/api/SchoolEvent?rangeStart=${rangeStart.toISOString()}&rangeEnd=${rangeEnd.toISOString()}`,
    )
      .then((d: SchoolEvent[]) => setEvents(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load events"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [rangeStart.getTime(), rangeEnd.getTime()]);

  // Holidays are managed on the Academic Calendar page (School Setup ->
  // Academic Calendar), not here -- pull them in read-only so they still
  // show up on this calendar instead of only existing on that other page.
  useEffect(() => {
    apiFetch("/api/AcademicYear")
      .then((years: AcademicYearOpt[]) => years.find((y) => y.status === "Active"))
      .then((activeYear) => {
        if (!activeYear) return;
        return apiFetch(`/api/Holiday?academicYearId=${activeYear.academicYearKey}`).then(
          (d: Holiday[]) =>
            setHolidays(
              d.map((h) => ({
                schoolEventKey: `holiday-${h.holidayKey}`,
                title: h.holidayName,
                description: null,
                startDate: h.holidayDate,
                endDate: h.holidayDate,
                category: "HOLIDAY" as const,
                isHoliday: true,
              })),
            ),
        );
      })
      .catch(() => setHolidays([]));
  }, []);

  const allEvents = useMemo(() => [...events, ...holidays], [events, holidays]);

  const days = useMemo(() => {
    const arr: Date[] = [];
    const d = new Date(rangeStart);
    while (d <= rangeEnd) {
      arr.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return arr;
  }, [rangeStart, rangeEnd]);

  const eventsForDay = (day: Date) =>
    allEvents.filter(
      (e) =>
        visibleCategories.has(e.category) &&
        new Date(e.startDate) <= endOfDayCopy(day) &&
        new Date(e.endDate) >= startOfDayCopy(day),
    );

  function startOfDayCopy(d: Date) {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  }
  function endOfDayCopy(d: Date) {
    const c = new Date(d);
    c.setHours(23, 59, 59, 999);
    return c;
  }

  const toggleCategory = (code: string) => {
    setVisibleCategories((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const openNew = (day?: Date) => {
    setEditing(null);
    const d = day ?? new Date();
    setDraft({ ...emptyDraft, startDate: toDateInputValue(d), endDate: toDateInputValue(d) });
    setOpen(true);
  };

  const openEdit = (ev: SchoolEvent) => {
    setEditing(ev);
    setDraft({
      title: ev.title,
      description: ev.description ?? "",
      startDate: ev.startDate.slice(0, 10),
      endDate: ev.endDate.slice(0, 10),
      category: ev.category,
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        title: draft.title,
        description: draft.description || null,
        startDate: draft.startDate,
        endDate: draft.endDate,
        category: draft.category,
      };
      if (editing) {
        await apiFetch(`/api/SchoolEvent/${editing.schoolEventKey}`, {
          method: "PUT",
          body: JSON.stringify({ schoolEventKey: editing.schoolEventKey, ...body }),
        });
        toast.success("Event updated");
      } else {
        await apiFetch("/api/SchoolEvent", { method: "POST", body: JSON.stringify(body) });
        toast.success("Event created");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save event");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/SchoolEvent/${deleteTarget.schoolEventKey}`, { method: "DELETE" });
      toast.success("Event removed");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove event");
    }
  };

  // Mini calendar (left sidebar)
  const miniDays = useMemo(() => {
    const start = startOfMonth(miniCursor);
    const gridStart = new Date(start);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());
    const arr: Date[] = [];
    const d = new Date(gridStart);
    for (let i = 0; i < 42; i++) {
      arr.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return arr;
  }, [miniCursor]);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div>
      <PageHeader
        title="Calendar"
        breadcrumbs={[{ label: "Applications" }, { label: "Calendar" }]}
      />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Left sidebar */}
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <button
                onClick={() =>
                  setMiniCursor(new Date(miniCursor.getFullYear(), miniCursor.getMonth() - 1, 1))
                }
                className="rounded-md p-1 hover:bg-secondary"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="font-display text-sm font-semibold">
                {miniCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </div>
              <button
                onClick={() =>
                  setMiniCursor(new Date(miniCursor.getFullYear(), miniCursor.getMonth() + 1, 1))
                }
                className="rounded-md p-1 hover:bg-secondary"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
              {WEEKDAY_LABELS.map((w) => (
                <div key={w} className="py-1">
                  {w[0]}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {miniDays.map((d) => {
                const inMonth = d.getMonth() === miniCursor.getMonth();
                const isToday = isSameDay(d, new Date());
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => {
                      setCursor(d);
                      setMiniCursor(d);
                    }}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md",
                      inMonth ? "text-foreground" : "text-muted-foreground/40",
                      isToday && "bg-primary text-primary-foreground font-semibold",
                    )}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold">Event</h3>
              <Button size="icon" className="h-7 w-7 rounded-md" onClick={() => openNew()}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Click a category to filter, or click a day to add an event.
            </p>
            <div className="space-y-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => toggleCategory(c.code)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-opacity",
                    c.pill,
                    !visibleCategories.has(c.code) && "opacity-30",
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", c.dot)} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main calendar */}
        <div className="rounded-md border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-md"
                onClick={() => setCursor(new Date())}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <h2 className="font-display text-lg font-bold">{monthLabel}</h2>
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border border-border p-0.5">
                {(["Month", "Week", "Day"] as ViewMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setViewMode(m)}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                      viewMode === m
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <Button size="sm" className="h-8 gap-1.5 rounded-md" onClick={() => openNew(cursor)}>
                <Plus className="h-3.5 w-3.5" /> Create
              </Button>
            </div>
          </div>

          {viewMode === "Month" ? (
            <div className="grid grid-cols-7 border-b border-border">
              {WEEKDAY_LABELS.map((w) => (
                <div
                  key={w}
                  className="border-r border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground last:border-r-0"
                >
                  {w}
                </div>
              ))}
            </div>
          ) : null}

          {viewMode === "Month" && (
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const inMonth = day.getMonth() === cursor.getMonth();
                const isToday = isSameDay(day, new Date());
                const dayEvents = eventsForDay(day);
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => openNew(day)}
                    className={cn(
                      "min-h-[110px] cursor-pointer border-b border-r border-border p-2 transition-colors hover:bg-secondary/40",
                      !inMonth && "bg-secondary/20 text-muted-foreground",
                      isToday && "bg-primary/5",
                    )}
                  >
                    <div
                      className={cn(
                        "mb-1 text-xs font-medium",
                        isToday && "text-primary font-bold",
                      )}
                    >
                      {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div
                          key={ev.schoolEventKey}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!ev.isHoliday) openEdit(ev);
                          }}
                          className={cn(
                            "truncate rounded px-1.5 py-0.5 text-[11px] font-medium",
                            categoryMeta(ev.category).pill,
                            ev.isHoliday && "cursor-default",
                          )}
                          title={ev.isHoliday ? `${ev.title} (Holiday)` : ev.title}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-muted-foreground">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode !== "Month" && (
            <div className="p-4">
              {loading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
              ) : (
                <div className="divide-y divide-border">
                  {allEvents
                    .filter((e) => visibleCategories.has(e.category))
                    .filter((e) =>
                      viewMode === "Day"
                        ? new Date(e.startDate) <= endOfDayCopy(cursor) &&
                          new Date(e.endDate) >= startOfDayCopy(cursor)
                        : true,
                    )
                    .map((ev) => (
                      <div
                        key={ev.schoolEventKey}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "h-2 w-2 shrink-0 rounded-full",
                              categoryMeta(ev.category).dot,
                            )}
                          />
                          <div>
                            <div className="text-sm font-medium">{ev.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(ev.startDate)} – {formatDate(ev.endDate)}
                            </div>
                          </div>
                        </div>
                        {ev.isHoliday ? (
                          <span className="text-xs text-muted-foreground">Managed in Academic Calendar</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-md"
                              onClick={() => openEdit(ev)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-md text-destructive"
                              onClick={() => setDeleteTarget(ev)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  {allEvents.filter((e) => visibleCategories.has(e.category)).length === 0 && (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      No events.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Event" : "Create Event"}
        submitLabel={editing ? "Save Changes" : "Create"}
        onSubmit={save}
        submitting={saving}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Title</Label>
            <Input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Meeting with Team Dev"
              className="rounded-md"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label required>Start Date</Label>
              <Input
                type="date"
                value={draft.startDate}
                onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                className="rounded-md"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label required>End Date</Label>
              <Input
                type="date"
                value={draft.endDate}
                onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                className="rounded-md"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label required>Category</Label>
            <Select
              value={draft.category}
              onValueChange={(v) => setDraft({ ...draft, category: v as SchoolEvent["category"] })}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              className="rounded-md"
              rows={3}
            />
          </div>
          {editing && (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-1.5 rounded-md border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => {
                setOpen(false);
                setDeleteTarget(editing);
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete Event
            </Button>
          )}
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
