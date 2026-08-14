import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, Trash2, Clock, MapPin, Award } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admissions-tests")({
  head: () => ({
    meta: [
      { title: "Entrance Tests — Akira School ERP" },
      {
        name: "description",
        content:
          "Schedule entrance tests and interactions, and configure their subject-wise marking scheme.",
      },
    ],
  }),
  component: AdmissionTestsPage,
});

type SchoolClass = { schoolClassKey: string; className: string };
type AcademicYear = { academicYearKey: string; yearName: string };
type Subject = { subjectKey: string; subjectName: string };
type Room = { roomKey: string; roomName: string };

type AdmissionTest = {
  admissionTestKey: string;
  academicYearKey: string;
  academicYearName: string | null;
  classForKey: string;
  classForName: string | null;
  testDate: string;
  reportingTime: string | null;
  venueRoomKey: string | null;
  venueName: string | null;
  testType: string;
  durationMinutes: number | null;
  passPercentage: number;
  totalMaxMarks: number | null;
};

type TestSubjectRow = { subjectKey: string; maxMarks: number; sortOrder: number };

const TEST_TYPES = ["WRITTEN", "ORAL", "INTERACTION", "APTITUDE"];
const TEST_TYPE_STYLES: Record<string, string> = {
  WRITTEN: "bg-primary/15 text-primary",
  ORAL: "bg-info/15 text-info",
  INTERACTION: "bg-success/15 text-success",
  APTITUDE: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
};

const emptyDraft = () => ({
  academicYearKey: "",
  classForKey: "",
  testDate: "",
  reportingTime: "",
  venueRoomKey: "",
  testType: "WRITTEN",
  durationMinutes: "",
  passPercentage: "40",
  subjects: [] as TestSubjectRow[],
});

