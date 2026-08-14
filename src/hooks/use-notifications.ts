import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { playNotificationSound } from "@/lib/notification-sound";

export type NotificationItem = {
  akiraNotificationKey: string;
  eventCode: string | null;
  title: string;
  message: string | null;
  url: string | null;
  isRead: boolean;
  createdOn: string;
};

const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;

function hasToken() {
  return typeof window !== "undefined" && !!localStorage.getItem("akira_token");
}

export function useNotifications() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => apiFetch("/api/Notification/my") as Promise<NotificationItem[]>,
    enabled: hasToken(),
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: false,
  });

  const notifications = query.data ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const seenIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!query.data) return;

    if (seenIds.current === null) {
      // First load: don't chime for notifications that already existed.
      seenIds.current = new Set(query.data.map((n) => n.akiraNotificationKey));
      return;
    }

    const hasNewUnread = query.data.some((n) => !n.isRead && !seenIds.current!.has(n.akiraNotificationKey));
    query.data.forEach((n) => seenIds.current!.add(n.akiraNotificationKey));

    if (hasNewUnread) {
      playNotificationSound();
    }
  }, [query.data]);

  const markRead = async (id: string) => {
    queryClient.setQueryData<NotificationItem[]>(NOTIFICATIONS_QUERY_KEY, (old) =>
      old?.map((n) => (n.akiraNotificationKey === id ? { ...n, isRead: true } : n)),
    );
    try {
      await apiFetch(`/api/Notification/${id}/read`, { method: "POST" });
    } catch {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    }
  };

  const markAllRead = async () => {
    queryClient.setQueryData<NotificationItem[]>(NOTIFICATIONS_QUERY_KEY, (old) =>
      old?.map((n) => ({ ...n, isRead: true })),
    );
    try {
      await apiFetch("/api/Notification/read-all", { method: "POST" });
    } catch {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    }
  };

  return { notifications, unreadCount, loading: query.isLoading, markRead, markAllRead };
}
