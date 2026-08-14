import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Pencil,
  PlayCircle,
  Lock,
  LockOpen,
  Sparkles,
  Search,
  CalendarDays,
  FileText,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useFormatDate } from "@/hooks/use-tenant-setting";

export const Route = createFileRoute("/academics")({
  head: () => ({
    meta: [
      { title: "Academic Years — Akira School ERP" },
      { name: "description", content: "Manage academic years and terms." },
    ],
  }),
  component: AcademicYearsPage,
});

type YearRow = {
  academicYearKey: string;
  yearName: string;
  startDate: string;
  endDate: string;
  status: "Draft" | "Active" | "Closed";
  createdOn: string;
};

type YearDraft = { academicYearKey: string; yearName: string; startDate: string; endDate: string };

type Term = {
  termKey: string;
  academicYearKey: string;
  termName: string;
  startDate: string;
  endDate: string;
  sortOrder: number;
};
type Board = { boardKey: string; boardCode: string; boardName: string };

const emptyYear: YearDraft = { academicYearKey: "", yearName: "", startDate: "", endDate: "" };

const statusStyles: Record<YearRow["status"], string> = {
  Draft: "bg-muted text-muted-foreground",
  Active: "bg-success/15 text-success",
  Closed: "bg-secondary text-secondary-foreground",
};

