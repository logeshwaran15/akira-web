import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ImageIcon, Loader2, Pencil, Plus, Save, Search, Trash2, Upload, X } from "lucide-react";
import { PageHeader } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiFetch, apiUpload } from "@/lib/api";
import { noticeFileSrc, noticeStatus, type NoticeRow, type NoticeStatus } from "@/lib/notice-board";

export const Route = createFileRoute("/comm-notice-board")({
  head: () => ({
    meta: [
      { title: "Notice Board — Akira School ERP" },
      { name: "description", content: "Manage banners shown on the dashboards." },
    ],
  }),
  component: NoticeBoardPage,
});

const API = "/api/NoticeBoard";
const MAX_FILE_MB = 10;

type Draft = { title: string; startDate: string; endDate: string; displayOrder: string; isActive: boolean };
const emptyDraft: Draft = { title: "", startDate: "", endDate: "", displayOrder: "0", isActive: true };

const STATUS_VARIANT: Record<NoticeStatus, "success" | "info" | "warning" | "secondary"> = {
  Active: "success", Scheduled: "info", Expired: "warning", Inactive: "secondary",
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function NoticeBoardPage() {
  const [rows, setRows] = useState<NoticeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [drawer, setDrawer] = useState<{ row?: NoticeRow } | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<NoticeRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch(API)
      .then((data: NoticeRow[]) =>
        setRows([...(data ?? [])].sort((a, b) => a.displayOrder - b.displayOrder)),
      )
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load banners"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  // Release the blob URL of a freshly picked file when it is replaced or the sheet closes.
  useEffect(() => {
    if (!file) { setFilePreview(null); return; }
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const openNew = () => { setDraft(emptyDraft); setFile(null); setDrawer({}); };
  const openEdit = (r: NoticeRow) => {
    setDraft({
      title: r.title,
      startDate: r.startDate?.slice(0, 10) ?? "",
      endDate: r.endDate?.slice(0, 10) ?? "",
      displayOrder: String(r.displayOrder ?? 0),
      isActive: r.isActive,
    });
    setFile(null);
    setDrawer({ row: r });
  };
  const closeDrawer = () => { setDrawer(null); setFile(null); };
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    if (f.size > MAX_FILE_MB * 1024 * 1024) { toast.error(`Image must be under ${MAX_FILE_MB} MB.`); return; }
    setFile(f);
  };

  const editing = drawer?.row;
  const previewSrc = filePreview ?? noticeFileSrc(editing?.fileUrl ?? null);

  const save = async () => {
    if (!draft.title.trim()) { toast.error("Banner title is required."); return; }
    if (!editing && !file) { toast.error("Please choose a banner file."); return; }
    if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) {
      toast.error("Expiry date cannot be before the from date.");
      return;
    }
    const body = {
      title: draft.title.trim(),
      startDate: draft.startDate || null,
      endDate: draft.endDate || null,
      displayOrder: Number(draft.displayOrder) || 0,
      isActive: draft.isActive,
    };
    setSaving(true);
    try {
      let key = editing?.akiraNoticeBoardKey;
      if (editing) {
        await apiFetch(`${API}/${editing.akiraNoticeBoardKey}`, {
          method: "PUT",
          body: JSON.stringify({ akiraNoticeBoardKey: editing.akiraNoticeBoardKey, ...body }),
        });
      } else {
        const created = await apiFetch(API, { method: "POST", body: JSON.stringify(body) });
        key = created?.akiraNoticeBoardKey;
      }
      if (file) {
        if (!key) throw new Error("Banner saved, but its id was not returned so the file could not be attached.");
        const formData = new FormData();
        formData.append("file", file);
        await apiUpload(`${API}/${key}/file`, formData);
      }
      toast.success(editing ? "Banner updated" : "Banner created");
      closeDrawer();
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save banner");
      load();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`${API}/${deleteTarget.akiraNoticeBoardKey}`, { method: "DELETE" });
      toast.success("Banner deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete banner");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.title.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && noticeStatus(r) !== statusFilter) return false;
      return true;
    });
  }, [rows, search, statusFilter]);

  useEffect(() => setPage(1), [search, statusFilter, pageSize]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);
  const hasFilters = search !== "" || statusFilter !== "all";

  const pageNumbers = useMemo(() => {
    const from = Math.max(1, Math.min(currentPage - 2, pageCount - 4));
    const to = Math.min(pageCount, from + 4);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [currentPage, pageCount]);

  return (
    <div>
      <PageHeader
        title="Notice Board"
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> Add Banner
          </Button>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search banners by title..."
            aria-label="Search banners"
            className="h-9 rounded-md pl-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[130px] shrink-0 rounded-md text-sm" aria-label="Filter by status"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(["Active", "Scheduled", "Expired", "Inactive"] as const).map((st) => (
                <SelectItem key={st} value={st}>{st}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-9 shrink-0 gap-1 rounded-md text-muted-foreground" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
              <X className="h-4 w-4" /> Clear
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Order</TableHead>
              <TableHead className="w-28">Banner</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading banners...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  {rows.length === 0 ? "No banners yet. Click “Add Banner” to create one." : "No banners match your search."}
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((r) => {
                const src = noticeFileSrc(r.fileUrl);
                const status = noticeStatus(r);
                return (
                  <TableRow key={r.akiraNoticeBoardKey}>
                    <TableCell>{r.displayOrder}</TableCell>
                    <TableCell>
                      {src ? (
                        <img src={src} alt="" className="h-10 w-20 rounded-md border border-border object-cover" />
                      ) : (
                        <div className="flex h-10 w-20 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell>{fmtDate(r.startDate)}</TableCell>
                    <TableCell>{fmtDate(r.endDate)}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANT[status]}>{status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit banner" onClick={() => openEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                          aria-label="Delete banner" onClick={() => setDeleteTarget(r)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && filtered.length > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Showing {start + 1}–{Math.min(start + pageSize, filtered.length)} of {filtered.length} banners
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

      <Dialog open={drawer !== null} onOpenChange={(o) => { if (!o) closeDrawer(); }}>
        <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] flex-col gap-0 p-0 sm:max-w-[480px]">
          <DialogHeader className="space-y-1 border-b border-border px-6 py-4 pr-12">
            <DialogTitle className="font-display text-lg">{editing ? "Edit Banner" : "Add Banner"}</DialogTitle>
            <DialogDescription>Shown on the dashboard between the from and expiry dates.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="nb-title">Banner Title *</Label>
              <Input id="nb-title" value={draft.title} maxLength={120} placeholder="Parents Meeting"
                onChange={(e) => set("title", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Banner File {editing ? "" : "*"}</Label>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }}
              />
              {previewSrc && (
                <img src={previewSrc} alt="Banner preview" className="max-h-44 w-full rounded-lg border border-border object-cover" />
              )}
              <Button type="button" variant="outline" className="w-full gap-1.5" onClick={() => fileInput.current?.click()}>
                <Upload className="h-4 w-4" />
                {previewSrc ? "Change file" : "Choose file"}
              </Button>
              {file && <p className="truncate text-xs text-muted-foreground">{file.name}</p>}
              <p className="text-xs text-muted-foreground">
                Recommended size 1500 × 500 px (3:1). JPG, PNG, WEBP or GIF, up to {MAX_FILE_MB} MB.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Date</Label>
                <DatePicker value={draft.startDate} onChange={(v) => set("startDate", v)} placeholder="Immediately" />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <DatePicker value={draft.endDate} onChange={(v) => set("endDate", v)} min={draft.startDate || undefined} placeholder="No expiry" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nb-order">Display Order</Label>
              <Input id="nb-order" type="number" min={0} value={draft.displayOrder}
                onChange={(e) => set("displayOrder", e.target.value)} />
            </div>

            <label className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              <span>{draft.isActive ? "Active" : "Inactive"}</span>
              <Switch checked={draft.isActive} onCheckedChange={(v) => set("isActive", v)} />
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-border bg-card px-6 py-3">
            <Button variant="outline" onClick={closeDrawer} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this banner?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.title}” will be removed from the dashboards. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
