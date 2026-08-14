import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { User, Lock, Eye, EyeOff, ShieldCheck, GraduationCap, CalendarCheck, Wallet, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiFetch } from "@/lib/api";
import { useRefreshMenu } from "@/hooks/use-menu";
import { useRefreshCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Akira School ERP" },
      { name: "description", content: "Sign in to the Akira School ERP dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

const FEATURES = [
  { icon: GraduationCap, label: "Students", desc: "Manage student information" },
  { icon: CalendarCheck, label: "Attendance", desc: "Track attendance in real-time" },
  { icon: Wallet, label: "Fees", desc: "Manage fee collections" },
];

function LoginPage() {
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const refreshMenu = useRefreshMenu();
  const refreshCurrentUser = useRefreshCurrentUser();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await apiFetch("/api/Auth/login", {
        method: "POST",
        body: JSON.stringify({ userName, password }),
      });
      if (data?.token) {
        localStorage.setItem("akira_token", data.token);
      }
      await Promise.all([refreshMenu(), refreshCurrentUser()]);
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid h-screen w-full overflow-hidden bg-background lg:grid-cols-2">
      {/* Left -- branding panel */}
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative hidden flex-col overflow-hidden p-10 text-white lg:flex"
        style={{ background: "linear-gradient(135deg, #FF6B35 0%, #FF7A00 55%, #FFA94D 100%)" }}
      >
        {/* Floating decorative shapes */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
          animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-black/10 blur-3xl"
          animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute right-10 top-1/3 h-24 w-24 rounded-full border border-white/20"
          animate={{ y: [0, 14, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div aria-hidden className="pointer-events-none absolute right-16 top-24 grid grid-cols-6 gap-2 opacity-30">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} className="h-1 w-1 rounded-full bg-white" />
          ))}
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-md bg-white p-1 shadow-sm">
            <img src="/akira-logo.png" alt="Akira" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="font-display text-xl font-bold leading-none tracking-tight">akira.</div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-white/80">School ERP</div>
          </div>
        </div>

        <div className="relative mt-auto space-y-7">
          <div className="space-y-3">
            <h1 className="font-display text-4xl font-bold leading-tight xl:text-5xl">
              One platform to run
              <br /> your entire school.
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-white/85">
              Students, attendance, timetable, examinations, fees and administration —
              beautifully organised in one modern ERP.
            </p>
          </div>

          <div className="grid max-w-md grid-cols-3 gap-3 pt-1">
            {FEATURES.map(({ icon: Icon, label, desc }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }}
                whileHover={{ y: -3, scale: 1.02 }}
                className="rounded-[20px] border border-white/20 bg-white/10 p-3.5 shadow-sm backdrop-blur-md transition-shadow hover:shadow-lg"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="mt-2.5 text-xs font-semibold">{label}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-white/75">{desc}</div>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-white/85">
            <ShieldCheck className="h-4 w-4" /> Secured by role-based access
          </div>
        </div>

        {/* School building illustration, softly blended into the background */}
        <svg
          aria-hidden
          viewBox="0 0 500 160"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full text-white/10"
          preserveAspectRatio="xMidYMax slice"
        >
          <rect x="40" y="60" width="420" height="100" fill="currentColor" />
          <rect x="210" y="10" width="80" height="150" fill="currentColor" />
          <polygon points="200,10 250,-25 300,10" fill="currentColor" />
          <circle cx="250" cy="20" r="4" fill="currentColor" />
          {Array.from({ length: 8 }).map((_, i) => (
            <rect key={i} x={60 + i * 46} y="85" width="22" height="26" fill="#FF7A00" opacity="0.35" />
          ))}
          <rect x="235" y="120" width="30" height="40" fill="#FF7A00" opacity="0.4" />
        </svg>
      </motion.div>

      {/* Right -- authentication panel */}
      <div
        className="relative flex h-full flex-col overflow-y-auto p-6 sm:p-10"
        style={{ backgroundColor: "#FAFAFA", backgroundImage: "radial-gradient(#00000008 1px, transparent 1px)", backgroundSize: "22px 22px" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-primary/10 p-1">
              <img src="/akira-logo.png" alt="Akira" className="h-full w-full object-contain" />
            </div>
            <span className="font-display text-lg font-bold">akira<span className="text-primary">.</span></span>
          </div>
          <div className="ml-auto"><ThemeToggle /></div>
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="w-full max-w-[480px] rounded-[32px] border border-border/60 bg-card/95 p-8 shadow-2xl backdrop-blur-sm sm:p-10"
          >
            <div className="flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.25, type: "spring" }}
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: "linear-gradient(135deg, #FF6B35, #FF7A00)" }}
              >
                <Lock className="h-6 w-6 text-white" />
              </motion.div>
              <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground">Welcome Back</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">Sign in to continue to your dashboard</p>
            </div>

            <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
              {error && (
                <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="username" required>Username</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="h-11 rounded-xl pl-9 transition-shadow focus-visible:shadow-md"
                    placeholder="Enter username"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" required>Password</Label>
                  <button type="button" className="text-xs font-medium text-primary hover:underline">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPwd ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl pl-9 pr-10 transition-shadow focus-visible:shadow-md"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                    aria-pressed={showPwd}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <label htmlFor="remember" className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox id="remember" defaultChecked /> Remember me
                </label>
              </div>

              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-[52px] w-full rounded-xl text-white shadow-md transition-shadow hover:shadow-xl"
                  style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing In...
                    </>
                  ) : (
                    <>
                      Sign in <ArrowRight className="ml-1.5 h-4 w-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            </form>
          </motion.div>
        </div>

        <p className="pb-2 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Akira School ERP
          <br className="sm:hidden" /> All Rights Reserved
        </p>
      </div>
    </div>
  );
}
