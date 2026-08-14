import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CalendarClock,
  ClipboardList,
  Wallet,
  Library,
  Bus,
  Bell,
  Mail,
  MessageSquare,
  Search,
  Settings,
  Settings2,
  Maximize2,
  Minimize2,
  LayoutGrid,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Blocks,
  Menu,
  X,
  Circle,
  Building2,
  ShieldCheck,
  KeyRound,
  User,
  LogOut,
  Layers,
  UserCheck,
  Award,
  CreditCard,
  MessageCircle,
  Hash,
  PhoneCall,
  FileText,
  UserPlus,
  GitBranch,
  FileBarChart,
  IdCard,
  FileCog,
  Percent,
  Users2,
  UserCog,
  Gauge,
  Target,
  NotebookPen,
  TrendingUp,
  Crosshair,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMenu, type MenuNode } from "@/hooks/use-menu";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTenantSetting } from "@/hooks/use-tenant-setting";
import { useNotifications } from "@/hooks/use-notifications";
import { useLogout } from "@/hooks/use-logout";
import { apiFetch, API_BASE_URL } from "@/lib/api";

// Maps the "Icon" string stored in AkiraMenu to the actual lucide-react component.
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CalendarClock,
  ClipboardList,
  Wallet,
  Library,
  Bus,
  Settings,
  Settings2,
  Blocks,
  Bell,
  Mail,
  Building2,
  ShieldCheck,
  KeyRound,
  Layers,
  UserCheck,
  Award,
  CreditCard,
  MessageCircle,
  Hash,
  PhoneCall,
  FileText,
  UserPlus,
  GitBranch,
  FileBarChart,
  IdCard,
  FileCog,
  Percent,
  Users2,
  UserCog,
  Gauge,
  Target,
  NotebookPen,
  TrendingUp,
  Crosshair,
  Clock,
};

// Fixed accent color per menu item (TenantMenu.IconColor), applied when the
// item isn't in its active/highlighted state. Written out as literal
// Tailwind classes (not template-built) so Tailwind's content scanner picks
// them up -- a class name built dynamically at runtime wouldn't be.
const iconColorMap: Record<string, string> = {
  blue: "text-blue-500",
  violet: "text-violet-500",
  slate: "text-slate-500",
  amber: "text-amber-500",
  emerald: "text-emerald-500",
  orange: "text-orange-500",
  sky: "text-sky-500",
  pink: "text-pink-500",
  rose: "text-rose-500",
  teal: "text-teal-500",
  indigo: "text-indigo-500",
  cyan: "text-cyan-500",
  fuchsia: "text-fuchsia-500",
  red: "text-red-500",
};

function resolveIcon(name?: string | null, color?: string | null, active?: boolean) {
  const Icon = (name && iconMap[name]) || Circle;
  const colorClass = !active && color ? iconColorMap[color] : undefined;
  return <Icon className={cn("h-4 w-4", colorClass)} />;
}

