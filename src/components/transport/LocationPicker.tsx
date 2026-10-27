import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type * as LeafletNS from "leaflet";
import "leaflet/dist/leaflet.css";

type Coord = number | string | null;

interface LocationPickerProps {
  latitude: Coord;
  longitude: Coord;
  onChange: (latitude: number, longitude: number) => void;
}

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629];

const toPoint = (lat: Coord, lng: Coord): [number, number] | null => {
  if (lat === null || lat === "" || lng === null || lng === "") return null;
  const a = Number(lat), b = Number(lng);
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180 ? [a, b] : null;
};

/** Click the map or drag the pin to pick a stop's GPS position. */
export function LocationPicker({ latitude, longitude, onChange }: LocationPickerProps) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const markerRef = useRef<LeafletNS.Marker | null>(null);
  const leafletRef = useRef<typeof LeafletNS | null>(null);
  const accuracyRef = useRef<LeafletNS.Circle | null>(null);
  const [locating, setLocating] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const point = toPoint(latitude, longitude);

  const pick = (lat: number, lng: number) =>
    onChangeRef.current(Number(lat.toFixed(6)), Number(lng.toFixed(6)));

  const placeMarker = (p: [number, number]) => {
    const L = leafletRef.current, map = mapRef.current;
    if (!L || !map) return;
    if (markerRef.current) {
      markerRef.current.setLatLng(p);
      return;
    }
    const icon = L.divIcon({
      className: "",
      html: '<div style="width:18px;height:18px;border-radius:9999px;background:hsl(var(--primary));border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    markerRef.current = L.marker(p, { icon, draggable: true })
      .addTo(map)
      .on("dragend", (e) => {
        const ll = (e.target as LeafletNS.Marker).getLatLng();
        pick(ll.lat, ll.lng);
      });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !mapEl.current || mapRef.current) return;
      leafletRef.current = L;
      const start = toPoint(latitude, longitude);
      const map = L.map(mapEl.current).setView(start ?? DEFAULT_CENTER, start ? 16 : 5);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      map.on("click", (e: LeafletNS.LeafletMouseEvent) => pick(e.latlng.lat, e.latlng.lng));
      mapRef.current = map;
      if (start) placeMarker(start);
      // The dialog animates open, so the container size is wrong on first render.
      setTimeout(() => map.invalidateSize(), 250);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the pin in sync when coordinates are typed into the fields.
  useEffect(() => {
    if (!point || !mapRef.current) return;
    const isNew = !markerRef.current;
    placeMarker(point);
    if (isNew || !mapRef.current.getBounds().contains(point)) {
      mapRef.current.setView(point, Math.max(mapRef.current.getZoom(), 16));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point?.[0], point?.[1]]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("This browser does not support location access");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        pick(lat, lng);
        const L = leafletRef.current, map = mapRef.current;
        if (L && map) {
          map.setView([lat, lng], 17);
          accuracyRef.current?.remove();
          accuracyRef.current = L.circle([lat, lng], {
            radius: accuracy, weight: 1, color: "#3b82f6", fillOpacity: 0.12, interactive: false,
          }).addTo(map);
        }
        if (accuracy > 100) {
          toast.warning(`Location is approximate (±${Math.round(accuracy)} m). Drag the pin to the exact spot.`);
        }
      },
      (err) => {
        setLocating(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Location permission is blocked. Allow it from the lock icon in the address bar."
            : err.code === err.TIMEOUT
              ? "Getting your location timed out. Try again."
              : "Could not get your location. Turn on device location services.",
        );
      },
      // Fresh, GPS-grade reading instead of a cached/IP-based guess.
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
    );
  };

  return (
    <div className="space-y-1.5 sm:col-span-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Pick on map</span>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="text-xs font-medium text-primary hover:underline disabled:opacity-60"
        >
          {locating ? "Locating…" : "Use my location"}
        </button>
      </div>
      <div ref={mapEl} className="h-64 w-full overflow-hidden rounded-md border" />
      <p className="text-xs text-muted-foreground">Click the map or drag the pin to set latitude and longitude.</p>
    </div>
  );
}
