import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Pencil, Trash2, KeyRound, Check, ChevronsUpDown, Circle,
  LayoutDashboard, GraduationCap, Users, BookOpen, CalendarCheck, CalendarDays,
  CalendarClock, ClipboardList, Wallet, Library, Bus, Settings, Settings2,
  Blocks, Bell, Mail, Building2, ShieldCheck, Layers, UserCheck, Award,
  CreditCard, MessageCircle, Hash, PhoneCall, FileText, UserPlus, GitBranch,
  FileBarChart, IdCard, FileCog, Percent, Users2, UserCog, Gauge, Target,
  NotebookPen, TrendingUp, Crosshair, Clock,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

// Kept in sync with the iconMap in AppLayout.tsx -- these are the icons the
// sidebar knows how to render for a menu's "Icon" field.
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, GraduationCap, Users, BookOpen, CalendarCheck, CalendarDays,
  CalendarClock, ClipboardList, Wallet, Library, Bus, Settings, Settings2,
  Blocks, Bell, Mail, Building2, ShieldCheck, KeyRound, Layers, UserCheck,
  Award, CreditCard, MessageCircle, Hash, PhoneCall, FileText, UserPlus,
  GitBranch, FileBarChart, IdCard, FileCog, Percent, Users2, UserCog, Gauge,
  Target, NotebookPen, TrendingUp, Crosshair, Clock,
};

export const Route = createFileRoute("/tenant-menu")({
  head: () => ({
    meta: [
      { title: "Menu Management — Akira School ERP" },
      { name: "description", content: "Create and manage the sidebar's 3-level menu: Main Menu, Sub Menu, and Child Menu." },
    ],
  }),
  component: TenantMenuPage,
});

type TenantMenuRow = {
  tenantMenuKey: string;
  menuName: string;
  menuCode: string;
  icon: string | null;
  iconColor: string | null;
  url: string | null;
  parentMenuKey: string | null;
  sortOrder: number;
  isActive: boolean;
  moduleCode: string | null;
  createdOn: string;
};

