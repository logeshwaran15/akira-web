import { Search, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ChatConversation } from "@/hooks/use-chat";
import { ConversationRow } from "./ConversationRow";
import { ConversationListSkeleton } from "./ChatSkeleton";

export function ChatSidebar({
  conversations,
  loading,
  activeId,
  search,
  onSearchChange,
  onSelect,
  onNewChat,
}: {
  conversations: ChatConversation[];
  loading: boolean;
  activeId: string | null;
  search: string;
  onSearchChange: (v: string) => void;
  onSelect: (conversationKey: string) => void;
  onNewChat: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden bg-card">
      <div className="border-b border-border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">Chats</h2>
          <button
            onClick={onNewChat}
            className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <UserPlus className="h-3.5 w-3.5" />
            New Chat
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search people or conversations..."
            className="h-9 rounded-full bg-secondary/40 pl-9"
          />
        </div>
      </div>

      <div className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Recent Chats
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <ConversationListSkeleton />
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">No conversations yet.</p>
            <button onClick={onNewChat} className="text-xs font-semibold text-primary hover:underline">
              Start a new chat
            </button>
          </div>
        ) : (
          conversations.map((c) => (
            <ConversationRow
              key={c.akiraChatConversationKey}
              conversation={c}
              active={c.akiraChatConversationKey === activeId}
              onClick={() => onSelect(c.akiraChatConversationKey)}
            />
          ))
        )}
      </div>
    </div>
  );
}
