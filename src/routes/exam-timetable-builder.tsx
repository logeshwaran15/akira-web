import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Rocket, ClipboardCheck, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useFormatDate } from "@/hooks/use-tenant-setting";

export const Route = createFileRoute("/exam-timetable-builder")({
  head: () => ({
    meta: [
      { title: "Exam Timetable Builder — Akira School ERP" },
      { name: "description", content: "Assign rooms and invigilators per subject and section for an exam, independent of the regular class timetable." },
    ],
  }),
  component: ExamTimetableBuilderPage,
});

type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type SchoolClass = { schoolClassKey: string; className: string };
type ExamOption = { examKey: string; examName: string; schoolClassKey: string; status: string; subjectCount: number };
type UserOption = { akiraUserKey: string; userName: string };
type RoomOption = { roomKey: string; roomName: string };
type ExamTimetableRow = {
  examTimetableSlotKey: string | null;
  examSubjectScheduleKey: string;
  subjectKey: string;
  subjectName: string;
  examDate: string | null;
  startTime: string | null;
  durationMinutes: number | null;
  sectionKey: string;
  sectionLabel: string;
  className: string;
  roomKey: string | null;
  roomName: string | null;
  invigilatorUserKey: string | null;
  invigilatorName: string | null;
};

function endTime(startTime: string | null, durationMinutes: number | null) {
  if (!startTime || !durationMinutes) return null;
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + durationMinutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function ExamTimetableBuilderPage() {
  const formatDate = useFormatDate();
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearKey, setYearKey] = useState("");
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classKey, setClassKey] = useState("");
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [examKey, setExamKey] = useState("");
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [teachers, setTeachers] = useState<UserOption[]>([]);
  const [rows, setRows] = useState<ExamTimetableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [editing, setEditing] = useState<ExamTimetableRow | null>(null);
  const [draft, setDraft] = useState({ roomKey: "", invigilatorUserKey: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([apiFetch("/api/AcademicYear"), apiFetch("/api/SchoolClass"), apiFetch("/api/Room"), apiFetch("/api/User")])
      .then(([y, c, r, u]) => {
        setYears(y);
        setClasses(c);
        setRooms(r);
        setTeachers(u);
        const active = (y as AcademicYear[]).find((yy) => yy.status === "Active") ?? y[0];
        if (active) setYearKey(active.academicYearKey);
        if (c.length > 0) setClassKey(c[0].schoolClassKey);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load exam timetable filters"));
  }, []);

  useEffect(() => {
    if (!yearKey || !classKey) { setExams([]); return; }
    apiFetch(`/api/Exam?academicYearId=${yearKey}&classId=${classKey}`)
      .then((d: ExamOption[]) => { setExams(d); setExamKey(d[0]?.examKey ?? ""); })
      .catch(() => setExams([]));
  }, [yearKey, classKey]);

  const load = () => {
    if (!examKey) { setRows([]); return; }
    setLoading(true);
    apiFetch(`/api/ExamTimetable?examId=${examKey}`)
      .then((d: ExamTimetableRow[]) => setRows(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load exam timetable"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [examKey]);

  const openAssign = (row: ExamTimetableRow) => {
    setEditing(row);
    setDraft({ roomKey: row.roomKey ?? "", invigilatorUserKey: row.invigilatorUserKey ?? "" });
  };

  const save = async () => {
    if (!editing) return;
    if (!draft.roomKey) {
      toast.error("Choose a room.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/ExamTimetable/slots", {
        method: "POST",
        body: JSON.stringify({
          examTimetableSlotKey: editing.examTimetableSlotKey,
          examSubjectScheduleKey: editing.examSubjectScheduleKey,
          sectionKey: editing.sectionKey,
          roomKey: draft.roomKey,
          invigilatorUserKey: draft.invigilatorUserKey || null,
        }),
      });
      toast.success("Room and invigilator saved");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save — check for a room or invigilator clash.");
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!examKey) return;
    setPublishing(true);
    try {
      await apiFetch(`/api/ExamTimetable/${examKey}/publish-schedule`, { method: "PUT" });
      toast.success("Exam schedule published");
      setExams((prev) => prev.map((e) => (e.examKey === examKey ? { ...e, status: "PUBLISHED" } : e)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cannot publish — some subjects still need a date or a room assigned.");
    } finally {
      setPublishing(false);
    }
  };

  const unassignedCount = rows.filter((r) => !r.roomKey).length;
  const selectedExam = exams.find((e) => e.examKey === examKey);

  const columns: Column<ExamTimetableRow>[] = [
    { key: "subjectName", header: "Subject", sortable: true, accessor: (r) => <span className="font-medium">{r.subjectName}</span> },
    { key: "className", header: "Class - Section", sortable: true, accessor: (r) => `${r.className} - ${r.sectionLabel}` },
    {
      key: "examDate",
      header: "Date & Time",
      sortable: true,
      accessor: (r) =>
        r.examDate && r.startTime ? (
          <span>{formatDate(r.examDate)} · {r.startTime.slice(0, 5)}–{endTime(r.startTime, r.durationMinutes)?.slice(0, 5) ?? "?"}</span>
        ) : (
          <Badge className="rounded-md border-0 bg-warning/25 text-[oklch(0.45_0.12_65)]">No date set</Badge>
        ),
    },
    {
      key: "roomName",
      header: "Room",
      accessor: (r) => r.roomName ?? <Badge className="rounded-md border-0 bg-destructive/15 text-destructive">Unassigned</Badge>,
    },
    { key: "invigilatorName", header: "Invigilator", accessor: (r) => r.invigilatorName ?? <span className="text-muted-foreground">—</span> },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      accessor: (r) => (
        <Button variant="ghost" size="sm" className="h-8 rounded-md" onClick={() => openAssign(r)} disabled={!r.examDate}>
          {r.roomKey ? "Reassign" : "Assign"}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Exam Timetable Builder"
        breadcrumbs={[{ label: "Academics" }, { label: "Exam Timetable Builder" }]}
        actions={
          <Button
            className="h-10 gap-1.5 rounded-md shadow-sm"
            onClick={publish}
            disabled={publishing || !examKey || selectedExam?.status === "PUBLISHED"}
          >
            <Rocket className="h-4 w-4" /> {selectedExam?.status === "PUBLISHED" ? "Published" : "Publish Schedule"}
          </Button>
        }
      />

      <div className="mb-4 flex items-start gap-2 rounded-md border border-info/30 bg-info/10 px-4 py-2.5 text-sm text-info">
        <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Standalone from the regular class timetable — assign a room and invigilator per subject and section here.
          Two sections sitting the same subject on the same day can use different rooms and invigilators.
        </span>
      </div>

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
          <Label>Exam</Label>
          <Select value={examKey} onValueChange={setExamKey}>
            <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose exam" /></SelectTrigger>
            <SelectContent>
              {exams.map((e) => <SelectItem key={e.examKey} value={e.examKey}>{e.examName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedExam && (
        <div className="mb-4 flex items-center gap-2">
          <Badge className={cn("rounded-md border-0", selectedExam.status === "PUBLISHED" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
            {selectedExam.status === "PUBLISHED" ? "Published" : "Draft"}
          </Badge>
          {unassignedCount > 0 && (
            <Badge className="gap-1 rounded-md border-0 bg-warning/25 text-[oklch(0.45_0.12_65)]">
              <AlertTriangle className="h-3 w-3" /> {unassignedCount} still need a room
            </Badge>
          )}
        </div>
      )}

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => `${r.examSubjectScheduleKey}-${r.sectionKey}`}
        searchPlaceholder="Search subject or section..."
        searchFields={(r) => `${r.subjectName} ${r.className} ${r.sectionLabel}`}
        emptyMessage={loading ? "Loading..." : "No subjects scheduled for this exam yet."}
        storageKey="exam-timetable-builder"
      />

      <FormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        title={editing ? `${editing.subjectName} — ${editing.className} ${editing.sectionLabel}` : ""}
        submitLabel="Save"
        onSubmit={save}
        submitting={saving}
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Room</Label>
            <Select value={draft.roomKey || "none"} onValueChange={(v) => setDraft({ ...draft, roomKey: v === "none" ? "" : v })}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose room" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {rooms.map((r) => <SelectItem key={r.roomKey} value={r.roomKey}>{r.roomName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Invigilator</Label>
            <Select value={draft.invigilatorUserKey || "none"} onValueChange={(v) => setDraft({ ...draft, invigilatorUserKey: v === "none" ? "" : v })}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose invigilator" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {teachers.map((t) => <SelectItem key={t.akiraUserKey} value={t.akiraUserKey}>{t.userName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
