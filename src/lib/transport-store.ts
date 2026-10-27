// Data layer for the Transport module (Phase 1 masters), backed by
// Akira.API's TransportMasterController at /api/Transport/master/*.
import { apiFetch } from "@/lib/api";

export type TransportZone = {
  zoneKey: string;
  zoneName: string;
  zoneCode: string;
  description: string;
  isActive: boolean;
};

export type TransportStop = {
  stopKey: string;
  stopName: string;
  landmark: string;
  zoneKey: string;
  latitude: number | "" | null;
  longitude: number | "" | null;
  isActive: boolean;
};

export type RouteStop = {
  stopKey: string;
  sequence: number;
  pickupTime: string; // HH:mm
  dropTime: string; // HH:mm
};

export type TransportRoute = {
  routeKey: string;
  routeName: string;
  routeCode: string;
  startPoint: string;
  endPoint: string;
  stops: RouteStop[];
  isActive: boolean;
};

export type TransportVehicle = {
  vehicleKey: string;
  registrationNumber: string;
  vehicleType: string;
  makeModel: string;
  capacity: number;
  fuelType: string;
  rcExpiry: string;
  insuranceExpiry: string;
  fitnessExpiry: string;
  permitExpiry: string;
  isActive: boolean;
};

export type TransportStaff = {
  staffKey: string;
  fullName: string;
  role: "DRIVER" | "CONDUCTOR" | "ATTENDANT";
  mobile: string;
  licenseNumber: string;
  licenseExpiry: string;
  address: string;
  isActive: boolean;
};

export type TransportShift = "MORNING" | "EVENING";

export type TransportRouteAssignment = {
  assignmentKey: string;
  routeKey: string;
  routeName: string;
  routeCode: string;
  shift: TransportShift;
  vehicleKey: string;
  registrationNumber: string;
  capacity: number;
  driverKey: string;
  driverName: string;
  conductorKey: string | null;
  conductorName: string;
  effectiveFrom: string;
  effectiveTo: string;
  isActive: boolean;
};

export type TransportAllocation = {
  transportAssignmentKey: string;
  studentKey: string;
  admissionNumber: string;
  studentName: string;
  academicYearKey: string;
  routeKey: string;
  routeName: string;
  routeCode: string;
  stopKey: string | null;
  stopName: string;
  startDate: string;
  status: string;
};

export type TransportRouteLoad = { routeKey: string; capacity: number | null; used: number };

const BASE = "/api/Transport/master";
const TRACKING = "/api/Transport/tracking";

// The UI keeps unset values as "" while the API expects null for optional
// Guid/date fields, so blank strings are normalised before every write.
function clean<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clean) as unknown as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, v === "" ? null : clean(v)]),
    ) as T;
  }
  return value;
}

// list/create/update/remove surface consumed by MasterCrudPage.
function apiCollection<T extends Record<string, any>>(resource: string, keyField: keyof T & string) {
  return {
    list: (): Promise<T[]> => apiFetch(`${BASE}/${resource}`),
    create: async (row: Partial<T>): Promise<T> => {
      const { [keyField]: _ignored, ...body } = row as Record<string, unknown>;
      const res = await apiFetch(`${BASE}/${resource}`, { method: "POST", body: JSON.stringify(clean(body)) });
      return { ...row, [keyField]: res?.[keyField] } as T;
    },
    update: async (key: string, patch: Partial<T>): Promise<T> => {
      await apiFetch(`${BASE}/${resource}/${key}`, { method: "PUT", body: JSON.stringify(clean(patch)) });
      return patch as T;
    },
    remove: async (key: string): Promise<void> => {
      await apiFetch(`${BASE}/${resource}/${key}`, { method: "DELETE" });
    },
  };
}

export const zoneStore = apiCollection<TransportZone>("zones", "zoneKey");
export const stopStore = apiCollection<TransportStop>("stops", "stopKey");
export const routeStore = apiCollection<TransportRoute>("routes", "routeKey");
export const vehicleStore = apiCollection<TransportVehicle>("vehicles", "vehicleKey");
export const staffStore = apiCollection<TransportStaff>("staff", "staffKey");
export const routeAssignmentStore = apiCollection<TransportRouteAssignment>("route-assignments", "assignmentKey");

export const allocationApi = {
  list: (academicYearKey: string): Promise<TransportAllocation[]> =>
    apiFetch(`${BASE}/allocations?academicYearKey=${academicYearKey}`),
  routeLoad: (academicYearKey: string): Promise<TransportRouteLoad[]> =>
    apiFetch(`${BASE}/route-load?academicYearKey=${academicYearKey}`),
  create: (body: { studentKey: string; academicYearKey: string; routeKey: string; stopKey: string; startDate: string }) =>
    apiFetch(`${BASE}/allocations`, { method: "POST", body: JSON.stringify(clean(body)) }),
  update: (key: string, body: { studentKey: string; academicYearKey: string; routeKey: string; stopKey: string; startDate: string }) =>
    apiFetch(`${BASE}/allocations/${key}`, { method: "PUT", body: JSON.stringify(clean(body)) }),
  remove: (key: string) => apiFetch(`${BASE}/allocations/${key}`, { method: "DELETE" }),
};

// ---- Live tracking ---------------------------------------------------------

export type TransportTrip = {
  tripKey: string;
  routeKey: string;
  routeName: string;
  routeCode: string;
  shift: TransportShift;
  vehicleKey: string;
  registrationNumber: string;
  driverName: string;
  driverMobile: string;
  startedOn: string;
  latitude: number | null;
  longitude: number | null;
  speedKmh: number | null;
  heading: number | null;
  lastPingOn: string | null;
  nextStopSequence: number;
  stopsReached: number;
};

/** Payload of the hub's "vehicleMoved" event (and the result of a ping). */
export type TransportPing = {
  tripKey: string;
  routeKey: string;
  latitude: number;
  longitude: number;
  speedKmh: number | null;
  heading: number | null;
  recordedOn: string;
  nextStopSequence: number;
  nextStopName: string | null;
  distanceToNextStopM: number | null;
};

export const trackingApi = {
  active: (): Promise<TransportTrip[]> => apiFetch(`${TRACKING}/trips/active`),
  mine: (): Promise<TransportTrip[]> => apiFetch(`${TRACKING}/trips/mine`),
  start: (body: { routeKey: string; shift: TransportShift }): Promise<TransportTrip> =>
    apiFetch(`${TRACKING}/trips`, { method: "POST", body: JSON.stringify(body) }),
  ping: (tripKey: string, body: { latitude: number; longitude: number; speedKmh: number | null; heading: number | null }) =>
    apiFetch(`${TRACKING}/trips/${tripKey}/ping`, { method: "POST", body: JSON.stringify(body) }),
  end: (tripKey: string) =>
    apiFetch(`${TRACKING}/trips/${tripKey}/end`, { method: "POST" }),
};

/** Days from today until the given ISO date (negative = already expired). null when no date. */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86_400_000);
}
