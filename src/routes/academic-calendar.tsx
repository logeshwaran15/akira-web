import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Trash2, Sparkles, AlertTriangle, CalendarDays } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useFormatDate } from "@/hooks/use-tenant-setting";

export const Route = createFileRoute("/academic-calendar")({
  head: () => ({
    meta: [
      { title: "Academic Calendar — Akira School ERP" },
      {
        name: "description",
        content: "Manage holidays and working-day counts for the academic year.",
      },
    ],
  }),
  component: AcademicCalendarPage,
});

type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type Holiday = {
  holidayKey: string;
  academicYearKey: string;
  holidayName: string;
  holidayDate: string;
  category: string;
  isWorkingDay: boolean;
  isMandatory: boolean;
};
type Summary = {
  totalCalendarWorkingDays: number;
  nonWorkingHolidayCount: number;
  netWorkingDays: number;
};

const CATEGORIES = ["NATIONAL", "STATE", "SCHOOL_EVENT", "VACATION"];
const CATEGORY_LABELS: Record<string, string> = {
  NATIONAL: "National Holiday",
  STATE: "State Holiday",
  SCHOOL_EVENT: "School Event",
  VACATION: "Vacation",
};
const CATEGORY_STYLES: Record<string, string> = {
  NATIONAL: "bg-destructive/15 text-destructive",
  STATE: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  SCHOOL_EVENT: "bg-info/15 text-info",
  VACATION: "bg-primary/15 text-primary",
};

const MIN_WORKING_DAYS_OPTIONS = [
  { label: "CBSE (200 days)", value: 200 },
  { label: "TN State / Matriculation (195 days)", value: 195 },
  { label: "ICSE / ISC (200 days)", value: 200 },
];

