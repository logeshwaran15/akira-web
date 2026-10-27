import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { DockedChatPanel } from "@/components/erp/SupportAssistantChat";
import { INITIAL_MESSAGE, scriptedReply, type ChatMessage } from "@/components/erp/support-assistant";
import {
  Search, Headset, LifeBuoy, FileText, BookOpen, MessageCircle, ArrowRight, ArrowUpRight,
  Key, GraduationCap, Users, IndianRupee, CalendarCheck, Clock8,
  BarChart3, Mail, Phone, MapPin, Lightbulb, Bot,
} from "lucide-react";

export const Route = createFileRoute("/support-center")({
  head: () => ({
    meta: [
      { title: "Support Center — Akira School ERP" },
      { name: "description", content: "Raise a ticket, track requests, browse help articles, or chat with the Akira Assistant." },
    ],
  }),
  component: SupportCenterPage,
});

// ---------- Static reference content ----------

const QUICK_ACTIONS = [
  { icon: LifeBuoy, tone: "bg-warning/15 text-warning", title: "Raise a Support Ticket", desc: "Create a new ticket for any issue or request" },
  { icon: FileText, tone: "bg-info/15 text-info", title: "View My Tickets", desc: "Check the status of your submitted tickets" },
  { icon: BookOpen, tone: "bg-success/15 text-success", title: "Browse Help Articles", desc: "Find step-by-step guides and solutions" },
  { icon: MessageCircle, tone: "bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]", title: "Live Support", desc: "Chat with our support team during working hours" },
] as const;

const COMMON_TOPICS = [
  { icon: Key, label: "Login & Access" },
  { icon: GraduationCap, label: "Examination" },
  { icon: FileText, label: "Report Card" },
  { icon: Users, label: "Student Management" },
  { icon: IndianRupee, label: "Fee Collection" },
  { icon: CalendarCheck, label: "Attendance" },
  { icon: BookOpen, label: "Academic Setup" },
  { icon: Clock8, label: "Timetable" },
  { icon: BarChart3, label: "Reports" },
] as const;

const FAQS = [
  "How do I reset my login password?",
  "How to create an examination series?",
  "How to generate report cards?",
  "How to add new students?",
  "How to configure the academic year?",
  "Why are marks not showing in report card?",
  "How to publish results?",
  "How to assign roles and permissions?",
] as const;

const RECENT_TICKETS = [
  { id: "#1024", subject: "Report card not generating", category: "Examinations", status: "Open" as const, updated: "13 Sep 2026" },
  { id: "#1023", subject: "Unable to login", category: "Login & Access", status: "Resolved" as const, updated: "12 Sep 2026" },
];

function statusTone(status: "Open" | "Resolved") {
  return status === "Open" ? "bg-info/15 text-info" : "bg-success/15 text-success";
}

