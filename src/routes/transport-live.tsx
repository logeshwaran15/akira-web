import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as signalR from "@microsoft/signalr";
import type * as LeafletNS from "leaflet";
import "leaflet/dist/leaflet.css";
import { Bus, Gauge, MapPinOff, Navigation, UserRound } from "lucide-react";
import { PageHeader } from "@/components/erp/PageHeader";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  routeStore, stopStore, trackingApi,
  type TransportPing, type TransportRoute, type TransportStop, type TransportTrip,
} from "@/lib/transport-store";

export const Route = createFileRoute("/transport-live")({
  head: () => ({
    meta: [
      { title: "Live Tracking — Akira School ERP" },
      { name: "description", content: "Watch school buses move on the map in real time." },
    ],
  }),
  component: TransportLivePage,
});

type Leaflet = typeof LeafletNS;

const DELAYED_AFTER_S = 60;
const OFFLINE_AFTER_S = 180;
const MIN_ETA_SPEED_KMH = 15;

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const formatDistance = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

function ageSeconds(iso: string | null, now: number) {
  if (!iso) return null;
  return Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
}

function signalState(age: number | null): "live" | "delayed" | "offline" | "waiting" {
  if (age === null) return "waiting";
  if (age > OFFLINE_AFTER_S) return "offline";
  if (age > DELAYED_AFTER_S) return "delayed";
  return "live";
}

const STATE_COLOR = { live: "#16a34a", delayed: "#f59e0b", offline: "#dc2626", waiting: "#6b7280" } as const;
const STATE_LABEL = { live: "Live", delayed: "Delayed", offline: "No signal", waiting: "Waiting for GPS" } as const;
const STATE_VARIANT = { live: "success", delayed: "warning", offline: "destructive", waiting: "secondary" } as const;

