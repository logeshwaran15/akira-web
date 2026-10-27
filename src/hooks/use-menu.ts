import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
// TEMP: overlays mock Exam module menu rows until the backend has real
// AkiraMenu rows for those screens. See src/lib/mock-store.ts. Remove this
// import and the withExamModuleMenu(...) call below once that lands.
import { withExamModuleMenu } from "@/lib/mock-store";

export type MenuItem = {
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

export type MenuNode = MenuItem & { children: MenuNode[] };

const MENU_QUERY_KEY = ["menu"] as const;

// Builds a tree from the flat ParentMenuKey list. Depth isn't capped here --
// the admin-side Menu Management page enforces the 3-level limit (Main Menu
// -> Sub Menu -> Child Menu) when items are created, so this just reflects
// whatever shape the data actually has.
function buildTree(items: MenuItem[], parentKey: string | null = null, seen = new Set<string>()): MenuNode[] {
  return items
    .filter((item) => (item.parentMenuKey ?? null) === parentKey)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => {
      if (seen.has(item.akiraMenuKey)) return { ...item, children: [] };
      const nextSeen = new Set(seen).add(item.akiraMenuKey);
      return { ...item, children: buildTree(items, item.akiraMenuKey, nextSeen) };
    });
}

function groupByParent(items: MenuItem[]): MenuNode[] {
  return buildTree(items, null);
}

function hasToken() {
  return typeof window !== "undefined" && !!localStorage.getItem("akira_token");
}

// The platform's AkiraMenu returns "akiraMenuKey"; a tenant's own TenantMenu
// returns "tenantMenuKey" -- normalize both into the same shape here so the
// rest of the sidebar doesn't need to know which source it came from.
type RawMenuItem = MenuItem & { tenantMenuKey?: string };

export function useMenu() {
  const query = useQuery({
    queryKey: MENU_QUERY_KEY,
    queryFn: async () => {
      const raw = (await apiFetch("/api/Menu/my")) as RawMenuItem[];
      const normalized = raw.map((item) => ({ ...item, akiraMenuKey: item.akiraMenuKey ?? item.tenantMenuKey! }));
      return withExamModuleMenu(normalized) as MenuItem[];
    },
    enabled: hasToken(),
    staleTime: 60_000,
    retry: false,
  });

  const sections = query.data ? groupByParent(query.data) : [];

  return { sections, loading: query.isLoading, error: query.error?.message ?? null };
}

export function useRefreshMenu() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: MENU_QUERY_KEY });
}
