import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ShieldCheck, Users, TrendingUp, LogIn, ArrowRight, Clock } from "lucide-react";

export const Route = createFileRoute("/session-expired")({
  head: () => ({
    meta: [
      { title: "Session Expired — Akira School ERP" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SessionExpiredPage,
});

const SIDE_POINTS = [
  { icon: ShieldCheck, tone: "bg-warning/15 text-warning", title: "Secure Access", desc: "Your data stays protected" },
  { icon: Users, tone: "bg-info/15 text-info", title: "Better Collaboration", desc: "Everyone stays in sync" },
  { icon: TrendingUp, tone: "bg-success/15 text-success", title: "Smarter Education", desc: "Insights that help you act" },
];

function SessionExpiredPage() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background p-4 sm:p-6">
      {/* Frozen app-shell silhouette behind the overlay, blurred + dimmed so the
          page reads as "your last screen is still there, but locked". */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-70 blur-md">
        <div className="flex h-full w-full">
          <div className="hidden h-full w-56 shrink-0 border-r bg-card sm:block">
            <div className="space-y-3 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-3 w-full rounded bg-muted" style={{ opacity: 1 - i * 0.06 }} />
              ))}
            </div>
          </div>
          <div className="flex h-full flex-1 flex-col">
            <div className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-6">
              <div className="h-3 w-32 rounded bg-muted" />
              <div className="h-8 w-8 rounded-full bg-muted" />
            </div>
            <div className="grid flex-1 grid-cols-1 gap-4 p-6 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 rounded-lg bg-card" />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-background/60"
        style={{ backgroundImage: "radial-gradient(circle at 15% 15%, oklch(0.75 0.15 55 / 0.08), transparent 45%), radial-gradient(circle at 85% 20%, oklch(0.7 0.12 250 / 0.06), transparent 40%)" }}
      />

      <div className="absolute left-6 top-6 z-10 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-white p-1 shadow-sm">
          <img src="/akira-logo.png" alt="Akira" className="h-full w-full object-contain" />
        </div>
        <div>
          <div className="font-display text-lg font-bold leading-none tracking-tight text-foreground">akira.</div>
          <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Education Empowers Tomorrow</div>
        </div>
      </div>

      <div className="z-10 hidden max-w-[220px] text-right text-sm italic text-muted-foreground lg:absolute lg:right-8 lg:top-8 lg:block">
        "A secure system
        <br /> for a brighter tomorrow"
      </div>

      <div className="z-10 hidden flex-col gap-6 lg:absolute lg:right-10 lg:top-1/2 lg:flex lg:-translate-y-1/2">
        {SIDE_POINTS.map(({ icon: Icon, tone, title, desc }) => (
          <div key={title} className="flex items-center gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[480px] rounded-[28px] border border-border/60 bg-card p-8 text-center shadow-2xl sm:p-10"
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15, type: "spring" }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-warning/15 text-warning"
        >
          <Clock className="h-8 w-8" />
        </motion.div>

        <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-foreground sm:text-[26px]">Your Session Has Expired</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          For your security, your session has ended due to inactivity.
          <br className="hidden sm:block" /> Please log in again to continue using Akira ERP.
        </p>

        <div className="mt-6 flex items-center gap-2.5 rounded-xl bg-info/10 px-4 py-3 text-left">
          <ShieldCheck className="h-4 w-4 shrink-0 text-info" />
          <p className="text-xs text-foreground">This helps us keep your account and data safe.</p>
        </div>

        <Link
          to="/login"
          className="mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-md transition-shadow hover:shadow-xl"
          style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
        >
          <LogIn className="h-4 w-4" /> Login to Akira ERP
        </Link>

        <p className="mt-4 text-xs text-muted-foreground">
          Need help?{" "}
          <Link to="/support-center" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            Contact Support <ArrowRight className="h-3 w-3" />
          </Link>
        </p>
      </motion.div>

      <p className="absolute bottom-4 text-center text-[11px] text-muted-foreground">
        Akira ERP&nbsp;&nbsp;|&nbsp;&nbsp;Schools&nbsp;&nbsp;|&nbsp;&nbsp;Students&nbsp;&nbsp;|&nbsp;&nbsp;A Brighter Future
      </p>
    </div>
  );
}
