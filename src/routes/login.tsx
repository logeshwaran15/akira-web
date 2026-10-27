import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { User, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
    e.stopPropagation();
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
      // Fire-and-forget: these just invalidate React Query caches so the
      // sidebar/menu and header refetch once we're on the dashboard. No need
      // to make the user wait on the network for them before navigating.
      refreshMenu();
      refreshCurrentUser();
      // Parents get their own dashboard page; everyone else lands on /dashboard.
      const me = await apiFetch("/api/Auth/me").catch(() => null);
      navigate({ to: me?.roleCode === "PARENT" ? "/parent-dashboard" : "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setLoading(false);
    }
  };

  return (
    <div className="grid h-screen w-full overflow-hidden bg-[#FFF8F3] lg:grid-cols-2">
      {/* Left -- illustration panel */}
      <div className="hidden flex-col items-center justify-center p-10 lg:flex">
        <img src="/agency.png" alt="Akira School ERP" className="max-h-[55%] w-full max-w-[560px] object-contain" />
        <h1 className="mt-10 text-center font-display text-3xl font-bold tracking-tight text-slate-800">
          Smarter School Management
        </h1>
        <p className="mt-4 max-w-[480px] text-center text-sm leading-relaxed text-slate-500">
          Akira School ERP brings admissions, attendance, timetables, examinations and report cards together, so your school runs from one simple platform.
        </p>
      </div>

      {/* Right -- authentication panel */}
      <div className="relative flex h-full flex-col overflow-y-auto p-4 sm:p-8">
        <div className="flex flex-1 items-center justify-center rounded-2xl bg-white p-6 sm:p-10">
          <div className="w-full max-w-[500px] animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col items-center text-center">
              <img src="/akira-logo.png" alt="Akira" className="mb-6 h-24 w-auto object-contain" />
              <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900">Sign In</h2>
              <p className="mt-2 text-base text-slate-400">Sign in to continue to your dashboard</p>
            </div>

            <form action="#" method="post" onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
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
                    autoFocus
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="h-[54px] rounded-md pl-9 focus-visible:border-primary focus-visible:ring-primary/30"
                    placeholder="Enter username"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" required>Password</Label>
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
                    className="h-[54px] rounded-md pl-9 pr-10 focus-visible:border-primary focus-visible:ring-primary/30"
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
                <button type="button" className="text-sm font-medium text-primary hover:underline">
                  Forgot Password ?
                </button>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="mt-4 h-[52px] w-full rounded-md bg-primary text-white shadow-none transition-colors hover:bg-primary/90 active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing In...
                  </>
                ) : (
                  <>
                    Sign In
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        <p className="pb-2 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Akira School ERP
          <br className="sm:hidden" /> All Rights Reserved
        </p>
      </div>
    </div>
  );
}
