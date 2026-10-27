import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { InfoAlert } from "@/components/erp/InfoAlert";
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
  Building2,
  Check,
  CheckCheck,
  ChevronsUpDown,
  Moon,
  Plus,
  Send,
  Sun,
  Trash2,
  Users2,
} from "lucide-react";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/hostel-attendance")({
  head: () => ({
    meta: [
      { title: "Hostel Attendance — Akira School ERP" },
      {
        name: "description",
        content: "Twice-daily boarder roll call with missing-person alerting.",
      },
    ],
  }),
  component: HostelAttendancePage,
});

type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type Hostel = { hostelKey: string; hostelName: string; hostelType: string; totalCapacity: number | null; boarderCount: number; isActive: boolean };
type Boarder = {
  hostelBoarderKey: string;
  studentKey: string;
  admissionNumber: string;
  studentName: string;
  photoUrl: string | null;
  roomNumber: string | null;
  status: string;
};
type RollCallRow = {
  hostelBoarderKey: string;
  studentKey: string;
  admissionNumber: string;
  studentName: string;
  photoUrl: string | null;
  roomNumber: string | null;
  hostelAttendanceKey: string | null;
  attendanceStatus: string | null;
};
type StudentOption = { studentKey: string; studentName: string; admissionNumber: string };
type MissingAlert = {
  studentKey: string;
  admissionNumber: string;
  studentName: string;
  hostelName: string;
  roomNumber: string | null;
  attendanceDate: string;
  session: string;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

function HostelAttendancePage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearKey, setYearKey] = useState("");

  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [hostelKey, setHostelKey] = useState("");

  const [date, setDate] = useState(todayIso());
  const [session, setSession] = useState<"MORNING" | "NIGHT">("MORNING");

  const [rollCall, setRollCall] = useState<RollCallRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [missingAlerts, setMissingAlerts] = useState<MissingAlert[]>([]);

  // Setup tab state
  const [newHostelOpen, setNewHostelOpen] = useState(false);
  const [hostelDraft, setHostelDraft] = useState({ hostelName: "", hostelType: "MIXED", totalCapacity: "" });
  const [hostelSaving, setHostelSaving] = useState(false);

  const [boarders, setBoarders] = useState<Boarder[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [addBoarderOpen, setAddBoarderOpen] = useState(false);
  const [boarderDraft, setBoarderDraft] = useState({ studentKey: "", roomNumber: "" });
  const [boarderPickerOpen, setBoarderPickerOpen] = useState(false);
  const [boarderSaving, setBoarderSaving] = useState(false);

  const loadHostels = () => {
    apiFetch("/api/Hostel")
      .then((h: Hostel[]) => {
        setHostels(h);
        if (!hostelKey && h.length > 0) setHostelKey(h[0].hostelKey);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load hostels"));
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
    loadHostels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRollCall = () => {
    if (!hostelKey || !yearKey) {
      setRollCall([]);
      return;
    }
    setLoading(true);
    apiFetch(
      `/api/Hostel/${hostelKey}/roll-call?academicYearId=${yearKey}&date=${date}&session=${session}`,
    )
      .then((d: RollCallRow[]) => setRollCall(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load roll call"))
      .finally(() => setLoading(false));
  };

  useEffect(loadRollCall, [hostelKey, yearKey, date, session]);

  const loadMissingAlerts = () => {
    apiFetch(`/api/Hostel/missing-alerts?date=${date}`)
      .then((d: MissingAlert[]) => setMissingAlerts(d))
      .catch(() => {});
  };

  useEffect(loadMissingAlerts, [date, rollCall]);

  const loadBoarders = () => {
    if (!hostelKey || !yearKey) {
      setBoarders([]);
      return;
    }
    apiFetch(`/api/Hostel/${hostelKey}/boarders?academicYearId=${yearKey}`)
      .then((b: Boarder[]) => setBoarders(b))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load boarders"));
  };

  useEffect(loadBoarders, [hostelKey, yearKey]);

  const updateRow = (studentKey: string, status: string) => {
    setRollCall((rows) =>
      rows.map((r) => (r.studentKey === studentKey ? { ...r, attendanceStatus: status } : r)),
    );
  };

  const markAllPresent = () => {
    setRollCall((rows) => rows.map((r) => ({ ...r, attendanceStatus: "PRESENT" })));
  };

  const submitRollCall = async () => {
    if (rollCall.some((r) => !r.attendanceStatus)) {
      toast.error("Every boarder must have a status before you can submit.");
      return;
    }
    setSaving(true);
    try {
      const res: { studentsMarked: number } = await apiFetch("/api/Hostel/roll-call", {
        method: "POST",
        body: JSON.stringify({
          hostelKey,
          attendanceDate: date,
          session,
          entries: rollCall.map((r) => ({ studentKey: r.studentKey, attendanceStatus: r.attendanceStatus })),
        }),
      });
      toast.success(`Roll call submitted for ${res.studentsMarked} boarder(s)`);
      loadRollCall();
      loadMissingAlerts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit roll call");
    } finally {
      setSaving(false);
    }
  };

  const openNewHostel = () => {
    setHostelDraft({ hostelName: "", hostelType: "MIXED", totalCapacity: "" });
    setNewHostelOpen(true);
  };

  const saveHostel = async () => {
    if (!hostelDraft.hostelName.trim()) {
      toast.error("Enter a hostel name.");
      return;
    }
    setHostelSaving(true);
    try {
      await apiFetch("/api/Hostel", {
        method: "POST",
        body: JSON.stringify({
          hostelName: hostelDraft.hostelName,
          hostelType: hostelDraft.hostelType,
          totalCapacity: hostelDraft.totalCapacity ? Number(hostelDraft.totalCapacity) : null,
        }),
      });
      toast.success("Hostel created");
      setNewHostelOpen(false);
      loadHostels();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create hostel");
    } finally {
      setHostelSaving(false);
    }
  };

  const openAddBoarder = () => {
    setBoarderDraft({ studentKey: "", roomNumber: "" });
    setAddBoarderOpen(true);
  };

  const saveBoarder = async () => {
    if (!boarderDraft.studentKey || !yearKey) {
      toast.error("Select a student.");
      return;
    }
    setBoarderSaving(true);
    try {
      await apiFetch(`/api/Hostel/${hostelKey}/boarders`, {
        method: "POST",
        body: JSON.stringify({
          studentKey: boarderDraft.studentKey,
          academicYearKey: yearKey,
          roomNumber: boarderDraft.roomNumber || null,
        }),
      });
      toast.success("Boarder assigned");
      setAddBoarderOpen(false);
      loadBoarders();
      loadHostels();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign boarder");
    } finally {
      setBoarderSaving(false);
    }
  };

  const removeBoarder = async (hostelBoarderKey: string) => {
    try {
      const token = localStorage.getItem("akira_token");
      const res = await fetch(`${API_BASE_URL}/api/Hostel/boarders/${hostelBoarderKey}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error(`Failed with status ${res.status}`);
      toast.success("Boarder removed");
      loadBoarders();
      loadHostels();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove boarder");
    }
  };

  const allMarked = rollCall.length > 0 && rollCall.every((r) => !!r.attendanceStatus);

  return (
    <div>
      <PageHeader
        title="Hostel Attendance"
        breadcrumbs={[{ label: "Attendance" }, { label: "Hostel" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={hostelKey} onValueChange={setHostelKey}>
              <SelectTrigger className="h-10 w-44 rounded-md">
                <SelectValue placeholder="Hostel" />
              </SelectTrigger>
              <SelectContent>
                {hostels.map((h) => (
                  <SelectItem key={h.hostelKey} value={h.hostelKey}>
                    {h.hostelName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {missingAlerts.length > 0 && (
        <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" /> Boarders unaccounted for — {date}
          </div>
          <div className="flex flex-wrap gap-2">
            {missingAlerts.map((a, idx) => (
              <Badge
                key={`${a.studentKey}-${a.session}-${idx}`}
                className="gap-1.5 rounded-md border-0 bg-destructive/20 px-2.5 py-1 text-xs font-medium text-destructive"
              >
                {a.session === "MORNING" ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
                {a.studentName} — {a.hostelName}
                {a.roomNumber ? ` (Room ${a.roomNumber})` : ""} · {a.session === "MORNING" ? "Morning" : "Night"}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="rollcall" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-96">
          <TabsTrigger value="rollcall" className="gap-1.5">
            <Users2 className="h-3.5 w-3.5" /> Roll Call
          </TabsTrigger>
          <TabsTrigger value="setup" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Hostels & Boarders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rollcall" className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <DatePicker
              value={date}
              max={todayIso()}
              onChange={setDate}
              className="h-10 w-44"
            />
            <div className="flex rounded-md border border-border p-0.5">
              <button
                onClick={() => setSession("MORNING")}
                className={cn(
                  "flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
                  session === "MORNING" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                <Sun className="h-3.5 w-3.5" /> Morning
              </button>
              <button
                onClick={() => setSession("NIGHT")}
                className={cn(
                  "flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
                  session === "NIGHT" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                <Moon className="h-3.5 w-3.5" /> Night
              </button>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 rounded-md"
                onClick={markAllPresent}
                disabled={loading || rollCall.length === 0}
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark All Present
              </Button>
              <Button
                size="sm"
                className="h-9 gap-1.5 rounded-md"
                onClick={submitRollCall}
                disabled={saving || loading || !allMarked}
                title={!allMarked ? "Every boarder needs a status before you can submit" : undefined}
              >
                <Send className="h-3.5 w-3.5" /> {saving ? "Submitting..." : "Submit Roll Call"}
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {loading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading roll call...</div>
            ) : rollCall.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No active boarders in this hostel for the selected year.
              </div>
            ) : (
              rollCall.map((r) => {
                const isPresent = r.attendanceStatus === "PRESENT";
                const isAbsent = r.attendanceStatus === "ABSENT";
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
                        <div className="font-mono text-xs text-muted-foreground">
                          {r.admissionNumber}
                          {r.roomNumber ? ` · Room ${r.roomNumber}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateRow(r.studentKey, "PRESENT")}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                          isPresent
                            ? "border-success/40 bg-success/15 text-success"
                            : "border-border text-muted-foreground hover:border-success/40 hover:text-success",
                        )}
                      >
                        <Check className="h-3.5 w-3.5" /> Present
                      </button>
                      <button
                        onClick={() => updateRow(r.studentKey, "ABSENT")}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                          isAbsent
                            ? "border-destructive/40 bg-destructive/15 text-destructive"
                            : "border-border text-muted-foreground hover:border-destructive/40 hover:text-destructive",
                        )}
                      >
                        Absent
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
            <p className="text-sm text-muted-foreground">
              {hostels.length} hostel(s) configured for this school.
            </p>
            <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={openNewHostel}>
              <Plus className="h-3.5 w-3.5" /> New Hostel
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {hostels.map((h) => (
              <button
                key={h.hostelKey}
                onClick={() => setHostelKey(h.hostelKey)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  hostelKey === h.hostelKey ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                )}
              >
                <div className="text-sm font-semibold">{h.hostelName}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {h.hostelType.replace(/_/g, " ")} · {h.boarderCount} boarder(s)
                  {h.totalCapacity ? ` / ${h.totalCapacity} capacity` : ""}
                </div>
              </button>
            ))}
          </div>

          {hostelKey && (
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border p-3">
                <div className="text-sm font-semibold">Boarder Roster</div>
                <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-md" onClick={openAddBoarder}>
                  <Plus className="h-3.5 w-3.5" /> Add Boarder
                </Button>
              </div>
              {boarders.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No boarders assigned yet.</div>
              ) : (
                boarders.map((b) => (
                  <div key={b.hostelBoarderKey} className="flex items-center justify-between gap-3 border-b border-border p-3 last:border-b-0">
                    <div>
                      <div className="text-sm font-medium">{b.studentName}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {b.admissionNumber}
                        {b.roomNumber ? ` · Room ${b.roomNumber}` : ""}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-destructive"
                      onClick={() => removeBoarder(b.hostelBoarderKey)}
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

      <Dialog open={newHostelOpen} onOpenChange={setNewHostelOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Hostel</DialogTitle>
            <DialogDescription>Register a boarding block for roll-call tracking.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label required>Hostel Name</Label>
              <Input
                className="rounded-md"
                value={hostelDraft.hostelName}
                onChange={(e) => setHostelDraft({ ...hostelDraft, hostelName: e.target.value })}
                placeholder="e.g. Boys Hostel Block A"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={hostelDraft.hostelType} onValueChange={(v) => setHostelDraft({ ...hostelDraft, hostelType: v })}>
                <SelectTrigger className="rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BOYS">Boys</SelectItem>
                  <SelectItem value="GIRLS">Girls</SelectItem>
                  <SelectItem value="MIXED">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Total Capacity</Label>
              <Input
                type="number"
                min={0}
                className="rounded-md"
                value={hostelDraft.totalCapacity}
                onChange={(e) => setHostelDraft({ ...hostelDraft, totalCapacity: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-md" onClick={() => setNewHostelOpen(false)} disabled={hostelSaving}>
              Cancel
            </Button>
            <Button className="rounded-md" onClick={saveHostel} disabled={hostelSaving}>
              {hostelSaving ? "Creating..." : "Create Hostel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addBoarderOpen} onOpenChange={setAddBoarderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Boarder</DialogTitle>
            <DialogDescription>Assign a student to this hostel for the current academic year.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label required>Student</Label>
              <Popover open={boarderPickerOpen} onOpenChange={setBoarderPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between rounded-md font-normal">
                    <span className="truncate">
                      {boarderDraft.studentKey
                        ? (() => {
                            const s = students.find((x) => x.studentKey === boarderDraft.studentKey);
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
                              setBoarderDraft({ ...boarderDraft, studentKey: s.studentKey });
                              setBoarderPickerOpen(false);
                            }}
                          >
                            <Check className={cn("h-4 w-4", boarderDraft.studentKey === s.studentKey ? "opacity-100" : "opacity-0")} />
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
              <Label>Room Number</Label>
              <Input
                className="rounded-md"
                value={boarderDraft.roomNumber}
                onChange={(e) => setBoarderDraft({ ...boarderDraft, roomNumber: e.target.value })}
                placeholder="e.g. B-204"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-md" onClick={() => setAddBoarderOpen(false)} disabled={boarderSaving}>
              Cancel
            </Button>
            <Button className="rounded-md" onClick={saveBoarder} disabled={boarderSaving}>
              {boarderSaving ? "Assigning..." : "Assign Boarder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