function AcademicCalendarPage() {
  const formatDate = useFormatDate();
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearKey, setYearKey] = useState("");
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [minRequired, setMinRequired] = useState(200);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    holidayName: "",
    holidayDate: "",
    category: "SCHOOL_EVENT",
    isWorkingDay: false,
  });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch("/api/AcademicYear")
      .then((data: AcademicYear[]) => {
        setYears(data);
        const active = data.find((y) => y.status === "Active") ?? data[0];
        if (active) setYearKey(active.academicYearKey);
      })
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load academic years"),
      )
      .finally(() => setLoading(false));
  }, []);

  const loadHolidays = (key: string) => {
    if (!key) return;
    Promise.all([
      apiFetch(`/api/Holiday?academicYearId=${key}`),
      apiFetch(`/api/Holiday/working-days-summary?academicYearId=${key}`),
    ])
      .then(([h, s]) => {
        setHolidays(h);
        setSummary(s);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load calendar"));
  };

  useEffect(() => {
    if (yearKey) loadHolidays(yearKey);
  }, [yearKey]);

  const seedNational = async () => {
    if (!yearKey) return;
    setSeeding(true);
    try {
      await apiFetch("/api/Holiday/seed-national", {
        method: "POST",
        body: JSON.stringify({ academicYearKey: yearKey }),
      });
      toast.success("National holidays added");
      loadHolidays(yearKey);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to seed national holidays");
    } finally {
      setSeeding(false);
    }
  };

  const openNew = () => {
    setDraft({ holidayName: "", holidayDate: "", category: "SCHOOL_EVENT", isWorkingDay: false });
    setOpen(true);
  };

  const save = async () => {
    if (!yearKey) return;
    setSaving(true);
    try {
      await apiFetch("/api/Holiday", {
        method: "POST",
        body: JSON.stringify({
          academicYearKey: yearKey,
          holidayName: draft.holidayName,
          holidayDate: draft.holidayDate,
          category: draft.category,
          isWorkingDay: draft.isWorkingDay,
        }),
      });
      toast.success("Added to calendar");
      setOpen(false);
      loadHolidays(yearKey);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/Holiday/${deleteTarget.holidayKey}`, { method: "DELETE" });
      toast.success("Removed");
      setDeleteTarget(null);
      loadHolidays(yearKey);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    }
  };

  const shortage = summary ? summary.netWorkingDays < minRequired : false;

  return (
    <div>
      <PageHeader
        title="Academic Calendar"
        breadcrumbs={[{ label: "School Setup" }, { label: "Academic Calendar" }]}
        actions={
          <Button
            className="h-10 gap-1.5 rounded-md shadow-sm"
            onClick={openNew}
            disabled={!yearKey}
          >
            <Plus className="h-4 w-4" /> Add to Calendar
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-3 shadow-sm">
        <CalendarDays className="h-4 w-4 text-primary" />
        <Label className="text-sm font-medium">Academic Year</Label>
        <Select value={yearKey} onValueChange={setYearKey}>
          <SelectTrigger className="h-9 w-[200px] rounded-md">
            <SelectValue placeholder="Choose year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y.academicYearKey} value={y.academicYearKey}>
                {y.yearName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 rounded-md"
          onClick={seedNational}
          disabled={seeding || !yearKey}
        >
          <Sparkles className="h-3.5 w-3.5" /> {seeding ? "Adding..." : "Seed National Holidays"}
        </Button>
      </div>

      {summary && (
        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-card p-4 shadow-sm">
            <div className="text-xs text-muted-foreground">Calendar Working Days</div>
            <div className="mt-1 font-display text-2xl font-bold">
              {summary.totalCalendarWorkingDays}
            </div>
          </div>
          <div className="rounded-md border border-border bg-card p-4 shadow-sm">
            <div className="text-xs text-muted-foreground">Holidays (non-working)</div>
            <div className="mt-1 font-display text-2xl font-bold">
              {summary.nonWorkingHolidayCount}
            </div>
          </div>
          <div
            className={cn(
              "rounded-md border p-4 shadow-sm",
              shortage ? "border-destructive/30 bg-destructive/5" : "border-border bg-card",
            )}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Net Working Days</span>
              <Select value={String(minRequired)} onValueChange={(v) => setMinRequired(Number(v))}>
                <SelectTrigger className="h-6 w-auto rounded-md border-0 bg-transparent px-1 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MIN_WORKING_DAYS_OPTIONS.map((o) => (
                    <SelectItem key={o.label} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-1 flex items-center gap-2 font-display text-2xl font-bold">
              {summary.netWorkingDays}
              {shortage && <AlertTriangle className="h-4 w-4 text-destructive" />}
            </div>
            {shortage && (
              <p className="mt-1 text-xs text-destructive">
                Below the {minRequired}-day minimum for this board.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="rounded-md border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Working Day?</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : holidays.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                  No calendar entries yet.
                </TableCell>
              </TableRow>
            ) : (
              holidays.map((h) => (
                <TableRow key={h.holidayKey}>
                  <TableCell>{formatDate(h.holidayDate)}</TableCell>
                  <TableCell className="font-medium">
                    {h.holidayName}
                    {h.isMandatory && (
                      <Badge variant="outline" className="ml-2 rounded-md text-[10px]">
                        Mandatory
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("rounded-md border-0", CATEGORY_STYLES[h.category])}>
                      {CATEGORY_LABELS[h.category] ?? h.category}
                    </Badge>
                  </TableCell>
                  <TableCell>{h.isWorkingDay ? "Yes (special schedule)" : "No"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-destructive"
                      onClick={() => setDeleteTarget(h)}
                      disabled={h.isMandatory}
                      title={h.isMandatory ? "Mandatory holidays cannot be removed" : "Remove"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Add to Calendar"
        submitLabel="Add"
        onSubmit={save}
        submitting={saving}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Name</Label>
            <Input
              value={draft.holidayName}
              onChange={(e) => setDraft({ ...draft, holidayName: e.target.value })}
              placeholder="Pongal"
              className="rounded-md"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label required>Date</Label>
              <DatePicker
                value={draft.holidayDate}
                onChange={(v) => setDraft({ ...draft, holidayDate: v })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label required>Category</Label>
              <Select
                value={draft.category}
                onValueChange={(v) => setDraft({ ...draft, category: v })}
              >
                <SelectTrigger className="rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={draft.isWorkingDay}
              onCheckedChange={(v) => setDraft({ ...draft, isWorkingDay: !!v })}
            />
            Still a working day (special schedule — e.g. Annual Day, Sports Day)
          </label>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{deleteTarget?.holidayName}"?</AlertDialogTitle>
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
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