type TenantMenuDraft = {
  tenantMenuKey: string;
  menuName: string;
  menuCode: string;
  icon: string;
  iconColor: string;
  url: string;
  parentMenuKey: string; // "" means top-level
  sortOrder: number;
  isActive: boolean;
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

const COLOR_OPTIONS = [
  "blue", "violet", "slate", "amber", "emerald", "orange", "sky", "pink",
  "rose", "teal", "indigo", "cyan", "fuchsia", "red",
];

// Literal Tailwind classes (not built dynamically) so the content scanner picks them up.
const ICON_COLOR_CLASS: Record<string, string> = {
  blue: "text-blue-500", violet: "text-violet-500", slate: "text-slate-500",
  amber: "text-amber-500", emerald: "text-emerald-500", orange: "text-orange-500",
  sky: "text-sky-500", pink: "text-pink-500", rose: "text-rose-500",
  teal: "text-teal-500", indigo: "text-indigo-500", cyan: "text-cyan-500",
  fuchsia: "text-fuchsia-500", red: "text-red-500",
};

const ICON_COLOR_BG: Record<string, string> = {
  blue: "bg-blue-500", violet: "bg-violet-500", slate: "bg-slate-500",
  amber: "bg-amber-500", emerald: "bg-emerald-500", orange: "bg-orange-500",
  sky: "bg-sky-500", pink: "bg-pink-500", rose: "bg-rose-500",
  teal: "bg-teal-500", indigo: "bg-indigo-500", cyan: "bg-cyan-500",
  fuchsia: "bg-fuchsia-500", red: "bg-red-500",
};

const empty: TenantMenuDraft = {
  tenantMenuKey: "", menuName: "", menuCode: "", icon: "", iconColor: "", url: "",
  parentMenuKey: "", sortOrder: 0, isActive: true,
};

function TenantMenuPage() {
  const [rows, setRows] = useState<TenantMenuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TenantMenuRow | null>(null);
  const [draft, setDraft] = useState<TenantMenuDraft>(empty);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TenantMenuRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [parentPickerOpen, setParentPickerOpen] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch("/api/TenantMenu")
      .then((data: TenantMenuRow[]) => setRows(data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load pages"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const childCountOf = (key: string) => rows.filter((r) => r.parentMenuKey === key).length;
  const menuNameOf = (key: string | null) =>
    rows.find((r) => r.tenantMenuKey === key)?.menuName ?? "—";

  // 1 = top-level module, 2 = sub menu, 3 = child menu item. Walks the
  // ParentMenuKey chain; a seen-set guards against a corrupt cycle in the data.
  const depthOf = (key: string | null, seen = new Set<string>()): number => {
    if (!key || seen.has(key)) return 1;
    const row = rows.find((r) => r.tenantMenuKey === key);
    if (!row?.parentMenuKey) return 1;
    seen.add(key);
    return 1 + depthOf(row.parentMenuKey, seen);
  };

  // Tallest chain of descendants below `key` (0 = leaf, i.e. no children).
  const subtreeHeight = (key: string): number => {
    const children = rows.filter((r) => r.parentMenuKey === key);
    if (children.length === 0) return 0;
    return 1 + Math.max(...children.map((c) => subtreeHeight(c.tenantMenuKey)));
  };

  // Breadcrumb path for display, e.g. "Attendance → Attendance Requests".
  const pathOf = (key: string, seen = new Set<string>()): string => {
    const row = rows.find((r) => r.tenantMenuKey === key);
    if (!row) return "—";
    if (!row.parentMenuKey || seen.has(key)) return row.menuName;
    seen.add(key);
    return `${pathOf(row.parentMenuKey, seen)} → ${row.menuName}`;
  };

  const isDescendantOf = (candidateKey: string, ancestorKey: string): boolean => {
    let cur = rows.find((r) => r.tenantMenuKey === candidateKey);
    const seen = new Set<string>();
    while (cur?.parentMenuKey && !seen.has(cur.tenantMenuKey)) {
      if (cur.parentMenuKey === ancestorKey) return true;
      seen.add(cur.tenantMenuKey);
      cur = rows.find((r) => r.tenantMenuKey === cur!.parentMenuKey);
    }
    return false;
  };

  // Only 3 levels deep are supported. A candidate parent is eligible only if
  // placing the item (plus everything already nested under it) there still
  // fits within that cap, and it isn't the item itself or one of its own
  // descendants (which would create a cycle).
  const editingSubtreeHeight = editing ? subtreeHeight(editing.tenantMenuKey) : 0;
  const parentOptions = rows.filter((r) => {
    if (editing && (r.tenantMenuKey === editing.tenantMenuKey || isDescendantOf(r.tenantMenuKey, editing.tenantMenuKey))) {
      return false;
    }
    return depthOf(r.tenantMenuKey) + 1 + editingSubtreeHeight <= 3;
  });

  const openNew = () => { setEditing(null); setDraft(empty); setOpen(true); };
  const openEdit = (r: TenantMenuRow) => {
    setEditing(r);
    setDraft({
      tenantMenuKey: r.tenantMenuKey,
      menuName: r.menuName,
      menuCode: r.menuCode,
      icon: r.icon ?? "",
      iconColor: r.iconColor ?? "",
      url: r.url ?? "",
      parentMenuKey: r.parentMenuKey ?? "",
      sortOrder: r.sortOrder,
      isActive: r.isActive,
    });
    setOpen(true);
  };

  const openNewChild = (parent: TenantMenuRow) => {
    setEditing(null);
    setDraft({ ...empty, parentMenuKey: parent.tenantMenuKey, sortOrder: 0 });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        menuName: draft.menuName,
        menuCode: draft.menuCode,
        icon: draft.icon || null,
        iconColor: draft.iconColor || null,
        url: draft.url || null,
        parentMenuKey: draft.parentMenuKey || null,
        sortOrder: draft.sortOrder,
        moduleCode: null,
      };

      if (editing) {
        await apiFetch(`/api/TenantMenu/${editing.tenantMenuKey}`, {
          method: "PUT",
          body: JSON.stringify({ tenantMenuKey: editing.tenantMenuKey, ...body, isActive: draft.isActive }),
        });
        toast.success("Page updated");
      } else {
        await apiFetch("/api/TenantMenu", { method: "POST", body: JSON.stringify(body) });
        toast.success("Page created");
      }

      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save page");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/TenantMenu/${deleteTarget.tenantMenuKey}`, { method: "DELETE" });
      toast.success("Page deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete page");
    } finally {
      setDeleting(false);
    }
  };

  const LEVEL_LABEL: Record<number, string> = { 1: "Main Menu", 2: "Sub Menu", 3: "Child Menu" };
  const LEVEL_BADGE_CLASS: Record<number, string> = {
    1: "border-0 bg-primary/15 text-primary",
    2: "border-0 bg-info/15 text-info",
    3: "border-0 bg-violet-500/15 text-violet-600",
  };

  const columns: Column<TenantMenuRow>[] = [
    {
      key: "menuName", header: "Page Name", sortable: true,
      accessor: (r) => {
        const depth = depthOf(r.tenantMenuKey);
        const Icon = (r.icon && ICON_MAP[r.icon]) || (depth === 1 ? Circle : null);
        const colorClass = (r.iconColor && ICON_COLOR_CLASS[r.iconColor]) || "text-muted-foreground";
        return (
          <span
            className={cn("flex items-center gap-2", depth > 1 ? "text-muted-foreground" : "font-medium")}
            style={depth > 1 ? { paddingLeft: `${(depth - 1) * 1.25}rem` } : undefined}
          >
            {depth > 1 && <span className="text-muted-foreground">↳</span>}
            {Icon && <Icon className={cn("h-4 w-4 shrink-0", colorClass)} />}
            {r.menuName}
          </span>
        );
      },
    },
    { key: "menuCode", header: "Code", sortable: true, className: "font-mono text-xs" },
    { key: "url", header: "URL", accessor: (r) => r.url || "—" },
    {
      key: "parentMenuKey", header: "Level",
      accessor: (r) => {
        const depth = depthOf(r.tenantMenuKey);
        return (
          <div className="flex flex-col gap-0.5">
            <Badge className={cn("w-fit rounded-md text-xs", LEVEL_BADGE_CLASS[depth])}>
              {LEVEL_LABEL[depth]}
            </Badge>
            {r.parentMenuKey && (
              <span className="text-xs text-muted-foreground">under {menuNameOf(r.parentMenuKey)}</span>
            )}
          </div>
        );
      },
    },
    { key: "sortOrder", header: "Order", sortable: true },
    {
      key: "isActive", header: "Status",
      accessor: (r) => r.isActive
        ? <Badge className="rounded-md border-0 bg-emerald-500/15 text-emerald-600">Active</Badge>
        : <Badge variant="outline" className="rounded-md">Inactive</Badge>,
    },
    {
      key: "actions", header: "Actions",
      accessor: (r) => (
        <div className="flex items-center gap-1">
          {depthOf(r.tenantMenuKey) < 3 && (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" title="Add child menu" onClick={() => openNewChild(r)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-purple-600 hover:text-purple-700" title="Edit" onClick={() => openEdit(r)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive" title="Delete" onClick={() => setDeleteTarget(r)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Menu Management"
        breadcrumbs={[{ label: "System" }, { label: "Menu Management" }]}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/tenant-role-menu">
              <Button variant="outline" className="h-10 gap-1.5 rounded-md">
                <KeyRound className="h-4 w-4" /> Manage Access
              </Button>
            </Link>
            <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew}>
              <Plus className="h-4 w-4" /> New Page
            </Button>
          </div>
        }
      />

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.tenantMenuKey}
        selectable
        storageKey="tenant-menu"
        searchPlaceholder="Search page name, code, url..."
        searchFields={(r) => `${r.menuName} ${r.menuCode} ${r.url ?? ""}`}
        emptyMessage={loading ? "Loading pages..." : "No pages found."}
        dateField={(r) => r.createdOn}
        dateFilterLabel="Created"
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Page" : "New Page"}
        description={editing ? "Update this menu entry." : "Add a new Main Menu, Sub Menu, or Child Menu item."}
        submitLabel={editing ? "Save Changes" : "Create Page"}
        onSubmit={save}
        submitting={saving}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label required>Page Name</Label>
            <Input value={draft.menuName} onChange={(e) => setDraft({ ...draft, menuName: e.target.value })} className="rounded-md" required />
          </div>
          <div className="space-y-1.5">
            <Label required>Page Code</Label>
            <Input value={draft.menuCode} onChange={(e) => setDraft({ ...draft, menuCode: e.target.value.toUpperCase() })} className="rounded-md" required />
          </div>
          <div className="space-y-1.5">
            <Label>URL</Label>
            <Input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="/students" className="rounded-md" />
          </div>
          <div className="space-y-1.5">
            <Label>Sort Order</Label>
            <Input type="number" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} className="rounded-md" />
          </div>
          <div className="space-y-1.5">
            <Label>Icon</Label>
            <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={iconPickerOpen}
                  className="w-full justify-between rounded-md font-normal"
                >
                  <span className="flex items-center gap-2 truncate">
                    {draft.icon
                      ? (() => {
                          const Icon = ICON_MAP[draft.icon];
                          const colorClass = (draft.iconColor && ICON_COLOR_CLASS[draft.iconColor]) || undefined;
                          return (
                            <>
                              {Icon && <Icon className={cn("h-4 w-4 shrink-0", colorClass)} />}
                              {draft.icon}
                            </>
                          );
                        })()
                      : <span className="text-muted-foreground">None</span>}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search icons..." />
                  <CommandList>
                    <CommandEmpty>No icon found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="none"
                        onSelect={() => { setDraft({ ...draft, icon: "" }); setIconPickerOpen(false); }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", draft.icon === "" ? "opacity-100" : "opacity-0")} />
                        None
                      </CommandItem>
                      {ICON_OPTIONS.map((i) => {
                        const Icon = ICON_MAP[i];
                        const colorClass = (draft.iconColor && ICON_COLOR_CLASS[draft.iconColor]) || undefined;
                        return (
                          <CommandItem
                            key={i}
                            value={i}
                            onSelect={() => { setDraft({ ...draft, icon: i }); setIconPickerOpen(false); }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", draft.icon === i ? "opacity-100" : "opacity-0")} />
                            <Icon className={cn("mr-2 h-4 w-4", colorClass)} />
                            {i}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <Label>Icon Color</Label>
            <Select value={draft.iconColor || "none"} onValueChange={(v) => setDraft({ ...draft, iconColor: v === "none" ? "" : v })}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Default" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-muted-foreground/40" />
                    Default
                  </span>
                </SelectItem>
                {COLOR_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    <span className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", ICON_COLOR_BG[c])} />
                      <span className="capitalize">{c}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Parent Menu</Label>
            <Popover open={parentPickerOpen} onOpenChange={setParentPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={parentPickerOpen}
                  className="w-full justify-between rounded-md font-normal"
                >
                  <span className="truncate">
                    {draft.parentMenuKey
                      ? pathOf(draft.parentMenuKey)
                      : <span className="text-muted-foreground">Main menu (top-level)</span>}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search menus..." />
                  <CommandList>
                    <CommandEmpty>No eligible parent found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="top-level-page-none"
                        onSelect={() => { setDraft({ ...draft, parentMenuKey: "" }); setParentPickerOpen(false); }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", draft.parentMenuKey === "" ? "opacity-100" : "opacity-0")} />
                        Main menu (top-level)
                      </CommandItem>
                      {parentOptions.map((p) => {
                        const Icon = (p.icon && ICON_MAP[p.icon]) || Circle;
                        return (
                          <CommandItem
                            key={p.tenantMenuKey}
                            value={`${pathOf(p.tenantMenuKey)} ${p.menuCode}`}
                            onSelect={() => { setDraft({ ...draft, parentMenuKey: p.tenantMenuKey }); setParentPickerOpen(false); }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", draft.parentMenuKey === p.tenantMenuKey ? "opacity-100" : "opacity-0")} />
                            <Icon className="mr-2 h-4 w-4 shrink-0" />
                            <span className="truncate">{pathOf(p.tenantMenuKey)}</span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Up to 3 levels: Main Menu → Sub Menu → Child Menu.
              {editingSubtreeHeight > 0 && " This page already has its own sub-items, which narrows where it can be nested."}
            </p>
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.menuName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && childCountOf(deleteTarget.tenantMenuKey) > 0
                ? "This menu has items nested under it. Delete those first."
                : "This will remove the menu from the sidebar for every role that had access to it. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting || (!!deleteTarget && childCountOf(deleteTarget.tenantMenuKey) > 0)}
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
