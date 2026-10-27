import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Pencil, Trash2, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/erp/PageHeader";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  allocationApi, routeStore, stopStore,
  type TransportAllocation, type TransportRoute, type TransportRouteLoad, type TransportStop,
} from "@/lib/transport-store";

export const Route = createFileRoute("/transport-allocations")({
  head: () => ({
    meta: [
      { title: "Student Transport — Akira School ERP" },
      { name: "description", content: "Allocate students to a transport route and stop." },
    ],
  }),
  component: TransportAllocationsPage,
});

type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type StudentOption = { studentKey: string; studentName: string; admissionNumber: string };
type Draft = { studentKey: string; routeKey: string; stopKey: string; startDate: string };

const today = () => new Date().toISOString().slice(0, 10);
const emptyDraft = (): Draft => ({ studentKey: "", routeKey: "", stopKey: "", startDate: today() });

function TransportAllocationsPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearKey, setYearKey] = useState("");
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [stops, setStops] = useState<TransportStop[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [rows, setRows] = useState<TransportAllocation[]>([]);
  const [load, setLoad] = useState<TransportRouteLoad[]>([]);
  const [routeFilter, setRouteFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TransportAllocation | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TransportAllocation | null>(null);

  const fail = (fallback: string) => (err: unknown) =>
    toast.error(err instanceof Error ? err.message : fallback);

  useEffect(() => {
    routeStore.list().then(setRoutes).catch(fail("Failed to load routes"));
    stopStore.list().then(setStops).catch(fail("Failed to load stops"));
    apiFetch("/api/Student?status=ENROLLED").then(setStudents).catch(fail("Failed to load students"));
    apiFetch("/api/AcademicYear")
      .then((ys: AcademicYear[]) => {
        setYears(ys);
        const active = ys.find((y) => y.status?.toLowerCase() === "active") ?? ys[0];
        if (active) setYearKey(active.academicYearKey);
      })
      .catch(fail("Failed to load academic years"));
  }, []);

  const reload = () => {
    if (!yearKey) return;
    setLoading(true);
    Promise.all([allocationApi.list(yearKey), allocationApi.routeLoad(yearKey)])
      .then(([a, l]) => { setRows(a); setLoad(l); })
      .catch(fail("Failed to load allocations"))
      .finally(() => setLoading(false));
  };

  useEffect(reload, [yearKey]);

  const loadFor = (routeKey: string) => load.find((l) => l.routeKey === routeKey);
  const isFull = (routeKey: string) => {
    const l = loadFor(routeKey);
    return !!l && l.capacity !== null && l.used >= l.capacity;
  };

  const allocatedStudents = useMemo(() => new Set(rows.map((r) => r.studentKey)), [rows]);
  const availableStudents = students.filter((s) => !allocatedStudents.has(s.studentKey));

  const routeStops = useMemo(() => {
    const route = routes.find((r) => r.routeKey === draft.routeKey);
    if (!route) return [];
    return [...route.stops]
      .sort((a, b) => a.sequence - b.sequence)
      .map((rs) => ({ ...rs, name: stops.find((s) => s.stopKey === rs.stopKey)?.stopName ?? "Unknown stop" }));
  }, [routes, stops, draft.routeKey]);

  const openNew = () => { setEditing(null); setDraft(emptyDraft()); setOpen(true); };
  const openEdit = (r: TransportAllocation) => {
    setEditing(r);
    setDraft({ studentKey: r.studentKey, routeKey: r.routeKey, stopKey: r.stopKey ?? "", startDate: r.startDate || today() });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.studentKey) return toast.error("Select a student");
    if (!draft.routeKey) return toast.error("Select a route");
    if (!draft.stopKey) return toast.error("Select a stop");

    setSaving(true);
    try {
      const body = { ...draft, academicYearKey: yearKey };
      if (editing) {
        await allocationApi.update(editing.transportAssignmentKey, body);
        toast.success("Allocation updated");
      } else {
        await allocationApi.create(body);
        toast.success("Student allocated to route");
      }
      setOpen(false);
      reload();
    } catch (err) {
      fail("Failed to save allocation")(err);
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    try {
      await allocationApi.remove(removeTarget.transportAssignmentKey);
      toast.success("Transport removed for student");
      setRemoveTarget(null);
      reload();
    } catch (err) {
      fail("Failed to remove allocation")(err);
    }
  };

  const visible = routeFilter === "all" ? rows : rows.filter((r) => r.routeKey === routeFilter);

  const columns: Column<TransportAllocation>[] = [
    {
      key: "studentName", header: "Student", sortable: true,
      accessor: (r) => (
        <div>
          <div className="font-medium">{r.studentName}</div>
          <div className="font-mono text-xs text-muted-foreground">{r.admissionNumber}</div>
        </div>
      ),
    },
    {
      key: "routeName", header: "Route", sortable: true,
      accessor: (r) => (
        <div>
          <div>{r.routeName}</div>
          <div className="font-mono text-xs text-muted-foreground">{r.routeCode}</div>
        </div>
      ),
    },
    { key: "stopName", header: "Stop", accessor: (r) => r.stopName || "—" },
    { key: "startDate", header: "From", sortable: true, accessor: (r) => r.startDate || "—" },
    {
      key: "actions", header: "Actions",
      accessor: (r) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-purple-600 hover:text-purple-700" onClick={() => openEdit(r)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive" onClick={() => setRemoveTarget(r)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const selectedStudent = students.find((s) => s.studentKey === draft.studentKey);
  const yearLabel = years.find((y) => y.academicYearKey === yearKey)?.yearName;

  return (
    <div>
      <PageHeader
        title="Student Transport"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={yearKey} onValueChange={setYearKey}>
              <SelectTrigger className="h-10 w-40 rounded-md"><SelectValue placeholder="Academic year" /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y.academicYearKey} value={y.academicYearKey}>{y.yearName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={routeFilter} onValueChange={setRouteFilter}>
              <SelectTrigger className="h-10 w-52 rounded-md"><SelectValue placeholder="All routes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All routes</SelectItem>
                {routes.map((r) => <SelectItem key={r.routeKey} value={r.routeKey}>{r.routeName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew} disabled={!yearKey}>
              <UserPlus className="h-4 w-4" /> Allocate Student
            </Button>
          </div>
        }
      />

      {load.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {routes.filter((r) => loadFor(r.routeKey)).map((r) => {
            const l = loadFor(r.routeKey)!;
            const variant = l.capacity === null ? "secondary" : l.used >= l.capacity ? "destructive" : l.used / l.capacity >= 0.85 ? "warning" : "success";
            return (
              <Badge key={r.routeKey} variant={variant}>
                {r.routeName}: {l.used}/{l.capacity ?? "—"} seats
              </Badge>
            );
          })}
        </div>
      )}

      <DataTable
        data={visible}
        columns={columns}
        rowKey={(r) => r.transportAssignmentKey}
        selectable
        storageKey="transport-allocations"
        searchPlaceholder="Search students or routes..."
        searchFields={(r) => `${r.studentName} ${r.admissionNumber} ${r.routeName} ${r.stopName}`}
        emptyMessage={loading ? "Loading allocations..." : `No students have transport${yearLabel ? ` for ${yearLabel}` : ""} yet.`}
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Change Transport Allocation" : "Allocate Student"}
        submitLabel={editing ? "Save Changes" : "Allocate"}
        onSubmit={save}
        submitting={saving}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Student</Label>
            {editing ? (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                {editing.studentName} <span className="font-mono text-xs text-muted-foreground">({editing.admissionNumber})</span>
              </div>
            ) : (
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" role="combobox" className="w-full justify-between rounded-md font-normal">
                    {selectedStudent ? `${selectedStudent.studentName} (${selectedStudent.admissionNumber})` : "Search student..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search by name or admission no..." />
                    <CommandList>
                      <CommandEmpty>No students without transport found.</CommandEmpty>
                      <CommandGroup>
                        {availableStudents.map((s) => (
                          <CommandItem
                            key={s.studentKey}
                            value={`${s.studentName} ${s.admissionNumber}`}
                            onSelect={() => { setDraft({ ...draft, studentKey: s.studentKey }); setPickerOpen(false); }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", draft.studentKey === s.studentKey ? "opacity-100" : "opacity-0")} />
                            {s.studentName}
                            <span className="ml-2 font-mono text-xs text-muted-foreground">{s.admissionNumber}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          <div className="space-y-1.5">
            <Label required>Route</Label>
            <Select value={draft.routeKey || undefined} onValueChange={(v) => setDraft({ ...draft, routeKey: v, stopKey: "" })}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Select route" /></SelectTrigger>
              <SelectContent>
                {routes.filter((r) => r.isActive).map((r) => {
                  const l = loadFor(r.routeKey);
                  const full = isFull(r.routeKey) && r.routeKey !== editing?.routeKey;
                  return (
                    <SelectItem key={r.routeKey} value={r.routeKey} disabled={full}>
                      {r.routeName} ({r.routeCode}){l ? ` · ${l.used}/${l.capacity ?? "—"} seats` : ""}{full ? " · full" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label required>Stop</Label>
            <Select value={draft.stopKey || undefined} onValueChange={(v) => setDraft({ ...draft, stopKey: v })} disabled={!draft.routeKey}>
              <SelectTrigger className="rounded-md">
                <SelectValue placeholder={draft.routeKey ? "Select stop" : "Select a route first"} />
              </SelectTrigger>
              <SelectContent>
                {routeStops.map((s) => (
                  <SelectItem key={s.stopKey} value={s.stopKey}>
                    {s.sequence}. {s.name}{s.pickupTime ? ` · ${s.pickupTime}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {draft.routeKey && routeStops.length === 0 && (
              <p className="text-xs text-destructive">This route has no stops yet. Add stops on the Routes screen.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Start Date</Label>
            <DatePicker value={draft.startDate} onChange={(v) => setDraft({ ...draft, startDate: v })} className="h-10 w-full" />
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!removeTarget} onOpenChange={(v) => !v && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove transport for {removeTarget?.studentName}?</AlertDialogTitle>
            <AlertDialogDescription>
              The student will no longer appear on {removeTarget?.routeName}. Their past attendance is kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); confirmRemove(); }}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
