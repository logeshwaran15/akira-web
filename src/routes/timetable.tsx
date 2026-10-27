import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FormDialog } from "@/components/erp/FormDialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft, ChevronRight,
  AlertTriangle, Send, CheckCircle2, Rocket,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAcademicYear } from "@/hooks/use-academic-year";

export const Route = createFileRoute("/timetable")({
  head: () => ({
    meta: [
      { title: "Timetable Builder — Akira School ERP" },
      { name: "description", content: "Build the weekly class timetable slot by slot, with real-time teacher and room conflict detection." },
    ],
  }),
  component: TimetablePage,
});

type SchoolClass = { schoolClassKey: string; className: string };
type SectionOption = { sectionKey: string; sectionLabel: string };
type SubjectOption = { subjectKey: string; subjectName: string };
type UserOption = { akiraUserKey: string; userName: string };
type RoomOption = { roomKey: string; roomName: string };
type Slot = {
  timetableSlotKey: string; dayOfWeek: number; periodNumber: number;
  subjectKey: string | null; subjectName: string | null;
  akiraUserKey: string | null; teacherName: string | null;
  roomKey: string | null; roomName: string | null;
  isPractical: boolean; isBreak: boolean; remarks: string | null;
};
type TimetableStatus = {
  timetableKey: string; status: string;
  reviewedBy: string | null; reviewedAt: string | null;
  approvedBy: string | null; approvedAt: string | null;
  publishedAt: string | null;
};
type Conflict = {
  conflictType: "TEACHER" | "ROOM";
  dayOfWeek: number; periodNumber: number;
  entityName: string; sectionNames: string;
};

const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WORKING_DAYS = [1, 2, 3, 4, 5, 6];
const PERIODS_PER_DAY = 8;
const MONTH_SHORT_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
// Locale-independent "31 Aug" / "31 Aug 2027" formatting -- toLocaleDateString(undefined, ...)
// resolves to whatever locale the runtime defaults to, which differs between the SSR
// (Node) environment and the browser and causes a hydration text mismatch.
const formatShortDate = (d: Date, withYear = false) =>
  `${d.getDate()} ${MONTH_SHORT_NAMES[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ""}`;
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

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  UNDER_REVIEW: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  APPROVED: "bg-info/15 text-info",
  PUBLISHED: "bg-success/15 text-success",
  ARCHIVED: "bg-muted text-muted-foreground",
};
const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", UNDER_REVIEW: "Under Review", APPROVED: "Approved", PUBLISHED: "Published", ARCHIVED: "Archived",
};

const emptyDraft = { subjectKey: "", teacherUserKey: "", roomKey: "", isPractical: false, isBreak: false, remarks: "" };

