import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, ChevronLeft, ChevronRight, ClipboardList, BookOpen, Users2, Clock, Download, Printer } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/timetable")({
  head: () => ({
    meta: [
      { title: "Timetable — Akira School ERP" },
      { name: "description", content: "Weekly class timetable, generated from curriculum and staff allocation." },
    ],
  }),
  component: TimetablePage,
});

type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type SchoolClass = { schoolClassKey: string; className: string };
type SectionOption = { sectionKey: string; sectionLabel: string };
type Slot = {
  timetableSlotKey: string; dayOfWeek: number; periodNumber: number;
  subjectKey: string | null; subjectName: string | null;
  teacherName: string | null; roomName: string | null;
};

const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOT_COLORS = [
  "bg-primary/10 text-primary", "bg-info/10 text-info", "bg-success/10 text-success",
  "bg-warning/15 text-[oklch(0.45_0.12_65)]", "bg-destructive/10 text-destructive",
];
const colorFor = (subjectKey: string | null) => {
  if (!subjectKey) return "bg-secondary/40 text-muted-foreground";
  let hash = 0;
  for (let i = 0; i < subjectKey.length; i++) hash = (hash * 31 + subjectKey.charCodeAt(i)) >>> 0;
  return SLOT_COLORS[hash % SLOT_COLORS.length];
};

const LUNCH_AFTER_PERIOD = 4;
const DAY_START_MINUTES = 8 * 60 + 30; // 08:30
const PERIOD_DURATION = 45;
const LUNCH_DURATION = 40;

