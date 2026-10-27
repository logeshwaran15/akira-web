import { createFileRoute } from "@tanstack/react-router";
import { MasterCrudPage } from "@/components/erp/MasterCrudPage";
import { Badge } from "@/components/ui/badge";
import { daysUntil, vehicleStore, type TransportVehicle } from "@/lib/transport-store";

export const Route = createFileRoute("/transport-vehicles")({
  head: () => ({
    meta: [
      { title: "Transport Vehicles — Akira School ERP" },
      { name: "description", content: "Register school buses and track compliance document expiry." },
    ],
  }),
  component: TransportVehiclesPage,
});

const DOCS: { key: keyof TransportVehicle & string; label: string }[] = [
  { key: "rcExpiry", label: "RC" },
  { key: "insuranceExpiry", label: "Insurance" },
  { key: "fitnessExpiry", label: "Fitness" },
  { key: "permitExpiry", label: "Permit" },
];

function ExpiryBadges({ row }: { row: TransportVehicle }) {
  const issues = DOCS.map((d) => ({ label: d.label, days: daysUntil(row[d.key] as string) }))
    .filter((d): d is { label: string; days: number } => d.days !== null && d.days <= 30);

  if (issues.length === 0) {
    return <Badge variant="success">All valid</Badge>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {issues.map((i) => (
        <Badge key={i.label} variant={i.days < 0 ? "destructive" : "warning"}>
          {i.label} {i.days < 0 ? "expired" : `${i.days}d`}
        </Badge>
      ))}
    </div>
  );
}

function TransportVehiclesPage() {
  return (
    <MasterCrudPage<TransportVehicle>
      title="Transport Vehicles"
      singular="Vehicle"
      keyField="vehicleKey"
      store={vehicleStore}
      storageKey="transport-vehicles"
      dialogSize="lg"
      empty={{
        vehicleKey: "", registrationNumber: "", vehicleType: "BUS", makeModel: "", capacity: 40,
        fuelType: "DIESEL", rcExpiry: "", insuranceExpiry: "", fitnessExpiry: "", permitExpiry: "", isActive: true,
      }}
      searchFields={(r) => `${r.registrationNumber} ${r.makeModel} ${r.vehicleType}`}
      deleteHint="Route assignments using this vehicle will need to be reassigned."
      validate={(d) => (Number(d.capacity) < 1 ? "Seating capacity must be at least 1" : null)}
      fields={[
        { key: "registrationNumber", label: "Registration Number", required: true, placeholder: "KA01AB1234", upper: true },
        {
          key: "vehicleType", label: "Vehicle Type", type: "select", required: true,
          options: [
            { value: "BUS", label: "Bus" },
            { value: "MINI_BUS", label: "Mini Bus" },
            { value: "VAN", label: "Van" },
          ],
        },
        { key: "makeModel", label: "Make & Model", placeholder: "Tata Starbus" },
        { key: "capacity", label: "Seating Capacity", type: "number", required: true },
        {
          key: "fuelType", label: "Fuel Type", type: "select",
          options: [
            { value: "DIESEL", label: "Diesel" },
            { value: "PETROL", label: "Petrol" },
            { value: "CNG", label: "CNG" },
            { value: "ELECTRIC", label: "Electric" },
          ],
        },
        { key: "rcExpiry", label: "RC Expiry", type: "date" },
        { key: "insuranceExpiry", label: "Insurance Expiry", type: "date" },
        { key: "fitnessExpiry", label: "Fitness Expiry", type: "date" },
        { key: "permitExpiry", label: "Permit Expiry", type: "date" },
      ]}
      columns={[
        {
          key: "registrationNumber", header: "Vehicle", sortable: true,
          accessor: (r) => (
            <div>
              <div className="font-mono font-medium">{r.registrationNumber}</div>
              <div className="text-xs text-muted-foreground">{r.makeModel || r.vehicleType}</div>
            </div>
          ),
        },
        { key: "capacity", header: "Capacity", sortable: true, sortValue: (r) => Number(r.capacity), accessor: (r) => `${r.capacity} seats` },
        { key: "fuelType", header: "Fuel", accessor: (r) => r.fuelType },
        { key: "docs", header: "Documents", accessor: (r) => <ExpiryBadges row={r} /> },
      ]}
    />
  );
}
