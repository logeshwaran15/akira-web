import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RichTextEditor, type RichTextEditorHandle } from "@/components/ui/rich-text-editor";
import {
  Plus, Pencil, Trash2, Eye, MoreVertical, Mail, CheckCircle2, PauseCircle, Clock, Search,
  X, Loader2, Save, Code2, AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/email-templates")({
  head: () => ({
    meta: [
      { title: "Email Templates — Akira School ERP" },
      { name: "description", content: "Manage reusable email templates for notifications." },
    ],
  }),
  component: EmailTemplatesPage,
});

type TemplateRow = {
  akiraEmailTemplateKey: string;
  templateCode: string;
  templateName: string;
  subject: string;
  body: string;
  description: string | null;
  isActive: boolean;
  templateType?: string | null;
  createdOn: string;
  modifiedOn?: string | null;
};

type TemplateDraft = {
  templateType: string;
  templateCode: string;
  templateName: string;
  subject: string;
  body: string;
  description: string;
  isActive: boolean;
};

const empty: TemplateDraft = { templateType: "", templateCode: "", templateName: "", subject: "", body: "", description: "", isActive: true };

// The type is stored on the template (TemplateType). Templates saved before that column
// existed fall back to a guess from the template code, e.g. FEE_DUE_EMAIL -> Fee.
const TEMPLATE_TYPES = [
  { key: "FEE", label: "Fee", match: /FEE|PAYMENT|RECEIPT/, tone: "border-transparent bg-primary text-primary-foreground" },
  { key: "ATTENDANCE", label: "Attendance", match: /ATTEND|ABSENT/, tone: "border-transparent bg-[oklch(0.65_0.15_220)] text-white" },
  { key: "EXAM", label: "Examination", match: /EXAM|RESULT|HALL_?TICKET/, tone: "border-transparent bg-[oklch(0.5_0.22_295)] text-white" },
  { key: "ADMISSION", label: "Admission", match: /ADMISSION|ENROL|INQUIRY|APPLICATION/, tone: "border-transparent bg-[oklch(0.62_0.17_145)] text-white" },
  { key: "TRANSPORT", label: "Transport", match: /TRANSPORT|BUS|ROUTE/, tone: "border-transparent bg-[oklch(0.68_0.16_55)] text-white" },
  { key: "EVENT", label: "Event", match: /EVENT|HOLIDAY|PTM|MEETING/, tone: "border-transparent bg-[oklch(0.5_0.1_200)] text-white" },
  { key: "ADMIN", label: "Administrative", match: /ADMIN|NOTICE|CIRCULAR|WELCOME|PASSWORD|OTP/, tone: "border-transparent bg-[oklch(0.6_0_0)] text-white" },
] as const;
const GENERAL_TONE = "border-transparent bg-[oklch(0.6_0_0)] text-white";

function detectType(code: string) {
  const c = code.toUpperCase();
  return TEMPLATE_TYPES.find((t) => t.match.test(c));
}

type TypeSource = { templateCode: string; templateType?: string | null };
const typeKeyOf = (r: TypeSource) => r.templateType || detectType(r.templateCode)?.key || "GENERAL";
const updatedOf = (r: { createdOn: string; modifiedOn?: string | null }) => r.modifiedOn || r.createdOn;

const PLACEHOLDERS = ["{{UserName}}", "{{SchoolName}}", "{{Amount}}", "{{Date}}"];
const RECENT_DAYS = 30;

const plainText = (html: string) => html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

function TypeBadge({ row }: { row: TypeSource }) {
  const t = TEMPLATE_TYPES.find((x) => x.key === typeKeyOf(row));
  return (
    <Badge className={t?.tone ?? GENERAL_TONE}>
      {t?.label ?? "General"}
    </Badge>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "success" : "secondary"}>{active ? "Active" : "Inactive"}</Badge>
  );
}