function TransportLivePage() {
  const [trips, setTrips] = useState<TransportTrip[]>([]);
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [stops, setStops] = useState<TransportStop[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [connected, setConnected] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const leafletRef = useRef<Leaflet | null>(null);
  const markersRef = useRef(new Map<string, LeafletNS.Marker>());
  const routeLayerRef = useRef<LeafletNS.LayerGroup | null>(null);
  const fittedRef = useRef(false);
  const tripsRef = useRef<TransportTrip[]>([]);
  tripsRef.current = trips;

  // ---- data -------------------------------------------------------------
  const loadTrips = () =>
    trackingApi.active().then(setTrips).catch((err) =>
      toast.error(err instanceof Error ? err.message : "Failed to load running trips"));

  useEffect(() => {
    routeStore.list().then(setRoutes).catch(() => undefined);
    stopStore.list().then(setStops).catch(() => undefined);
    loadTrips();
    // Polling is the safety net behind SignalR: it also refreshes the
    // "delayed / offline" state when no event arrives at all.
    const poll = setInterval(loadTrips, 20_000);
    const tick = setInterval(() => setNow(Date.now()), 5_000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, []);

  // ---- SignalR ----------------------------------------------------------
  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/transport`, {
        accessTokenFactory: () => localStorage.getItem("akira_token") ?? "",
      })
      .withAutomaticReconnect()
      .build();

    connection.on("vehicleMoved", (p: TransportPing) => {
      setTrips((prev) => prev.map((t) => t.tripKey === p.tripKey
        ? {
            ...t, latitude: p.latitude, longitude: p.longitude, speedKmh: p.speedKmh, heading: p.heading,
            lastPingOn: p.recordedOn, nextStopSequence: p.nextStopSequence,
          }
        : t));
    });
    connection.on("tripStarted", (t: TransportTrip) => {
      setTrips((prev) => (prev.some((x) => x.tripKey === t.tripKey) ? prev : [...prev, t]));
      toast.info(`${t.routeName} (${t.shift === "MORNING" ? "morning" : "evening"}) trip started`);
    });
    connection.on("tripEnded", (e: { tripKey: string }) => {
      const ended = tripsRef.current.find((t) => t.tripKey === e.tripKey);
      setTrips((prev) => prev.filter((t) => t.tripKey !== e.tripKey));
      if (ended) toast.info(`${ended.routeName} trip ended`);
    });
    connection.on("stopReached", (e: { tripKey: string; stopName: string }) => {
      const trip = tripsRef.current.find((t) => t.tripKey === e.tripKey);
      toast.success(`${trip?.routeName ?? "Bus"} reached ${e.stopName}`);
    });

    connection.onreconnected(() => { setConnected(true); loadTrips(); });
    connection.onreconnecting(() => setConnected(false));
    connection.onclose(() => setConnected(false));

    connection.start().then(() => setConnected(true)).catch(() => setConnected(false));
    return () => { connection.stop(); };
  }, []);

  // ---- map --------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !mapEl.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(mapEl.current, { zoomControl: true }).setView([20.5937, 78.9629], 5);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      routeLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setMapReady(true);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
      setMapReady(false);
    };
  }, []);

  const busIcon = (L: Leaflet, color: string, label: string) =>
    L.divIcon({
      className: "",
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      html: `<div style="display:flex;flex-direction:column;align-items:center">
        <div style="width:34px;height:34px;border-radius:9999px;background:${color};border:3px solid #fff;
                    box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:17px">🚌</div>
        <div style="margin-top:2px;padding:0 6px;border-radius:9999px;background:#fff;font:600 10px sans-serif;
                    box-shadow:0 1px 3px rgba(0,0,0,.3);white-space:nowrap">${label}</div>
      </div>`,
    });

  // Keep one marker per running trip in sync with state.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map) return;

    const seen = new Set<string>();
    for (const t of trips) {
      if (t.latitude === null || t.longitude === null) continue;
      seen.add(t.tripKey);
      const color = STATE_COLOR[signalState(ageSeconds(t.lastPingOn, now))];
      const icon = busIcon(L, color, t.routeCode || t.routeName);
      const existing = markersRef.current.get(t.tripKey);
      if (existing) {
        existing.setLatLng([t.latitude, t.longitude]);
        existing.setIcon(icon);
      } else {
        const marker = L.marker([t.latitude, t.longitude], { icon }).addTo(map);
        marker.on("click", () => setSelected(t.tripKey));
        markersRef.current.set(t.tripKey, marker);
      }
    }
    for (const [key, marker] of markersRef.current) {
      if (!seen.has(key)) { marker.remove(); markersRef.current.delete(key); }
    }

    if (!fittedRef.current && seen.size > 0) {
      const points = trips
        .filter((t) => t.latitude !== null && t.longitude !== null)
        .map((t) => [t.latitude!, t.longitude!] as [number, number]);
      map.fitBounds(L.latLngBounds(points).pad(0.3), { maxZoom: 15 });
      fittedRef.current = true;
    }
  }, [trips, now, mapReady]);

  // Route line + stops of the selected trip.
  const selectedTrip = trips.find((t) => t.tripKey === selected) ?? null;
  const selectedStops = useMemo(() => {
    if (!selectedTrip) return [];
    const route = routes.find((r) => r.routeKey === selectedTrip.routeKey);
    if (!route) return [];
    return [...route.stops]
      .sort((a, b) => a.sequence - b.sequence)
      .map((rs) => {
        const stop = stops.find((s) => s.stopKey === rs.stopKey);
        return {
          sequence: rs.sequence,
          name: stop?.stopName ?? "Unknown stop",
          lat: stop?.latitude === null || stop?.latitude === "" || stop?.latitude === undefined ? null : Number(stop.latitude),
          lng: stop?.longitude === null || stop?.longitude === "" || stop?.longitude === undefined ? null : Number(stop.longitude),
          pickupTime: rs.pickupTime,
        };
      });
  }, [selectedTrip?.tripKey, routes, stops]);

  useEffect(() => {
    const L = leafletRef.current;
    const layer = routeLayerRef.current;
    if (!mapReady || !L || !layer) return;
    layer.clearLayers();
    if (!selectedTrip) return;

    const located = selectedStops.filter((s) => s.lat !== null && s.lng !== null) as
      (typeof selectedStops[number] & { lat: number; lng: number })[];
    if (located.length > 1) {
      L.polyline(located.map((s) => [s.lat, s.lng] as [number, number]), { color: "#2563eb", weight: 4, opacity: 0.6, dashArray: "6 8" }).addTo(layer);
    }
    for (const s of located) {
      const reached = s.sequence < selectedTrip.nextStopSequence;
      L.circleMarker([s.lat, s.lng], {
        radius: 8, color: "#fff", weight: 2, fillOpacity: 1, fillColor: reached ? "#16a34a" : "#6b7280",
      }).bindTooltip(`${s.sequence}. ${s.name}${s.pickupTime ? ` · ${s.pickupTime}` : ""}`, { direction: "top" }).addTo(layer);
    }
  }, [selectedTrip?.tripKey, selectedTrip?.nextStopSequence, selectedStops, mapReady]);

  const focus = (t: TransportTrip) => {
    setSelected(t.tripKey);
    if (t.latitude !== null && t.longitude !== null) {
      mapRef.current?.flyTo([t.latitude, t.longitude], Math.max(mapRef.current.getZoom(), 15), { duration: 0.8 });
    }
  };

  // ---- per-trip derived info -------------------------------------------
  const describe = (t: TransportTrip) => {
    const route = routes.find((r) => r.routeKey === t.routeKey);
    const ordered = route ? [...route.stops].sort((a, b) => a.sequence - b.sequence) : [];
    const next = ordered.find((s) => s.sequence === t.nextStopSequence);
    const nextStop = next ? stops.find((s) => s.stopKey === next.stopKey) : undefined;
    const nLat = nextStop?.latitude === null || nextStop?.latitude === "" || nextStop?.latitude === undefined ? null : Number(nextStop.latitude);
    const nLng = nextStop?.longitude === null || nextStop?.longitude === "" || nextStop?.longitude === undefined ? null : Number(nextStop.longitude);

    let distance: number | null = null;
    let etaMin: number | null = null;
    if (t.latitude !== null && t.longitude !== null && nLat !== null && nLng !== null) {
      distance = haversineM(t.latitude, t.longitude, nLat, nLng);
      const speed = Math.max(t.speedKmh ?? 0, MIN_ETA_SPEED_KMH);
      etaMin = Math.max(1, Math.round((distance / 1000 / speed) * 60));
    }
    return {
      totalStops: ordered.length,
      nextName: nextStop?.stopName ?? null,
      finished: ordered.length > 0 && t.nextStopSequence > ordered.length,
      distance, etaMin,
    };
  };

  const noGpsStops = stops.filter((s) => s.isActive && (s.latitude === null || s.latitude === "")).length;

  return (
    <div>
      <PageHeader
        title="Live Tracking"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={connected ? "success" : "warning"}>{connected ? "Real-time connected" : "Reconnecting…"}</Badge>
            <Badge variant="info">{trips.length} running</Badge>
          </div>
        }
      />

      {noGpsStops > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          <MapPinOff className="h-4 w-4 shrink-0" />
          {noGpsStops} active stop{noGpsStops > 1 ? "s have" : " has"} no GPS coordinates. Buses still show on the map, but arrival
          detection and ETA skip those stops. Add them on the Stops screen.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <div className="space-y-3 lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto">
          {trips.length === 0 && (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              <Bus className="mx-auto mb-2 h-8 w-8 opacity-50" />
              No buses are running right now.
              <div className="mt-1 text-xs">A trip appears here as soon as a driver starts it.</div>
            </div>
          )}

          {trips.map((t) => {
            const age = ageSeconds(t.lastPingOn, now);
            const state = signalState(age);
            const info = describe(t);
            return (
              <button
                key={t.tripKey}
                type="button"
                onClick={() => focus(t)}
                className={cn(
                  "w-full rounded-md border bg-card p-3 text-left shadow-sm transition hover:border-primary",
                  selected === t.tripKey && "border-primary ring-1 ring-primary",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{t.routeName}</div>
                    <div className="font-mono text-xs text-muted-foreground">{t.routeCode} · {t.shift === "MORNING" ? "Morning" : "Evening"}</div>
                  </div>
                  <Badge variant={STATE_VARIANT[state]}>{STATE_LABEL[state]}</Badge>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Bus className="h-3 w-3" />{t.registrationNumber}</span>
                  <span className="flex items-center gap-1"><UserRound className="h-3 w-3" />{t.driverName}</span>
                  <span className="flex items-center gap-1">
                    <Gauge className="h-3 w-3" />{t.speedKmh !== null ? `${Math.round(t.speedKmh)} km/h` : "—"}
                  </span>
                  <span>{age === null ? "No GPS yet" : age < 5 ? "just now" : `${age}s ago`}</span>
                </div>

                <div className="mt-2 flex items-center gap-1.5 border-t pt-2 text-xs">
                  <Navigation className="h-3 w-3 shrink-0" />
                  {info.finished ? (
                    <span className="font-medium text-success">All stops reached</span>
                  ) : info.nextName ? (
                    <span>
                      Next: <span className="font-medium">{info.nextName}</span>
                      {info.distance !== null && ` · ${formatDistance(info.distance)} · ~${info.etaMin} min`}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No stop information</span>
                  )}
                </div>
                {info.totalStops > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground">{t.stopsReached}/{info.totalStops} stops reached</div>
                )}
              </button>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-md border shadow-sm">
          <div ref={mapEl} className="h-[28rem] w-full lg:h-[calc(100vh-14rem)]" />
        </div>
      </div>
    </div>
  );
}