function formatTime(totalMinutes: number) {
  const h24 = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const ampm = h24 < 12 ? "AM" : "PM";
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

function periodTimes(periodNumber: number) {
  let start = DAY_START_MINUTES + (periodNumber - 1) * PERIOD_DURATION;
  if (periodNumber > LUNCH_AFTER_PERIOD) start += LUNCH_DURATION;
  return { start, end: start + PERIOD_DURATION };
}

function TimetablePage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearKey, setYearKey] = useState("");
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classKey, setClassKey] = useState("");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [sectionKey, setSectionKey] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    Promise.all([apiFetch("/api/AcademicYear"), apiFetch("/api/SchoolClass")])
      .then(([y, c]) => {
        setYears(y);
        setClasses(c);
        const active = (y as AcademicYear[]).find((yy) => yy.status === "Active") ?? y[0];
        if (active) setYearKey(active.academicYearKey);
        if (c.length > 0) setClassKey(c[0].schoolClassKey);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load timetable filters"));
  }, []);

  useEffect(() => {
    if (!classKey || !yearKey) { setSections([]); return; }
    apiFetch(`/api/Section?schoolClassId=${classKey}&academicYearId=${yearKey}`)
      .then((d: SectionOption[]) => { setSections(d); setSectionKey(d[0]?.sectionKey ?? ""); })
      .catch(() => setSections([]));
  }, [classKey, yearKey]);

  const loadSlots = () => {
    if (!sectionKey || !yearKey) return;
    setLoading(true);
    apiFetch(`/api/Timetable?sectionId=${sectionKey}&academicYearId=${yearKey}`)
      .then((d: Slot[]) => setSlots(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load timetable"))
      .finally(() => setLoading(false));
  };

  useEffect(loadSlots, [sectionKey, yearKey]);

  const generate = async () => {
    if (!sectionKey || !yearKey) return;
    setGenerating(true);
    try {
      const data = await apiFetch("/api/Timetable/generate", {
        method: "POST",
        body: JSON.stringify({ academicYearKey: yearKey, sectionKey }),
      });
      setSlots(data);
      toast.success("Timetable generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate timetable");
    } finally {
      setGenerating(false);
    }
  };

  const periodsPerDay = useMemo(() => Math.max(0, ...slots.map((s) => s.periodNumber), 0), [slots]);
  const uniqueSubjects = useMemo(() => new Set(slots.map((s) => s.subjectKey).filter(Boolean)).size, [slots]);
  const uniqueTeachers = useMemo(() => new Set(slots.map((s) => s.teacherName).filter(Boolean)).size, [slots]);

  const weekStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + weekOffset * 7); // Monday of the week
    return d;
  }, [weekOffset]);

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 5);
    return d;
  }, [weekStart]);

  const dayDate = (dow: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + (dow - 1));
    return d;
  };

  const slotAt = (dow: number, period: number) => slots.find((s) => s.dayOfWeek === dow && s.periodNumber === period);

  const workingDays = useMemo(() => {
    const present = new Set(slots.map((s) => s.dayOfWeek));
    return [1, 2, 3, 4, 5, 6, 7].filter((d) => present.has(d));
  }, [slots]);

  return (
    <div>
      <PageHeader
        title="Timetable"
        breadcrumbs={[{ label: "Academics" }, { label: "Timetable" }]}
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={generate} disabled={generating || !sectionKey}>
            <Plus className="h-4 w-4" /> {generating ? "Generating..." : "Create Timetable"}
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Academic Year</Label>
          <Select value={yearKey} onValueChange={setYearKey}>
            <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose year" /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y.academicYearKey} value={y.academicYearKey}>{y.yearName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Class</Label>
          <Select value={classKey} onValueChange={setClassKey}>
            <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose class" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>{c.className}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Section</Label>
          <Select value={sectionKey} onValueChange={setSectionKey}>
            <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose section" /></SelectTrigger>
            <SelectContent>
              {sections.map((s) => <SelectItem key={s.sectionKey} value={s.sectionKey}>{s.sectionLabel}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-end gap-2">
        <Button variant="outline" size="icon" className="h-9 w-9 rounded-md" onClick={() => setWeekOffset((w) => w - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm">
          {weekStart.toLocaleDateString(undefined, { day: "numeric", month: "short" })} - {weekEnd.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
        </div>
        <Button variant="outline" size="icon" className="h-9 w-9 rounded-md" onClick={() => setWeekOffset((w) => w + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={ClipboardList} tone="text-primary bg-primary/10" label="Total Periods" value={slots.filter((s) => s.subjectKey).length} sub="This Week" />
        <StatCard icon={BookOpen} tone="text-success bg-success/10" label="Subjects" value={uniqueSubjects} sub="This Week" />
        <StatCard icon={Users2} tone="text-warning bg-warning/15" label="Teachers" value={uniqueTeachers} sub="This Week" />
        <StatCard icon={Clock} tone="text-info bg-info/10" label="Daily Periods" value={periodsPerDay} sub="Per Day" />
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-card shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>
        ) : workingDays.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No timetable yet — click "Create Timetable" to generate one.</div>
        ) : (
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead>
              <tr className="bg-secondary/40">
                <th className="w-24 border-b border-border p-2 text-left text-xs font-semibold uppercase text-muted-foreground">Time / Day</th>
                {workingDays.map((dow) => (
                  <th key={dow} className="border-b border-border p-2 text-center text-xs font-semibold uppercase text-muted-foreground">
                    {DAY_NAMES[dow]}
                    <div className="font-mono text-[10px] font-normal normal-case text-muted-foreground/70">
                      {dayDate(dow).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: periodsPerDay }, (_, i) => i + 1).map((period) => {
                const { start, end } = periodTimes(period);
                return (
                  <>
                    <tr key={period} className="border-b border-border">
                      <td className="p-2 align-top text-xs text-muted-foreground">
                        <div className="font-semibold text-foreground">{period}</div>
                        {formatTime(start)}<br />{formatTime(end)}
                      </td>
                      {workingDays.map((dow) => {
                        const slot = slotAt(dow, period);
                        return (
                          <td key={dow} className="p-1.5 align-top">
                            {slot?.subjectName ? (
                              <div className={cn("rounded-md p-2 text-xs", colorFor(slot.subjectKey))}>
                                <div className="font-semibold">{slot.subjectName}</div>
                                {slot.teacherName && <div className="opacity-80">{slot.teacherName}</div>}
                                {slot.roomName && <div className="opacity-60">{slot.roomName}</div>}
                              </div>
                            ) : (
                              <div className="rounded-md bg-secondary/30 p-2 text-center text-xs text-muted-foreground">Free</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    {period === LUNCH_AFTER_PERIOD && (
                      <tr className="border-b border-border bg-secondary/30">
                        <td colSpan={workingDays.length + 1} className="py-1.5 text-center text-xs font-medium text-muted-foreground">
                          Lunch Break &nbsp; {formatTime(DAY_START_MINUTES + LUNCH_AFTER_PERIOD * PERIOD_DURATION)} - {formatTime(DAY_START_MINUTES + LUNCH_AFTER_PERIOD * PERIOD_DURATION + LUNCH_DURATION)}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Timetable is subject to change. Please check regularly for updates.</p>
        <div className="flex gap-2">
          <Button variant="outline" className="h-9 gap-1.5 rounded-md" onClick={() => toast.info("Export coming soon")}>
            <Download className="h-3.5 w-3.5" /> Export Timetable
          </Button>
          <Button className="h-9 gap-1.5 rounded-md" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" /> Print Timetable
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, tone, label, value, sub }: { icon: typeof ClipboardList; tone: string; label: string; value: number; sub: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md", tone)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-display text-xl font-bold">{value}</div>
        <div className="text-[11px] text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}
