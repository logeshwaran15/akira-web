// Shared chat UI for the Akira Assistant — a compact docked variant (used
// inside the Support Center sidebar) and the pieces the full-page
// /support-assistant route composes into its own larger layout.
import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Bot, X, Send, Sparkles, MessageCircle, Maximize2, BookOpen, LifeBuoy, ClipboardList } from "lucide-react";
import { CHAT_SUGGESTIONS, type ChatMessage } from "./support-assistant";

export function QuickChip({ icon: Icon, label, sub, onClick }: { icon: typeof BookOpen; label: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1 rounded-md border bg-background p-2 text-center hover:bg-muted">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-[10.5px] font-semibold leading-tight text-foreground">{label}</span>
      <span className="text-[9px] leading-tight text-muted-foreground">{sub}</span>
    </button>
  );
}

/** Compact docked chat panel — used inside the Support Center's sidebar. */
export function DockedChatPanel({
  messages, chatInput, setChatInput, send, chatEndRef, onExpand, onClose,
}: {
  messages: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  send: (text: string) => void;
  chatEndRef: RefObject<HTMLDivElement | null>;
  onExpand: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bot className="h-5 w-5" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-success" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Akira Assistant</p>
            <p className="text-[11px] text-muted-foreground">AI Powered Support</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={onExpand} title="Open full view">
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={onClose} title="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-[13px] leading-relaxed",
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />

        {messages.length === 1 && (
          <div className="space-y-1.5 pt-2">
            <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground"><Sparkles className="h-3 w-3" /> Here are some things you can try:</p>
            {CHAT_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="flex w-full items-center gap-2 rounded-md border bg-background px-3 py-2 text-left text-[12.5px] text-foreground hover:bg-muted"
              >
                <MessageCircle className="h-3.5 w-3.5 shrink-0 text-primary" /> {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5 border-t p-2.5">
        <QuickChip icon={BookOpen} label="Find Help" sub="Search articles" onClick={() => send("How to search help articles?")} />
        <QuickChip icon={LifeBuoy} label="Raise Ticket" sub="Create a ticket" onClick={() => send("I want to raise a support ticket")} />
        <QuickChip icon={ClipboardList} label="Track Ticket" sub="Check status" onClick={() => send("How do I check my ticket status?")} />
      </div>

      <div className="border-t p-2.5">
        <div className="flex items-center gap-2">
          <Textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(chatInput); } }}
            placeholder="Ask me anything..."
            className="h-9 min-h-9 flex-1 resize-none rounded-md py-2 text-sm"
          />
          <Button size="icon" className="h-9 w-9 shrink-0 rounded-md" onClick={() => send(chatInput)}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">AI Assistant may not be 100% accurate. For critical issues, please contact our support team.</p>
      </div>
    </>
  );
}
