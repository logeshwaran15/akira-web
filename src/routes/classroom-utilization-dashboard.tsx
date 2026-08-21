import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Building2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/classroom-utilization-dashboard")({
  head: () => ({
    meta: [
      { title: "Classroom Utilization Dashboard — Akira School ERP" },
      { name: "description", content: "How full every teaching space is across the week, from real Timetable Builder data." },
    ],
  }),
  component: ClassroomUtilizationDashboardPage,
});

type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type CampusOption = { campusKey: string; campusName: string };
type UtilizationRow = {
  roomKey: string; roomName: string; roomType: string; buildingName: string | null;
  bookedSlots: number; availableSlots: number; utilizationPercentage: number;
};

const ROOM_TYPES = ["CLASSROOM", "SCIENCE_LAB", "COMPUTER_LAB", "LANGUAGE_LAB", "LIBRARY", "AUDITORIUM", "STAFF_ROOM", "SPORTS_GROUND", "MUSIC_ROOM", "ART_ROOM", "CONFERENCE_ROOM"];

function utilizationTone(pct: number) {
  if (pct >= 80) return "bg-destructive/15 text-destructive";
  if (pct >= 50) return "bg-warning/25 text-[oklch(0.45_0.12_65)]";
  if (pct > 0) return "bg-success/15 text-success";
  return "bg-muted text-muted-foreground";
}

function ClassroomUtilizationDashboardPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearKey, setYearKey] = useState("");
  const [campuses, setCampuses] = useState<CampusOption[]>([]);
  const [campusKey, setCampusKey] = useState("");
  const [roomType, setRoomType] = useState("");
  const [rows, setRows] = useState<UtilizationRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([apiFetch("/api/AcademicYear"), apiFetch("/api/Campus")])
      .then(([y, c]) => {
        setYears(y);
        setCampuses(c);
        const active = (y as AcademicYear[]).find((yy) => yy.status === "Active") ?? y[0];
        if (active) setYearKey(active.academicYearKey);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load filters"));
  }, []);

  const load = () => {
    if (!yearKey) return;
    setLoading(true);
    const params = new URLSearchParams({ academicYearId: yearKey });
    if (campusKey) params.set("campusId", campusKey);
    if (roomType) params.set("roomType", roomType);
    apiFetch(`/api/Timetable/classroom-utilization?${params.toString()}`)
      .then((d: UtilizationRow[]) => setRows(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load classroom utilization"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [yearKey, campusKey, roomType]);

  const overallAvg = rows.length > 0 ? Math.round((rows.reduce((sum, r) => sum + r.utilizationPercentage, 0) / rows.length) * 10) / 10 : 0;
  const idleCount = rows.filter((r) => r.utilizationPercentage < 30).length;

  const columns: Column<UtilizationRow>[] = [
    { key: "roomName", header: "Room", sortable: true, accessor: (r) => <span className="font-medium">{r.roomName}</span> },
    { key: "roomType", header: "Type", sortable: true, accessor: (r) => r.roomType.replace(/_/g, " ") },
    { key: "buildingName", header: "Building", sortable: true, accessor: (r) => r.buildingName ?? "—" },
    { key: "bookedSlots", header: "Booked / Available", sortable: true, accessor: (r) => `${r.bookedSlots} / ${r.availableSlots}` },
    {
      key: "utilizationPercentage",
      header: "Utilization",
      sortable: true,
      accessor: (r) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-secondary/50">
            <div
              className={cn("h-full rounded-full", r.utilizationPercentage >= 80 ? "bg-destructive" : r.utilizationPercentage >= 50 ? "bg-warning" : "bg-success")}
              style={{ width: `${Math.min(100, r.utilizationPercentage)}%` }}
            />
          </div>
          <Badge className={cn("rounded-md border-0", utilizationTone(r.utilizationPercentage))}>{r.utilizationPercentage}%</Badge>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Classroom Utilization Dashboard" breadcrumbs={[{ label: "Academics" }, { label: "Classroom Utilization Dashboard" }]} />

      <div className="mb-4 flex items-start gap-2 rounded-md border border-info/30 bg-info/10 px-4 py-2.5 text-sm text-info">
        <Building2 className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Booked slots ÷ total available teaching slots per week, from real Timetable Builder data. Filter by room
          type before judging a Library or Activity Hall against a core classroom's usage pattern — they're not
          meant to run at the same utilization.
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
          <Label>Campus</Label>
          <Select value={campusKey || "all"} onValueChange={(v) => setCampusKey(v === "all" ? "" : v)}>
            <SelectTrigger className="rounded-md"><SelectValue placeholder="All campuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All campuses</SelectItem>
              {campuses.map((c) => <SelectItem key={c.campusKey} value={c.campusKey}>{c.campusName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Room Type</Label>
          <Select value={roomType || "all"} onValueChange={(v) => setRoomType(v === "all" ? "" : v)}>
            <SelectTrigger className="rounded-md"><SelectValue placeholder="All room types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All room types</SelectItem>
              {ROOM_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <Badge className="rounded-md border-0 bg-info/15 text-info">Avg utilization: {overallAvg}%</Badge>
        {idleCount > 0 && <Badge className="rounded-md border-0 bg-muted text-muted-foreground">{idleCount} room(s) under 30%</Badge>}
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.roomKey}
        searchPlaceholder="Search rooms..."
        searchFields={(r) => `${r.roomName} ${r.buildingName ?? ""}`}
        emptyMessage={loading ? "Loading..." : "No rooms found for this filter."}
        storageKey="classroom-utilization-dashboard"
      />
    </div>
  );
}