function SupportCenterPage() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [helpQuery, setHelpQuery] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const greetingName = user?.userName?.split(" ")[0] ?? "there";

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((m) => [...m, { role: "user", text: trimmed }, { role: "assistant", text: scriptedReply(trimmed) }]);
    setChatInput("");
    requestAnimationFrame(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }));
  };

  const filteredFaqs = useMemo(() => {
    if (!helpQuery.trim()) return FAQS;
    const q = helpQuery.toLowerCase();
    return FAQS.filter((f) => f.toLowerCase().includes(q));
  }, [helpQuery]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
        <PageHeader title="" actions={null} />

        {/* Hero */}
        <div className="relative mb-6 overflow-hidden rounded-lg border bg-gradient-to-br from-warning/10 via-warning/5 to-transparent p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
                <Headset className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">We're here to help, {greetingName}</p>
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Support Center</h1>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">Get the help you need. Raise a ticket, track your requests, find answers, or chat with our AI Assistant.</p>
              </div>
            </div>
          </div>

          <div className="relative mt-6 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={helpQuery}
                onChange={(e) => setHelpQuery(e.target.value)}
                placeholder='Search for help (e.g. "Report Card", "Login Issue", "Fee Collection")'
                className="h-11 rounded-md pl-9 text-sm"
              />
            </div>
            <Button className="h-11 gap-1.5 rounded-md shadow-sm">
              <Search className="h-4 w-4" /> Search
            </Button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.title}
              type="button"
              className="group flex flex-col gap-3 rounded-lg border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md"
            >
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-md", a.tone)}>
                <a.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{a.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{a.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr_0.9fr]">
          {/* Common Support Topics */}
          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-foreground">Common Support Topics</h2>
              <a href="#" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">View All <ArrowRight className="h-3 w-3" /></a>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {COMMON_TOPICS.map((t) => (
                <button key={t.label} type="button" className="flex flex-col items-center gap-2 rounded-md p-3 text-center hover:bg-muted">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-foreground">
                    <t.icon className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] font-medium leading-tight text-foreground">{t.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* FAQs */}
          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-foreground">Frequently Asked Questions</h2>
              <a href="#" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">View All <ArrowRight className="h-3 w-3" /></a>
            </div>
            <div className="divide-y">
              {filteredFaqs.map((f) => (
                <button key={f} type="button" className="flex w-full items-center justify-between gap-2 py-2.5 text-left text-sm text-foreground hover:text-primary">
                  <span>{f}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              ))}
              {filteredFaqs.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No FAQs match "{helpQuery}".</p>}
            </div>
          </section>

          <div className="space-y-6">
            {/* Support Hours */}
            <section className="rounded-lg border bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Clock8 className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-display text-sm font-bold text-foreground">Support Hours</h2>
              </div>
              <p className="text-sm text-foreground">Monday – Friday</p>
              <p className="text-sm text-muted-foreground">9:00 AM – 6:00 PM (IST)</p>
              <Badge className="mt-3 gap-1.5 rounded-md border-0 bg-success/15 text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> We're Online
              </Badge>
            </section>

            {/* Contact Support */}
            <section className="rounded-lg border bg-card p-5 shadow-sm">
              <h2 className="mb-3 font-display text-sm font-bold text-foreground">Contact Support</h2>
              <div className="space-y-3">
                <ContactRow icon={Mail} tone="bg-warning/15 text-warning" title="Email Support" subtitle="support@akiraerp.com" />
                <ContactRow icon={Phone} tone="bg-info/15 text-info" title="Call Support" subtitle="+91 98765 43210" />
                <ContactRow icon={MapPin} tone="bg-destructive/15 text-destructive" title="Raise an Escalation" subtitle="For urgent issues" />
              </div>
            </section>
          </div>
        </div>

        {/* Tip banner */}
        <div className="mb-6 flex flex-col gap-3 rounded-lg border bg-info/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-info" />
            <p className="text-sm text-foreground">Before raising a ticket, please check our User Manual or FAQs. You might find the answer right away!</p>
          </div>
          <Link
            to="/user-manual"
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-primary hover:underline"
          >
            Go to User Manual <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Recent Tickets */}
        <section className="rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="font-display text-base font-bold text-foreground">Recent Tickets</h2>
            <a href="#" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">View All <ArrowRight className="h-3 w-3" /></a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-semibold">#</th>
                  <th className="px-4 py-2 font-semibold">Subject</th>
                  <th className="px-4 py-2 font-semibold">Category</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                  <th className="px-4 py-2 font-semibold">Last Updated</th>
                  <th className="px-4 py-2 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_TICKETS.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="px-4 py-2.5 font-medium text-foreground">{t.id}</td>
                    <td className="px-4 py-2.5 text-foreground">{t.subject}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{t.category}</td>
                    <td className="px-4 py-2.5"><Badge className={cn("rounded-md border-0", statusTone(t.status))}>{t.status}</Badge></td>
                    <td className="px-4 py-2.5 text-muted-foreground">{t.updated}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Button variant="outline" size="sm" className="h-7 rounded-md text-xs">View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t p-3 text-center text-[11px] text-muted-foreground">Example tickets shown for preview — ticket submission isn't connected to a live queue yet.</p>
        </section>
      </div>

      {/* AI Chat panel — expand navigates to the dedicated /support-assistant
          full page route rather than overlaying this page. */}
      {chatOpen ? (
        <aside className="flex h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-lg border bg-card shadow-sm xl:sticky xl:top-4">
          <DockedChatPanel
            messages={messages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            send={send}
            chatEndRef={chatEndRef}
            onExpand={() => navigate({ to: "/support-assistant" })}
            onClose={() => setChatOpen(false)}
          />
        </aside>
      ) : (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 xl:static xl:h-auto xl:w-auto xl:justify-start xl:gap-2 xl:self-start xl:rounded-lg xl:border xl:bg-card xl:px-4 xl:py-3 xl:text-foreground xl:shadow-sm"
        >
          <Bot className="h-6 w-6 xl:h-5 xl:w-5 xl:text-primary" />
          <span className="hidden text-sm font-medium xl:inline">Open Akira Assistant</span>
        </button>
      )}
    </div>
  );
}

function ContactRow({ icon: Icon, tone, title, subtitle }: { icon: typeof Mail; tone: string; title: string; subtitle: string }) {
  return (
    <button type="button" className="flex w-full items-center gap-3 rounded-md p-1.5 text-left hover:bg-muted">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", tone)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}
