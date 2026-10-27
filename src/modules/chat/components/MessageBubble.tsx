import { Check, CheckCheck, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/hooks/use-chat";
import { chatAttachmentUrl } from "@/hooks/use-chat";
import { ChatAvatar } from "./ChatAvatar";
import { formatClockTime } from "../chatFormat";

export function MessageBubble({
  message,
  isMe,
  otherName,
  otherKey,
  otherImage,
}: {
  message: ChatMessage;
  isMe: boolean;
  otherName: string;
  otherKey: string;
  otherImage?: string | null;
}) {
  return (
    <div className={cn("flex items-end gap-2.5", isMe && "flex-row-reverse")}>
      {!isMe && <ChatAvatar name={otherName} userKey={otherKey} imagePath={otherImage} size="sm" />}
      <div className={cn("flex max-w-[68%] flex-col gap-1", isMe && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isMe
              ? "rounded-br-sm bg-primary text-primary-foreground"
              : "rounded-bl-sm border border-border bg-card text-foreground",
          )}
        >
          {message.kind === "text" && <span className="whitespace-pre-wrap break-words">{message.body}</span>}

          {message.kind === "image" && message.attachmentPath && (
            <a href={chatAttachmentUrl(message.attachmentPath)} target="_blank" rel="noreferrer">
              <img
                src={chatAttachmentUrl(message.attachmentPath)}
                alt={message.attachmentName ?? "Image"}
                className="max-h-64 max-w-full rounded-lg object-cover"
              />
            </a>
          )}

          {message.kind === "document" && message.attachmentPath && (
            <a
              href={chatAttachmentUrl(message.attachmentPath)}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-1 py-1 underline-offset-2 hover:underline",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                  isMe ? "bg-white/15" : "bg-destructive/10 text-destructive",
                )}
              >
                <FileText className="h-4.5 w-4.5" />
              </span>
              <span className="min-w-0 truncate">{message.attachmentName}</span>
            </a>
          )}
        </div>
        <div className="flex items-center gap-1 px-1 text-[11px] text-muted-foreground">
          {isMe &&
            (message.isRead ? (
              <CheckCheck className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            ))}
          <span>{formatClockTime(message.createdOn)}</span>
        </div>
      </div>
    </div>
  );
}
