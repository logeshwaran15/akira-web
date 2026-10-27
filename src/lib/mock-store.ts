// Frontend-first mock data layer for modules whose backend API isn't built yet
// (currently: the Exam module). Each screen keeps calling a small async
// function shaped exactly like a future apiFetch("/api/...") call, so
// swapping in the real endpoint later is a one-line change per call site --
// just replace the body of the relevant function in this file.
//
// Data persists to localStorage so a page refresh doesn't lose work, but it
// is NOT shared across browsers/devices and is not a substitute for a real
// backend. Remove this file once the Exam API endpoints exist.

function read<T>(key: string, seed: T): T {
  if (typeof window === "undefined") return seed;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      window.localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as T;
  } catch {
    return seed;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

// Simulates real network latency so loading states are visible/testable.
export function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function genKey(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// --- Exam module sidebar menu (mock overlay) --------------------------------
// The real sidebar (src/hooks/use-menu.ts) fetches /api/Menu/my, which is a
// permission-filtered list of AkiraMenu/TenantMenu rows from the backend.
// "Examinations" and "Exam Type Master" now exist as real DB rows (see
// Akira.API/StoredProcedures/TenantMenu_Seed_Examinations.sql) with real
// menu codes TENANT_EXAMINATIONS / TENANT_EXAM_TYPE_MASTER, so they're no
// longer mocked here. The remaining screens below still don't have backend
// rows yet -- each one gets removed from this list and added to that .sql
// seed file (with its own TENANT_* code) as its backend gets built.
export type MockMenuRow = {
  akiraMenuKey: string;
  menuName: string;
  menuCode: string;
  icon: string | null;
  iconColor: string | null;
  url: string | null;
  parentMenuKey: string | null;
  sortOrder: number;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canPrint: boolean;
};

const fullAccess = { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true, canPrint: true };

// Parented under the real TENANT_EXAMINATIONS row by menu CODE (not key --
// the real parent's key is a DB-generated GUID we don't know client-side).
// use-menu.ts resolves this placeholder to the real parent's key after merge.
export const EXAM_MODULE_PARENT_CODE = "TENANT_EXAMINATIONS";

// All 6 core Exam module screens now have real TenantMenu rows (see the
// TenantMenu_Seed_*.sql scripts in Akira.API/StoredProcedures). Nothing is
// mocked here anymore -- this list (and withExamModuleMenu below) stays as
// scaffolding for the next screens as their backends get built.
export const EXAM_MODULE_MENU: MockMenuRow[] = [];

// Merges the mock exam menu into a real /api/Menu/my response. Idempotent —
// skips re-adding if a real backend row with the same menuCode ever appears.
// Also rewrites each mock item's placeholder parentMenuKey to the real
// TENANT_EXAMINATIONS row's actual key, so it nests correctly under it.
export function withExamModuleMenu<T extends { menuCode: string; parentMenuKey?: string | null; akiraMenuKey?: string; tenantMenuKey?: string }>(
  realMenu: T[],
): (T | MockMenuRow)[] {
  const realCodes = new Set(realMenu.map((m) => m.menuCode));
  const realParent = realMenu.find((m) => m.menuCode === EXAM_MODULE_PARENT_CODE);
  const realParentKey = realParent ? (realParent.akiraMenuKey ?? realParent.tenantMenuKey) : undefined;

  const missing = EXAM_MODULE_MENU
    .filter((m) => !realCodes.has(m.menuCode))
    .map((m) => (realParentKey ? { ...m, parentMenuKey: realParentKey } : m));

  return [...realMenu, ...missing];
}

export function makeCollection<T extends { [k: string]: any }>(storageKey: string, keyField: keyof T, seed: T[]) {
  let cache: T[] | null = null;

  const all = (): T[] => {
    if (!cache) cache = read(storageKey, seed);
    return cache;
  };

  const persist = () => write(storageKey, cache ?? []);

  return {
    list: async (): Promise<T[]> => delay([...all()]),
    get: async (key: string): Promise<T | undefined> => delay(all().find((r) => r[keyField] === key)),
    create: async (row: Omit<T, keyof T> & Partial<T>): Promise<T> => {
      const withKey = { ...(row as T), [keyField]: genKey(storageKey) } as T;
      all().push(withKey);
      persist();
      return delay(withKey);
    },
    update: async (key: string, patch: Partial<T>): Promise<T> => {
      const idx = all().findIndex((r) => r[keyField] === key);
      if (idx === -1) throw new Error("Record not found");
      all()[idx] = { ...all()[idx], ...patch };
      persist();
      return delay(all()[idx]);
    },
    remove: async (key: string): Promise<void> => {
      cache = all().filter((r) => r[keyField] !== key);
      persist();
      return delay(undefined);
    },
    reset: (newSeed: T[]) => {
      cache = newSeed;
      persist();
    },
  };
}
