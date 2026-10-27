import { useMemo } from "react";
import { FileText, X } from "lucide-react";
import type { ChatConversation, ChatMessage } from "@/hooks/use-chat";
import { chatAttachmentUrl } from "@/hooks/use-chat";
import { ChatAvatar } from "./ChatAvatar";

export function ChatDetails({
  conversation,
  messages,
  onClose,
}: {
  conversation: ChatConversation;
  messages: ChatMessage[];
  onClose: () => void;
}) {
  // Derived straight from the messages already loaded for this conversation
  // -- there's no separate "shared media" endpoint, so this is exactly what
  // the user has actually sent/received here, newest first.
  const sharedMedia = useMemo(
    () =>
      messages
        .filter((m) => (m.kind === "image" || m.kind === "document") && m.attachmentPath)
        .slice()
        .reverse(),
    [messages],
  );
  const visibleMedia = sharedMedia.slice(0, 4);
  const extraCount = sharedMedia.length - visibleMedia.length;

  return (
    <div className="flex min-h-0 flex-col overflow-hidden bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <h3 className="text-sm font-bold text-foreground">Chat Details</h3>
        <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary/60" aria-label="Close chat details">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center gap-2 border-b border-border px-5 py-6 text-center">
          <ChatAvatar
            name={conversation.otherUserName}
            userKey={conversation.otherUserKey}
            imagePath={conversation.otherUserProfileImagePath}
            size="lg"
          />
          <div>
            <p className="text-sm font-semibold text-foreground">{conversation.otherUserName}</p>
            <p className="mt-0.5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={
                  conversation.otherUserOnline
                    ? "h-1.5 w-1.5 rounded-full bg-success"
                    : "h-1.5 w-1.5 rounded-full bg-muted-foreground/50"
                }
              />
              {conversation.otherUserOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        <div className="px-5 py-4">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Shared Media &amp; Files
          </p>
          {sharedMedia.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing shared in this conversation yet.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {visibleMedia.map((m) => (
                <a
                  key={m.akiraChatMessageKey}
                  href={chatAttachmentUrl(m.attachmentPath!)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary/40"
                  title={m.attachmentName ?? undefined}
                >
                  {m.kind === "image" ? (
                    <img src={chatAttachmentUrl(m.attachmentPath!)} alt={m.attachmentName ?? "Shared image"} className="h-full w-full object-cover" />
                  ) : (
                    <FileText className="h-5 w-5 text-destructive" />
                  )}
                </a>
              ))}
              {extraCount > 0 && (
                <div className="flex aspect-square items-center justify-center rounded-lg bg-secondary text-xs font-semibold text-muted-foreground">
                  +{extraCount}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

