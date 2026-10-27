import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Bot, X, Send, MessageCircle } from "lucide-react";
import { CHAT_SUGGESTIONS, INITIAL_MESSAGE, scriptedReply, type ChatMessage } from "@/components/erp/support-assistant";

export const Route = createFileRoute("/support-assistant")({
  head: () => ({
    meta: [
      { title: "Akira Assistant — Akira School ERP" },
      { name: "description", content: "Chat with the Akira Assistant for help finding answers and guidance." },
    ],
  }),
  component: SupportAssistantPage,
});

function SupportAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((m) => [...m, { role: "user", text: trimmed }, { role: "assistant", text: scriptedReply(trimmed) }]);
    setChatInput("");
    requestAnimationFrame(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }));
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bot className="h-4.5 w-4.5" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-success" />
          </div>
          <p className="text-sm font-semibold text-foreground">Akira Assistant</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" asChild title="Close">
          <Link to="/support-center">
            <X className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end gap-5 px-4 py-8 sm:px-6">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-3", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
              {m.role === "assistant" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />

          {messages.length === 1 && (
            <div className="grid grid-cols-1 gap-2 pt-4 sm:grid-cols-2">
              {CHAT_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="flex items-center gap-2.5 rounded-xl border bg-card px-4 py-3 text-left text-sm text-foreground shadow-sm hover:bg-muted"
                >
                  <MessageCircle className="h-4 w-4 shrink-0 text-primary" /> {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm">
          <Textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(chatInput); } }}
            placeholder="Ask me anything..."
            className="min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm shadow-none focus-visible:ring-0"
          />
          <Button size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={() => send(chatInput)}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground">AI Assistant may not be 100% accurate. For critical issues, please contact our support team.</p>
      </div>
    </div>
  );
}
