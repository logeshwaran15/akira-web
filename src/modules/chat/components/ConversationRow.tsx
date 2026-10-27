import { FileText, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatConversation } from "@/hooks/use-chat";
import { ChatAvatar } from "./ChatAvatar";
import { formatShortTime } from "../chatFormat";

export function ConversationRow({
  conversation: c,
  active,
  onClick,
}: {
  conversation: ChatConversation;
  active: boolean;
  onClick: () => void;
}) {
  const previewIcon =
    c.lastMessageKind === "document" ? (
      <FileText className="h-3.5 w-3.5 shrink-0" />
    ) : c.lastMessageKind === "image" ? (
      <ImageIcon className="h-3.5 w-3.5 shrink-0" />
    ) : null;
  const previewText =
    c.lastMessageKind === "document" || c.lastMessageKind === "image"
      ? c.lastMessageAttachmentName ?? (c.lastMessageKind === "image" ? "Photo" : "Document")
      : c.lastMessageBody ?? "No messages yet";

  return (
    <button
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors",
        active ? "bg-primary/10" : "hover:bg-secondary/60",
      )}
    >
      <ChatAvatar
        name={c.otherUserName}
        userKey={c.otherUserKey}
        imagePath={c.otherUserProfileImagePath}
        online={c.otherUserOnline}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-foreground">{c.otherUserName}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">{formatShortTime(c.lastMessageOn)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
            {previewIcon}
            <span className="truncate">{previewText}</span>
          </span>
          {c.unreadCount > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {c.unreadCount > 99 ? "99+" : c.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
