import { ChevronLeft, Info, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatConversation } from "@/hooks/use-chat";
import { ChatAvatar } from "./ChatAvatar";

export function ChatHeader({
  conversation,
  detailsOpen,
  onToggleDetails,
  onBack,
}: {
  conversation: ChatConversation;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  /** Shown only on phones, where the list and the thread are separate screens. */
  onBack?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border bg-card px-3 py-3.5 sm:px-5">
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Back to chat list"
          className="-ml-1 shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-secondary/60 lg:hidden"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      <ChatAvatar
        name={conversation.otherUserName}
        userKey={conversation.otherUserKey}
        imagePath={conversation.otherUserProfileImagePath}
        online={conversation.otherUserOnline}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">{conversation.otherUserName}</div>
        <div className={cn("flex items-center gap-1.5 text-xs", conversation.otherUserOnline ? "text-success" : "text-muted-foreground")}>
          <span className={cn("h-1.5 w-1.5 rounded-full", conversation.otherUserOnline ? "bg-success" : "bg-muted-foreground/50")} />
          {conversation.otherUserOnline ? "Online" : "Offline"}
        </div>
      </div>
      <button
        onClick={onToggleDetails}
        aria-label="Chat details"
        aria-pressed={detailsOpen}
        className={cn(
          "rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary/60",
          detailsOpen && "bg-primary/10 text-primary",
        )}
      >
        <Info className="h-4 w-4" />
      </button>
      <button className="rounded-md p-2 text-muted-foreground hover:bg-secondary/60" aria-label="More options">
        <MoreVertical className="h-4 w-4" />
      </button>
    </div>
  );
}
