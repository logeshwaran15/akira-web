import { createFileRoute } from "@tanstack/react-router";
import { MasterCrudPage } from "@/components/erp/MasterCrudPage";
import { Badge } from "@/components/ui/badge";
import { daysUntil, staffStore, type TransportStaff } from "@/lib/transport-store";

export const Route = createFileRoute("/transport-staff")({
  head: () => ({
    meta: [
      { title: "Transport Staff — Akira School ERP" },
      { name: "description", content: "Manage drivers, conductors and attendants with licence tracking." },
    ],
  }),
  component: TransportStaffPage,
});

const ROLE_LABEL: Record<TransportStaff["role"], string> = {
  DRIVER: "Driver",
  CONDUCTOR: "Conductor",
  ATTENDANT: "Attendant",
};

function TransportStaffPage() {
  return (
    <MasterCrudPage<TransportStaff>
      title="Transport Staff"
      singular="Staff Member"
      keyField="staffKey"
      store={staffStore}
      storageKey="transport-staff"
      empty={{ staffKey: "", fullName: "", role: "DRIVER", mobile: "", licenseNumber: "", licenseExpiry: "", address: "", isActive: true }}
      searchFields={(r) => `${r.fullName} ${r.mobile} ${r.licenseNumber} ${ROLE_LABEL[r.role]}`}
      deleteHint="Route assignments using this person will need to be reassigned."
      validate={(d) => {
        if (d.mobile && !/^\d{10}$/.test(d.mobile)) return "Mobile number must be 10 digits";
        if (d.role === "DRIVER" && !d.licenseNumber) return "Licence number is required for a driver";
        return null;
      }}
      fields={[
        { key: "fullName", label: "Full Name", required: true, placeholder: "Ramesh Kumar" },
        {
          key: "role", label: "Role", type: "select", required: true,
          options: [
            { value: "DRIVER", label: "Driver" },
            { value: "CONDUCTOR", label: "Conductor" },
            { value: "ATTENDANT", label: "Attendant" },
          ],
        },
        { key: "mobile", label: "Mobile", placeholder: "9876543210" },
        { key: "licenseNumber", label: "Licence Number", placeholder: "DL-0420110012345", upper: true },
        { key: "licenseExpiry", label: "Licence Expiry", type: "date" },
        { key: "address", label: "Address", type: "textarea", full: true },
      ]}
      columns={[
        {
          key: "fullName", header: "Name", sortable: true,
          accessor: (r) => (
            <div>
              <div className="font-medium">{r.fullName}</div>
              <div className="text-xs text-muted-foreground">{r.mobile || "No mobile"}</div>
            </div>
          ),
        },
        { key: "role", header: "Role", sortable: true, sortValue: (r) => r.role, accessor: (r) => ROLE_LABEL[r.role] },
        { key: "licenseNumber", header: "Licence", accessor: (r) => <span className="font-mono text-xs">{r.licenseNumber || "—"}</span> },
        {
          key: "licenseExpiry", header: "Licence Expiry",
          accessor: (r) => {
            const d = daysUntil(r.licenseExpiry);
            if (d === null) return "—";
            return (
              <Badge variant={d < 0 ? "destructive" : d <= 30 ? "warning" : "success"}>
                {d < 0 ? "Expired" : d <= 30 ? `Expires in ${d}d` : r.licenseExpiry}
              </Badge>
            );
          },
        },
      ]}
    />
  );
}
