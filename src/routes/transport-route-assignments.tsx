import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MasterCrudPage } from "@/components/erp/MasterCrudPage";
import { Badge } from "@/components/ui/badge";
import {
  routeAssignmentStore, routeStore, staffStore, vehicleStore,
  type TransportRoute, type TransportRouteAssignment, type TransportStaff, type TransportVehicle,
} from "@/lib/transport-store";

export const Route = createFileRoute("/transport-route-assignments")({
  head: () => ({
    meta: [
      { title: "Route Assignment — Akira School ERP" },
      { name: "description", content: "Assign a vehicle, driver and conductor to each route and shift." },
    ],
  }),
  component: TransportRouteAssignmentsPage,
});

const SHIFT_LABEL = { MORNING: "Morning", EVENING: "Evening" } as const;

function TransportRouteAssignmentsPage() {
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [vehicles, setVehicles] = useState<TransportVehicle[]>([]);
  const [staff, setStaff] = useState<TransportStaff[]>([]);

  useEffect(() => {
    routeStore.list().then(setRoutes);
    vehicleStore.list().then(setVehicles);
    staffStore.list().then(setStaff);
  }, []);

  const activeStaff = staff.filter((s) => s.isActive);

  return (
    <MasterCrudPage<TransportRouteAssignment>
      title="Route Assignment"
      singular="Assignment"
      keyField="assignmentKey"
      store={routeAssignmentStore}
      storageKey="transport-route-assignments"
      dialogSize="lg"
      empty={{
        assignmentKey: "", routeKey: "", routeName: "", routeCode: "", shift: "MORNING", vehicleKey: "",
        registrationNumber: "", capacity: 0, driverKey: "", driverName: "", conductorKey: null, conductorName: "",
        effectiveFrom: "", effectiveTo: "", isActive: true,
      }}
      searchFields={(r) => `${r.routeName} ${r.routeCode} ${r.registrationNumber} ${r.driverName} ${r.conductorName}`}
      deleteHint="The route will have no vehicle or driver for this shift until it is assigned again."
      validate={(d) => {
        if (d.effectiveTo && d.effectiveFrom && d.effectiveTo < d.effectiveFrom) {
          return "Effective to cannot be before effective from";
        }
        return null;
      }}
      fields={[
        {
          key: "routeKey", label: "Route", type: "select", required: true,
          options: routes.filter((r) => r.isActive).map((r) => ({ value: r.routeKey, label: `${r.routeName} (${r.routeCode})` })),
        },
        {
          key: "shift", label: "Shift", type: "select", required: true,
          options: [
            { value: "MORNING", label: "Morning (pickup)" },
            { value: "EVENING", label: "Evening (drop)" },
          ],
        },
        {
          key: "vehicleKey", label: "Vehicle", type: "select", required: true,
          options: vehicles.filter((v) => v.isActive).map((v) => ({ value: v.vehicleKey, label: `${v.registrationNumber} · ${v.capacity} seats` })),
        },
        {
          key: "driverKey", label: "Driver", type: "select", required: true,
          options: activeStaff.filter((s) => s.role === "DRIVER").map((s) => ({ value: s.staffKey, label: s.fullName })),
        },
        {
          key: "conductorKey", label: "Conductor / Attendant", type: "select",
          options: activeStaff.filter((s) => s.role !== "DRIVER").map((s) => ({ value: s.staffKey, label: s.fullName })),
        },
        { key: "effectiveFrom", label: "Effective From", type: "date", required: true },
        { key: "effectiveTo", label: "Effective To (blank = open ended)", type: "date" },
      ]}
      columns={[
        {
          key: "routeName", header: "Route", sortable: true,
          accessor: (r) => (
            <div>
              <div className="font-medium">{r.routeName}</div>
              <div className="font-mono text-xs text-muted-foreground">{r.routeCode}</div>
            </div>
          ),
        },
        {
          key: "shift", header: "Shift", sortable: true, sortValue: (r) => r.shift,
          accessor: (r) => <Badge variant={r.shift === "MORNING" ? "info" : "default"}>{SHIFT_LABEL[r.shift]}</Badge>,
        },
        {
          key: "vehicle", header: "Vehicle",
          accessor: (r) => (
            <div>
              <div className="font-mono font-medium">{r.registrationNumber}</div>
              <div className="text-xs text-muted-foreground">{r.capacity} seats</div>
            </div>
          ),
        },
        { key: "driverName", header: "Driver", accessor: (r) => r.driverName },
        { key: "conductorName", header: "Conductor", accessor: (r) => r.conductorName || <span className="text-muted-foreground">—</span> },
        {
          key: "period", header: "Period",
          accessor: (r) => `${r.effectiveFrom} → ${r.effectiveTo || "open"}`,
        },
      ]}
    />
  );
}
