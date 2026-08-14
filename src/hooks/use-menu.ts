import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

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

export type MenuNode = MenuItem & { children: MenuItem[] };

const MENU_QUERY_KEY = ["menu"] as const;

function groupByParent(items: MenuItem[]): MenuNode[] {
  const sections = items
    .filter((item) => !item.parentMenuKey)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return sections.map((section) => ({
    ...section,
    children: items
      .filter((item) => item.parentMenuKey === section.akiraMenuKey)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }));
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
      return raw.map((item) => ({ ...item, akiraMenuKey: item.akiraMenuKey ?? item.tenantMenuKey! }));
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
