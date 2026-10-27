import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, CalendarDays, Coffee, FlaskConical } from "lucide-react";
import { PageHeader } from "@/components/erp/PageHeader";
import { StudentAvatar } from "@/components/erp/StudentAvatar";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/PageLoader";
import { apiFetch } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/parent-timetable")({
  head: () => ({
    meta: [
      { title: "Timetable — Akira School ERP" },
      { name: "description", content: "Weekly class timetable and upcoming school events for your child." },
    ],
  }),
  component: ParentTimetablePage,
});

// Backed by the PARENT-only /api/Parent/children/{id}/timetable endpoint (read-only).
// The API only returns a timetable the school has published.
type Child = {
  studentKey: string;
  studentName: string;
  className: string | null;
  sectionLabel: string | null;
  gender: string | null;
  photoUrl: string | null;
};
type Slot = {
  timetableSlotKey: string;
  dayOfWeek: number; // 1 = Monday ... 7 = Sunday
  periodNumber: number;
  subjectName: string | null;
  teacherName: string | null;
  roomName: string | null;
  isPractical: boolean;
  isBreak: boolean;
  remarks: string | null;
};
type SchoolEvent = {
  schoolEventKey: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  category: "TEAM" | "WORK" | "EXTERNAL";
};

const DAYS = [
  { dow: 1, short: "Mon", full: "Monday" },
  { dow: 2, short: "Tue", full: "Tuesday" },
  { dow: 3, short: "Wed", full: "Wednesday" },
  { dow: 4, short: "Thu", full: "Thursday" },
  { dow: 5, short: "Fri", full: "Friday" },
  { dow: 6, short: "Sat", full: "Saturday" },
];
const EVENT_STYLES: Record<string, string> = {
  TEAM: "bg-success/15 text-success",
  WORK: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  EXTERNAL: "bg-destructive/15 text-destructive",
};

// JS getDay(): 0 = Sunday; timetable uses 1 = Monday ... 7 = Sunday.
const todayDow = () => {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
};
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

