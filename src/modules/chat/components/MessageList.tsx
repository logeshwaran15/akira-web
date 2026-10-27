import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import type { ChatMessage } from "@/hooks/use-chat";
import { MessageBubble } from "./MessageBubble";
import { MessageListSkeleton } from "./ChatSkeleton";
import { NoMessagesState } from "./EmptyStates";
import { groupMessagesByDay } from "../chatFormat";

// How close to the bottom (px) counts as "already at the bottom" for the
// purposes of auto-scrolling on a new message vs. showing the jump button.
const NEAR_BOTTOM_THRESHOLD = 120;

export function MessageList({
  messages,
  loading,
  otherUserName,
  otherUserKey,
  otherUserImage,
  conversationKey,
}: {
  messages: ChatMessage[];
  loading: boolean;
  otherUserName: string;
  otherUserKey: string;
  otherUserImage: string | null;
  /** Used only to detect "switched to a different conversation" so we always jump to bottom then. */
  conversationKey: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevConversationKey = useRef(conversationKey);
  const prevMessageCount = useRef(messages.length);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  const isNearBottom = () => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD;
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior });
    setShowJumpToLatest(false);
  };

  // Switching conversations always jumps straight to the bottom (no smooth
  // scroll animation dragging across an unrelated thread).
  useEffect(() => {
    if (prevConversationKey.current !== conversationKey) {
      prevConversationKey.current = conversationKey;
      prevMessageCount.current = messages.length;
      requestAnimationFrame(() => scrollToBottom("auto"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationKey]);

  // A new message arriving only auto-scrolls if the reader was already near
  // the bottom; otherwise it surfaces the "new message" jump button instead
  // of yanking them away from whatever they're reading.
  useEffect(() => {
    const grew = messages.length > prevMessageCount.current;
    prevMessageCount.current = messages.length;
    if (!grew) return;

    if (isNearBottom()) {
      requestAnimationFrame(() => scrollToBottom("smooth"));
    } else {
      setShowJumpToLatest(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const handleScroll = () => {
    if (isNearBottom()) setShowJumpToLatest(false);
  };

  if (loading) return <MessageListSkeleton />;
  if (messages.length === 0) {
    return <NoMessagesState otherUserFirstName={otherUserName.split(" ")[0]} />;
  }

  const dayGroups = groupMessagesByDay(messages);

  return (
    <div className="relative flex-1 overflow-hidden">
      <div ref={scrollRef} onScroll={handleScroll} className="h-full space-y-4 overflow-y-auto bg-[oklch(0.98_0.004_90)] p-5 dark:bg-background">
        {dayGroups.map((group) => (
          <div key={group.dateLabel} className="space-y-4">
            <div className="flex items-center justify-center">
              <span className="rounded-full bg-secondary/70 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                {group.dateLabel}
              </span>
            </div>
            {group.items.map((m) => (
              <MessageBubble
                key={m.akiraChatMessageKey}
                message={m}
                isMe={m.senderUserKey !== otherUserKey}
                otherName={otherUserName}
                otherKey={otherUserKey}
                otherImage={otherUserImage}
              />
            ))}
          </div>
        ))}
      </div>

      {showJumpToLatest && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          New message
        </button>
      )}
    </div>
  );
}
