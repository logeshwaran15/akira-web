import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  AlertTriangle,
  Check,
  ChevronsUpDown,
  Clock,
  LogOut,
  TimerReset,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/late-early-log")({
  head: () => ({
    meta: [
      { title: "Late Arrival & Early Departure Log — Akira School ERP" },
      {
        name: "description",
        content: "Log and track late arrivals and early departures, with habitual-pattern alerts.",
      },
    ],
  }),
  component: LateEarlyLogPage,
});

type SchoolClass = { schoolClassKey: string; className: string };
type StudentOption = { studentKey: string; studentName: string; admissionNumber: string };

type LateArrivalRow = {
  attendanceLateArrivalKey: string;
  studentKey: string;
  admissionNumber: string;
  studentName: string;
  className: string | null;
  sectionLabel: string | null;
  attendanceDate: string;
  arrivalTime: string;
  expectedTime: string;
  delayMinutes: number | null;
  reason: string | null;
};

type EarlyDepartureRow = {
  attendanceEarlyDepartureKey: string;
  studentKey: string;
  admissionNumber: string;
  studentName: string;
  className: string | null;
  sectionLabel: string | null;
  attendanceDate: string;
  departureTime: string;
  reason: string;
  authorizedByUserName: string | null;
  guardianName: string | null;
  guardianMobile: string | null;
};

type HabitualLateRow = {
  studentKey: string;
  admissionNumber: string;
  studentName: string;
  lateCount: number;
  avgDelayMinutes: number;
};

