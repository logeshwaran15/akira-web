import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { DEFAULT_DATE_FORMAT, formatDate } from "@/lib/date";

export type TenantSetting = {
  tenantSettingKey: string;
  akiraTenantKey: string;
  logoUrl: string | null;
  dateFormat: string;
} | null;

const TENANT_SETTING_QUERY_KEY = ["tenantSetting"] as const;

function hasToken() {
  return typeof window !== "undefined" && !!localStorage.getItem("akira_token");
}

export function useTenantSetting() {
  const { user } = useCurrentUser();
  // Only real school tenants have their own settings/logo -- the platform
  // keeps its static Akira branding, kept completely separate.
  const enabled = hasToken() && !!user && !user.isPlatformTenant;

  const query = useQuery({
    queryKey: TENANT_SETTING_QUERY_KEY,
    queryFn: () => apiFetch("/api/TenantSetting") as Promise<TenantSetting>,
    enabled,
    staleTime: 60_000,
    retry: false,
  });

  return { setting: query.data ?? null, loading: query.isLoading };
}

export function useRefreshTenantSetting() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: TENANT_SETTING_QUERY_KEY });
}

/**
 * Returns a formatDate(value) function bound to the current tenant's
 * configured date format (Settings > Date Format). Use this instead of
 * value.toLocaleDateString() anywhere a stored date is displayed, so the
 * whole tenant sees dates consistently in the format their admin picked.
 */
export function useFormatDate() {
  const { setting } = useTenantSetting();
  const dateFormat = setting?.dateFormat ?? DEFAULT_DATE_FORMAT;
  return useCallback(
    (value: string | Date | null | undefined) => formatDate(value, dateFormat),
    [dateFormat],
  );
}
