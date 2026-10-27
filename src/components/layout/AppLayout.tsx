import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMenu, type MenuNode } from "@/hooks/use-menu";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTenantSetting } from "@/hooks/use-tenant-setting";
import { useNotifications } from "@/hooks/use-notifications";
import { useLogout } from "@/hooks/use-logout";
import { useAcademicYear } from "@/hooks/use-academic-year";
import { API_BASE_URL } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

// Soft semi-3D app-tile icons for the sidebar footer links (in place of plain
// Lucide line icons). Each is built from layered shapes with a top-to-bottom
// gradient (light -> saturated) plus a soft highlight and a faint drop shadow,
// giving a subtle raised, "SaaS app icon" feel without going glossy/cartoonish.
// `id` (from useId()) namespaces the <linearGradient>/<filter> defs so two
// simultaneous instances (desktop + mobile sidebar both render these) never
// collide on the same gradient id.
function UserManualIcon({ className, id }: { className?: string; id: string }) {
  const grad = `um-grad-${id}`;
  const shadow = `um-shadow-${id}`;
  return (
    <svg viewBox="0 0 28 28" className={className} fill="none">
      <defs>
        <linearGradient id={grad} x1="4" y1="4" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.55" />
          <stop offset="1" stopColor="currentColor" stopOpacity="1" />
        </linearGradient>
        <filter id={shadow} x="-20%" y="-10%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="0.9" floodColor="currentColor" floodOpacity="0.35" />
        </filter>
      </defs>
      <g filter={`url(#${shadow})`}>
        <path
          d="M14 8.2c-1.6-1.1-4-1.7-6.3-1.7-.9 0-1.7.72-1.7 1.6v11.4c0 .9.8 1.55 1.7 1.5 2.2-.12 4.7.45 6.3 1.5V8.2Z"
          fill={`url(#${grad})`}
          opacity="0.6"
        />
        <path
          d="M14 8.2c1.6-1.1 4-1.7 6.3-1.7.9 0 1.7.72 1.7 1.6v11.4c0 .9-.8 1.55-1.7 1.5-2.2-.12-4.7.45-6.3 1.5V8.2Z"
          fill={`url(#${grad})`}
        />
      </g>
      <path d="M14 8.2v14.3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <path
        d="M16.2 10.4c1.2-.5 2.7-.75 4-.75"
        stroke="white"
        strokeOpacity="0.55"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SupportCenterIcon({ className, id }: { className?: string; id: string }) {
  const grad = `sc-grad-${id}`;
  const shadow = `sc-shadow-${id}`;
  return (
    <svg viewBox="0 0 28 28" className={className} fill="none">
      <defs>
        <linearGradient id={grad} x1="6" y1="6" x2="22" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.65" />
          <stop offset="1" stopColor="currentColor" stopOpacity="1" />
        </linearGradient>
        <filter id={shadow} x="-20%" y="-10%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="0.9" floodColor="currentColor" floodOpacity="0.35" />
        </filter>
      </defs>
      <g filter={`url(#${shadow})`}>
        <path
          d="M5.5 15.5a8.5 8.5 0 0 1 17 0"
          stroke={`url(#${grad})`}
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <rect x="4.3" y="14.7" width="4.4" height="7" rx="2.1" fill={`url(#${grad})`} />
        <rect x="19.3" y="14.7" width="4.4" height="7" rx="2.1" fill={`url(#${grad})`} opacity="0.75" />
      </g>
      <path
        d="M10.5 21.6h3.2a2.3 2.3 0 0 0 2.3-2.3v-.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path d="M6.2 15.6c.5-.3 1-.4 1.5-.4" stroke="white" strokeOpacity="0.5" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}

function PolicyIcon({ className, id }: { className?: string; id: string }) {
  const grad = `pl-grad-${id}`;
  const shadow = `pl-shadow-${id}`;
  return (
    <svg viewBox="0 0 28 28" className={className} fill="none">
      <defs>
        <linearGradient id={grad} x1="14" y1="4" x2="14" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.55" />
          <stop offset="1" stopColor="currentColor" stopOpacity="1" />
        </linearGradient>
        <filter id={shadow} x="-20%" y="-10%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="0.9" floodColor="currentColor" floodOpacity="0.35" />
        </filter>
      </defs>
      <g filter={`url(#${shadow})`}>
        <path
          d="M14 4.2 5.8 7v6.4c0 5.1 3.4 9.4 8.2 11 4.8-1.6 8.2-5.9 8.2-11V7L14 4.2Z"
          fill={`url(#${grad})`}
        />
      </g>
      <path
        d="M14 5.6 7.4 7.9v5.5c0 4.3 2.8 7.9 6.6 9.3 3.8-1.4 6.6-5 6.6-9.3V7.9L14 5.6Z"
        fill="white"
        fillOpacity="0.08"
      />
      <path
        d="m10.6 14.1 2.3 2.3 4.5-4.5"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const FOOTER_LINKS: {
  label: string;
  icon: (props: { className?: string; id: string }) => ReactElement;
  image: string;
  bg: string;
  text: string;
  to?: string;
}[] = [
  {
    label: "User Manual",
    icon: UserManualIcon,
    image: "/assets/icons/user-manual.png",
    bg: "bg-emerald-500/15",
    text: "text-emerald-600",
    to: "/user-manual",
  },
  {
    label: "Support Center",
    icon: SupportCenterIcon,
    image: "/assets/icons/support-center.png",
    bg: "bg-amber-700/15",
    text: "text-amber-700",
    to: "/support-center",
  },
  {
    label: "Policy",
    icon: PolicyIcon,
    image: "/assets/icons/policy.png",
    bg: "bg-violet-500/15",
    text: "text-violet-600",
  },
];

// Renders the real uploaded icon image when present at /assets/icons/, falling
// back to the flat-illustration SVG (above) if the file is missing (e.g. before
// the user has dropped an image in) so the sidebar never shows a broken image.
function FooterIcon({
  image,
  fallback: Fallback,
  className,
}: {
  image: string;
  fallback: (props: { className?: string; id: string }) => ReactElement;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const gradId = useId();
  if (failed) return <Fallback className={className} id={gradId} />;
  return (
    <img
      src={image}
      alt=""
      className={cn(className, "object-contain")}
      onError={() => setFailed(true)}
    />
  );
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [topSearchOpen, setTopSearchOpen] = useState(false);
  const [topSearchTerm, setTopSearchTerm] = useState("");
  const topSearchRef = useRef<HTMLDivElement>(null);
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
  const brandLogoUrl = tenantSetting?.logoUrl ? `${API_BASE_URL}${tenantSetting.logoUrl}` : null;

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

  // Close the top-bar search dropdown on outside click, and whenever the route changes.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (topSearchRef.current && !topSearchRef.current.contains(e.target as Node)) {
        setTopSearchOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    setTopSearchOpen(false);
  }, [location.pathname]);

  // Persist the collapse toggle so a page refresh doesn't reset it.
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  // A group (Sub Menu with its own Child Menu items) counts as "active" when
  // any leaf underneath it matches the current route, so its chevron/header
  // can be highlighted even though the group itself isn't a link.
  const hasActiveDescendant = (item: MenuNode): boolean =>
    item.children.length > 0
      ? item.children.some((c) => hasActiveDescendant(c))
      : !!item.url && location.pathname.startsWith(item.url);

  // Auto-expand every ancestor group (Sub Menu, and its Main Menu section)
  // that leads down to whichever leaf matches the current route.
  useEffect(() => {
    const ancestorKeys: string[] = [];
    const findPath = (items: MenuNode[]): boolean =>
      items.some((item) => {
        if (item.children.length > 0) {
          if (findPath(item.children)) {
            ancestorKeys.push(item.akiraMenuKey);
            return true;
          }
          return false;
        }
        return !!item.url && location.pathname.startsWith(item.url);
      });

    for (const section of navSections) {
      if (findPath(section.children)) {
        ancestorKeys.push(section.akiraMenuKey);
        break;
      }
    }

    if (ancestorKeys.length > 0) {
      setExpandedSections((prev) => {
        const next = new Set(prev);
        ancestorKeys.forEach((k) => next.add(k));
        return next;
      });
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
  if (location.pathname === "/login" || location.pathname === "/session-expired") {
    return <Outlet />;
  }

  const searchTerm = menuSearch.trim().toLowerCase();

  // A node survives the filter if its own name matches (in which case it
  // keeps its whole subtree, so you can browse the rest of that branch) or
  // if any descendant matches (in which case only the matching descendants
  // are kept, so a branch never renders with an empty child list).
  const filterNodes = (items: MenuNode[]): MenuNode[] =>
    items
      .map((item) => {
        const selfMatches = item.menuName.toLowerCase().includes(searchTerm);
        return {
          ...item,
          children: selfMatches ? item.children : filterNodes(item.children),
        };
      })
      .filter((item) => item.menuName.toLowerCase().includes(searchTerm) || item.children.length > 0);

  const filteredSections = searchTerm ? filterNodes(navSections) : navSections;

  // Flattened, searchable list of every clickable menu item at any depth,
  // used by the top-bar search dropdown (separate from the sidebar's own
  // menu search above).
  const flattenLeaves = (items: MenuNode[]): MenuNode[] =>
    items.flatMap((item) => (item.children.length > 0 ? flattenLeaves(item.children) : item.url ? [item] : []));
  const allMenuItems = flattenLeaves(navSections);
  const topSearchQuery = topSearchTerm.trim().toLowerCase();
  const topSearchResults = topSearchQuery
    ? allMenuItems.filter((item) => item.menuName.toLowerCase().includes(topSearchQuery))
    : allMenuItems.slice(0, 6);

  const renderNav = (items: MenuNode["children"], compact: boolean, depth = 0): ReactNode =>
    items.map((item) => {
      if (item.children.length > 0) {
        // Sub Menu / Child Menu group -- expandable header, not itself a link.
        // Only reached through a non-compact flyout body, so `compact` here
        // just suppresses the label/chevron the same way a leaf link does.
        const isOpen = searchTerm.length > 0 || expandedSections.has(item.akiraMenuKey);
        const groupActive = hasActiveDescendant(item);
        return (
          <div key={item.akiraMenuKey} className="space-y-0.5">
            <button
              type="button"
              onClick={() => toggleSection(item.akiraMenuKey)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors duration-200",
                groupActive
                  ? "text-primary"
                  : "text-sidebar-foreground/70 hover:bg-primary/10 hover:text-primary",
                compact && "justify-center px-2",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors duration-200",
                  groupActive ? "bg-primary/15 text-primary" : "text-sidebar-foreground/60",
                )}
              >
                {resolveIcon(item.icon, item.iconColor, false)}
              </span>
              {!compact && <span className="flex-1 truncate text-left">{item.menuName}</span>}
              {!compact && (
                <ChevronRight
                  className={cn(
                    "h-3 w-3 shrink-0 transition-transform duration-200",
                    isOpen && "rotate-90",
                  )}
                />
              )}
            </button>
            {!compact && isOpen && (
              <div className="ml-2 space-y-0.5 border-l border-sidebar-border pl-2">
                {renderNav(item.children, false, depth + 1)}
              </div>
            )}
          </div>
        );
      }

      if (!item.url) return null;
      const to = item.url;
      const active = location.pathname.startsWith(to);
      return (
        <Link
          key={item.akiraMenuKey}
          to={to}
          className={cn(
            "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-all duration-200 ease-out",
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
      <div className="relative flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
        <div
          className={cn(
            "flex min-w-0 flex-1 items-center justify-center overflow-hidden",
            compact ? "h-10" : "h-11",
          )}
        >
          {brandLogoUrl ? (
            <img
              src={brandLogoUrl}
              alt="School logo"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-muted-foreground">
              <Building2 className="h-4 w-4" />
            </div>
          )}
        </div>
        <button
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((c) => !c)}
          aria-label="Toggle sidebar"
          className="absolute -right-4 top-1/2 z-50 hidden h-8 w-8 -translate-y-1/2 rounded-full border border-primary/30 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 lg:inline-flex"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
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
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
            No menu items found.
          </div>
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
              const sectionActive = hasActiveDescendant(section);
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
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  {resolveIcon(section.icon, section.iconColor, false)}
                  <span className="flex-1 truncate text-left">{section.menuName}</span>
                  <ChevronRight
                    className={cn(
                      "h-3 w-3 shrink-0 transition-transform duration-200",
                      isOpen && "rotate-90",
                    )}
                  />
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

      <div className="border-t border-sidebar-border p-2.5">
        {compact ? (
          <div className="space-y-1">
            {FOOTER_LINKS.map(({ label, icon, image, to }) => {
              const Comp = to ? Link : "button";
              return (
                <Comp
                  key={label}
                  {...(to ? { to } : { type: "button" })}
                  title={label}
                  className="group flex w-full items-center justify-center rounded-md py-1.5 transition-transform duration-200 hover:scale-105"
                >
                  <FooterIcon image={image} fallback={icon} className="h-7 w-7 shrink-0" />
                </Comp>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {FOOTER_LINKS.map(({ label, icon, image, text, to }) => {
              const Comp = to ? Link : "button";
              return (
                <Comp
                  key={label}
                  {...(to ? { to } : { type: "button" })}
                  className="group flex flex-col items-center gap-1 rounded-md py-1.5 transition-transform duration-200 hover:scale-105"
                >
                  <FooterIcon image={image} fallback={icon} className="h-9 w-9" />
                  <span className={cn("truncate text-[10px] font-semibold", text)}>{label}</span>
                </Comp>
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar -- fixed to the viewport; only the content pane (below) scrolls,
          so wide page content never drags the sidebar along horizontally. */}
      <aside
        className={cn(
          "z-30 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex",
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

      {/* Main -- this column owns the only scrollbar; header stays pinned to its top
          via `sticky`, and wide content inside <main> scrolls horizontally within
          itself instead of widening (and dragging) the whole layout. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur md:px-6">
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

          <div ref={topSearchRef} className="relative hidden max-w-md flex-1 md:flex">
            <div className="flex h-10 w-full items-center rounded-full border border-primary/20 bg-primary/5 pl-4 pr-1 transition-colors focus-within:border-primary focus-within:bg-background">
              <Search className="h-4 w-4 shrink-0 text-primary" />
              <input
                type="text"
                value={topSearchTerm}
                onChange={(e) => setTopSearchTerm(e.target.value)}
                onFocus={() => setTopSearchOpen(true)}
                placeholder="Search in Akira ERP"
                className="h-full flex-1 bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                <Search className="h-3.5 w-3.5" />
                Search
              </button>
            </div>

            {topSearchOpen && (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
                <div className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {topSearchQuery ? "Results" : "Quick Links"}
                </div>
                {topSearchResults.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No matching menu items.
                  </p>
                ) : (
                  <div className="p-2">
                    {topSearchResults.map((item) => (
                      <Link
                        key={item.akiraMenuKey}
                        to={item.url as string}
                        onClick={() => setTopSearchOpen(false)}
                        className="flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-secondary/60"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          {resolveIcon(item.icon, item.iconColor, false)}
                        </span>
                        <span className="truncate font-medium text-foreground">{item.menuName}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile brand */}
          <div className="flex h-8 max-w-[140px] items-center justify-center overflow-hidden md:hidden">
            {brandLogoUrl ? (
              <img src={brandLogoUrl} alt="School logo" className="max-h-full max-w-full object-contain" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-muted-foreground">
                <Building2 className="h-4 w-4" />
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
            <AcademicYearSwitcher />
            <IconBtn
              tone="teal"
              className="hidden md:flex"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </IconBtn>
            <Link to="/chat" className="hidden sm:flex">
              <IconBtn tone="info" aria-label="Messages">
                <MessageSquare className="h-4 w-4" />
              </IconBtn>
            </Link>
            <NotificationBell />
            <div className="ml-1 hidden items-center gap-2 pl-1 sm:flex">
              <div className="text-right leading-tight">
                <div className="truncate text-sm font-semibold">{displayName}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {user?.roleName ?? ""}
                </div>
              </div>
            </div>
            <ProfileMenu
              displayName={displayName}
              roleName={user?.roleName ?? ""}
              initials={initials}
              avatarUrl={avatarUrl}
            />
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden p-3 sm:p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
}


const ICON_BTN_TONE_STYLES: Record<string, string> = {
  primary: "bg-primary/10 text-primary hover:bg-primary/15",
  info: "bg-info/10 text-info hover:bg-info/15",
  success: "bg-success/10 text-success hover:bg-success/15",
  warning: "bg-warning/15 text-[oklch(0.55_0.15_65)] hover:bg-warning/25",
  purple: "bg-[oklch(0.75_0.17_300)]/10 text-[oklch(0.55_0.2_300)] hover:bg-[oklch(0.75_0.17_300)]/20",
  teal: "bg-[oklch(0.55_0.1_200)]/10 text-[oklch(0.4_0.12_200)] hover:bg-[oklch(0.55_0.1_200)]/20",
  destructive: "bg-destructive/10 text-destructive hover:bg-destructive/15",
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
        "relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0",
        tone ? ICON_BTN_TONE_STYLES[tone] : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground",
        className,
      )}
    >
      {children}
      {dot && (
        <span
          className={cn(
            "absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-background",
            dot,
          )}
        />
      )}
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
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const openNow = () => {
    cancelClose();
    setOpen(true);
  };
  const closeSoon = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <div onMouseEnter={openNow} onMouseLeave={closeSoon}>
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary/60 text-sm font-semibold text-primary-foreground"
            aria-label="Account menu"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </button>
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent
        align="end"
        className="w-56"
        onMouseEnter={openNow}
        onMouseLeave={closeSoon}
      >
        <DropdownMenuLabel>
          <div className="truncate text-sm font-semibold">{displayName}</div>
          <div className="truncate text-xs font-normal text-muted-foreground">{roleName}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={logout}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
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

function AcademicYearSwitcher() {
  const { years, selectedYearKey, setSelectedYearKey } = useAcademicYear();

  // Nothing to switch between yet (platform tenant, or years still loading) --
  // stay invisible rather than showing an empty/disabled control.
  if (years.length === 0) return null;

  return (
    <Select value={selectedYearKey} onValueChange={setSelectedYearKey}>
      <SelectTrigger className="hidden h-9 w-[132px] rounded-md border-primary/20 bg-primary/5 text-sm font-medium sm:flex">
        <SelectValue placeholder="Year" />
      </SelectTrigger>
      <SelectContent align="end">
        {years.map((y) => (
          <SelectItem key={y.academicYearKey} value={y.academicYearKey}>
            {y.yearName}
            {y.status === "Active" && <span className="ml-1.5 text-[10px] text-success">●</span>}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function NotificationBell() {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const visible = unreadOnly ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div ref={ref} className="relative">
      <button
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive transition-all duration-200 hover:-translate-y-0.5 hover:bg-destructive/15 hover:shadow-sm active:translate-y-0"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground ring-2 ring-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-30 flex max-h-[32rem] w-[23rem] flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
          <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
            <h2 className="font-display text-lg font-bold">Notifications</h2>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
              Only show unread
              <Switch checked={unreadOnly} onCheckedChange={setUnreadOnly} className="scale-90" />
            </label>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-10 text-center text-sm text-muted-foreground">Loading...</div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bell className="h-7 w-7" />
                </span>
                <p className="text-sm text-muted-foreground">
                  {unreadOnly ? "You're all caught up — no unread notifications." : "You have no notifications yet."}
                </p>
              </div>
            ) : (
              visible.map((n) => (
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
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {timeAgo(n.createdOn)}
                    </span>
                  </div>
                  {n.message && (
                    <p className="ml-3.5 truncate text-xs text-muted-foreground">{n.message}</p>
                  )}
                </button>
              ))
            )}
          </div>

          {unreadCount > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
              <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
              <button
                onClick={() => markAllRead()}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Mark all read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