function SummaryCard({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: number; hint?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="font-display text-xl font-semibold leading-tight text-foreground">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}{hint ? ` · ${hint}` : ""}</p>
      </div>
    </div>
  );
}

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground" aria-label={label} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function RowMenu({ onPreview, onEdit, onDelete }: { onPreview: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground" aria-label="More actions">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onPreview}><Eye className="mr-2 h-4 w-4" /> Preview</DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmailPreview({ subject, body }: { subject: string; body: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 bg-primary px-5 py-3 text-primary-foreground">
        <Mail className="h-4 w-4" />
        <span className="font-display text-sm font-semibold">Akira School ERP</span>
      </div>
      <div className="space-y-4 px-5 py-4">
        <div className="border-b border-border pb-3">
          <p className="text-xs text-muted-foreground">Subject</p>
          <p className="text-sm font-medium text-foreground">{subject || "(no subject)"}</p>
        </div>
        {plainText(body) || /<(img|table)/i.test(body) ? (
          <div
            className="text-sm leading-relaxed text-foreground [&_a]:text-primary [&_a]:underline [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        ) : (
          <p className="text-sm italic text-muted-foreground">The email body is empty.</p>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

type DrawerState = { mode: "create" | "edit" | "view"; row?: TemplateRow } | null;

function EmailTemplatesPage() {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [drawerTab, setDrawerTab] = useState("details");
  const [draft, setDraft] = useState<TemplateDraft>(empty);
  const [htmlMode, setHtmlMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<RichTextEditorHandle>(null);

  const [deleteTarget, setDeleteTarget] = useState<TemplateRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch("/api/EmailTemplate")
      .then((data: TemplateRow[]) => setRows(data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load email templates"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => {
    setDraft(empty); setDrawerTab("details"); setHtmlMode(false); setDrawer({ mode: "create" });
  };
  const openEdit = (r: TemplateRow) => {
    setDraft({
      templateType: r.templateType || detectType(r.templateCode)?.key || "",
      templateCode: r.templateCode, templateName: r.templateName, subject: r.subject,
      body: r.body, description: r.description ?? "", isActive: r.isActive,
    });
    setDrawerTab("details"); setHtmlMode(false); setDrawer({ mode: "edit", row: r });
  };
  const openView = (r: TemplateRow) => setDrawer({ mode: "view", row: r });
  const closeDrawer = () => setDrawer(null);

  const save = async () => {
    const editing = drawer?.mode === "edit" ? drawer.row : undefined;
    if (!draft.templateName.trim() || !draft.templateCode.trim() || !draft.subject.trim() || !plainText(draft.body)) {
      toast.error("Template name, code, subject and email body are required.");
      setDrawerTab("details");
      return;
    }
    setSaving(true);
    try {
      const body = {
        templateCode: draft.templateCode,
        templateName: draft.templateName,
        subject: draft.subject,
        body: draft.body,
        description: draft.description || null,
        templateType: draft.templateType || null,
      };

      if (editing) {
        await apiFetch(`/api/EmailTemplate/${editing.akiraEmailTemplateKey}`, {
          method: "PUT",
          body: JSON.stringify({ akiraEmailTemplateKey: editing.akiraEmailTemplateKey, ...body, isActive: draft.isActive }),
        });
        toast.success("Email template updated");
      } else {
        await apiFetch("/api/EmailTemplate", { method: "POST", body: JSON.stringify({ ...body, isActive: draft.isActive }) });
        toast.success("Email template created");
      }

      closeDrawer();
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save email template");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/EmailTemplate/${deleteTarget.akiraEmailTemplateKey}`, { method: "DELETE" });
      toast.success("Email template deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete email template");
    } finally {
      setDeleting(false);
    }
  };

  const setType = (key: string) => setDraft({ ...draft, templateType: key === "GENERAL" ? "" : key });

  // ── derived list ──
  const summary = useMemo(() => {
    const cutoff = Date.now() - RECENT_DAYS * 86_400_000;
    return {
      total: rows.length,
      active: rows.filter((r) => r.isActive).length,
      inactive: rows.filter((r) => !r.isActive).length,
      recent: rows.filter((r) => new Date(updatedOf(r)).getTime() >= cutoff).length,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !`${r.templateName} ${r.templateCode} ${r.subject}`.toLowerCase().includes(q)) return false;
      if (statusFilter === "active" && !r.isActive) return false;
      if (statusFilter === "inactive" && r.isActive) return false;
      if (typeFilter !== "all") {
        if (typeKeyOf(r) !== typeFilter) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, typeFilter]);

  useEffect(() => setPage(1), [search, statusFilter, typeFilter, pageSize]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);
  const hasFilters = search !== "" || statusFilter !== "all" || typeFilter !== "all";
  const clearFilters = () => { setSearch(""); setStatusFilter("all"); setTypeFilter("all"); };

  const pageNumbers = useMemo(() => {
    const from = Math.max(1, Math.min(currentPage - 2, pageCount - 4));
    const to = Math.min(pageCount, from + 4);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [currentPage, pageCount]);

  const isView = drawer?.mode === "view";
  const viewRow = drawer?.row;
  const detectedKey = draft.templateType || "GENERAL";

  return (
    <TooltipProvider delayDuration={200}>
      <div>
        <PageHeader
          title="Email Templates"
          actions={
            <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew}>
              <Plus className="h-4 w-4" /> New Template
            </Button>
          }
        />
        <p className="-mt-4 mb-5 text-sm text-muted-foreground">
          Create and manage reusable email templates for school notifications.
        </p>

        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard icon={Mail} label="Total Templates" value={summary.total} />
          <SummaryCard icon={CheckCircle2} label="Active" value={summary.active} />
          <SummaryCard icon={PauseCircle} label="Inactive" value={summary.inactive} />
          <SummaryCard icon={Clock} label="Recently Updated" value={summary.recent} hint={`Last ${RECENT_DAYS} days`} />
        </div>

        {rows.length === 0 && !loading ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center shadow-sm">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Mail className="h-6 w-6" />
            </div>
            <h2 className="font-display text-lg font-semibold text-foreground">No email templates yet</h2>
            <p className="mb-5 mt-1 max-w-sm text-sm text-muted-foreground">
              Create your first reusable email template for school notifications.
            </p>
            <Button className="gap-1.5 rounded-md" onClick={openNew}><Plus className="h-4 w-4" /> Create Template</Button>
          </div>
        ) : (
          <>
            {/* Filter bar */}
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search templates by name, code or subject..."
                  aria-label="Search templates"
                  className="rounded-md pl-9"
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px] shrink-0 rounded-md" aria-label="Filter by status"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px] shrink-0 rounded-md" aria-label="Filter by type"><SelectValue placeholder="Template Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {TEMPLATE_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                    <SelectItem value="GENERAL">General</SelectItem>
                  </SelectContent>
                </Select>
                {hasFilters && (
                  <Button variant="ghost" className="shrink-0 gap-1.5 rounded-md text-muted-foreground" onClick={clearFilters}>
                    <X className="h-4 w-4" /> Clear Filters
                  </Button>
                )}
              </div>
            </div>

            {/* Desktop / tablet table */}
            <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead className="hidden xl:table-cell">Template Code</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Last Updated</TableHead>
                    <TableHead className="w-[130px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">Loading email templates...</TableCell></TableRow>
                  ) : pageRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                        No templates match your filters.{" "}
                        <button className="text-primary hover:underline" onClick={clearFilters}>Clear filters</button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageRows.map((r, i) => (
                      <TableRow key={r.akiraEmailTemplateKey}>
                        <TableCell className="text-muted-foreground">{start + i + 1}</TableCell>
                        <TableCell>
                          <button className="text-left hover:underline" onClick={() => openView(r)}>
                            <div className="font-medium text-foreground">{r.templateName}</div>
                            <div className="font-mono text-xs text-muted-foreground">{r.templateCode}</div>
                          </button>
                        </TableCell>
                        <TableCell className="hidden font-mono text-xs text-muted-foreground xl:table-cell">{r.templateCode}</TableCell>
                        <TableCell className="max-w-[260px]">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="truncate text-sm text-muted-foreground">{r.subject}</p>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">{r.subject}</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell><TypeBadge row={r} /></TableCell>
                        <TableCell><StatusBadge active={r.isActive} /></TableCell>
                        <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground lg:table-cell">{fmtDate(updatedOf(r))}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-0.5">
                            <IconAction label="Preview" onClick={() => openView(r)}><Eye className="h-4 w-4" /></IconAction>
                            <IconAction label="Edit" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></IconAction>
                            <RowMenu onPreview={() => openView(r)} onEdit={() => openEdit(r)} onDelete={() => setDeleteTarget(r)} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {loading ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Loading email templates...</p>
              ) : pageRows.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No templates match your filters.{" "}
                  <button className="text-primary hover:underline" onClick={clearFilters}>Clear filters</button>
                </p>
              ) : (
                pageRows.map((r) => (
                  <div key={r.akiraEmailTemplateKey} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <button className="min-w-0 text-left" onClick={() => openView(r)}>
                        <div className="font-medium text-foreground">{r.templateName}</div>
                        <div className="font-mono text-xs text-muted-foreground">{r.templateCode}</div>
                      </button>
                      <RowMenu onPreview={() => openView(r)} onEdit={() => openEdit(r)} onDelete={() => setDeleteTarget(r)} />
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.subject}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <TypeBadge row={r} />
                      <StatusBadge active={r.isActive} />
                      <span className="ml-auto text-xs text-muted-foreground">{fmtDate(updatedOf(r))}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {filtered.length > 0 && (
              <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                <p className="text-sm text-muted-foreground">
                  Showing {start + 1}–{Math.min(start + pageSize, filtered.length)} of {filtered.length} templates
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    Rows per page
                    <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                      <SelectTrigger className="h-8 w-[72px] rounded-md" aria-label="Rows per page"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[10, 25, 50].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="rounded-md" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button>
                    {pageNumbers.map((n) => (
                      <Button
                        key={n}
                        size="sm"
                        variant={n === currentPage ? "default" : "outline"}
                        className="h-8 w-8 rounded-md p-0"
                        aria-current={n === currentPage ? "page" : undefined}
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </Button>
                    ))}
                    <Button variant="outline" size="sm" className="rounded-md" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Create / Edit / Preview drawer */}
        <Sheet open={drawer !== null} onOpenChange={(o) => { if (!o) closeDrawer(); }}>
          <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[560px]">
            <SheetHeader className="space-y-1 border-b border-border px-6 py-4 pr-12">
              <SheetTitle className="font-display text-lg">
                {isView ? viewRow?.templateName : drawer?.mode === "edit" ? "Edit Email Template" : "New Email Template"}
              </SheetTitle>
              {isView && viewRow ? (
                <div className="flex items-center gap-2">
                  <StatusBadge active={viewRow.isActive} />
                  <TypeBadge row={viewRow} />
                </div>
              ) : (
                <SheetDescription>
                  {drawer?.mode === "edit" ? "Update this email template." : "Create a reusable email template."}
                </SheetDescription>
              )}
            </SheetHeader>

            {isView && viewRow ? (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                  {viewRow.description && <p className="text-sm text-muted-foreground">{viewRow.description}</p>}
                  <EmailPreview subject={viewRow.subject} body={viewRow.body} />
                </div>
                <div className="flex justify-end gap-2 border-t border-border bg-card px-6 py-3">
                  <Button variant="outline" className="rounded-md" onClick={closeDrawer}>Close</Button>
                  <Button className="gap-1.5 rounded-md" onClick={() => openEdit(viewRow)}><Pencil className="h-4 w-4" /> Edit Template</Button>
                </div>
              </>
            ) : (
              <>
                <Tabs value={drawerTab} onValueChange={setDrawerTab} className="flex min-h-0 flex-1 flex-col">
                  <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b border-border bg-transparent px-4 py-0">
                    {[{ v: "details", l: "Template Details" }, { v: "preview", l: "Preview" }].map((t) => (
                      <TabsTrigger
                        key={t.v}
                        value={t.v}
                        className="-mb-px rounded-none border-b-2 border-transparent bg-transparent px-3 py-2.5 text-sm text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                      >
                        {t.l}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContent value="details" className="mt-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
                    <Section title="Basic Information">
                      <div className="space-y-1.5">
                        <Label required htmlFor="et-name">Template Name</Label>
                        <Input id="et-name" value={draft.templateName} maxLength={150} onChange={(e) => setDraft({ ...draft, templateName: e.target.value })} placeholder="Fee Due Reminder" className="rounded-md" />
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label required htmlFor="et-code">Template Code</Label>
                          <Input id="et-code" value={draft.templateCode} maxLength={50} onChange={(e) => setDraft({ ...draft, templateCode: e.target.value.toUpperCase() })} placeholder="FEE_DUE_EMAIL" className="rounded-md font-mono text-xs" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Template Type</Label>
                          <Select value={detectedKey} onValueChange={setType}>
                            <SelectTrigger className="rounded-md" aria-label="Template type"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TEMPLATE_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                              <SelectItem value="GENERAL">General</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                                    </Section>

                    <Section title="Email Content">
                      <div className="space-y-1.5">
                        <Label required htmlFor="et-subject">Subject</Label>
                        <Input id="et-subject" value={draft.subject} maxLength={300} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="Your fee payment is due, {{UserName}}" className="rounded-md" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label required>Email Body</Label>
                          <button
                            type="button"
                            onClick={() => setHtmlMode((m) => !m)}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <Code2 className="h-3.5 w-3.5" /> {htmlMode ? "Back to editor" : "Edit HTML source"}
                          </button>
                        </div>
                        {htmlMode ? (
                          <Textarea
                            value={draft.body}
                            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                            className="min-h-[240px] rounded-md font-mono text-xs"
                            aria-label="Email body HTML"
                          />
                        ) : (
                          <RichTextEditor
                            ref={editorRef}
                            extended
                            value={draft.body}
                            onChange={(html) => setDraft((d) => ({ ...d, body: html }))}
                            placeholder="Write your email..."
                            minHeight="min-h-[220px]"
                          />
                        )}
                        {!htmlMode && (
                          <div className="space-y-1.5 pt-1">
                            <p className="text-xs font-medium text-muted-foreground">Available placeholders</p>
                            <div className="flex flex-wrap gap-1.5">
                              {PLACEHOLDERS.map((p) => (
                                <button
                                  key={p}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => editorRef.current?.insertText(p)}
                                  className="rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-xs text-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">Placeholders are replaced automatically when the email is sent.</p>
                      </div>
                    </Section>

                    <Section title="Settings">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="et-desc">Description</Label>
                          <span className="text-xs text-muted-foreground">{draft.description.length}/300</span>
                        </div>
                        <Input id="et-desc" value={draft.description} maxLength={300} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Short internal description (optional)" className="rounded-md" />
                      </div>
                      <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2.5">
                        <div>
                          <Label htmlFor="et-active" className="text-sm">Active</Label>
                          <p className="text-xs text-muted-foreground">Enable this template for notifications</p>
                        </div>
                        <Switch id="et-active" checked={draft.isActive} onCheckedChange={(v) => setDraft({ ...draft, isActive: v })} />
                      </div>
                    </Section>
                  </TabsContent>

                  <TabsContent value="preview" className="mt-0 flex-1 overflow-y-auto px-6 py-5">
                    <EmailPreview subject={draft.subject} body={draft.body} />
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2 border-t border-border bg-card px-6 py-3">
                  <Button variant="outline" className="rounded-md" onClick={closeDrawer} disabled={saving}>Cancel</Button>
                  <Button className="gap-1.5 rounded-md" onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {drawer?.mode === "edit" ? "Save Changes" : "Save Template"}
                  </Button>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this email template?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p className="font-medium text-foreground">{deleteTarget?.templateName}</p>
                  <div className="flex gap-2 rounded-md bg-warning/20 p-3 text-warning-foreground">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="text-sm">
                      This template may be used by notification rules. Deleting it may prevent associated notifications from using this template.
                    </p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleting}
                onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              >
                {deleting ? "Deleting..." : "Delete Template"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