function AcademicYearsPage() {
  const formatDate = useFormatDate();
  const [rows, setRows] = useState<YearRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<YearRow | null>(null);
  const [draft, setDraft] = useState<YearDraft>(emptyYear);
  const [saving, setSaving] = useState(false);
  const [activateTarget, setActivateTarget] = useState<YearRow | null>(null);
  const [closeTarget, setCloseTarget] = useState<YearRow | null>(null);
  const [reopenTarget, setReopenTarget] = useState<YearRow | null>(null);
  const [applyingStatus, setApplyingStatus] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [termsFor, setTermsFor] = useState<YearRow | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [termsLoading, setTermsLoading] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [seedBoardCode, setSeedBoardCode] = useState("");
  const [seeding, setSeeding] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch("/api/AcademicYear")
      .then((data: YearRow[]) => setRows(data))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load academic years"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    apiFetch("/api/Board")
      .then((d: Board[]) => setBoards(d))
      .catch(() => {});
  }, []);

  const openNew = () => {
    setEditing(null);
    setDraft(emptyYear);
    setOpen(true);
  };
  const openEdit = (r: YearRow) => {
    setEditing(r);
    setDraft({
      academicYearKey: r.academicYearKey,
      yearName: r.yearName,
      startDate: r.startDate.slice(0, 10),
      endDate: r.endDate.slice(0, 10),
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { yearName: draft.yearName, startDate: draft.startDate, endDate: draft.endDate };
      if (editing) {
        await apiFetch(`/api/AcademicYear/${editing.academicYearKey}`, {
          method: "PUT",
          body: JSON.stringify({ academicYearKey: editing.academicYearKey, ...body }),
        });
        toast.success("Academic year updated");
      } else {
        await apiFetch("/api/AcademicYear", { method: "POST", body: JSON.stringify(body) });
        toast.success("Academic year created");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save academic year");
    } finally {
      setSaving(false);
    }
  };

  const confirmActivate = async () => {
    if (!activateTarget) return;
    setApplyingStatus(true);
    try {
      await apiFetch(`/api/AcademicYear/${activateTarget.academicYearKey}/activate`, {
        method: "POST",
      });
      toast.success("Academic year activated");
      setActivateTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to activate academic year");
    } finally {
      setApplyingStatus(false);
    }
  };

  const confirmClose = async () => {
    if (!closeTarget) return;
    setApplyingStatus(true);
    try {
      await apiFetch(`/api/AcademicYear/${closeTarget.academicYearKey}/close`, { method: "POST" });
      toast.success("Academic year closed");
      setCloseTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to close academic year");
    } finally {
      setApplyingStatus(false);
    }
  };

  const confirmReopen = async () => {
    if (!reopenTarget) return;
    setApplyingStatus(true);
    try {
      await apiFetch(`/api/AcademicYear/${reopenTarget.academicYearKey}/reopen`, { method: "POST" });
      toast.success("Academic year reopened");
      setReopenTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reopen academic year");
    } finally {
      setApplyingStatus(false);
    }
  };

  const openTerms = (r: YearRow) => {
    setTermsFor(r);
    setTermsLoading(true);
    apiFetch(`/api/Term?academicYearId=${r.academicYearKey}`)
      .then((d: Term[]) => setTerms(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load terms"))
      .finally(() => setTermsLoading(false));
  };

  const seedDefaultTerms = async () => {
    if (!termsFor || !seedBoardCode) return;
    setSeeding(true);
    try {
      const data = await apiFetch("/api/Term/seed-defaults", {
        method: "POST",
        body: JSON.stringify({
          academicYearKey: termsFor.academicYearKey,
          boardCode: seedBoardCode,
          isSeniorStage: false,
        }),
      });
      setTerms(data);
      toast.success("Default terms created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to seed default terms");
    } finally {
      setSeeding(false);
    }
  };

  const cardBorderStyles: Record<YearRow["status"], string> = {
    Draft: "border-t-warning",
    Active: "border-t-success",
    Closed: "border-t-border",
  };

  const filteredRows = rows.filter((r) => {
    if (search && !r.yearName.toLowerCase().includes(search.toLowerCase())) return false;
    const created = new Date(r.createdOn).getTime();
    if (dateFrom && created < new Date(dateFrom).getTime()) return false;
    if (dateTo && created > new Date(dateTo).getTime() + 86_400_000) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Academic Years"
        breadcrumbs={[{ label: "Setup" }, { label: "Academic Years" }]}
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> New Academic Year
          </Button>
        }
      />

      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto rounded-md border border-border bg-card p-3 shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search academic years..."
            className="h-9 rounded-md pl-9"
          />
        </div>
        <DatePicker
          value={dateFrom}
          max={dateTo || undefined}
          onChange={setDateFrom}
          className="w-[168px] shrink-0 truncate sm:w-[190px]"
          placeholder="Created From"
        />
        <DatePicker
          value={dateTo}
          min={dateFrom || undefined}
          onChange={setDateTo}
          className="w-[168px] shrink-0 truncate sm:w-[190px]"
          placeholder="Created To"
        />
        {(dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 shrink-0 rounded-md text-muted-foreground"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filteredRows.length === 0 ? (
          <div className="col-span-full flex h-32 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
            {loading ? "Loading academic years..." : "No academic years yet."}
          </div>
        ) : (
          filteredRows.map((r) => (
            <div
              key={r.academicYearKey}
              className={cn(
                "rounded-md border border-t-4 border-border bg-card p-5 shadow-sm",
                cardBorderStyles[r.status],
              )}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <h3 className="font-display text-lg font-bold">{r.yearName}</h3>
                <Badge
                  className={cn(
                    "rounded-md border-0 px-2 py-0.5 text-xs font-medium",
                    statusStyles[r.status],
                  )}
                >
                  {r.status}
                </Badge>
              </div>
              <div className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDate(r.startDate)} – {formatDate(r.endDate)}
              </div>

              <div className="space-y-2.5 border-t border-border pt-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" /> Status
                  </span>
                  <span className="font-medium">{r.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" /> Created On
                  </span>
                  <span className="font-medium">{formatDate(r.createdOn)}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 rounded-md px-0 font-medium"
                  onClick={() => openTerms(r)}
                >
                  Terms
                </Button>
                <div className="flex items-center gap-1">
                  {r.status === "Draft" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => openEdit(r)}
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {r.status === "Draft" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-success"
                      title="Activate"
                      onClick={() => setActivateTarget(r)}
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {r.status === "Active" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-destructive"
                      title="Close year"
                      onClick={() => setCloseTarget(r)}
                    >
                      <Lock className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {r.status === "Closed" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                      title="Reopen year"
                      onClick={() => setReopenTarget(r)}
                    >
                      <LockOpen className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {!loading && filteredRows.length > 0 && (
        <div className="mt-3 text-sm text-muted-foreground">
          Showing 1–{filteredRows.length} of {filteredRows.length}
        </div>
      )}

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Academic Year" : "New Academic Year"}
        description={
          editing ? "Update this academic year." : "Create a new academic year for your school."
        }
        submitLabel={editing ? "Save Changes" : "Create"}
        onSubmit={save}
        submitting={saving}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Year Name</Label>
            <Input
              value={draft.yearName}
              onChange={(e) => setDraft({ ...draft, yearName: e.target.value })}
              placeholder="2025-26"
              className="rounded-md"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label required>Start Date</Label>
              <DatePicker
                value={draft.startDate}
                onChange={(v) => setDraft({ ...draft, startDate: v })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label required>End Date</Label>
              <DatePicker
                value={draft.endDate}
                onChange={(v) => setDraft({ ...draft, endDate: v })}
                required
              />
            </div>
          </div>
        </div>
      </FormDialog>

      <FormDialog
        open={!!termsFor}
        onOpenChange={(v) => !v && setTermsFor(null)}
        title={`Terms — ${termsFor?.yearName ?? ""}`}
        description="Terms drive fee billing cycles, exam scheduling and report cards."
        submitLabel="Close"
        cancelLabel="Close"
        onSubmit={() => setTermsFor(null)}
        size="lg"
      >
        <div className="space-y-4">
          {terms.length === 0 && !termsLoading && (
            <div className="flex items-center gap-3 rounded-md border border-dashed border-border p-3">
              <Select value={seedBoardCode} onValueChange={setSeedBoardCode}>
                <SelectTrigger className="h-9 flex-1 rounded-md">
                  <SelectValue placeholder="Choose a board to seed default terms" />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((b) => (
                    <SelectItem key={b.boardKey} value={b.boardCode}>
                      {b.boardName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-9 gap-1.5 rounded-md"
                onClick={seedDefaultTerms}
                disabled={seeding || !seedBoardCode}
              >
                <Sparkles className="h-3.5 w-3.5" /> {seeding ? "Seeding..." : "Seed Defaults"}
              </Button>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Term</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {termsLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-20 text-center text-sm text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : terms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-20 text-center text-sm text-muted-foreground">
                    No terms yet.
                  </TableCell>
                </TableRow>
              ) : (
                terms.map((t) => (
                  <TableRow key={t.termKey}>
                    <TableCell className="font-medium">{t.termName}</TableCell>
                    <TableCell>{formatDate(t.startDate)}</TableCell>
                    <TableCell>{formatDate(t.endDate)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </FormDialog>

      <AlertDialog open={!!activateTarget} onOpenChange={(v) => !v && setActivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate "{activateTarget?.yearName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This becomes the tenant's ACTIVE academic year. Any other currently active year will
              be deactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applyingStatus}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={applyingStatus}
              onClick={(e) => {
                e.preventDefault();
                confirmActivate();
              }}
            >
              {applyingStatus ? "Activating..." : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!closeTarget} onOpenChange={(v) => !v && setCloseTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close "{closeTarget?.yearName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Once closed, attendance, exam marks, and new enrollments can no longer be created or
              edited for this year. An admin can reopen it later if needed, but treat closing as a
              deliberate, end-of-year action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applyingStatus}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={applyingStatus}
              onClick={(e) => {
                e.preventDefault();
                confirmClose();
              }}
            >
              {applyingStatus ? "Closing..." : "Close Year"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!reopenTarget} onOpenChange={(v) => !v && setReopenTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reopen "{reopenTarget?.yearName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This overrides the year-close lock and sets the year back to Active. Attendance, exam
              marks, and enrollments can be edited again. Only do this if you're certain — it should
              be a rare, deliberate correction, not routine.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applyingStatus}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={applyingStatus}
              onClick={(e) => {
                e.preventDefault();
                confirmReopen();
              }}
            >
              {applyingStatus ? "Reopening..." : "Reopen Year"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
