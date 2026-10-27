import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
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
  Bus,
  Check,
  CheckCheck,
  ChevronsUpDown,
  MapPin,
  Plus,
  Trash2,
  Users2,
} from "lucide-react";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/transport-attendance")({
  head: () => ({
    meta: [
      { title: "Transport Attendance — Akira School ERP" },
      {
        name: "description",
        content: "Bus boarding and drop-off confirmation for school transport routes.",
      },
    ],
  }),
  component: TransportAttendancePage,
});

type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type Route_ = { routeKey: string; routeName: string; vehicleNumber: string | null; driverName: string | null; driverMobile: string | null; studentCount: number; isActive: boolean };
type Assignment = {
  transportAssignmentKey: string;
  studentKey: string;
  admissionNumber: string;
  studentName: string;
  photoUrl: string | null;
  stopName: string | null;
  status: string;
};
type AttendanceRow = {
  transportAssignmentKey: string;
  studentKey: string;
  admissionNumber: string;
  studentName: string;
  photoUrl: string | null;
  stopName: string | null;
  transportAttendanceKey: string | null;
  boarded: boolean;
  boardedTime: string | null;
  dropped: boolean;
  droppedTime: string | null;
};
type StudentOption = { studentKey: string; studentName: string; admissionNumber: string };
type NotBoardedAlert = {
  studentKey: string;
  admissionNumber: string;
  studentName: string;
  routeName: string;
  stopName: string | null;
  attendanceDate: string;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

function TransportAttendancePage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearKey, setYearKey] = useState("");

  const [routes, setRoutes] = useState<Route_[]>([]);
  const [routeKey, setRouteKey] = useState("");

  const [date, setDate] = useState(todayIso());
  const [tripType, setTripType] = useState<"BOARD" | "DROP">("BOARD");

  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [notBoardedAlerts, setNotBoardedAlerts] = useState<NotBoardedAlert[]>([]);

  // Setup tab
  const [newRouteOpen, setNewRouteOpen] = useState(false);
  const [routeDraft, setRouteDraft] = useState({ routeName: "", vehicleNumber: "", driverName: "", driverMobile: "" });
  const [routeSaving, setRouteSaving] = useState(false);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [addAssignmentOpen, setAddAssignmentOpen] = useState(false);
  const [assignmentDraft, setAssignmentDraft] = useState({ studentKey: "", stopName: "" });
  const [assignmentPickerOpen, setAssignmentPickerOpen] = useState(false);
  const [assignmentSaving, setAssignmentSaving] = useState(false);

  const loadRoutes = () => {
    apiFetch("/api/Transport/routes")
      .then((r: Route_[]) => {
        setRoutes(r);
        if (!routeKey && r.length > 0) setRouteKey(r[0].routeKey);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load routes"));
  };

  useEffect(() => {
    apiFetch("/api/AcademicYear")
      .then((y: AcademicYear[]) => {
        setYears(y);
        const active = y.find((x) => x.status === "Active");
        setYearKey(active?.academicYearKey ?? y[0]?.academicYearKey ?? "");
      })
      .catch(() => {});
    apiFetch("/api/Student?status=ENROLLED")
      .then((s: StudentOption[]) => setStudents(s))
      .catch(() => {});
    loadRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAttendance = () => {
    if (!routeKey || !yearKey) {
      setAttendance([]);
      return;
    }
    setLoading(true);
    apiFetch(`/api/Transport/routes/${routeKey}/attendance?academicYearId=${yearKey}&date=${date}`)
      .then((d: AttendanceRow[]) => setAttendance(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load attendance"))
      .finally(() => setLoading(false));
  };

  useEffect(loadAttendance, [routeKey, yearKey, date]);

  const loadAlerts = () => {
    apiFetch(`/api/Transport/not-boarded-alerts?date=${date}`)
      .then((d: NotBoardedAlert[]) => setNotBoardedAlerts(d))
      .catch(() => {});
  };

  useEffect(loadAlerts, [date, attendance]);

  const loadAssignments = () => {
    if (!routeKey || !yearKey) {
      setAssignments([]);
      return;
    }
    apiFetch(`/api/Transport/routes/${routeKey}/assignments?academicYearId=${yearKey}`)
      .then((a: Assignment[]) => setAssignments(a))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load roster"));
  };

  useEffect(loadAssignments, [routeKey, yearKey]);

  const markStudent = (studentKey: string, confirmed: boolean) => {
    setAttendance((rows) =>
      rows.map((r) =>
        r.studentKey === studentKey
          ? tripType === "BOARD"
            ? { ...r, boarded: confirmed }
            : { ...r, dropped: confirmed }
          : r,
      ),
    );
  };

  const markAllBoarded = () => {
    setAttendance((rows) => rows.map((r) => (tripType === "BOARD" ? { ...r, boarded: true } : { ...r, dropped: true })));
  };

  const submitTrip = async () => {
    setSaving(true);
    try {
      const res: { studentsMarked: number } = await apiFetch("/api/Transport/trip", {
        method: "POST",
        body: JSON.stringify({
          routeKey,
          attendanceDate: date,
          tripType,
          entries: attendance.map((r) => ({
            studentKey: r.studentKey,
            confirmed: tripType === "BOARD" ? r.boarded : r.dropped,
          })),
        }),
      });
      toast.success(`${tripType === "BOARD" ? "Boarding" : "Drop-off"} confirmed for ${res.studentsMarked} student(s)`);
      loadAttendance();
      loadAlerts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit trip attendance");
    } finally {
      setSaving(false);
    }
  };

  const openNewRoute = () => {
    setRouteDraft({ routeName: "", vehicleNumber: "", driverName: "", driverMobile: "" });
    setNewRouteOpen(true);
  };

  const saveRoute = async () => {
    if (!routeDraft.routeName.trim()) {
      toast.error("Enter a route name.");
      return;
    }
    setRouteSaving(true);
    try {
      await apiFetch("/api/Transport/routes", {
        method: "POST",
        body: JSON.stringify({
          routeName: routeDraft.routeName,
          vehicleNumber: routeDraft.vehicleNumber || null,
          driverName: routeDraft.driverName || null,
          driverMobile: routeDraft.driverMobile || null,
        }),
      });
      toast.success("Route created");
      setNewRouteOpen(false);
      loadRoutes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create route");
    } finally {
      setRouteSaving(false);
    }
  };

  const openAddAssignment = () => {
    setAssignmentDraft({ studentKey: "", stopName: "" });
    setAddAssignmentOpen(true);
  };

  const saveAssignment = async () => {
    if (!assignmentDraft.studentKey || !yearKey) {
      toast.error("Select a student.");
      return;
    }
    setAssignmentSaving(true);
    try {
      await apiFetch(`/api/Transport/routes/${routeKey}/assignments`, {
        method: "POST",
        body: JSON.stringify({
          studentKey: assignmentDraft.studentKey,
          academicYearKey: yearKey,
          stopName: assignmentDraft.stopName || null,
        }),
      });
      toast.success("Student assigned to route");
      setAddAssignmentOpen(false);
      loadAssignments();
      loadRoutes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign student");
    } finally {
      setAssignmentSaving(false);
    }
  };

  const removeAssignment = async (transportAssignmentKey: string) => {
    try {
      const token = localStorage.getItem("akira_token");
      const res = await fetch(`${API_BASE_URL}/api/Transport/assignments/${transportAssignmentKey}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error(`Failed with status ${res.status}`);
      toast.success("Student removed from route");
      loadAssignments();
      loadRoutes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove assignment");
    }
  };

  return (
    <div>
      <PageHeader
        title="Transport Attendance"
        breadcrumbs={[{ label: "Attendance" }, { label: "Transport" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={routeKey} onValueChange={setRouteKey}>
              <SelectTrigger className="h-10 w-48 rounded-md">
                <SelectValue placeholder="Route" />
              </SelectTrigger>
              <SelectContent>
                {routes.map((r) => (
                  <SelectItem key={r.routeKey} value={r.routeKey}>
                    {r.routeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {notBoardedAlerts.length > 0 && (
        <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" /> Students not yet boarded — {date}
          </div>
          <div className="flex flex-wrap gap-2">
            {notBoardedAlerts.map((a) => (
              <Badge
                key={a.studentKey}
                className="gap-1.5 rounded-md border-0 bg-destructive/20 px-2.5 py-1 text-xs font-medium text-destructive"
              >
                <Bus className="h-3 w-3" />
                {a.studentName} — {a.routeName}
                {a.stopName ? ` (${a.stopName})` : ""}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-96">
          <TabsTrigger value="attendance" className="gap-1.5">
            <Users2 className="h-3.5 w-3.5" /> Route Attendance
          </TabsTrigger>
          <TabsTrigger value="setup" className="gap-1.5">
            <Bus className="h-3.5 w-3.5" /> Routes & Roster
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <DatePicker value={date} max={todayIso()} onChange={setDate} className="h-10 w-44" />
            <div className="flex rounded-md border border-border p-0.5">
              <button
                onClick={() => setTripType("BOARD")}
                className={cn(
                  "rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
                  tripType === "BOARD" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                Morning Boarding
              </button>
              <button
                onClick={() => setTripType("DROP")}
                className={cn(
                  "rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
                  tripType === "DROP" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                Afternoon Drop-off
              </button>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 rounded-md"
                onClick={markAllBoarded}
                disabled={loading || attendance.length === 0}
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark All {tripType === "BOARD" ? "Boarded" : "Dropped"}
              </Button>
              <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={submitTrip} disabled={saving || loading || attendance.length === 0}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {loading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading route attendance...</div>
            ) : attendance.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No active students assigned to this route.</div>
            ) : (
              attendance.map((r) => {
                const confirmed = tripType === "BOARD" ? r.boarded : r.dropped;
                const time = tripType === "BOARD" ? r.boardedTime : r.droppedTime;
                return (
                  <div
                    key={r.studentKey}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3 last:border-b-0 hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-xs font-semibold text-primary">
                        {r.photoUrl ? (
                          <img src={`${API_BASE_URL}${r.photoUrl}`} alt={r.studentName} className="h-full w-full object-cover" />
                        ) : (
                          r.studentName.split(" ").map((n) => n[0]).slice(0, 2).join("")
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{r.studentName}</div>
                        <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                          {r.admissionNumber}
                          {r.stopName && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="h-3 w-3" /> {r.stopName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {confirmed && time && (
                        <span className="text-xs text-muted-foreground">{time.slice(0, 5)}</span>
                      )}
                      <button
                        onClick={() => markStudent(r.studentKey, !confirmed)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                          confirmed
                            ? "border-success/40 bg-success/15 text-success"
                            : "border-border text-muted-foreground hover:border-success/40 hover:text-success",
                        )}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {confirmed ? (tripType === "BOARD" ? "Boarded" : "Dropped") : "Confirm"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="setup" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{routes.length} route(s) configured for this school.</p>
            <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={openNewRoute}>
              <Plus className="h-3.5 w-3.5" /> New Route
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {routes.map((r) => (
              <button
                key={r.routeKey}
                onClick={() => setRouteKey(r.routeKey)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  routeKey === r.routeKey ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                )}
              >
                <div className="text-sm font-semibold">{r.routeName}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {r.vehicleNumber ? `${r.vehicleNumber} · ` : ""}
                  {r.studentCount} student(s)
                </div>
                {r.driverName && <div className="mt-0.5 text-xs text-muted-foreground">Driver: {r.driverName}</div>}
              </button>
            ))}
          </div>

          {routeKey && (
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border p-3">
                <div className="text-sm font-semibold">Route Roster</div>
                <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-md" onClick={openAddAssignment}>
                  <Plus className="h-3.5 w-3.5" /> Add Student
                </Button>
              </div>
              {assignments.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No students assigned yet.</div>
              ) : (
                assignments.map((a) => (
                  <div key={a.transportAssignmentKey} className="flex items-center justify-between gap-3 border-b border-border p-3 last:border-b-0">
                    <div>
                      <div className="text-sm font-medium">{a.studentName}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {a.admissionNumber}
                        {a.stopName ? ` · ${a.stopName}` : ""}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-destructive"
                      onClick={() => removeAssignment(a.transportAssignmentKey)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={newRouteOpen} onOpenChange={setNewRouteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Transport Route</DialogTitle>
            <DialogDescription>Register a bus route for boarding/drop-off tracking.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label required>Route Name</Label>
              <Input
                className="rounded-md"
                value={routeDraft.routeName}
                onChange={(e) => setRouteDraft({ ...routeDraft, routeName: e.target.value })}
                placeholder="e.g. Route 4 — Anna Nagar"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vehicle Number</Label>
              <Input
                className="rounded-md"
                value={routeDraft.vehicleNumber}
                onChange={(e) => setRouteDraft({ ...routeDraft, vehicleNumber: e.target.value })}
                placeholder="e.g. TN-01-AB-1234"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Driver Name</Label>
                <Input
                  className="rounded-md"
                  value={routeDraft.driverName}
                  onChange={(e) => setRouteDraft({ ...routeDraft, driverName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Driver Mobile</Label>
                <Input
                  className="rounded-md"
                  value={routeDraft.driverMobile}
                  onChange={(e) => setRouteDraft({ ...routeDraft, driverMobile: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-md" onClick={() => setNewRouteOpen(false)} disabled={routeSaving}>
              Cancel
            </Button>
            <Button className="rounded-md" onClick={saveRoute} disabled={routeSaving}>
              {routeSaving ? "Creating..." : "Create Route"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addAssignmentOpen} onOpenChange={setAddAssignmentOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Student to Route</DialogTitle>
            <DialogDescription>Assign a student to this transport route for the current academic year.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label required>Student</Label>
              <Popover open={assignmentPickerOpen} onOpenChange={setAssignmentPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between rounded-md font-normal">
                    <span className="truncate">
                      {assignmentDraft.studentKey
                        ? (() => {
                            const s = students.find((x) => x.studentKey === assignmentDraft.studentKey);
                            return s ? `${s.studentName} (${s.admissionNumber})` : "Select student";
                          })()
                        : "Select student"}
                    </span>
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
                              setAssignmentDraft({ ...assignmentDraft, studentKey: s.studentKey });
                              setAssignmentPickerOpen(false);
                            }}
                          >
                            <Check className={cn("h-4 w-4", assignmentDraft.studentKey === s.studentKey ? "opacity-100" : "opacity-0")} />
                            {s.studentName} <span className="font-mono text-xs text-muted-foreground">({s.admissionNumber})</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>Stop Name</Label>
              <Input
                className="rounded-md"
                value={assignmentDraft.stopName}
                onChange={(e) => setAssignmentDraft({ ...assignmentDraft, stopName: e.target.value })}
                placeholder="e.g. Anna Nagar West"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-md" onClick={() => setAddAssignmentOpen(false)} disabled={assignmentSaving}>
              Cancel
            </Button>
            <Button className="rounded-md" onClick={saveAssignment} disabled={assignmentSaving}>
              {assignmentSaving ? "Assigning..." : "Assign to Route"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
