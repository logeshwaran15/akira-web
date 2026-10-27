import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  useChatConnection,
  useChatConversations,
  useChatContacts,
  useChatMessages,
  useStartConversation,
  useSendChatMessage,
  useSendChatAttachment,
  useMarkConversationRead,
} from "@/hooks/use-chat";
import { ChatSidebar } from "@/modules/chat/components/ChatSidebar";
import { ChatHeader } from "@/modules/chat/components/ChatHeader";
import { MessageList } from "@/modules/chat/components/MessageList";
import { MessageComposer } from "@/modules/chat/components/MessageComposer";
import { ChatDetails } from "@/modules/chat/components/ChatDetails";
import { NewChatModal } from "@/modules/chat/components/NewChatModal";
import { EmptyConversationState } from "@/modules/chat/components/EmptyStates";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat — Akira School ERP" },
      { name: "description", content: "Message staff and colleagues in real time." },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  useChatConnection(); // mounts the live hub connection for this view

  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  // On phones the sidebar and the active thread are two separate screens;
  // this tracks which one is showing. Desktop/tablet ignore it (both render
  // side by side via the lg: grid columns below).
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");

  const { conversations, loading: conversationsLoading } = useChatConversations();
  const { contacts, loading: contactsLoading } = useChatContacts(contactSearch);
  const { messages, loading: messagesLoading } = useChatMessages(activeId);
  const startConversation = useStartConversation();
  const sendMessage = useSendChatMessage(activeId ?? "");
  const sendAttachment = useSendChatAttachment(activeId ?? "");
  const markRead = useMarkConversationRead();

  // Default to the first conversation once the list loads (desktop only --
  // on mobile we stay on the list screen until the user taps one).
  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations[0].akiraChatConversationKey);
    }
  }, [activeId, conversations]);

  const active = conversations.find((c) => c.akiraChatConversationKey === activeId) ?? null;

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.otherUserName.toLowerCase().includes(q));
  }, [search, conversations]);

  useEffect(() => {
    if (activeId && active && active.unreadCount > 0) {
      markRead.mutate(activeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, active?.unreadCount]);

  useEffect(() => {
    setDetailsOpen(false);
  }, [activeId]);

  const handleSelectConversation = (conversationKey: string) => {
    setActiveId(conversationKey);
    setMobileView("thread");
  };

  const handleSend = () => {
    const text = draft.trim();
    if (!text || !activeId) return;
    setDraft("");
    sendMessage.mutate(text, {
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to send message"),
    });
  };

  const handleAttach = (file: File) => {
    if (!activeId) return;
    sendAttachment.mutate(file, {
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to upload file"),
    });
  };

  const handleStartConversation = (otherUserKey: string) => {
    startConversation.mutate(otherUserKey, {
      onSuccess: (res) => {
        setActiveId(res.akiraChatConversationKey);
        setMobileView("thread");
        setPickerOpen(false);
        setContactSearch("");
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to start conversation"),
    });
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Chat" />

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border shadow-sm">
        <div
          className={cn(
            "grid h-full min-h-0",
            detailsOpen ? "lg:grid-cols-[320px_1fr_300px]" : "lg:grid-cols-[320px_1fr]",
          )}
        >
          {/* Sidebar: conversation list. Full-screen on mobile until a chat is opened. */}
          <div
            className={cn(
              "min-h-0 border-r border-border lg:block",
              mobileView === "list" ? "block" : "hidden",
            )}
          >
            <ChatSidebar
              conversations={filteredConversations}
              loading={conversationsLoading}
              activeId={activeId}
              search={search}
              onSearchChange={setSearch}
              onSelect={handleSelectConversation}
              onNewChat={() => setPickerOpen(true)}
            />
          </div>

          {/* Active thread. Full-screen on mobile once a chat is selected. */}
          <div
            className={cn(
              "flex min-h-0 flex-col bg-[oklch(0.98_0.004_90)] dark:bg-background",
              mobileView === "thread" ? "flex" : "hidden lg:flex",
            )}
          >
            {active ? (
              <>
                <ChatHeader
                  conversation={active}
                  detailsOpen={detailsOpen}
                  onToggleDetails={() => setDetailsOpen((o) => !o)}
                  onBack={() => setMobileView("list")}
                />

                <MessageList
                  messages={messages}
                  loading={messagesLoading}
                  otherUserName={active.otherUserName}
                  otherUserKey={active.otherUserKey}
                  otherUserImage={active.otherUserProfileImagePath}
                  conversationKey={active.akiraChatConversationKey}
                />

                <MessageComposer
                  draft={draft}
                  onDraftChange={setDraft}
                  onSend={handleSend}
                  onAttach={handleAttach}
                  sending={sendMessage.isPending}
                  uploading={sendAttachment.isPending}
                />
              </>
            ) : (
              <EmptyConversationState onStartChat={() => setPickerOpen(true)} />
            )}
          </div>

          {/* Details panel: inline column on desktop, drawer on tablet/mobile. */}
          {active && detailsOpen && (
            <div className="hidden min-h-0 border-l border-border lg:block">
              <ChatDetails conversation={active} messages={messages} onClose={() => setDetailsOpen(false)} />
            </div>
          )}
        </div>
      </div>

      {active && (
        <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
          <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-sm lg:hidden">
            <SheetHeader className="sr-only">
              <SheetTitle>Chat Details</SheetTitle>
            </SheetHeader>
            <ChatDetails conversation={active} messages={messages} onClose={() => setDetailsOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      {pickerOpen && (
        <NewChatModal
          contacts={contacts}
          loading={contactsLoading}
          search={contactSearch}
          onSearchChange={setContactSearch}
          onSelect={handleStartConversation}
          onClose={() => {
            setPickerOpen(false);
            setContactSearch("");
          }}
        />
      )}
    </div>
  );
}