function AdmissionTestsPage() {
  const [tests, setTests] = useState<AdmissionTest[]>([]);
  const [loading, setLoading] = useState(true);

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft());
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdmissionTest | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch("/api/AdmissionTest")
      .then((d: AdmissionTest[]) => setTests(d))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load entrance tests"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/AcademicYear"),
      apiFetch("/api/SchoolClass"),
      apiFetch("/api/Subject"),
      apiFetch("/api/Room"),
    ])
      .then(([y, c, s, r]) => {
        setYears(y);
        setClasses(c);
        setSubjects(s);
        setRooms(r);
      })
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setDraft(emptyDraft());
    setCreateOpen(true);
  };

  const addSubjectRow = () => {
    setDraft((d) => ({
      ...d,
      subjects: [
        ...d.subjects,
        { subjectKey: "", maxMarks: 100, sortOrder: (d.subjects.length + 1) * 10 },
      ],
    }));
  };

  const updateSubjectRow = (index: number, patch: Partial<TestSubjectRow>) => {
    setDraft((d) => ({
      ...d,
      subjects: d.subjects.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  };

  const removeSubjectRow = (index: number) => {
    setDraft((d) => ({ ...d, subjects: d.subjects.filter((_, i) => i !== index) }));
  };

  const totalMaxMarks = draft.subjects.reduce((sum, s) => sum + (Number(s.maxMarks) || 0), 0);

  const save = async () => {
    if (!draft.academicYearKey || !draft.classForKey || !draft.testDate) {
      toast.error("Academic year, class and test date are required.");
      return;
    }
    if (draft.subjects.some((s) => !s.subjectKey)) {
      toast.error("Every subject row needs a subject selected.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/AdmissionTest", {
        method: "POST",
        body: JSON.stringify({
          academicYearKey: draft.academicYearKey,
          classForKey: draft.classForKey,
          testDate: draft.testDate,
          reportingTime: draft.reportingTime || null,
          venueRoomKey: draft.venueRoomKey || null,
          testType: draft.testType,
          durationMinutes: draft.durationMinutes ? Number(draft.durationMinutes) : null,
          passPercentage: Number(draft.passPercentage) || 40,
          subjects: draft.subjects.map((s) => ({
            subjectKey: s.subjectKey,
            maxMarks: Number(s.maxMarks) || 0,
            sortOrder: s.sortOrder,
          })),
        }),
      });
      toast.success("Entrance test scheduled");
      setCreateOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create entrance test");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/AdmissionTest/${deleteTarget.admissionTestKey}`, { method: "DELETE" });
      toast.success("Entrance test removed");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove entrance test");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<AdmissionTest>[] = [
    {
      key: "testDate",
      header: "Test",
      sortable: true,
      accessor: (r) => (
        <div>
          <div className="font-medium">{r.testDate?.slice(0, 10)}</div>
          <div className="text-xs text-muted-foreground">
            {r.classForName} · {r.academicYearName}
          </div>
        </div>
      ),
    },
    {
      key: "testType",
      header: "Type",
      sortable: true,
      accessor: (r) => (
        <Badge
          className={cn(
            "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
            TEST_TYPE_STYLES[r.testType],
          )}
        >
          {r.testType}
        </Badge>
      ),
    },
    {
      key: "reportingTime",
      header: "Reporting",
      accessor: (r) => (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> {r.reportingTime ? r.reportingTime.slice(0, 5) : "—"}
          {r.durationMinutes ? ` · ${r.durationMinutes} min` : ""}
        </span>
      ),
    },
    {
      key: "venueName",
      header: "Venue",
      accessor: (r) => (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> {r.venueName ?? "—"}
        </span>
      ),
    },
    {
      key: "totalMaxMarks",
      header: "Marks",
      accessor: (r) => (
        <span className="text-sm">
          {r.totalMaxMarks ?? "—"}{" "}
          <span className="text-xs text-muted-foreground">(pass {r.passPercentage}%)</span>
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (r) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-md text-destructive hover:text-destructive"
          title="Delete"
          onClick={() => setDeleteTarget(r)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Entrance Tests"
        breadcrumbs={[{ label: "Admissions" }, { label: "Entrance Tests" }]}
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Schedule Test
          </Button>
        }
      />

      <DataTable
        data={tests}
        columns={columns}
        rowKey={(r) => r.admissionTestKey}
        storageKey="admissions-tests"
        searchPlaceholder="Search by class or academic year..."
        searchFields={(r) => `${r.classForName ?? ""} ${r.academicYearName ?? ""} ${r.testType}`}
        dateField={(r) => r.testDate}
        dateFilterLabel="Test Date"
        emptyMessage={loading ? "Loading entrance tests..." : "No entrance tests scheduled yet."}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-4.5 w-4.5 text-primary" /> Schedule Entrance Test
            </DialogTitle>
            <DialogDescription>
              RTE-quota applicants are admitted by government lottery only and are automatically
              blocked from being scheduled for any test.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label required>Academic Year</Label>
                <Select
                  value={draft.academicYearKey}
                  onValueChange={(v) => setDraft({ ...draft, academicYearKey: v })}
                >
                  <SelectTrigger className="rounded-md">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y.academicYearKey} value={y.academicYearKey}>
                        {y.yearName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label required>Class For</Label>
                <Select
                  value={draft.classForKey}
                  onValueChange={(v) => setDraft({ ...draft, classForKey: v })}
                >
                  <SelectTrigger className="rounded-md">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>
                        {c.className}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label required>Test Date</Label>
                <Input
                  type="date"
                  className="rounded-md"
                  value={draft.testDate}
                  onChange={(e) => setDraft({ ...draft, testDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Reporting Time</Label>
                <Input
                  type="time"
                  className="rounded-md"
                  value={draft.reportingTime}
                  onChange={(e) => setDraft({ ...draft, reportingTime: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Test Type</Label>
                <Select
                  value={draft.testType}
                  onValueChange={(v) => setDraft({ ...draft, testType: v })}
                >
                  <SelectTrigger className="rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEST_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Venue</Label>
                <Select
                  value={draft.venueRoomKey}
                  onValueChange={(v) => setDraft({ ...draft, venueRoomKey: v })}
                >
                  <SelectTrigger className="rounded-md">
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((r) => (
                      <SelectItem key={r.roomKey} value={r.roomKey}>
                        {r.roomName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  className="rounded-md"
                  value={draft.durationMinutes}
                  onChange={(e) => setDraft({ ...draft, durationMinutes: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Pass Percentage</Label>
                <Input
                  type="number"
                  className="rounded-md"
                  value={draft.passPercentage}
                  onChange={(e) => setDraft({ ...draft, passPercentage: e.target.value })}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Subjects &amp; Max Marks</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 rounded-md"
                  onClick={addSubjectRow}
                >
                  <Plus className="h-3.5 w-3.5" /> Add Subject
                </Button>
              </div>
              <div className="space-y-2">
                {draft.subjects.length === 0 && (
                  <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                    No subjects added yet. Add at least one subject to define the marking scheme.
                  </p>
                )}
                {draft.subjects.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select
                      value={row.subjectKey}
                      onValueChange={(v) => updateSubjectRow(i, { subjectKey: v })}
                    >
                      <SelectTrigger className="h-9 flex-1 rounded-md">
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.subjectKey} value={s.subjectKey}>
                            {s.subjectName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      className="h-9 w-28 rounded-md"
                      placeholder="Max marks"
                      value={row.maxMarks}
                      onChange={(e) => updateSubjectRow(i, { maxMarks: Number(e.target.value) })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-md text-destructive hover:text-destructive"
                      onClick={() => removeSubjectRow(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {draft.subjects.length > 0 && (
                  <p className="text-right text-xs text-muted-foreground">
                    Total max marks:{" "}
                    <span className="font-medium text-foreground">{totalMaxMarks}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-md"
              onClick={() => setCreateOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button className="rounded-md" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Schedule Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Entrance Test?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the test scheduled for {deleteTarget?.classForName} on{" "}
              {deleteTarget?.testDate?.slice(0, 10)}. Applications already linked to it keep their
              recorded results.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
