import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ArrowRight, GraduationCap, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/examinations")({
  head: () => ({
    meta: [
      { title: "Examinations — Akira School ERP" },
      { name: "description", content: "Schedule examinations and manage marks entry and results." },
    ],
  }),
  component: ExaminationsPage,
});

type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type SchoolClass = { schoolClassKey: string; className: string };
type ExamType = { examTypeKey: string; examTypeName: string; weightage: number | null };

type Exam = {
  examKey: string;
  examName: string;
  academicYearKey: string;
  academicYearName: string;
  examTypeKey: string;
  examTypeName: string;
  schoolClassKey: string;
  className: string;
  startDate: string;
  endDate: string;
  status: string;
  subjectCount: number;
};

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "bg-muted text-muted-foreground",
  ONGOING: "bg-info/15 text-info",
  COMPLETED: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  PUBLISHED: "bg-success/15 text-success",
};

function ExaminationsPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);

  const [yearFilter, setYearFilter] = useState("");
  const [classFilter, setClassFilter] = useState("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState({
    academicYearKey: "",
    examTypeKey: "",
    examName: "",
    schoolClassKey: "",
    startDate: "",
    endDate: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch("/api/AcademicYear")
      .then((y: AcademicYear[]) => {
        setYears(y);
        const active = y.find((x) => x.status === "Active");
        setYearFilter(active?.academicYearKey ?? y[0]?.academicYearKey ?? "");
      })
      .catch(() => {});
    apiFetch("/api/SchoolClass")
      .then((c: SchoolClass[]) => setClasses(c))
      .catch(() => {});
    apiFetch("/api/Exam/types")
      .then((t: ExamType[]) => setExamTypes(t))
      .catch(() => {});
  }, []);

  const load = () => {
    if (!yearFilter) return;
    setLoading(true);
    const params = new URLSearchParams({ academicYearId: yearFilter });
    if (classFilter !== "all") params.set("classId", classFilter);
    apiFetch(`/api/Exam?${params.toString()}`)
      .then((d: Exam[]) => setExams(d))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load examinations"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, [yearFilter, classFilter]);

  const openCreate = () => {
    setDraft({
      academicYearKey: yearFilter,
      examTypeKey: "",
      examName: "",
      schoolClassKey: "",
      startDate: "",
      endDate: "",
    });
    setCreateOpen(true);
  };

  const save = async () => {
    if (
      !draft.academicYearKey ||
      !draft.examTypeKey ||
      !draft.examName.trim() ||
      !draft.schoolClassKey ||
      !draft.startDate ||
      !draft.endDate
    ) {
      toast.error("Fill in all fields.");
      return;
    }
    setSaving(true);
    try {
      const result: { examKey: string } = await apiFetch("/api/Exam", {
        method: "POST",
        body: JSON.stringify(draft),
      });
      toast.success("Exam scheduled — subject schedule generated from the class's mapped subjects");
      setCreateOpen(false);
      navigate({ to: "/exam-detail", search: { id: result.examKey } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create exam");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Exam>[] = [
    {
      key: "examName",
      header: "Exam",
      sortable: true,
      accessor: (r) => (
        <div>
          <div className="font-medium">{r.examName}</div>
          <div className="text-xs text-muted-foreground">
            {r.examTypeName} · {r.className} · {r.academicYearName}
          </div>
        </div>
      ),
    },
    {
      key: "startDate",
      header: "Dates",
      sortable: true,
      accessor: (r) => `${r.startDate?.slice(0, 10)} → ${r.endDate?.slice(0, 10)}`,
    },
    { key: "subjectCount", header: "Subjects", accessor: (r) => r.subjectCount },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (r) => (
        <Badge
          className={cn(
            "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
            STATUS_STYLES[r.status],
          )}
        >
          {r.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (r) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-md"
          onClick={() => navigate({ to: "/exam-detail", search: { id: r.examKey } })}
        >
          Open <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Examinations"
        breadcrumbs={[{ label: "Examinations" }]}
        actions={
          <div className="flex items-center gap-2">
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="h-10 w-40 rounded-md">
                <SelectValue placeholder="All classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>
                    {c.className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="h-10 w-32 rounded-md">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y.academicYearKey} value={y.academicYearKey}>
                    {y.yearName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> New Exam
            </Button>
          </div>
        }
      />

      <DataTable
        data={exams}
        columns={columns}
        rowKey={(r) => r.examKey}
        storageKey="examinations"
        searchPlaceholder="Search by exam name or class..."
        searchFields={(r) => `${r.examName} ${r.className} ${r.examTypeName}`}
        dateField={(r) => r.startDate}
        dateFilterLabel="Start Date"
        emptyMessage={loading ? "Loading examinations..." : "No examinations scheduled yet."}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-4.5 w-4.5 text-primary" /> Schedule Exam
            </DialogTitle>
            <DialogDescription>
              The subject schedule is auto-generated from the class's mapped subjects, with max/pass
              marks from School Setup.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label required>Exam Name</Label>
              <Input
                className="rounded-md"
                value={draft.examName}
                onChange={(e) => setDraft({ ...draft, examName: e.target.value })}
                placeholder="e.g. Quarterly Examination 2026"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label required>Exam Type</Label>
                <Select
                  value={draft.examTypeKey}
                  onValueChange={(v) => setDraft({ ...draft, examTypeKey: v })}
                >
                  <SelectTrigger className="rounded-md">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {examTypes.map((t) => (
                      <SelectItem key={t.examTypeKey} value={t.examTypeKey}>
                        {t.examTypeName}
                        {t.weightage ? ` (${t.weightage}%)` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label required>Class</Label>
                <Select
                  value={draft.schoolClassKey}
                  onValueChange={(v) => setDraft({ ...draft, schoolClassKey: v })}
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label required>Start Date</Label>
                <Input
                  type="date"
                  className="rounded-md"
                  value={draft.startDate}
                  onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label required>End Date</Label>
                <Input
                  type="date"
                  className="rounded-md"
                  value={draft.endDate}
                  onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                />
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
              {saving ? "Scheduling..." : "Schedule Exam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
