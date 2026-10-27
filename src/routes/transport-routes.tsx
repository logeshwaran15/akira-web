import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { MasterCrudPage } from "@/components/erp/MasterCrudPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { routeStore, stopStore, type TransportRoute, type TransportStop } from "@/lib/transport-store";

export const Route = createFileRoute("/transport-routes")({
  head: () => ({
    meta: [
      { title: "Transport Routes — Akira School ERP" },
      { name: "description", content: "Build bus routes with ordered stops and pickup/drop timings." },
    ],
  }),
  component: TransportRoutesPage,
});

function TransportRoutesPage() {
  const [stops, setStops] = useState<TransportStop[]>([]);
  useEffect(() => { stopStore.list().then(setStops); }, []);
  const stopName = (key: string) => stops.find((s) => s.stopKey === key)?.stopName ?? "Unknown stop";

  return (
    <MasterCrudPage<TransportRoute>
      title="Transport Routes"
      singular="Route"
      keyField="routeKey"
      store={routeStore}
      storageKey="transport-routes"
      dialogSize="lg"
      empty={{ routeKey: "", routeName: "", routeCode: "", startPoint: "", endPoint: "", stops: [], isActive: true }}
      searchFields={(r) => `${r.routeName} ${r.routeCode} ${r.startPoint} ${r.endPoint}`}
      deleteHint="Vehicle and student allocations on this route will need to be reassigned."
      validate={(d) => {
        const keys = d.stops.map((s) => s.stopKey);
        if (keys.some((k) => !k)) return "Choose a stop for every row in the stop list";
        if (new Set(keys).size !== keys.length) return "A stop can appear only once on a route";
        return null;
      }}
      fields={[
        { key: "routeName", label: "Route Name", required: true, placeholder: "North City Route" },
        { key: "routeCode", label: "Route Code", required: true, placeholder: "R-01", upper: true },
        { key: "startPoint", label: "Start Point", placeholder: "Depot" },
        { key: "endPoint", label: "End Point", placeholder: "School Campus" },
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
          key: "path", header: "Path",
          accessor: (r) => (r.startPoint || r.endPoint ? `${r.startPoint || "—"} → ${r.endPoint || "—"}` : "—"),
        },
        {
          key: "stops", header: "Stops", sortValue: (r) => r.stops.length,
          accessor: (r) => (
            <span title={[...r.stops].sort((a, b) => a.sequence - b.sequence).map((s) => stopName(s.stopKey)).join(" → ")}>
              {r.stops.length}
            </span>
          ),
        },
      ]}
      extraForm={(draft, setDraft) => {
        const setStopRows = (rows: TransportRoute["stops"]) =>
          setDraft({ ...draft, stops: rows.map((r, i) => ({ ...r, sequence: i + 1 })) });
        const update = (i: number, patch: Partial<TransportRoute["stops"][number]>) =>
          setStopRows(draft.stops.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Stops (in pickup order)</Label>
              <Button
                type="button" variant="outline" size="sm" className="h-8 gap-1 rounded-md"
                onClick={() => setStopRows([...draft.stops, { stopKey: "", sequence: draft.stops.length + 1, pickupTime: "", dropTime: "" }])}
              >
                <Plus className="h-3.5 w-3.5" /> Add Stop
              </Button>
            </div>

            {draft.stops.length === 0 && (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                No stops added yet. Add the stops this route covers, in the order the bus reaches them.
              </p>
            )}

            {draft.stops.map((row, i) => (
              <div key={i} className="grid grid-cols-[2rem_1fr_7rem_7rem_2rem] items-center gap-2">
                <span className="text-center text-sm font-medium text-muted-foreground">{i + 1}</span>
                <Select value={row.stopKey || undefined} onValueChange={(v) => update(i, { stopKey: v })}>
                  <SelectTrigger className="rounded-md"><SelectValue placeholder="Select stop" /></SelectTrigger>
                  <SelectContent>
                    {stops.filter((s) => s.isActive).map((s) => <SelectItem key={s.stopKey} value={s.stopKey}>{s.stopName}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="time" value={row.pickupTime} onChange={(e) => update(i, { pickupTime: e.target.value })} className="rounded-md" aria-label="Pickup time" />
                <Input type="time" value={row.dropTime} onChange={(e) => update(i, { dropTime: e.target.value })} className="rounded-md" aria-label="Drop time" />
                <Button
                  type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive"
                  onClick={() => setStopRows(draft.stops.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {draft.stops.length > 0 && (
              <p className="text-xs text-muted-foreground">Columns: stop, morning pickup time, evening drop time.</p>
            )}
          </div>
        );
      }}
    />
  );
}