const SIDEBAR_COLLAPSED_KEY = "akira_sidebar_collapsed";

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [appsOpen, setAppsOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const { location } = useRouterState();
  const { sections: navSections } = useMenu();
  const { user } = useCurrentUser();
  const { setting: tenantSetting } = useTenantSetting();

  const displayName = user?.userName ?? "Guest";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const avatarUrl = user?.profileImagePath ? `${API_BASE_URL}${user.profileImagePath}` : null;
  const brandLogoUrl = tenantSetting?.logoUrl ? `${API_BASE_URL}${tenantSetting.logoUrl}` : "/akira-logo.png";

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Persist the collapse toggle so a page refresh doesn't reset it.
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  // Auto-expand whichever section contains the current route.
  useEffect(() => {
    const active = navSections.find((section) =>
      section.children.some((c) => c.url && location.pathname.startsWith(c.url)),
    );
    if (active) {
      setExpandedSections((prev) => new Set(prev).add(active.akiraMenuKey));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, navSections.length]);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Bare shell for auth routes
  if (location.pathname === "/login") {
    return <Outlet />;
  }


  const searchTerm = menuSearch.trim().toLowerCase();
  const filteredSections = searchTerm
    ? navSections
        .map((section) => {
          const sectionMatches = section.menuName.toLowerCase().includes(searchTerm);
          return {
            ...section,
            // A section whose own name matches keeps all its children (so you
            // can browse the whole section); otherwise only matching children
            // are kept, so a section never renders with an empty child list.
            children: sectionMatches
              ? section.children
              : section.children.filter((c) => c.menuName.toLowerCase().includes(searchTerm)),
          };
        })
        .filter((section) => section.menuName.toLowerCase().includes(searchTerm) || section.children.length > 0)
    : navSections;

  const renderNav = (items: MenuNode["children"], compact: boolean) =>
    items
      .filter((item) => item.url)
      .map((item) => {
        const to = item.url as string;
        const active = location.pathname.startsWith(to);
        return (
          <Link
            key={item.akiraMenuKey}
            to={to}
            className={cn(
              "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-all duration-200 ease-out",
              active
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                : "text-sidebar-foreground/70 hover:translate-x-0.5 hover:bg-primary/10 hover:text-primary",
              compact && "justify-center px-2 hover:translate-x-0",
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors duration-200",
                active
                  ? "bg-white/15 text-primary-foreground"
                  : "text-sidebar-foreground/60 group-hover:bg-primary/15 group-hover:text-primary",
              )}
            >
              {resolveIcon(item.icon, item.iconColor, active)}
            </span>
            {!compact && <span className="flex-1 truncate">{item.menuName}</span>}
          </Link>
        );
      });

  // Rendered inline (not as a nested component) -- defining this as its own
  // component would give it a new function identity on every AppLayout
  // render, which makes React remount the whole subtree (including the
  // search <input>) on each keystroke and drop focus after one character.
  const renderSidebar = (compact: boolean) => (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary/10 shadow-sm">
          <img src={brandLogoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
        </div>
        {!compact && (
          <div className="min-w-0 leading-tight">
            <div className="font-display text-lg font-bold tracking-tight">
              akira<span className="text-primary">.</span>
            </div>
            <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              School ERP
            </div>
          </div>
        )}
        <button
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!compact && (
        <div className="border-b border-sidebar-border px-3 py-2.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary" />
            <input
              type="text"
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              placeholder="Search menu..."
              className="h-8 w-full rounded-md border border-primary/20 bg-primary/5 pl-8 pr-2 text-xs outline-none transition-colors focus:border-primary focus:bg-background"
            />
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-3 overflow-y-auto px-2.5 py-3">
        {filteredSections.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">No menu items found.</div>
        ) : (
          filteredSections.map((section) => {
            if (section.children.length === 0 && section.url) {
              // Flat menu item (no sub-items) -- render as a clickable link
              // itself instead of a non-clickable section header.
              return (
                <div key={section.akiraMenuKey} className="space-y-0.5">
                  {renderNav([section], compact)}
                </div>
              );
            }

            const isOpen = searchTerm.length > 0 || expandedSections.has(section.akiraMenuKey);

            if (compact) {
              // Icon-only mode -- hover the section icon to reveal a flyout
              // card with the section name and its clickable sub-items.
              const sectionActive = section.children.some(
                (c) => c.url && location.pathname.startsWith(c.url),
              );
              return (
                <HoverCard key={section.akiraMenuKey} openDelay={100} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <div
                      className={cn(
                        "mx-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-md transition-colors",
                        sectionActive
                          ? "bg-primary/15 text-primary"
                          : "text-sidebar-foreground/60 hover:bg-primary/10 hover:text-primary",
                      )}
                    >
                      {resolveIcon(section.icon, section.iconColor, sectionActive)}
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent side="right" align="start" sideOffset={12} className="w-56 p-2">
                    <div className="mb-1.5 px-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {section.menuName}
                    </div>
                    <div className="space-y-0.5">{renderNav(section.children, false)}</div>
                  </HoverCardContent>
                </HoverCard>
              );
            }

            return (
              <div key={section.akiraMenuKey} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleSection(section.akiraMenuKey)}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  {resolveIcon(section.icon, section.iconColor, false)}
                  <span className="flex-1 truncate text-left">{section.menuName}</span>
                  <ChevronRight className={cn("h-3 w-3 shrink-0 transition-transform duration-200", isOpen && "rotate-90")} />
                </button>
                {isOpen && (
                  <div className="ml-2 space-y-0.5 border-l border-sidebar-border pl-2">
                    {renderNav(section.children, compact)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-md bg-sidebar-accent/60 p-2",
            compact && "justify-center",
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-sm font-semibold text-primary">
            {avatarUrl ? <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" /> : initials}
          </div>
          {!compact && (
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-semibold">{displayName}</div>
              <div className="truncate text-xs text-muted-foreground">{user?.roleName ?? ""}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        {renderSidebar(collapsed)}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar shadow-xl transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {renderSidebar(false)}
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur md:px-6">
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Desktop collapse toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-9 w-9 lg:inline-flex"
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Toggle sidebar"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>

          <div className="hidden max-w-md flex-1 md:flex">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
              <input
                type="text"
                placeholder="Search in Akira ERP"
                className="h-9 w-full rounded-md border border-primary/20 bg-primary/5 pl-9 pr-16 text-sm outline-none transition-colors focus:border-primary focus:bg-background"
              />
              <kbd className="pointer-events-none absolute right-2 top-1/2 hidden h-6 -translate-y-1/2 items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-1.5 text-[10px] font-medium text-primary lg:flex">
                CTRL + /
              </kbd>
            </div>
          </div>

          {/* Mobile brand */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-primary/10">
              <img src={brandLogoUrl} alt="Logo" className="h-full w-full object-cover object-left" />
            </div>
            <span className="font-display text-base font-bold">akira<span className="text-primary">.</span></span>
          </div>

          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
            <IconBtn
              tone="teal"
              className="hidden md:flex"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </IconBtn>
            <IconBtn
              tone="primary"
              className="hidden md:flex"
              onClick={() => setAppsOpen(true)}
              aria-label="Apps"
            >
              <LayoutGrid className="h-4 w-4" />
            </IconBtn>
            <IconBtn
              tone="info"
              className="hidden sm:flex"
              onClick={() => setMessagesOpen(true)}
              aria-label="Messages"
            >
              <MessageSquare className="h-4 w-4" />
            </IconBtn>
            <IconBtn tone="purple" className="hidden sm:flex" onClick={() => setMailOpen(true)} aria-label="Mail">
              <Mail className="h-4 w-4" />
            </IconBtn>
            <ThemeToggle />
            <NotificationBell />
            <div className="ml-1 hidden items-center gap-2 pl-1 sm:flex">
              <div className="text-right leading-tight">
                <div className="truncate text-sm font-semibold">{displayName}</div>
                <div className="truncate text-[11px] text-muted-foreground">{user?.roleName ?? ""}</div>
              </div>
            </div>
            <ProfileMenu displayName={displayName} roleName={user?.roleName ?? ""} initials={initials} avatarUrl={avatarUrl} />
          </div>
        </header>

        <AppsLauncherPanel open={appsOpen} onOpenChange={setAppsOpen} sections={navSections} />
        <MessagesPanel open={messagesOpen} onOpenChange={setMessagesOpen} />
        <MailPanel open={mailOpen} onOpenChange={setMailOpen} />

        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
}

const SLIDE_PANEL_CLASS = "flex w-full flex-col gap-0 p-0 sm:w-[40%] sm:max-w-none";

function AppsLauncherPanel({
  open,
  onOpenChange,
  sections,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: MenuNode[];
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={SLIDE_PANEL_CLASS}>
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle>Apps</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-5">
          {sections.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No modules available.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {sections.map((section) => {
                const to = section.url ?? section.children.find((c) => c.url)?.url;
                if (!to) return null;
                return (
                  <Link
                    key={section.akiraMenuKey}
                    to={to}
                    onClick={() => onOpenChange(false)}
                    className="flex flex-col items-center gap-2 rounded-md border border-transparent p-3 text-center text-xs font-medium text-foreground/80 transition-colors hover:border-border hover:bg-secondary/60"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      {resolveIcon(section.icon, section.iconColor, false)}
                    </span>
                    <span className="line-clamp-2">{section.menuName}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MessagesPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={SLIDE_PANEL_CLASS}>
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle>Messages</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-5 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No messages yet</p>
          <p className="text-xs text-muted-foreground">
            Direct messaging isn't set up for this workspace yet.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

type EmailTemplateRow = {
  akiraEmailTemplateKey: string;
  templateName: string;
  subject: string;
  description: string | null;
  isActive: boolean;
};

function MailPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [templates, setTemplates] = useState<EmailTemplateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    setLoading(true);
    apiFetch("/api/EmailTemplate")
      .then((t: EmailTemplateRow[]) => setTemplates(t))
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setLoaded(true);
      });
  }, [open, loaded]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={SLIDE_PANEL_CLASS}>
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle>Mail Templates</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Mail className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">No email templates configured</p>
              <p className="text-xs text-muted-foreground">
                Configure templates for admissions, fees and attendance alerts.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <Link
                  key={t.akiraEmailTemplateKey}
                  to="/email-templates"
                  onClick={() => onOpenChange(false)}
                  className="block rounded-md border border-border p-3 transition-colors hover:bg-secondary/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{t.templateName}</span>
                    {!t.isActive && (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{t.subject}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

const ICON_BTN_TONE_STYLES: Record<string, string> = {
  primary: "text-primary hover:bg-primary/10",
  info: "text-info hover:bg-info/10",
  success: "text-success hover:bg-success/10",
  warning: "text-[oklch(0.55_0.15_65)] hover:bg-warning/15",
  purple: "text-[oklch(0.55_0.2_300)] hover:bg-[oklch(0.75_0.17_300)]/10",
  teal: "text-[oklch(0.4_0.12_200)] hover:bg-[oklch(0.55_0.1_200)]/10",
  destructive: "text-destructive hover:bg-destructive/10",
};

function IconBtn({
  children,
  dot,
  tone,
  className,
  onClick,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  dot?: string;
  tone?: keyof typeof ICON_BTN_TONE_STYLES;
  className?: string;
  onClick?: () => void;
  "aria-label"?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-md border border-transparent transition-colors hover:border-border",
        tone ? ICON_BTN_TONE_STYLES[tone] : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        className,
      )}
    >
      {children}
      {dot && <span className={cn("absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-background", dot)} />}
    </button>
  );
}

function ProfileMenu({
  displayName,
  roleName,
  initials,
  avatarUrl,
}: {
  displayName: string;
  roleName: string;
  initials: string;
  avatarUrl: string | null;
}) {
  const logout = useLogout();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary/60 text-sm font-semibold text-primary-foreground"
          aria-label="Account menu"
        >
          {avatarUrl ? <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" /> : initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="truncate text-sm font-semibold">{displayName}</div>
          <div className="truncate text-xs font-normal text-muted-foreground">{roleName}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NotificationBell() {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label="Notifications"
        onClick={() => setOpen(true)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-destructive transition-colors hover:border-border hover:bg-destructive/10"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground ring-2 ring-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className={SLIDE_PANEL_CLASS}>
          <SheetHeader className="flex-row items-center justify-between space-y-0 border-b border-border px-5 py-4">
            <SheetTitle>Notifications</SheetTitle>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                className="text-xs font-medium text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.akiraNotificationKey}
                  onClick={() => !n.isRead && markRead(n.akiraNotificationKey)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 border-b border-border px-5 py-3 text-left transition-colors last:border-0 hover:bg-secondary/60",
                    !n.isRead && "bg-primary/5",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {!n.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                    <span className="flex-1 truncate text-sm font-medium">{n.title}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(n.createdOn)}</span>
                  </div>
                  {n.message && <p className="ml-3.5 truncate text-xs text-muted-foreground">{n.message}</p>}
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
