import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as signalR from "@microsoft/signalr";
import { apiFetch, apiUpload, API_BASE_URL } from "@/lib/api";

export type ChatContact = {
  akiraUserKey: string;
  userName: string;
  profileImagePath: string | null;
  online: boolean;
};

export type ChatConversation = {
  akiraChatConversationKey: string;
  otherUserKey: string;
  otherUserName: string;
  otherUserProfileImagePath: string | null;
  otherUserOnline: boolean;
  lastMessageKind: string | null;
  lastMessageBody: string | null;
  lastMessageAttachmentName: string | null;
  lastMessageOn: string | null;
  unreadCount: number;
};

export type ChatMessage = {
  akiraChatMessageKey: string;
  akiraChatConversationKey: string;
  senderUserKey: string;
  kind: "text" | "image" | "document";
  body: string | null;
  attachmentPath: string | null;
  attachmentName: string | null;
  isRead: boolean;
  createdOn: string;
};

const CONVERSATIONS_KEY = ["chat", "conversations"] as const;
const CONTACTS_KEY = ["chat", "contacts"] as const;
const messagesKey = (conversationKey: string) => ["chat", "messages", conversationKey] as const;

// The sender's own send/upload mutation appends the message it just posted,
// and the SignalR "messageReceived" push (sent to every participant,
// including the sender) appends it again -- whichever of the two arrives
// second must be a no-op, so every append into the messages cache goes
// through this helper instead of a bare spread.
function appendMessage(old: ChatMessage[] | undefined, message: ChatMessage): ChatMessage[] {
  if (!old) return [message];
  if (old.some((m) => m.akiraChatMessageKey === message.akiraChatMessageKey)) return old;
  return [...old, message];
}

function hasToken() {
  return typeof window !== "undefined" && !!localStorage.getItem("akira_token");
}

/**
 * Owns the single ChatHub connection for the whole app (mounted once from
 * AppLayout) and feeds every message/presence/typing event it receives back
 * into the react-query cache, so any component reading useChatConversations /
 * useChatMessages just re-renders -- no extra plumbing per component.
 */
export function useChatConnection() {
  const queryClient = useQueryClient();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingByConversation, setTypingByConversation] = useState<Record<string, number>>({});
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    if (!hasToken()) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/chat`, {
        accessTokenFactory: () => localStorage.getItem("akira_token") ?? "",
      })
      .withAutomaticReconnect()
      .build();

    connectionRef.current = connection;

    connection.on("messageReceived", (message: ChatMessage) => {
      queryClient.setQueryData<ChatMessage[]>(messagesKey(message.akiraChatConversationKey), (old) =>
        appendMessage(old, message),
      );
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    });

    connection.on("presenceChanged", ({ userKey, online }: { userKey: string; online: boolean }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (online) next.add(userKey);
        else next.delete(userKey);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: CONTACTS_KEY });
    });

    connection.on("typing", ({ conversationKey, userKey }: { conversationKey: string; userKey: string }) => {
      setTypingByConversation((prev) => ({ ...prev, [conversationKey]: Date.now() }));
      void userKey;
    });

    connection.on("messagesRead", ({ conversationKey }: { conversationKey: string }) => {
      queryClient.setQueryData<ChatMessage[]>(messagesKey(conversationKey), (old) =>
        old?.map((m) => ({ ...m, isRead: true })),
      );
    });

    connection
      .start()
      .then(() => connection.invoke<string[]>("GetOnlineUsers"))
      .then((users) => setOnlineUsers(new Set(users)))
      .catch(() => {
        // Connection failures are non-fatal for the rest of the app -- chat
        // just falls back to whatever the REST snapshot last returned.
      });

    return () => {
      connection.stop().catch(() => {});
      connectionRef.current = null;
    };
  }, [queryClient]);

  // Typing indicators expire on their own after a couple seconds of silence.
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingByConversation((prev) => {
        const now = Date.now();
        const next: Record<string, number> = {};
        let changed = false;
        for (const [key, ts] of Object.entries(prev)) {
          if (now - ts < 3000) next[key] = ts;
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const sendTyping = (conversationKey: string) => {
    connectionRef.current?.invoke("Typing", conversationKey).catch(() => {});
  };

  return { onlineUsers, typingByConversation, sendTyping };
}

export function useChatConversations() {
  const query = useQuery({
    queryKey: CONVERSATIONS_KEY,
    queryFn: () => apiFetch("/api/Chat/conversations") as Promise<ChatConversation[]>,
    enabled: hasToken(),
    staleTime: 10_000,
    retry: false,
  });
  return { conversations: query.data ?? [], loading: query.isLoading };
}

export function useChatContacts(search: string) {
  const query = useQuery({
    queryKey: [...CONTACTS_KEY, search],
    queryFn: () => apiFetch(`/api/Chat/contacts${search ? `?search=${encodeURIComponent(search)}` : ""}`) as Promise<ChatContact[]>,
    enabled: hasToken(),
    staleTime: 30_000,
    retry: false,
  });
  return { contacts: query.data ?? [], loading: query.isLoading };
}

export function useChatMessages(conversationKey: string | null) {
  const query = useQuery({
    queryKey: messagesKey(conversationKey ?? ""),
    queryFn: () => apiFetch(`/api/Chat/conversations/${conversationKey}/messages`) as Promise<ChatMessage[]>,
    enabled: hasToken() && !!conversationKey,
    staleTime: 5_000,
    retry: false,
  });
  return { messages: query.data ?? [], loading: query.isLoading };
}

export function useStartConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (otherUserKey: string) =>
      apiFetch(`/api/Chat/conversations/with/${otherUserKey}`, { method: "POST" }) as Promise<{ akiraChatConversationKey: string }>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });
}

export function useSendChatMessage(conversationKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      apiFetch(`/api/Chat/conversations/${conversationKey}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      }) as Promise<ChatMessage>,
    onSuccess: (message) => {
      queryClient.setQueryData<ChatMessage[]>(messagesKey(conversationKey), (old) =>
        appendMessage(old, message),
      );
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });
}

export function useSendChatAttachment(conversationKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiUpload(`/api/Chat/conversations/${conversationKey}/attachments`, formData) as Promise<ChatMessage>;
    },
    onSuccess: (message) => {
      queryClient.setQueryData<ChatMessage[]>(messagesKey(conversationKey), (old) =>
        appendMessage(old, message),
      );
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationKey: string) => apiFetch(`/api/Chat/conversations/${conversationKey}/read`, { method: "POST" }),
    onSuccess: (_data, conversationKey) => {
      queryClient.setQueryData<ChatConversation[]>(CONVERSATIONS_KEY, (old) =>
        old?.map((c) => (c.akiraChatConversationKey === conversationKey ? { ...c, unreadCount: 0 } : c)),
      );
    },
  });
}

export function chatAttachmentUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}
