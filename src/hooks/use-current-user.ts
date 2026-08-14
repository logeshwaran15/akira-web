import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export type CurrentUser = {
  userId: string | null;
  userName: string | null;
  email: string | null;
  roleCode: string | null;
  roleName: string | null;
  tenantId: string | null;
  tenantName: string | null;
  isPlatformTenant: boolean;
  profileImagePath: string | null;
};

export const CURRENT_USER_QUERY_KEY = ["currentUser"] as const;

export function useCurrentUser() {
  const query = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => apiFetch("/api/Auth/me") as Promise<CurrentUser>,
    enabled: typeof window !== "undefined" && !!localStorage.getItem("akira_token"),
    staleTime: 60_000,
    retry: false,
  });

  return { user: query.data ?? null, loading: query.isLoading };
}

export function useRefreshCurrentUser() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
}

export function useSetCurrentUserProfileImage() {
  const queryClient = useQueryClient();
  return (profileImagePath: string) =>
    queryClient.setQueryData<CurrentUser>(CURRENT_USER_QUERY_KEY, (old) =>
      old ? { ...old, profileImagePath } : old,
    );
}
