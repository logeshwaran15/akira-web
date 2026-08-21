import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ClipboardList, CalendarCheck2, Gauge, Users2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/teacher-schedule-view")({
  head: () => ({
    meta: [
      { title: "Teacher Schedule View — Akira School ERP" },
      { name: "description", content: "A teacher's own weekly timetable, auto-generated from the Timetable Builder, with a live workload summary." },
    ],
  }),
  component: TeacherScheduleViewPage,
});

type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type UserOption = { akiraUserKey: string; userName: string };
type Slot = {
  timetableSlotKey: string; dayOfWeek: number; periodNumber: number;
  subjectKey: string | null; subjectName: string | null;
  roomName: string | null; isBreak: boolean; sectionName: string | null;
};
type Summary = {
  teacherName: string; totalWeeklyPeriods: number; maxWeeklyPeriods: number;
  freePeriods: number; workloadPercentage: number;
};

const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WORKING_DAYS = [1, 2, 3, 4, 5, 6];
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

function TeacherScheduleViewPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearKey, setYearKey] = useState("");
  const [teachers, setTeachers] = useState<UserOption[]>([]);
  const [teacherKey, setTeacherKey] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([apiFetch("/api/AcademicYear"), apiFetch("/api/User")])
      .then(([y, u]) => {
        setYears(y);
        setTeachers(u);
        const active = (y as AcademicYear[]).find((yy) => yy.status === "Active") ?? y[0];
        if (active) setYearKey(active.academicYearKey);
        if (u.length > 0) setTeacherKey(u[0].akiraUserKey);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load filters"));
  }, []);

  useEffect(() => {
    if (!teacherKey || !yearKey) return;
    setLoading(true);
    apiFetch(`/api/Timetable/teacher/${teacherKey}?academicYearId=${yearKey}`)
      .then((d: { slots: Slot[]; summary: Summary }) => { setSlots(d.slots); setSummary(d.summary); })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load teacher schedule"))
      .finally(() => setLoading(false));
  }, [teacherKey, yearKey]);

  const periodsPerDay = Math.max(0, ...slots.map((s) => s.periodNumber), 0);
  const slotAt = (dow: number, period: number) => slots.find((s) => s.dayOfWeek === dow && s.periodNumber === period);

  return (
    <div>
      <PageHeader title="Teacher Schedule View" breadcrumbs={[{ label: "Staff" }, { label: "Teacher Schedule View" }]} />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <Label>Teacher</Label>
          <Select value={teacherKey} onValueChange={setTeacherKey}>
            <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose teacher" /></SelectTrigger>
            <SelectContent>
              {teachers.map((t) => <SelectItem key={t.akiraUserKey} value={t.akiraUserKey}>{t.userName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard icon={ClipboardList} tone="text-primary bg-primary/10" label="Weekly Periods" value={summary.totalWeeklyPeriods} sub="Assigned" />
          <StatCard icon={CalendarCheck2} tone="text-success bg-success/10" label="Free Periods" value={summary.freePeriods} sub="Remaining capacity" />
          <StatCard icon={Users2} tone="text-info bg-info/10" label="Max Periods" value={summary.maxWeeklyPeriods} sub="Configured limit" />
          <StatCard
            icon={Gauge}
            tone={summary.workloadPercentage > 100 ? "text-destructive bg-destructive/10" : "text-warning bg-warning/15"}
            label="Workload"
            value={summary.workloadPercentage}
            sub="% of max"
            suffix="%"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-border bg-card shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>
        ) : slots.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No periods assigned to this teacher yet in the Timetable Builder.</div>
        ) : (
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead>
              <tr className="bg-secondary/40">
                <th className="w-20 border-b border-border p-2 text-left text-xs font-semibold uppercase text-muted-foreground">Period</th>
                {WORKING_DAYS.map((dow) => (
                  <th key={dow} className="border-b border-border p-2 text-center text-xs font-semibold uppercase text-muted-foreground">
                    {DAY_NAMES[dow]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: periodsPerDay }, (_, i) => i + 1).map((period) => (
                <tr key={period} className="border-b border-border">
                  <td className="p-2 align-top text-xs font-semibold text-foreground">Period {period}</td>
                  {WORKING_DAYS.map((dow) => {
                    const slot = slotAt(dow, period);
                    return (
                      <td key={dow} className="p-1.5 align-top">
                        <div
                          className={cn(
                            "rounded-md p-2 text-xs",
                            slot?.isBreak
                              ? "bg-secondary/50 text-center text-muted-foreground"
                              : slot?.subjectName
                                ? colorFor(slot.subjectKey)
                                : "bg-secondary/30 text-center text-muted-foreground",
                          )}
                        >
                          {slot?.isBreak ? (
                            "Break"
                          ) : slot?.subjectName ? (
                            <>
                              <div className="font-semibold">{slot.subjectName}</div>
                              {slot.sectionName && <div className="opacity-80">{slot.sectionName}</div>}
                              {slot.roomName && <div className="opacity-60">{slot.roomName}</div>}
                            </>
                          ) : (
                            "Free"
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon, tone, label, value, sub, suffix,
}: { icon: typeof ClipboardList; tone: string; label: string; value: number; sub: string; suffix?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md", tone)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-display text-xl font-bold">{value}{suffix}</div>
        <div className="text-[11px] text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}
