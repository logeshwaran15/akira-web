import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, IconTile } from "@/components/erp/PageHeader";
import { InfoAlert } from "@/components/erp/InfoAlert";
import { StatCard } from "@/components/erp/StatCard";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  LogIn,
  LogOut,
  Clock,
  Users2,
  ShieldAlert,
  Pencil,
  IndianRupee,
  CalendarCheck2,
  CalendarX2,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useFormatDate } from "@/hooks/use-tenant-setting";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff-attendance")({
  head: () => ({
    meta: [
      { title: "Staff Attendance — Akira School ERP" },
      {
        name: "description",
        content:
          "Self check-in/check-out for staff and teachers, feeding directly into HRMS payroll for Loss-of-Pay calculation.",
      },
    ],
  }),
  component: StaffAttendancePage,
});

const ADMIN_ROLE_CODES = ["ADMIN", "HR", "PRINCIPAL", "VICEPRINCIPAL"];

const STATUS_OPTIONS = [
  "present",
  "absent",
  "late",
  "half_day",
  "on_leave",
  "on_duty",
  "work_from_home",
] as const;
type StaffStatus = (typeof STATUS_OPTIONS)[number];

const STATUS_LABELS: Record<StaffStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  half_day: "Half Day",
  on_leave: "On Leave",
  on_duty: "On Duty",
  work_from_home: "Work From Home",
};

const STATUS_STYLES: Record<StaffStatus, string> = {
  present: "bg-success/15 text-success",
  absent: "bg-destructive/15 text-destructive",
  late: "bg-warning/25 text-[oklch(0.45_0.12_65)]",
  half_day: "bg-info/15 text-info",
  on_leave: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]",
  on_duty: "bg-primary/15 text-primary",
  work_from_home: "bg-[oklch(0.55_0.1_200)]/15 text-[oklch(0.4_0.12_200)]",
};

type MyAttendance = {
  staffAttendanceKey: string | null;
  attendanceDate: string;
  status: StaffStatus | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  source: string | null;
};

type MyHistoryRow = {
  attendanceDate: string;
  status: StaffStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
};

type StaffRosterRow = {
  akiraUserKey: string;
  userName: string;
  employeeId: string;
  designation: string;
  departmentName: string | null;
  profileImagePath: string | null;
  staffAttendanceKey: string | null;
  status: StaffStatus | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  source: string | null;
  isLopCandidate: boolean;
};

const todayIso = () => new Date().toISOString().slice(0, 10);
const monthStartIso = () => `${todayIso().slice(0, 7)}-01`;
const timeNow = () =>
  new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