function TimetablePage() {
  const { selectedYearKey: yearKey } = useAcademicYear();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classKey, setClassKey] = useState("");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [sectionKey, setSectionKey] = useState("");
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [teachers, setTeachers] = useState<UserOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [status, setStatus] = useState<TimetableStatus | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [conflictsOpen, setConflictsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const [editing, setEditing] = useState<{ day: number; period: number; slot: Slot | null } | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/SchoolClass"), apiFetch("/api/Subject"), apiFetch("/api/User"), apiFetch("/api/Room"),
    ])
      .then(([c, subj, u, r]) => {
        setClasses(c);
        setSubjects(subj);
        setTeachers(u);
        setRooms(r);
        if (c.length > 0) setClassKey(c[0].schoolClassKey);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load timetable filters"));
  }, []);

  useEffect(() => {
    setSectionKey("");
    if (!classKey || !yearKey) { setSections([]); return; }
    apiFetch(`/api/Section?schoolClassId=${classKey}&academicYearId=${yearKey}`)
      .then((d: SectionOption[]) => { setSections(d); setSectionKey(d[0]?.sectionKey ?? ""); })
      .catch((err) => {
        setSections([]);
        toast.error(err instanceof Error ? err.message : "Failed to load sections");
      });
  }, [classKey, yearKey]);

  const loadSlots = () => {
    if (!sectionKey || !yearKey) return;
    setLoading(true);
    apiFetch(`/api/Timetable?sectionId=${sectionKey}&academicYearId=${yearKey}`)
      .then((d: Slot[]) => setSlots(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load timetable"))
      .finally(() => setLoading(false));
  };

  const loadStatus = () => {
    if (!sectionKey || !yearKey) { setStatus(null); return; }
    apiFetch(`/api/Timetable/status?sectionId=${sectionKey}&academicYearId=${yearKey}`)
      .then((d: TimetableStatus) => setStatus(d))
      .catch(() => setStatus(null));
  };

  const loadConflicts = () => {
    if (!yearKey) { setConflicts([]); return; }
    apiFetch(`/api/Timetable/conflicts/${yearKey}`)
      .then((d: Conflict[]) => setConflicts(d))
      .catch(() => setConflicts([]));
  };

  useEffect(loadSlots, [sectionKey, yearKey]);
  useEffect(loadStatus, [sectionKey, yearKey]);
  useEffect(loadConflicts, [yearKey]);

  const openCell = (day: number, period: number) => {
    const slot = slots.find((s) => s.dayOfWeek === day && s.periodNumber === period) ?? null;
    setEditing({ day, period, slot });
    setDraft(slot
      ? {
        subjectKey: slot.subjectKey ?? "", teacherUserKey: slot.akiraUserKey ?? "", roomKey: slot.roomKey ?? "",
        isPractical: slot.isPractical, isBreak: slot.isBreak, remarks: slot.remarks ?? "",
      }
      : emptyDraft);
  };

  const saveSlot = async () => {
    if (!editing || !sectionKey || !yearKey) return;
    setSaving(true);
    try {
      await apiFetch("/api/Timetable/slots", {
        method: "POST",
        body: JSON.stringify({
          timetableSlotKey: editing.slot?.timetableSlotKey ?? null,
          sectionKey,
          academicYearKey: yearKey,
          dayOfWeek: editing.day,
          periodNumber: editing.period,
          subjectKey: draft.isBreak ? null : (draft.subjectKey || null),
          teacherUserKey: draft.isBreak ? null : (draft.teacherUserKey || null),
          roomKey: draft.isBreak ? null : (draft.roomKey || null),
          isPractical: draft.isPractical,
          isBreak: draft.isBreak,
          remarks: draft.remarks || null,
        }),
      });
      toast.success("Slot saved");
      setEditing(null);
      loadSlots();
      loadStatus();
      loadConflicts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save slot — check for a teacher or room clash.");
    } finally {
      setSaving(false);
    }
  };

  const submitForReview = async () => {
    if (!sectionKey || !yearKey) return;
    setWorkflowBusy(true);
    try {
      await apiFetch(`/api/Timetable/${sectionKey}/submit-for-review?academicYearId=${yearKey}`, { method: "PUT" });
      toast.success("Sent for coordinator review");
      loadStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit for review");
    } finally {
      setWorkflowBusy(false);
    }
  };

  const approve = async () => {
    if (!sectionKey || !yearKey) return;
    setWorkflowBusy(true);
    try {
      await apiFetch(`/api/Timetable/${sectionKey}/approve?academicYearId=${yearKey}`, { method: "PUT" });
      toast.success("Timetable approved");
      loadStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setWorkflowBusy(false);
    }
  };

  const publish = async () => {
    if (!yearKey) return;
    setWorkflowBusy(true);
    try {
      const res = await apiFetch(`/api/Timetable/publish/${yearKey}`, { method: "PUT" });
      toast.success(`Published ${res.publishedCount} section timetable(s)`);
      loadStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cannot publish — unresolved conflicts exist for this academic year.");
    } finally {
      setWorkflowBusy(false);
    }
  };

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

  const sectionConflictDays = useMemo(() => {
    const set = new Set<string>();
    conflicts.forEach((c) => {
      slots.forEach((s) => {
        if (s.dayOfWeek === c.dayOfWeek && s.periodNumber === c.periodNumber
          && ((c.conflictType === "TEACHER" && s.akiraUserKey) || (c.conflictType === "ROOM" && s.roomKey))) {
          set.add(`${c.dayOfWeek}-${c.periodNumber}`);
        }
      });
    });
    return set;
  }, [conflicts, slots]);

  return (
    <div>
      <PageHeader
        title="Timetable Builder"
        breadcrumbs={[{ label: "Academics" }, { label: "Timetable Builder" }]}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {status && (
          <Badge className={cn("rounded-md border-0 px-2.5 py-1", STATUS_BADGE[status.status] ?? "bg-muted text-muted-foreground")}>
            {STATUS_LABEL[status.status] ?? status.status}
          </Badge>
        )}
        {conflicts.length > 0 && (
          <Button
            variant="outline" size="sm" className="h-8 gap-1.5 rounded-md"
            onClick={() => setConflictsOpen(true)}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {conflicts.length} conflict{conflicts.length === 1 ? "" : "s"}
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {status?.status === "DRAFT" && (
            <Button size="sm" className="h-8 gap-1.5 rounded-md" onClick={submitForReview} disabled={workflowBusy}>
              <Send className="h-3.5 w-3.5" /> Submit for Review
            </Button>
          )}
          {status?.status === "UNDER_REVIEW" && (
            <Button size="sm" className="h-8 gap-1.5 rounded-md" onClick={approve} disabled={workflowBusy}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
            </Button>
          )}
          {status?.status === "APPROVED" && (
            <Button size="sm" className="h-8 gap-1.5 rounded-md" onClick={publish} disabled={workflowBusy || conflicts.length > 0}>
              <Rocket className="h-3.5 w-3.5" /> Publish (this year)
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="w-40 space-y-1">
          <Label className="text-xs">Class</Label>
          <Select value={classKey} onValueChange={setClassKey}>
            <SelectTrigger className="h-8 rounded-md text-sm"><SelectValue placeholder="Choose class" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>{c.className}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-32 space-y-1">
          <Label className="text-xs">Section</Label>
          <Select value={sectionKey} onValueChange={setSectionKey}>
            <SelectTrigger className="h-8 rounded-md text-sm"><SelectValue placeholder="Choose section" /></SelectTrigger>
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
          {formatShortDate(weekStart)} - {formatShortDate(weekEnd, true)}
        </div>
        <Button variant="outline" size="icon" className="h-9 w-9 rounded-md" onClick={() => setWeekOffset((w) => w + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-card shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>
        ) : !sectionKey ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Choose a class and section to start building its timetable.</div>
        ) : (
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead>
              <tr className="bg-secondary/40">
                <th className="w-24 border-b border-border p-2 text-left text-xs font-semibold uppercase text-muted-foreground">Period</th>
                {WORKING_DAYS.map((dow) => (
                  <th key={dow} className="border-b border-border p-2 text-center text-xs font-semibold uppercase text-muted-foreground">
                    {DAY_NAMES[dow]}
                    <div className="font-mono text-[10px] font-normal normal-case text-muted-foreground/70">
                      {formatShortDate(dayDate(dow))}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: PERIODS_PER_DAY }, (_, i) => i + 1).map((period) => (
                <tr key={period} className="border-b border-border">
                  <td className="p-2 align-top text-xs font-semibold text-foreground">Period {period}</td>
                  {WORKING_DAYS.map((dow) => {
                    const slot = slotAt(dow, period);
                    const hasConflict = sectionConflictDays.has(`${dow}-${period}`);
                    return (
                      <td key={dow} className="p-1.5 align-top">
                        <button
                          type="button"
                          onClick={() => openCell(dow, period)}
                          className={cn(
                            "block w-full rounded-md p-2 text-left text-xs transition-colors hover:ring-2 hover:ring-primary/40",
                            slot?.isBreak
                              ? "bg-secondary/50 text-center text-muted-foreground"
                              : slot?.subjectName
                                ? colorFor(slot.subjectKey)
                                : "bg-secondary/30 text-center text-muted-foreground",
                            hasConflict && "ring-2 ring-destructive",
                          )}
                        >
                          {slot?.isBreak ? (
                            "Break"
                          ) : slot?.subjectName ? (
                            <>
                              <div className="flex items-center gap-1 font-semibold">
                                {slot.subjectName}
                                {hasConflict && <AlertTriangle className="h-3 w-3 text-destructive" />}
                              </div>
                              {slot.teacherName && <div className="opacity-80">{slot.teacherName}</div>}
                              {slot.roomName && <div className="opacity-60">{slot.roomName}</div>}
                            </>
                          ) : (
                            "Free"
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">Click any cell to assign or change a subject, teacher and room for that slot.</p>

      <FormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        title={editing ? `${DAY_NAMES[editing.day]} — Period ${editing.period}` : ""}
        submitLabel="Save Slot"
        onSubmit={saveSlot}
        submitting={saving}
        size="sm"
      >
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={draft.isBreak} onCheckedChange={(v) => setDraft({ ...draft, isBreak: !!v })} />
            This is a break / lunch period (no subject or teacher)
          </label>

          {!draft.isBreak && (
            <>
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Select value={draft.subjectKey || "none"} onValueChange={(v) => setDraft({ ...draft, subjectKey: v === "none" ? "" : v })}>
                  <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose subject" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {subjects.map((s) => <SelectItem key={s.subjectKey} value={s.subjectKey}>{s.subjectName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Teacher</Label>
                <Select value={draft.teacherUserKey || "none"} onValueChange={(v) => setDraft({ ...draft, teacherUserKey: v === "none" ? "" : v })}>
                  <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose teacher" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {teachers.map((t) => <SelectItem key={t.akiraUserKey} value={t.akiraUserKey}>{t.userName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Room</Label>
                <Select value={draft.roomKey || "none"} onValueChange={(v) => setDraft({ ...draft, roomKey: v === "none" ? "" : v })}>
                  <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose room" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {rooms.map((r) => <SelectItem key={r.roomKey} value={r.roomKey}>{r.roomName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={draft.isPractical} onCheckedChange={(v) => setDraft({ ...draft, isPractical: !!v })} />
                Practical / lab session
              </label>
            </>
          )}

          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Textarea
              value={draft.remarks}
              onChange={(e) => setDraft({ ...draft, remarks: e.target.value })}
              placeholder="Optional note for this slot"
              className="rounded-md"
              rows={2}
            />
          </div>
        </div>
      </FormDialog>

      <FormDialog
        open={conflictsOpen}
        onOpenChange={setConflictsOpen}
        title="Timetable Conflicts — this Academic Year"
        submitLabel="Close"
        cancelLabel="Close"
        onSubmit={() => setConflictsOpen(false)}
        size="md"
      >
        {conflicts.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No conflicts detected.</div>
        ) : (
          <div className="space-y-3">
            {conflicts.map((c, i) => (
              <div key={i} className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <div className="flex items-center gap-1.5 font-medium text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {c.conflictType === "TEACHER" ? "Teacher clash" : "Room clash"}: {c.entityName}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {DAY_NAMES[c.dayOfWeek]}, Period {c.periodNumber} — double-booked across: {c.sectionNames}
                </div>
              </div>
            ))}
          </div>
        )}
      </FormDialog>
    </div>
  );
}
