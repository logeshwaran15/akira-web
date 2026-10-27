import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Layers } from "lucide-react";
import { MasterCrudPage } from "@/components/erp/MasterCrudPage";
import { LocationPicker } from "@/components/transport/LocationPicker";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { stopStore, zoneStore, type TransportStop, type TransportZone } from "@/lib/transport-store";

type ZoneTab = "zones" | "stops";

export const Route = createFileRoute("/transport-zones")({
  validateSearch: (search: Record<string, unknown>): { tab?: ZoneTab } =>
    search.tab === "stops" ? { tab: "stops" } : {},
  head: () => ({
    meta: [
      { title: "Zones & Stops — Akira School ERP" },
      { name: "description", content: "Define transport zones and the pickup/drop stops within them." },
    ],
  }),
  component: TransportZonesPage,
});

function TransportZonesPage() {
  const { tab = "zones" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const tabs = (
    <Tabs
      value={tab}
      onValueChange={(v) => navigate({ search: v === "stops" ? { tab: "stops" } : {}, replace: true })}
      className="mb-4"
    >
      <TabsList className="grid w-full grid-cols-2 sm:w-72">
        <TabsTrigger value="zones" className="gap-1.5">
          <Layers className="h-4 w-4" /> Zones
        </TabsTrigger>
        <TabsTrigger value="stops" className="gap-1.5">
          <MapPin className="h-4 w-4" /> Stops
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );

  return tab === "stops" ? <StopsTab tabs={tabs} /> : <ZonesTab tabs={tabs} />;
}

function ZonesTab({ tabs }: { tabs: React.ReactNode }) {
  return (
    <MasterCrudPage<TransportZone>
      title="Transport Zones"
      singular="Zone"
      keyField="zoneKey"
      store={zoneStore}
      storageKey="transport-zones"
      toolbarExtra={tabs}
      empty={{ zoneKey: "", zoneName: "", zoneCode: "", description: "", isActive: true }}
      searchFields={(r) => `${r.zoneName} ${r.zoneCode}`}
      deleteHint="Stops that use this zone will lose their zone assignment."
      fields={[
        { key: "zoneName", label: "Zone Name", required: true, placeholder: "Zone A (0-5 km)" },
        { key: "zoneCode", label: "Zone Code", required: true, placeholder: "ZA", upper: true },
        { key: "description", label: "Description", type: "textarea", full: true },
      ]}
      columns={[
        {
          key: "zoneName", header: "Zone", sortable: true,
          accessor: (r) => (
            <div>
              <div className="font-medium">{r.zoneName}</div>
              <div className="font-mono text-xs text-muted-foreground">{r.zoneCode}</div>
            </div>
          ),
        },
        { key: "description", header: "Description", accessor: (r) => r.description || "—" },
      ]}
    />
  );
}

function StopsTab({ tabs }: { tabs: React.ReactNode }) {
  const [zones, setZones] = useState<TransportZone[]>([]);
  useEffect(() => { zoneStore.list().then(setZones); }, []);
  const zoneName = (key: string) => zones.find((z) => z.zoneKey === key)?.zoneName;

  return (
    <MasterCrudPage<TransportStop>
      title="Transport Stops"
      singular="Stop"
      keyField="stopKey"
      store={stopStore}
      storageKey="transport-stops"
      toolbarExtra={tabs}
      dialogSize="lg"
      extraForm={(draft, setDraft) => (
        <LocationPicker
          latitude={draft.latitude}
          longitude={draft.longitude}
          onChange={(latitude, longitude) => setDraft({ ...draft, latitude, longitude })}
        />
      )}
      empty={{ stopKey: "", stopName: "", landmark: "", zoneKey: "", latitude: "", longitude: "", isActive: true }}
      searchFields={(r) => `${r.stopName} ${r.landmark} ${zoneName(r.zoneKey) ?? ""}`}
      fields={[
        { key: "stopName", label: "Stop Name", required: true, placeholder: "Main Market Gate" },
        {
          key: "zoneKey", label: "Zone", type: "select", required: true,
          options: zones.filter((z) => z.isActive).map((z) => ({ value: z.zoneKey, label: z.zoneName })),
        },
        { key: "landmark", label: "Landmark", full: true, placeholder: "Opposite city bus stand" },
        { key: "latitude", label: "Latitude", type: "number", placeholder: "12.971599" },
        { key: "longitude", label: "Longitude", type: "number", placeholder: "77.594566" },
      ]}
      validate={(d) => {
        const hasLat = d.latitude !== "" && d.latitude !== null;
        const hasLng = d.longitude !== "" && d.longitude !== null;
        if (hasLat !== hasLng) return "Enter both latitude and longitude, or leave both blank";
        if (hasLat && (Number(d.latitude) < -90 || Number(d.latitude) > 90)) return "Latitude must be between -90 and 90";
        if (hasLng && (Number(d.longitude) < -180 || Number(d.longitude) > 180)) return "Longitude must be between -180 and 180";
        return null;
      }}
      columns={[
        { key: "stopName", header: "Stop", sortable: true, accessor: (r) => <span className="font-medium">{r.stopName}</span> },
        { key: "zoneKey", header: "Zone", accessor: (r) => zoneName(r.zoneKey) ?? <span className="text-muted-foreground">Unassigned</span> },
        { key: "landmark", header: "Landmark", accessor: (r) => r.landmark || "—" },
        {
          key: "location", header: "GPS",
          accessor: (r) =>
            r.latitude !== null && r.latitude !== "" && r.longitude !== null && r.longitude !== ""
              ? <span className="font-mono text-xs">{Number(r.latitude).toFixed(5)}, {Number(r.longitude).toFixed(5)}</span>
              : <span className="text-muted-foreground">Not set</span>,
        },
      ]}
    />
  );
}
