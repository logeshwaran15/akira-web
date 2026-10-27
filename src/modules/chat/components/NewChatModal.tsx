import { useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ChatContact } from "@/hooks/use-chat";
import { ChatAvatar } from "./ChatAvatar";

export function NewChatModal({
  contacts,
  loading,
  search,
  onSearchChange,
  onSelect,
  onClose,
}: {
  contacts: ChatContact[];
  loading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  onSelect: (userKey: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[28rem] w-full max-w-sm flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-display text-base font-bold text-foreground">New Conversation</h3>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary/60" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search people..."
              className="h-9 rounded-full bg-secondary/40 pl-9"
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : contacts.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">No matching people.</p>
          ) : (
            contacts.map((c) => (
              <button
                key={c.akiraUserKey}
                onClick={() => onSelect(c.akiraUserKey)}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-secondary/60"
              >
                <ChatAvatar name={c.userName} userKey={c.akiraUserKey} imagePath={c.profileImagePath} online={c.online} size="sm" />
                <span className="truncate text-sm font-medium text-foreground">{c.userName}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