const todayIso = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const formatTime = (t: string | null) => {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${m} ${suffix}`;
};

const formatDate = (iso: string) => {
  const d = new Date(iso.slice(0, 10));
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

function LateEarlyLogPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classFilter, setClassFilter] = useState("");
  const [students, setStudents] = useState<StudentOption[]>([]);

  const [lateArrivals, setLateArrivals] = useState<LateArrivalRow[]>([]);
  const [earlyDepartures, setEarlyDepartures] = useState<EarlyDepartureRow[]>([]);
  const [habitual, setHabitual] = useState<HabitualLateRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [lateDialogOpen, setLateDialogOpen] = useState(false);
  const [lateDraft, setLateDraft] = useState({
    studentKey: "",
    attendanceDate: todayIso(),
    arrivalTime: "",
    expectedTime: "08:30",
    reason: "",
  });
  const [lateSaving, setLateSaving] = useState(false);
  const [latePickerOpen, setLatePickerOpen] = useState(false);

  const [earlyDialogOpen, setEarlyDialogOpen] = useState(false);
  const [earlyDraft, setEarlyDraft] = useState({
    studentKey: "",
    attendanceDate: todayIso(),
    departureTime: "",
    reason: "",
    guardianName: "",
    guardianMobile: "",
  });
  const [earlySaving, setEarlySaving] = useState(false);
  const [earlyPickerOpen, setEarlyPickerOpen] = useState(false);

  useEffect(() => {
    apiFetch("/api/SchoolClass")
      .then((c: SchoolClass[]) => setClasses(c))
      .catch(() => {});
    apiFetch("/api/Student?status=ENROLLED")
      .then((s: StudentOption[]) => setStudents(s))
      .catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    const from = daysAgoIso(60);
    const to = todayIso();
    const params = new URLSearchParams({ fromDate: from, toDate: to });
    if (classFilter) params.set("schoolClassId", classFilter);

    Promise.all([
      apiFetch(`/api/StudentAttendance/late-arrival?${params.toString()}`),
      apiFetch(`/api/StudentAttendance/early-departure?${params.toString()}`),
      apiFetch(
        `/api/StudentAttendance/late-arrival/habitual?fromDate=${daysAgoIso(30)}&toDate=${todayIso()}&minOccurrences=3`,
      ),
    ])
      .then(([la, ed, hab]: [LateArrivalRow[], EarlyDepartureRow[], HabitualLateRow[]]) => {
        setLateArrivals(la);
        setEarlyDepartures(ed);
        setHabitual(hab);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load log"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [classFilter]);

  const openLateDialog = () => {
    setLateDraft({
      studentKey: "",
      attendanceDate: todayIso(),
      arrivalTime: "",
      expectedTime: "08:30",
      reason: "",
    });
    setLateDialogOpen(true);
  };

  const saveLateArrival = async () => {
    if (!lateDraft.studentKey || !lateDraft.arrivalTime || !lateDraft.expectedTime) {
      toast.error("Select the student and fill in both arrival and expected time.");
      return;
    }
    setLateSaving(true);
    try {
      await apiFetch("/api/StudentAttendance/late-arrival", {
        method: "POST",
        body: JSON.stringify({
          studentKey: lateDraft.studentKey,
          attendanceDate: lateDraft.attendanceDate,
          arrivalTime: `${lateDraft.arrivalTime}:00`,
          expectedTime: `${lateDraft.expectedTime}:00`,
          reason: lateDraft.reason || null,
        }),
      });
      toast.success("Late arrival logged");
      setLateDialogOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log late arrival");
    } finally {
      setLateSaving(false);
    }
  };

  const openEarlyDialog = () => {
    setEarlyDraft({
      studentKey: "",
      attendanceDate: todayIso(),
      departureTime: "",
      reason: "",
      guardianName: "",
      guardianMobile: "",
    });
    setEarlyDialogOpen(true);
  };

  const saveEarlyDeparture = async () => {
    if (!earlyDraft.studentKey || !earlyDraft.departureTime || !earlyDraft.reason.trim()) {
      toast.error("Select the student, departure time, and give a reason.");
      return;
    }
    setEarlySaving(true);
    try {
      await apiFetch("/api/StudentAttendance/early-departure", {
        method: "POST",
        body: JSON.stringify({
          studentKey: earlyDraft.studentKey,
          attendanceDate: earlyDraft.attendanceDate,
          departureTime: `${earlyDraft.departureTime}:00`,
          reason: earlyDraft.reason,
          guardianName: earlyDraft.guardianName || null,
          guardianMobile: earlyDraft.guardianMobile || null,
        }),
      });
      toast.success("Early departure logged — you are recorded as the authorizer.");
      setEarlyDialogOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log early departure");
    } finally {
      setEarlySaving(false);
    }
  };

  const studentLabel = (key: string) => {
    const s = students.find((x) => x.studentKey === key);
    return s ? `${s.studentName} (${s.admissionNumber})` : "Select student";
  };

  const lateColumns: Column<LateArrivalRow>[] = [
    {
      key: "studentName",
      header: "Student",
      sortable: true,
      accessor: (r) => (
        <div>
          <div className="text-sm font-medium">{r.studentName}</div>
          <div className="font-mono text-xs text-muted-foreground">
            {r.admissionNumber}
            {r.className ? ` · ${r.className}${r.sectionLabel ? ` - ${r.sectionLabel}` : ""}` : ""}
          </div>
        </div>
      ),
    },
    {
      key: "attendanceDate",
      header: "Date",
      sortable: true,
      accessor: (r) => formatDate(r.attendanceDate),
    },
    {
      key: "arrivalTime",
      header: "Arrival",
      accessor: (r) => `${formatTime(r.arrivalTime)} (expected ${formatTime(r.expectedTime)})`,
    },
    {
      key: "delayMinutes",
      header: "Delay",
      sortable: true,
      sortValue: (r) => r.delayMinutes ?? 0,
      accessor: (r) =>
        r.delayMinutes != null && r.delayMinutes > 0 ? (
          <Badge className="rounded-md border-0 bg-warning/15 text-[oklch(0.45_0.12_65)]">
            {r.delayMinutes} min
          </Badge>
        ) : (
          "—"
        ),
    },
    {
      key: "reason",
      header: "Reason",
      className: "text-muted-foreground",
      accessor: (r) => r.reason || "—",
    },
  ];

  const earlyColumns: Column<EarlyDepartureRow>[] = [
    {
      key: "studentName",
      header: "Student",
      sortable: true,
      accessor: (r) => (
        <div>
          <div className="text-sm font-medium">{r.studentName}</div>
          <div className="font-mono text-xs text-muted-foreground">
            {r.admissionNumber}
            {r.className ? ` · ${r.className}${r.sectionLabel ? ` - ${r.sectionLabel}` : ""}` : ""}
          </div>
        </div>
      ),
    },
    {
      key: "attendanceDate",
      header: "Date",
      sortable: true,
      accessor: (r) => formatDate(r.attendanceDate),
    },
    {
      key: "departureTime",
      header: "Departure",
      accessor: (r) => formatTime(r.departureTime),
    },
    {
      key: "reason",
      header: "Reason",
      className: "text-muted-foreground",
    },
    {
      key: "authorizedByUserName",
      header: "Authorized By",
      accessor: (r) => r.authorizedByUserName || "—",
    },
  ];

  const habitualSorted = useMemo(
    () => [...habitual].sort((a, b) => b.lateCount - a.lateCount),
    [habitual],
  );

  return (
    <div>
      <PageHeader
        title="Late Arrival & Early Departure Log"
        breadcrumbs={[{ label: "Attendance" }, { label: "Late & Early Log" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="h-10 w-40 rounded-md">
                <SelectValue placeholder="All classes" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>
                    {c.className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-10 gap-1.5 rounded-md" onClick={openLateDialog}>
              <Clock className="h-3.5 w-3.5" /> Log Late Arrival
            </Button>
            <Button size="sm" className="h-10 gap-1.5 rounded-md" onClick={openEarlyDialog}>
              <LogOut className="h-3.5 w-3.5" /> Log Early Departure
            </Button>
          </div>
        }
      />

      {habitualSorted.length > 0 && (
        <div className="mb-5 rounded-xl border border-warning/30 bg-warning/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[oklch(0.45_0.12_65)]">
            <AlertTriangle className="h-4 w-4" /> Habitual Late Arrivals (last 30 days, 3+ occurrences)
          </div>
          <div className="flex flex-wrap gap-2">
            {habitualSorted.map((h) => (
              <Badge
                key={h.studentKey}
                className="gap-1.5 rounded-md border-0 bg-warning/20 px-2.5 py-1 text-xs font-medium text-[oklch(0.4_0.12_65)]"
              >
                <TimerReset className="h-3 w-3" />
                {h.studentName} — {h.lateCount}× (avg {Math.round(h.avgDelayMinutes)} min)
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="late" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-96">
          <TabsTrigger value="late" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Late Arrivals {lateArrivals.length}
          </TabsTrigger>
          <TabsTrigger value="early" className="gap-1.5">
            <LogOut className="h-3.5 w-3.5" /> Early Departures {earlyDepartures.length}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="late" className="pt-4">
          <DataTable
            data={lateArrivals}
            columns={lateColumns}
            rowKey={(r) => r.attendanceLateArrivalKey}
            searchPlaceholder="Search by name or admission number..."
            searchFields={(r) => `${r.studentName} ${r.admissionNumber}`}
            dateField={(r) => r.attendanceDate}
            dateFilterLabel="Date"
            emptyMessage={loading ? "Loading..." : "No late arrivals logged in the last 60 days."}
            storageKey="late-arrival-log"
          />
        </TabsContent>

        <TabsContent value="early" className="pt-4">
          <DataTable
            data={earlyDepartures}
            columns={earlyColumns}
            rowKey={(r) => r.attendanceEarlyDepartureKey}
            searchPlaceholder="Search by name or admission number..."
            searchFields={(r) => `${r.studentName} ${r.admissionNumber}`}
            dateField={(r) => r.attendanceDate}
            dateFilterLabel="Date"
            emptyMessage={loading ? "Loading..." : "No early departures logged in the last 60 days."}
            storageKey="early-departure-log"
          />
        </TabsContent>
      </Tabs>

      <Dialog open={lateDialogOpen} onOpenChange={setLateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Late Arrival</DialogTitle>
            <DialogDescription>
              Records the event and marks the student's daily attendance as LATE for this date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label required>Student</Label>
              <Popover open={latePickerOpen} onOpenChange={setLatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between rounded-md font-normal"
                  >
                    <span className="truncate">{studentLabel(lateDraft.studentKey)}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search by name or admission no..." />
                    <CommandList>
                      <CommandEmpty>No student found.</CommandEmpty>
                      <CommandGroup>
                        {students.map((s) => (
                          <CommandItem
                            key={s.studentKey}
                            value={`${s.studentName} ${s.admissionNumber}`}
                            onSelect={() => {
                              setLateDraft({ ...lateDraft, studentKey: s.studentKey });
                              setLatePickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "h-4 w-4",
                                lateDraft.studentKey === s.studentKey ? "opacity-100" : "opacity-0",
                              )}
                            />
                            {s.studentName}{" "}
                            <span className="font-mono text-xs text-muted-foreground">
                              ({s.admissionNumber})
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label required>Date</Label>
              <DatePicker
                value={lateDraft.attendanceDate}
                max={todayIso()}
                onChange={(v) => setLateDraft({ ...lateDraft, attendanceDate: v })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label required>Arrival Time</Label>
                <Input
                  type="time"
                  className="rounded-md"
                  value={lateDraft.arrivalTime}
                  onChange={(e) => setLateDraft({ ...lateDraft, arrivalTime: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label required>Expected Time</Label>
                <Input
                  type="time"
                  className="rounded-md"
                  value={lateDraft.expectedTime}
                  onChange={(e) => setLateDraft({ ...lateDraft, expectedTime: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input
                className="rounded-md"
                value={lateDraft.reason}
                onChange={(e) => setLateDraft({ ...lateDraft, reason: e.target.value })}
                placeholder="e.g. Traffic, overslept, family emergency"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-md" onClick={() => setLateDialogOpen(false)} disabled={lateSaving}>
              Cancel
            </Button>
            <Button className="rounded-md" onClick={saveLateArrival} disabled={lateSaving}>
              {lateSaving ? "Logging..." : "Log Late Arrival"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={earlyDialogOpen} onOpenChange={setEarlyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Early Departure</DialogTitle>
            <DialogDescription>
              You are recorded as the authorizer for this departure — required for every off-campus
              departure during school hours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label required>Student</Label>
              <Popover open={earlyPickerOpen} onOpenChange={setEarlyPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between rounded-md font-normal"
                  >
                    <span className="truncate">{studentLabel(earlyDraft.studentKey)}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search by name or admission no..." />
                    <CommandList>
                      <CommandEmpty>No student found.</CommandEmpty>
                      <CommandGroup>
                        {students.map((s) => (
                          <CommandItem
                            key={s.studentKey}
                            value={`${s.studentName} ${s.admissionNumber}`}
                            onSelect={() => {
                              setEarlyDraft({ ...earlyDraft, studentKey: s.studentKey });
                              setEarlyPickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "h-4 w-4",
                                earlyDraft.studentKey === s.studentKey ? "opacity-100" : "opacity-0",
                              )}
                            />
                            {s.studentName}{" "}
                            <span className="font-mono text-xs text-muted-foreground">
                              ({s.admissionNumber})
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label required>Date</Label>
                <DatePicker
                  value={earlyDraft.attendanceDate}
                  max={todayIso()}
                  onChange={(v) => setEarlyDraft({ ...earlyDraft, attendanceDate: v })}
                />
              </div>
              <div className="space-y-1.5">
                <Label required>Departure Time</Label>
                <Input
                  type="time"
                  className="rounded-md"
                  value={earlyDraft.departureTime}
                  onChange={(e) => setEarlyDraft({ ...earlyDraft, departureTime: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label required>Reason</Label>
              <Input
                className="rounded-md"
                value={earlyDraft.reason}
                onChange={(e) => setEarlyDraft({ ...earlyDraft, reason: e.target.value })}
                placeholder="e.g. Doctor's appointment"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Guardian Name</Label>
                <Input
                  className="rounded-md"
                  value={earlyDraft.guardianName}
                  onChange={(e) => setEarlyDraft({ ...earlyDraft, guardianName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Guardian Mobile</Label>
                <Input
                  className="rounded-md"
                  value={earlyDraft.guardianMobile}
                  onChange={(e) => setEarlyDraft({ ...earlyDraft, guardianMobile: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-md" onClick={() => setEarlyDialogOpen(false)} disabled={earlySaving}>
              Cancel
            </Button>
            <Button className="rounded-md" onClick={saveEarlyDeparture} disabled={earlySaving}>
              {earlySaving ? "Logging..." : "Log Early Departure"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
