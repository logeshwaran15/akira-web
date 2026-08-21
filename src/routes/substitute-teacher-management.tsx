import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { UserCheck, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/substitute-teacher-management")({
  head: () => ({
    meta: [
      { title: "Substitute Teacher Management — Akira School ERP" },
      { name: "description", content: "Resolve a teacher's absence for one date without touching their regular timetable." },
    ],
  }),
  component: SubstituteTeacherManagementPage,
});

type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type UserOption = { akiraUserKey: string; userName: string };
type DaySlot = {
  timetableSlotKey: string; dayOfWeek: number; periodNumber: number;
  subjectKey: string | null; subjectName: string | null; sectionName: string;
  substituteAssignmentKey: string | null;
  substituteTeacherUserKey: string | null; substituteTeacherName: string | null;
  reason: string | null; remarks: string | null;
};
type EligibleSubstitute = { akiraUserKey: string; userName: string };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function SubstituteTeacherManagementPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearKey, setYearKey] = useState("");
  const [teachers, setTeachers] = useState<UserOption[]>([]);
  const [teacherKey, setTeacherKey] = useState("");
  const [leaveDate, setLeaveDate] = useState(todayISO());
  const [slots, setSlots] = useState<DaySlot[]>([]);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState<DaySlot | null>(null);
  const [eligible, setEligible] = useState<EligibleSubstitute[]>([]);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [draft, setDraft] = useState({ substituteTeacherUserKey: "", reason: "", remarks: "" });
  const [saving, setSaving] = useState(false);

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

  const load = () => {
    if (!teacherKey || !leaveDate || !yearKey) return;
    setLoading(true);
    apiFetch(`/api/SubstituteAssignment/teacher-day?teacherId=${teacherKey}&leaveDate=${leaveDate}&academicYearId=${yearKey}`)
      .then((d: DaySlot[]) => setSlots(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load the teacher's day"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [teacherKey, leaveDate, yearKey]);

  const openAssign = (slot: DaySlot) => {
    setEditing(slot);
    setDraft({ substituteTeacherUserKey: slot.substituteTeacherUserKey ?? "", reason: slot.reason ?? "", remarks: slot.remarks ?? "" });
    setEligibleLoading(true);
    apiFetch(`/api/SubstituteAssignment/eligible?timetableSlotId=${slot.timetableSlotKey}&leaveDate=${leaveDate}`)
      .then((d: EligibleSubstitute[]) => setEligible(d))
      .catch(() => setEligible([]))
      .finally(() => setEligibleLoading(false));
  };

  const save = async () => {
    if (!editing) return;
    if (!draft.substituteTeacherUserKey) {
      toast.error("Choose a substitute teacher.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/SubstituteAssignment", {
        method: "POST",
        body: JSON.stringify({
          timetableSlotKey: editing.timetableSlotKey,
          leaveDate,
          substituteTeacherUserKey: draft.substituteTeacherUserKey,
          reason: draft.reason || null,
          remarks: draft.remarks || null,
        }),
      });
      toast.success("Substitute assigned");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign substitute — they may already be committed at this period.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (slot: DaySlot) => {
    if (!slot.substituteAssignmentKey) return;
    try {
      await apiFetch(`/api/SubstituteAssignment/${slot.substituteAssignmentKey}`, { method: "DELETE" });
      toast.success("Substitute removed");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove substitute");
    }
  };

  return (
    <div>
      <PageHeader title="Substitute Teacher Management" breadcrumbs={[{ label: "Staff" }, { label: "Substitute Teacher Management" }]} />

      <div className="mb-4 flex items-start gap-2 rounded-md border border-info/30 bg-info/10 px-4 py-2.5 text-sm text-info">
        <UserCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          A dated overlay only — assigning a substitute here never changes the absent teacher's regular timetable.
          Tomorrow, they're back on it exactly as before.
        </span>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <Label>Absent Teacher</Label>
          <Select value={teacherKey} onValueChange={setTeacherKey}>
            <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose teacher" /></SelectTrigger>
            <SelectContent>
              {teachers.map((t) => <SelectItem key={t.akiraUserKey} value={t.akiraUserKey}>{t.userName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Leave Date</Label>
          <DatePicker value={leaveDate} onChange={setLeaveDate} />
        </div>
      </div>

      <div className="rounded-md border border-border bg-card shadow-sm">
        <div className="border-b border-border p-4">
          <h2 className="font-display text-base font-semibold">Periods on this date</h2>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : slots.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">This teacher has no scheduled periods on this date.</div>
          ) : (
            slots.map((slot) => (
              <div key={slot.timetableSlotKey} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <div className="text-sm font-medium">
                    Period {slot.periodNumber} — {slot.subjectName ?? "Free"}
                  </div>
                  <div className="text-xs text-muted-foreground">{slot.sectionName}</div>
                </div>
                <div className="flex items-center gap-2">
                  {slot.substituteTeacherName ? (
                    <>
                      <Badge className="rounded-md border-0 bg-success/15 text-success">{slot.substituteTeacherName}</Badge>
                      <Button variant="ghost" size="sm" className="h-8 rounded-md" onClick={() => openAssign(slot)}>Reassign</Button>
                      <Button variant="ghost" size="sm" className="h-8 rounded-md text-destructive" onClick={() => remove(slot)}>Remove</Button>
                    </>
                  ) : (
                    <Button size="sm" className="h-8 rounded-md" onClick={() => openAssign(slot)} disabled={!slot.subjectName}>
                      Assign Substitute
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <FormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        title={editing ? `Period ${editing.periodNumber} — ${editing.subjectName ?? ""} (${editing.sectionName})` : ""}
        submitLabel="Assign"
        onSubmit={save}
        submitting={saving}
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Substitute Teacher</Label>
            <Select value={draft.substituteTeacherUserKey || "none"} onValueChange={(v) => setDraft({ ...draft, substituteTeacherUserKey: v === "none" ? "" : v })}>
              <SelectTrigger className="rounded-md">
                <SelectValue placeholder={eligibleLoading ? "Loading eligible substitutes..." : "Choose substitute"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {eligible.map((e) => <SelectItem key={e.akiraUserKey} value={e.akiraUserKey}>{e.userName}</SelectItem>)}
              </SelectContent>
            </Select>
            {!eligibleLoading && eligible.length === 0 && (
              <div className="flex items-center gap-1.5 text-xs text-warning">
                <AlertTriangle className="h-3 w-3" /> No eligible substitute free at this period — consider merging with an adjacent section instead.
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea
              value={draft.reason}
              onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
              placeholder="Sick leave, personal emergency, etc."
              className="rounded-md"
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Textarea
              value={draft.remarks}
              onChange={(e) => setDraft({ ...draft, remarks: e.target.value })}
              placeholder="Optional note"
              className="rounded-md"
              rows={2}
            />
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
