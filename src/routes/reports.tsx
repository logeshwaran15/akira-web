import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { PageHeader } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Settings2, ArchiveRestore, Star, PlayCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Akira School ERP" },
      {
        name: "description",
        content:
          "Enterprise reporting hub — Student, Attendance, Fee, Examination, HR, Library and Custom reports.",
      },
    ],
  }),
  component: ReportsHubPage,
});

type ReportCard = {
  tenantAdhocReportKey: string;
  displayName: string;
  category: string;
  module: string | null;
  description: string | null;
  icon: string | null;
  executionCount: number;
};

const CATEGORY_ORDER = [
  "Student",
  "Attendance",
  "Fee",
  "Examination",
  "HR",
  "Library",
  "Transport",
  "Custom",
];

const CATEGORY_ICON: Record<string, keyof typeof Icons> = {
  Student: "GraduationCap",
  Attendance: "CalendarCheck",
  Fee: "Wallet",
  Examination: "FileText",
  HR: "Users",
  Library: "BookOpen",
  Transport: "Bus",
  Custom: "Sparkles",
};

function IconFor(name: string | null | undefined, fallback: keyof typeof Icons = "BarChart3") {
  const key = (name && name in Icons ? name : fallback) as keyof typeof Icons;
  return Icons[key] as Icons.LucideIcon;
}

function ReportsHubPage() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const isAdmin = user?.roleCode === "ADMIN";

  const [reports, setReports] = useState<ReportCard[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = () => {
    setLoading(true);
    apiFetch("/api/AdhocReport/published")
      .then((d: ReportCard[]) => setReports(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load reports"))
      .finally(() => setLoading(false));
    apiFetch("/api/AdhocReport/favorites")
      .then((d: string[]) => setFavorites(new Set(d)))
      .catch(() => {});
  };

  useEffect(load, []);

  const toggleFavorite = async (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    try {
      const r: { isFavorite: boolean } = await apiFetch(`/api/AdhocReport/${key}/favorite`, {
        method: "POST",
      });
      setFavorites((prev) => {
        const next = new Set(prev);
        if (r.isFavorite) next.add(key);
        else next.delete(key);
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update favorite");
    }
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return reports;
    const q = query.toLowerCase();
    return reports.filter(
      (r) =>
        r.displayName.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q),
    );
  }, [reports, query]);

  const grouped = useMemo(() => {
    const byCategory = new Map<string, ReportCard[]>();
    for (const r of filtered) {
      const list = byCategory.get(r.category) ?? [];
      list.push(r);
      byCategory.set(r.category, list);
    }
    const orderedKeys = [
      ...CATEGORY_ORDER.filter((c) => byCategory.has(c)),
      ...Array.from(byCategory.keys()).filter((c) => !CATEGORY_ORDER.includes(c)),
    ];
    return orderedKeys.map((cat) => ({ category: cat, items: byCategory.get(cat)! }));
  }, [filtered]);

  const favoriteReports = filtered.filter((r) => favorites.has(r.tenantAdhocReportKey));

  return (
    <div>
      <PageHeader
        title="Reports"
        breadcrumbs={[{ label: "Reports" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-1.5 rounded-md"
              onClick={() => navigate({ to: "/reports-classic" })}
            >
              <ArchiveRestore className="h-4 w-4" /> Classic Reports
            </Button>
            {isAdmin && (
              <Button
                className="gap-1.5 rounded-md"
                onClick={() => navigate({ to: "/report-config" })}
              >
                <Settings2 className="h-4 w-4" /> Configure Reports
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-10 rounded-md pl-9"
          placeholder="Search reports..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {!loading && reports.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-card p-10 text-center">
          <Icons.BarChart3 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No published reports yet.{" "}
            {isAdmin ? (
              <button
                className="font-medium text-primary underline"
                onClick={() => navigate({ to: "/report-config" })}
              >
                Create one in Configuration
              </button>
            ) : (
              "Check back once your administrator publishes reports."
            )}
          </p>
        </div>
      )}

      {favoriteReports.length > 0 && (
        <ReportSection
          title="Favorites"
          icon={Icons.Star}
          items={favoriteReports}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onOpen={(key) => navigate({ to: "/report-viewer", search: { id: key, preview: false } })}
        />
      )}

      {grouped.map(({ category, items }) => (
        <ReportSection
          key={category}
          title={`${category} Reports`}
          icon={IconFor(CATEGORY_ICON[category], "Sparkles")}
          items={items}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onOpen={(key) => navigate({ to: "/report-viewer", search: { id: key, preview: false } })}
        />
      ))}
    </div>
  );
}

function ReportSection({
  title,
  icon: SectionIcon,
  items,
  favorites,
  onToggleFavorite,
  onOpen,
}: {
  title: string;
  icon: Icons.LucideIcon;
  items: ReportCard[];
  favorites: Set<string>;
  onToggleFavorite: (e: React.MouseEvent, key: string) => void;
  onOpen: (key: string) => void;
}) {
  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <SectionIcon className="h-4 w-4 text-primary" />
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </h2>
        <Badge className="rounded-md border-0 bg-primary/15 text-primary">{items.length}</Badge>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((r) => {
          const CardIcon = IconFor(r.icon);
          return (
            <div
              key={r.tenantAdhocReportKey}
              role="button"
              tabIndex={0}
              onClick={() => onOpen(r.tenantAdhocReportKey)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpen(r.tenantAdhocReportKey);
                }
              }}
              className="group relative flex cursor-pointer flex-col items-start rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
            >
              <button
                type="button"
                className="absolute right-4 top-4 text-lg leading-none text-warning opacity-0 transition-opacity group-hover:opacity-100 data-[active=true]:opacity-100"
                data-active={favorites.has(r.tenantAdhocReportKey)}
                onClick={(e) => onToggleFavorite(e, r.tenantAdhocReportKey)}
              >
                {favorites.has(r.tenantAdhocReportKey) ? "★" : "☆"}
              </button>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CardIcon className="h-5 w-5" />
              </div>
              <div className="font-display text-base font-semibold text-foreground">
                {r.displayName}
              </div>
              {r.description && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
              )}
              <div className="mt-4 flex w-full items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <PlayCircle className="h-3.5 w-3.5" /> {r.executionCount} runs
                </span>
                <span
                  className={cn(
                    "font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100",
                  )}
                >
                  Open →
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