function ParentTimetablePage() {
  const { user, loading: userLoading } = useCurrentUser();

  const [children, setChildren] = useState<Child[]>([]);
  const [childKey, setChildKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedDow, setSelectedDow] = useState(() => Math.min(todayDow(), 6));
  const [events, setEvents] = useState<SchoolEvent[]>([]);

  useEffect(() => {
    apiFetch("/api/Parent/children")
      .then((list: Child[]) => {
        setChildren(list ?? []);
        setChildKey(list?.[0]?.studentKey ?? null);
      })
      .catch(() => toast.error("Failed to load your children"))
      .finally(() => setLoading(false));

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 60);
    apiFetch(`/api/SchoolEvent?rangeStart=${start.toISOString()}&rangeEnd=${end.toISOString()}`)
      .then((e: SchoolEvent[]) =>
        setEvents([...(e ?? [])].sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, 8)),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!childKey) return;
    setSlotsLoading(true);
    setSlots([]);
    apiFetch(`/api/Parent/children/${childKey}/timetable`)
      .then((rows: Slot[]) => setSlots(rows ?? []))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load the timetable"))
      .finally(() => setSlotsLoading(false));
  }, [childKey]);

  const slotAt = useMemo(() => {
    const map = new Map<string, Slot>();
    for (const s of slots) map.set(`${s.dayOfWeek}-${s.periodNumber}`, s);
    return (dow: number, period: number) => map.get(`${dow}-${period}`);
  }, [slots]);

  const periodCount = slots.reduce((m, s) => Math.max(m, s.periodNumber), 0);
  const periods = Array.from({ length: periodCount }, (_, i) => i + 1);
  const today = todayDow();

  if (userLoading) return <PageLoader />;
  // Parent-only page; everyone else uses the admin timetable screens.
  if (user && user.roleCode !== "PARENT") return <Navigate to="/dashboard" replace />;

  return (
    <div>
      <PageHeader title="Timetable" />

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>
      ) : children.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
          No children are linked to your account. Please contact the school office.
        </div>
      ) : (
        <>
          {/* Child tabs */}
          <div className="-mx-1 mb-5 flex gap-2.5 overflow-x-auto px-1 pb-1">
            {children.map((c) => {
              const active = c.studentKey === childKey;
              return (
                <button
                  key={c.studentKey}
                  type="button"
                  onClick={() => setChildKey(c.studentKey)}
                  aria-pressed={active}
                  className={cn(
                    "flex shrink-0 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25"
                      : "border-border bg-card shadow-sm hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
                  )}
                >
                  <StudentAvatar photoUrl={c.photoUrl} gender={c.gender} studentName={c.studentName} className="h-9 w-9" />
                  <span>
                    <span className="block text-sm font-semibold leading-tight">{c.studentName}</span>
                    <span className={cn("block text-xs", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {[c.className, c.sectionLabel].filter(Boolean).join(" - ") || "—"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(260px,0.8fr)]">
            <section className="min-w-0 rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-display text-base font-bold">Weekly Timetable</h2>
              </div>

              {slotsLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Loading timetable...</div>
              ) : slots.length === 0 ? (
                <div className="p-8 text-center">
                  <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground" />
                  <div className="mt-2 text-sm font-semibold">Timetable not published yet</div>
                  <div className="text-xs text-muted-foreground">
                    It will appear here once the school publishes it.
                  </div>
                </div>
              ) : (
                <>
                  {/* Phone: one day at a time */}
                  <div className="md:hidden">
                    <div className="flex gap-1.5 overflow-x-auto px-3 pt-3">
                      {DAYS.map((d) => (
                        <button
                          key={d.dow}
                          type="button"
                          onClick={() => setSelectedDow(d.dow)}
                          aria-pressed={selectedDow === d.dow}
                          className={cn(
                            "shrink-0 rounded-md border px-3 py-1.5 text-xs font-semibold",
                            selectedDow === d.dow
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-muted-foreground",
                          )}
                        >
                          {d.short}
                          {d.dow === today && " •"}
                        </button>
                      ))}
                    </div>
                    <ul className="space-y-2 p-3">
                      {periods.map((p) => (
                        <li key={p}>
                          <PeriodCell slot={slotAt(selectedDow, p)} period={p} showPeriod />
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Tablet / desktop: full week grid */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[640px] border-separate border-spacing-1.5 p-2 text-sm">
                      <thead>
                        <tr>
                          <th className="w-16 px-2 py-1.5 text-left text-xs font-semibold uppercase text-muted-foreground">
                            Period
                          </th>
                          {DAYS.map((d) => (
                            <th
                              key={d.dow}
                              className={cn(
                                "rounded-md px-2 py-1.5 text-xs font-semibold uppercase",
                                d.dow === today ? "bg-primary/10 text-primary" : "text-muted-foreground",
                              )}
                            >
                              {d.short}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {periods.map((p) => (
                          <tr key={p}>
                            <td className="px-2 text-xs font-semibold text-muted-foreground">P{p}</td>
                            {DAYS.map((d) => (
                              <td key={d.dow} className="align-top">
                                <PeriodCell slot={slotAt(d.dow, p)} period={p} highlight={d.dow === today} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

            <section className="h-fit rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-display text-base font-bold">Upcoming Events</h2>
              </div>
              {events.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">No upcoming events.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {events.map((e) => (
                    <li key={e.schoolEventKey} className="flex items-start gap-3 px-4 py-3">
                      <Badge className={cn("shrink-0 rounded-md border-0 text-[11px] font-semibold", EVENT_STYLES[e.category])}>
                        {fmtDate(e.startDate)}
                      </Badge>
                      <div className="min-w-0">
                        <div className="text-sm font-medium leading-tight">{e.title}</div>
                        {e.description && (
                          <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{e.description}</div>
                        )}
                        {fmtDate(e.endDate) !== fmtDate(e.startDate) && (
                          <div className="mt-0.5 text-xs text-muted-foreground">until {fmtDate(e.endDate)}</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function PeriodCell({
  slot, period, showPeriod, highlight,
}: {
  slot: Slot | undefined;
  period: number;
  showPeriod?: boolean;
  highlight?: boolean;
}) {
  const prefix = showPeriod ? (
    <span className="mb-0.5 block text-[10px] font-semibold uppercase text-muted-foreground">Period {period}</span>
  ) : null;

  if (!slot || (!slot.subjectName && !slot.isBreak)) {
    return (
      <div className="min-h-[56px] rounded-lg border border-dashed border-border/70 p-2 text-xs text-muted-foreground/60">
        {prefix}—
      </div>
    );
  }
  if (slot.isBreak) {
    return (
      <div className="flex min-h-[56px] flex-col justify-center rounded-lg bg-muted/60 p-2 text-xs font-medium text-muted-foreground">
        {prefix}
        <span className="flex items-center gap-1.5"><Coffee className="h-3.5 w-3.5" />{slot.subjectName || "Break"}</span>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "min-h-[56px] rounded-lg border p-2",
        highlight ? "border-primary/40 bg-primary/[0.06]" : "border-border bg-card",
      )}
    >
      {prefix}
      <div className="flex items-start justify-between gap-1">
        <span className="text-sm font-semibold leading-tight">{slot.subjectName}</span>
        {slot.isPractical && <FlaskConical className="h-3.5 w-3.5 shrink-0 text-info" aria-label="Practical" />}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">
        {[slot.teacherName, slot.roomName].filter(Boolean).join(" · ")}
      </div>
    </div>
  );
}