function StaffAttendancePage() {
  const { user } = useCurrentUser();
  const formatDate = useFormatDate();
  const isAdmin = !!user?.roleCode && ADMIN_ROLE_CODES.includes(user.roleCode);

  return (
    <div>
      <PageHeader title="Staff Attendance" />

      <Tabs defaultValue="me" className="w-full">
        <TabsList className={cn("grid w-full", isAdmin ? "grid-cols-2 sm:w-96" : "grid-cols-1 sm:w-52")}>
          <TabsTrigger value="me" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" /> My Attendance
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="roster" className="gap-1.5">
              <Users2 className="h-3.5 w-3.5" /> Staff Register
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="me" className="pt-5">
          <MyAttendanceTab />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="roster" className="pt-5">
            <StaffRegisterTab formatDate={formatDate} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* My Attendance — self check-in / check-out                              */
/* ---------------------------------------------------------------------- */

function MyAttendanceTab() {
  const [today, setToday] = useState<MyAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [clock, setClock] = useState(timeNow());

  const [history, setHistory] = useState<MyHistoryRow[]>([]);
  const [monthLoading, setMonthLoading] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setClock(timeNow()), 30_000);
    return () => clearInterval(id);
  }, []);

  const loadToday = () => {
    setLoading(true);
    apiFetch(`/api/StaffAttendance/me?date=${todayIso()}`)
      .then((d: MyAttendance) => setToday(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load today's attendance"))
      .finally(() => setLoading(false));
  };

  const loadHistory = () => {
    setMonthLoading(true);
    apiFetch(`/api/StaffAttendance/me/history?from=${monthStartIso()}&to=${todayIso()}`)
      .then((d: MyHistoryRow[]) => setHistory(d))
      .catch(() => {})
      .finally(() => setMonthLoading(false));
  };

  useEffect(() => {
    loadToday();
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkIn = async () => {
    setActing(true);
    try {
      await apiFetch("/api/StaffAttendance/check-in", { method: "POST" });
      toast.success("Checked in successfully");
      loadToday();
      loadHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to check in");
    } finally {
      setActing(false);
    }
  };

  const checkOut = async () => {
    setActing(true);
    try {
      await apiFetch("/api/StaffAttendance/check-out", { method: "POST" });
      toast.success("Checked out successfully");
      loadToday();
      loadHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to check out");
    } finally {
      setActing(false);
    }
  };

  const monthSummary = useMemo(() => {
    const present = history.filter((h) =>
      ["present", "late", "half_day", "on_duty", "work_from_home"].includes(h.status),
    ).length;
    const absentUnapproved = history.filter((h) => h.status === "absent").length;
    const onLeave = history.filter((h) => h.status === "on_leave").length;
    return { present, absentUnapproved, onLeave, total: history.length };
  }, [history]);

  const checkedIn = !!today?.checkInTime;
  const checkedOut = !!today?.checkOutTime;

  return (
    <div className="space-y-5">
      {/* Hero check-in panel */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border p-5 shadow-sm sm:p-7",
          checkedOut
            ? "border-success/25 bg-gradient-to-br from-success/10 via-card to-card"
            : checkedIn
              ? "border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card"
              : "border-border bg-gradient-to-br from-muted/60 via-card to-card",
        )}
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/5 blur-2xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <IconTile
              icon={checkedOut ? CheckCircle2 : checkedIn ? Clock : CalendarClock}
              tone={checkedOut ? "success" : checkedIn ? "primary" : "warning"}
              className="h-14 w-14 sm:h-16 sm:w-16"
            />
            <div className="min-w-0">
              <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
              </div>
              <div className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {clock}
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                {loading ? (
                  <span className="text-xs text-muted-foreground">Checking today's status…</span>
                ) : today?.status ? (
                  <Badge className={cn("rounded-md border-0 px-2.5 py-1 text-xs font-medium", STATUS_STYLES[today.status])}>
                    {STATUS_LABELS[today.status]}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    Not checked in yet
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:gap-4">
            <div className="rounded-xl border border-border bg-background/60 px-4 py-2.5 text-center sm:min-w-[92px]">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">In</div>
              <div className="mt-0.5 font-mono text-base font-semibold sm:text-lg">
                {today?.checkInTime ? today.checkInTime.slice(0, 5) : "--:--"}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-background/60 px-4 py-2.5 text-center sm:min-w-[92px]">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Out</div>
              <div className="mt-0.5 font-mono text-base font-semibold sm:text-lg">
                {today?.checkOutTime ? today.checkOutTime.slice(0, 5) : "--:--"}
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-6 flex flex-col gap-2 sm:flex-row sm:gap-2.5">
          <Button
            size="default"
            className="h-10 flex-1 gap-1.5 rounded-lg text-sm font-semibold shadow-sm sm:h-11 sm:rounded-xl"
            onClick={checkIn}
            disabled={acting || loading || checkedIn}
          >
            <LogIn className="h-4 w-4" /> Check In
          </Button>
          <Button
            size="default"
            variant="outline"
            className="h-10 flex-1 gap-1.5 rounded-lg border-border text-sm font-semibold sm:h-11 sm:rounded-xl"
            onClick={checkOut}
            disabled={acting || loading || !checkedIn || checkedOut}
          >
            <LogOut className="h-4 w-4" /> Check Out
          </Button>
        </div>
      </div>

      <InfoAlert tone="info" title="Attendance feeds payroll">
        Your daily check-in/check-out is recorded here and feeds directly into Loss-of-Pay (LOP) calculation for
        payroll. You cannot mark or approve your own attendance for salary purposes — an unapproved absence is
        automatically flagged for HR review.
      </InfoAlert>

      {/* Month summary */}
      <div>
        <div className="mb-3 text-sm font-semibold text-foreground">This Month</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Present Days" value={monthLoading ? "—" : String(monthSummary.present)} icon={CalendarCheck2} tone="success" />
          <StatCard label="On Leave" value={monthLoading ? "—" : String(monthSummary.onLeave)} icon={CalendarClock} tone="purple" />
          <StatCard
            label="Unapproved Absence"
            value={monthLoading ? "—" : String(monthSummary.absentUnapproved)}
            icon={CalendarX2}
            tone="destructive"
          />
        </div>
        {monthSummary.absentUnapproved > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-xs text-destructive">
            <IndianRupee className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {monthSummary.absentUnapproved} day(s) may be flagged for Loss-of-Pay this payroll cycle.
          </div>
        )}
      </div>

      {/* History */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-4 text-sm font-semibold">Attendance History — This Month</div>
        {monthLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No attendance recorded yet this month.</div>
        ) : (
          <div className="divide-y divide-border">
            {history.map((h) => (
              <div
                key={h.attendanceDate}
                className="flex flex-wrap items-center justify-between gap-2 p-3.5 text-sm transition-colors hover:bg-muted/30 sm:px-4"
              >
                <span className="font-mono text-xs text-muted-foreground">{h.attendanceDate}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {h.checkInTime ? h.checkInTime.slice(0, 5) : "--:--"} — {h.checkOutTime ? h.checkOutTime.slice(0, 5) : "--:--"}
                </span>
                <Badge className={cn("rounded-md border-0 px-2 py-0.5 text-xs font-medium", STATUS_STYLES[h.status])}>
                  {STATUS_LABELS[h.status]}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Staff Register — Admin / HR consolidated view + exceptional override   */
/* ---------------------------------------------------------------------- */

function StaffRegisterTab({ formatDate }: { formatDate: (d: string) => string }) {
  const [date, setDate] = useState(todayIso());
  const [rows, setRows] = useState<StaffRosterRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [overrideFor, setOverrideFor] = useState<StaffRosterRow | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<StaffStatus>("present");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideSaving, setOverrideSaving] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch(`/api/StaffAttendance/daily-summary?date=${date}`)
      .then((d: StaffRosterRow[]) => setRows(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load staff register"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [date]);

  const summary = useMemo(() => {
    const present = rows.filter((r) => r.status && r.status !== "absent" && r.status !== "on_leave").length;
    const onLeave = rows.filter((r) => r.status === "on_leave").length;
    const lop = rows.filter((r) => r.isLopCandidate).length;
    const unmarked = rows.filter((r) => !r.status).length;
    return { present, onLeave, lop, unmarked, total: rows.length };
  }, [rows]);

  const openOverride = (row: StaffRosterRow) => {
    setOverrideFor(row);
    setOverrideStatus(row.status ?? "present");
    setOverrideReason("");
  };

  const saveOverride = async () => {
    if (!overrideFor) return;
    if (!overrideReason.trim()) {
      toast.error("A reason is required for an admin attendance override — this directly affects payroll.");
      return;
    }
    setOverrideSaving(true);
    try {
      await apiFetch("/api/StaffAttendance/override", {
        method: "POST",
        body: JSON.stringify({
          userKey: overrideFor.akiraUserKey,
          attendanceDate: date,
          status: overrideStatus,
          reason: overrideReason,
        }),
      });
      toast.success("Attendance updated");
      setOverrideFor(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update attendance");
    } finally {
      setOverrideSaving(false);
    }
  };

  const columns: Column<StaffRosterRow>[] = [
    {
      key: "userName",
      header: "Staff Member",
      sortable: true,
      sortValue: (r) => r.userName,
      accessor: (r) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-xs font-semibold text-primary">
            {r.profileImagePath ? (
              <img src={`${API_BASE_URL}${r.profileImagePath}`} alt={r.userName} className="h-full w-full object-cover" />
            ) : (
              r.userName.split(" ").map((n) => n[0]).slice(0, 2).join("")
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{r.userName}</div>
            <div className="font-mono text-xs text-muted-foreground">{r.employeeId}</div>
          </div>
        </div>
      ),
    },
    {
      key: "departmentName",
      header: "Department",
      sortable: true,
      sortValue: (r) => r.departmentName ?? "",
      accessor: (r) => <span className="text-sm text-muted-foreground">{r.departmentName ?? "—"}</span>,
    },
    {
      key: "checkInTime",
      header: "In / Out",
      accessor: (r) => (
        <span className="font-mono text-xs text-muted-foreground">
          {r.checkInTime ? r.checkInTime.slice(0, 5) : "--:--"} — {r.checkOutTime ? r.checkOutTime.slice(0, 5) : "--:--"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (r) => r.status ?? "",
      accessor: (r) =>
        r.status ? (
          <Badge className={cn("rounded-md border-0 px-2.5 py-1 text-xs font-medium", STATUS_STYLES[r.status])}>
            {STATUS_LABELS[r.status]}
          </Badge>
        ) : (
          <Badge variant="outline" className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Not marked
          </Badge>
        ),
    },
    {
      key: "lop",
      header: "LOP",
      accessor: (r) =>
        r.isLopCandidate ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
            <IndianRupee className="h-3 w-3" /> LOP
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      accessor: (r) => (
        <Button
          variant="purple"
          size="icon"
          className="h-8 w-8 rounded-md"
          title="Admin override (exceptional cases only, e.g. device failure)"
          onClick={() => openOverride(r)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Present Today" value={loading ? "—" : String(summary.present)} icon={CalendarCheck2} tone="success" />
        <StatCard label="On Leave" value={loading ? "—" : String(summary.onLeave)} icon={CalendarClock} tone="purple" />
        <StatCard label="LOP Candidates" value={loading ? "—" : String(summary.lop)} icon={IndianRupee} tone="destructive" />
        <StatCard label="Not Marked" value={loading ? "—" : String(summary.unmarked)} icon={Users2} tone="warning" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DatePicker value={date} max={todayIso()} onChange={setDate} className="h-10 w-full sm:w-44" />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading staff register...
        </div>
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          rowKey={(r) => r.akiraUserKey}
          searchable
          searchPlaceholder="Search staff by name, employee ID, department..."
          searchFields={(r) => `${r.userName} ${r.employeeId} ${r.departmentName ?? ""}`}
          storageKey="staff-attendance-register"
          emptyMessage="No staff found for the selected date."
        />
      )}

      <Dialog open={!!overrideFor} onOpenChange={(o) => !o && setOverrideFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-warning" /> Admin Override
            </DialogTitle>
            <DialogDescription>
              {overrideFor?.userName} — {date}. Staff cannot self-mark for salary purposes; this override is logged
              and directly affects payroll.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label required>Status</Label>
              <Select value={overrideStatus} onValueChange={(v) => setOverrideStatus(v as StaffStatus)}>
                <SelectTrigger className="rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label required>Reason</Label>
              <Textarea
                className="rounded-md"
                rows={3}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Biometric device offline, confirmed present by front office"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-md" onClick={() => setOverrideFor(null)} disabled={overrideSaving}>
              Cancel
            </Button>
            <Button className="rounded-md" onClick={saveOverride} disabled={overrideSaving}>
              {overrideSaving ? "Saving..." : "Save Override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
