import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Trash2, Users2, Layers, Search, MoreVertical, GraduationCap,
  Landmark, ChevronLeft, ChevronRight,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/classes-sections")({
  head: () => ({
    meta: [
      { title: "Classes & Sections — Akira School ERP" },
      { name: "description", content: "Manage your school's class ladder, sections and streams." },
    ],
  }),
  component: ClassesSectionsPage,
});

type ClassCatalogItem = { classCatalogKey: string; classCode: string; className: string; sortOrder: number };
type ClassOverview = {
  schoolClassKey: string; classCatalogKey: string; classCode: string; className: string;
  sortOrder: number; isActive: boolean; sectionCount: number; capacityTotal: number; studentCount: number;
};
type AcademicYear = { academicYearKey: string; yearName: string; status: string };
type Stream = { streamKey: string; streamCode: string; streamName: string };
type UserOption = { akiraUserKey: string; userName: string };
type SectionRow = {
  sectionKey: string; schoolClassKey: string; sectionLabel: string; seatingCapacity: number;
  classTeacherUserKey: string | null; classTeacherName: string | null; roomName: string | null;
  streamKey: string | null; streamName: string | null;
};

const SENIOR_CODES = ["XI", "XII"];
const PAGE_SIZE = 12;

// Purely cosmetic grouping for the subtitle under each class name --
// approximates the usual Indian school stage names from the class code.
function stageLabel(classCode: string) {
  if (classCode === "NUR") return "Pre Primary";
  if (classCode === "LKG") return "Lower Kindergarten";
  if (classCode === "UKG") return "Upper Kindergarten";
  if (["I", "II", "III"].includes(classCode)) return "Primary";
  if (["IV", "V"].includes(classCode)) return "Upper Primary";
  if (["VI", "VII", "VIII"].includes(classCode)) return "Middle School";
  if (["IX", "X"].includes(classCode)) return "Secondary";
  if (SENIOR_CODES.includes(classCode)) return "Senior Secondary";
  return "";
}

function ClassesSectionsPage() {
  const [catalog, setCatalog] = useState<ClassCatalogItem[]>([]);
  const [classes, setClasses] = useState<ClassOverview[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [activeYearKey, setActiveYearKey] = useState("");
  const [streams, setStreams] = useState<Stream[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [addClassOpen, setAddClassOpen] = useState(false);
  const [newClassCatalogKey, setNewClassCatalogKey] = useState("");
  const [customClassMode, setCustomClassMode] = useState(false);
  const [customClassCode, setCustomClassCode] = useState("");
  const [customClassName, setCustomClassName] = useState("");
  const [savingClass, setSavingClass] = useState(false);
  const [deleteClassTarget, setDeleteClassTarget] = useState<ClassOverview | null>(null);

  const [sectionsFor, setSectionsFor] = useState<ClassOverview | null>(null);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionRow | null>(null);
  const [sectionDraft, setSectionDraft] = useState({ sectionLabel: "", seatingCapacity: 40, classTeacherUserKey: "", roomName: "", streamKey: "" });
  const [savingSection, setSavingSection] = useState(false);
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<SectionRow | null>(null);

  const load = () => {
    setLoading(true);
    // allSettled, not all -- one endpoint failing (e.g. a stored procedure
    // not yet deployed) used to blank every list on this page via Promise.all,
    // including the class catalog, which silently disabled "Add Class" and
    // looked like a broken button instead of surfacing the real error.
    Promise.allSettled([
      apiFetch("/api/ClassCatalog"),
      apiFetch("/api/AcademicYear"),
      apiFetch("/api/Stream"),
      apiFetch("/api/User"),
    ])
      .then(([c, y, st, u]) => {
        if (c.status === "fulfilled") setCatalog(c.value);
        else toast.error(c.reason instanceof Error ? c.reason.message : "Failed to load class catalog");

        if (y.status === "fulfilled") {
          setYears(y.value);
          const active = (y.value as AcademicYear[]).find((year) => year.status === "Active");
          setActiveYearKey(active?.academicYearKey ?? "");
        } else {
          toast.error(y.reason instanceof Error ? y.reason.message : "Failed to load academic years");
        }

        if (st.status === "fulfilled") setStreams(st.value);
        else toast.error(st.reason instanceof Error ? st.reason.message : "Failed to load streams");

        if (u.status === "fulfilled") setUsers(u.value);
        else toast.error(u.reason instanceof Error ? u.reason.message : "Failed to load users");
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const loadClasses = () => {
    setClassesLoading(true);
    const qs = activeYearKey ? `?academicYearId=${activeYearKey}` : "";
    apiFetch(`/api/SchoolClass/overview${qs}`)
      .then((d: ClassOverview[]) => setClasses(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load classes"))
      .finally(() => setClassesLoading(false));
  };

  // Re-fetch once the active academic year resolves, since section/student
  // counts are scoped to a year.
  useEffect(loadClasses, [activeYearKey]);

  const availableCatalog = catalog.filter((c) => !classes.some((sc) => sc.classCatalogKey === c.classCatalogKey));

  const addClass = async () => {
    setSavingClass(true);
    try {
      let classCatalogKey = newClassCatalogKey;

      if (customClassMode) {
        if (!customClassCode.trim() || !customClassName.trim()) {
          toast.error("Enter both a code and a name for the new class.");
          setSavingClass(false);
          return;
        }
        const created = await apiFetch("/api/ClassCatalog", {
          method: "POST",
          body: JSON.stringify({ classCode: customClassCode.trim().toUpperCase(), className: customClassName.trim() }),
        });
        classCatalogKey = created.classCatalogKey;
      }

      if (!classCatalogKey) return;

      await apiFetch("/api/SchoolClass", { method: "POST", body: JSON.stringify({ classCatalogKey }) });
      toast.success("Class added");
      setAddClassOpen(false);
      setNewClassCatalogKey("");
      setCustomClassMode(false);
      setCustomClassCode("");
      setCustomClassName("");
      loadClasses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add class");
    } finally {
      setSavingClass(false);
    }
  };

  const confirmDeleteClass = async () => {
    if (!deleteClassTarget) return;
    try {
      await apiFetch(`/api/SchoolClass/${deleteClassTarget.schoolClassKey}`, { method: "DELETE" });
      toast.success("Class removed");
      setDeleteClassTarget(null);
      loadClasses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove class");
    }
  };

  const openSections = (c: ClassOverview) => {
    if (!activeYearKey) {
      toast.error("Activate an academic year first (Academic Years page).");
      return;
    }
    setSectionsFor(c);
    setSectionsLoading(true);
    apiFetch(`/api/Section?schoolClassId=${c.schoolClassKey}&academicYearId=${activeYearKey}`)
      .then((d: SectionRow[]) => setSections(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load sections"))
      .finally(() => setSectionsLoading(false));
  };

  const isSeniorClass = sectionsFor && SENIOR_CODES.includes(sectionsFor.classCode);

  const openNewSection = () => {
    setEditingSection(null);
    setSectionDraft({ sectionLabel: "", seatingCapacity: 40, classTeacherUserKey: "", roomName: "", streamKey: "" });
    setSectionDialogOpen(true);
  };

  const openEditSection = (s: SectionRow) => {
    setEditingSection(s);
    setSectionDraft({
      sectionLabel: s.sectionLabel,
      seatingCapacity: s.seatingCapacity,
      classTeacherUserKey: s.classTeacherUserKey ?? "",
      roomName: s.roomName ?? "",
      streamKey: s.streamKey ?? "",
    });
    setSectionDialogOpen(true);
  };

  const saveSection = async () => {
    if (!sectionsFor) return;
    setSavingSection(true);
    try {
      const body = {
        sectionLabel: sectionDraft.sectionLabel.toUpperCase(),
        seatingCapacity: sectionDraft.seatingCapacity,
        classTeacherUserKey: sectionDraft.classTeacherUserKey || null,
        roomName: sectionDraft.roomName || null,
        streamKey: sectionDraft.streamKey || null,
      };

      if (editingSection) {
        await apiFetch(`/api/Section/${editingSection.sectionKey}`, {
          method: "PUT",
          body: JSON.stringify({ sectionKey: editingSection.sectionKey, ...body }),
        });
        toast.success("Section updated");
      } else {
        await apiFetch("/api/Section", {
          method: "POST",
          body: JSON.stringify({ schoolClassKey: sectionsFor.schoolClassKey, academicYearKey: activeYearKey, ...body }),
        });
        toast.success("Section created");
      }
      setSectionDialogOpen(false);
      openSections(sectionsFor);
      loadClasses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save section");
    } finally {
      setSavingSection(false);
    }
  };

  const confirmDeleteSection = async () => {
    if (!deleteSectionTarget || !sectionsFor) return;
    try {
      await apiFetch(`/api/Section/${deleteSectionTarget.sectionKey}`, { method: "DELETE" });
      toast.success("Section removed");
      setDeleteSectionTarget(null);
      openSections(sectionsFor);
      loadClasses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove section");
    }
  };

  const filteredClasses = useMemo(
    () => classes.filter((c) => c.className.toLowerCase().includes(search.trim().toLowerCase())),
    [classes, search],
  );

  const totalPages = Math.max(1, Math.ceil(filteredClasses.length / PAGE_SIZE));
  const pageClasses = filteredClasses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [search]);

  const totalSections = classes.reduce((sum, c) => sum + c.sectionCount, 0);
  const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0);
  const activeLevels = classes.filter((c) => c.isActive).length;

  return (
    <div>
      <PageHeader
        title="Classes & Sections"
        actions={
          <Button
            className="h-10 gap-1.5 rounded-md shadow-sm"
            onClick={() => {
              setCustomClassMode(availableCatalog.length === 0);
              setAddClassOpen(true);
            }}
            disabled={loading || classesLoading}
          >
            <Plus className="h-4 w-4" /> Add Class
          </Button>
        }
      />

      {!activeYearKey && !loading && (
        <div className="mb-4 rounded-md border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-[oklch(0.45_0.12_65)]">
          No active academic year — activate one on the Academic Years page before adding sections.
        </div>
      )}

      {!loading && !classesLoading && availableCatalog.length === 0 && classes.length > 0 && (
        <div className="mb-4 rounded-md border border-info/30 bg-info/10 px-4 py-2.5 text-sm text-info">
          All classes from Nursery to Class XII have been added. Need something beyond the standard ladder? Click "Add Class" to add a custom one.
        </div>
      )}

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-primary/20 bg-primary/[0.06] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold">{classes.length}</div>
              <div className="text-sm font-medium text-foreground/90">Total Classes</div>
              <div className="text-xs text-muted-foreground">From Nursery to Class XII</div>
            </div>
          </div>
        </div>
        <div className="rounded-md border border-info/20 bg-info/[0.06] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-info/15 text-info">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold">{totalSections}</div>
              <div className="text-sm font-medium text-foreground/90">Total Sections</div>
              <div className="text-xs text-muted-foreground">All active sections</div>
            </div>
          </div>
        </div>
        <div className="rounded-md border border-success/20 bg-success/[0.06] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-success/15 text-success">
              <Users2 className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold">{totalStudents}</div>
              <div className="text-sm font-medium text-foreground/90">Total Students</div>
              <div className="text-xs text-muted-foreground">Across all classes</div>
            </div>
          </div>
        </div>
        <div className="rounded-md border border-[oklch(0.75_0.17_300)]/20 bg-[oklch(0.75_0.17_300)]/[0.06] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[oklch(0.75_0.17_300)]/15 text-[oklch(0.55_0.2_300)]">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold">{activeLevels}</div>
              <div className="text-sm font-medium text-foreground/90">Active Class Levels</div>
              <div className="text-xs text-muted-foreground">Nursery to Class XII</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <h2 className="font-display text-base font-bold">Classes Overview</h2>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search class..."
              className="h-9 rounded-md pl-8"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Sections</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading || classesLoading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">Loading...</TableCell></TableRow>
            ) : pageClasses.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">No classes found.</TableCell></TableRow>
            ) : (
              pageClasses.map((c) => {
                const pct = c.capacityTotal > 0 ? Math.min(100, Math.round((c.studentCount / c.capacityTotal) * 100)) : 0;
                return (
                  <TableRow key={c.schoolClassKey}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                          {c.className.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">{c.className}</div>
                          <div className="text-xs text-muted-foreground">{stageLabel(c.classCode)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{c.classCode}</TableCell>
                    <TableCell>{c.sectionCount} Sections</TableCell>
                    <TableCell>
                      <div className="min-w-[140px]">
                        <div className="text-sm font-medium">
                          {c.studentCount}
                          {c.capacityTotal > 0 && <span className="text-muted-foreground"> / {c.capacityTotal}</span>}
                        </div>
                        {c.capacityTotal > 0 && (
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("rounded-md border-0 px-2 py-0.5 text-xs font-medium", c.isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                        {c.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-md" onClick={() => openSections(c)}>
                          <Layers className="h-3.5 w-3.5" /> Sections
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteClassTarget(c)}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove Class
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {filteredClasses.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filteredClasses.length)} of {filteredClasses.length} classes
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-md" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">{page}</span>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-md" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add class dialog */}
      <FormDialog
        open={addClassOpen}
        onOpenChange={(v) => {
          setAddClassOpen(v);
          if (!v) {
            setCustomClassMode(false);
            setCustomClassCode("");
            setCustomClassName("");
          }
        }}
        title="Add Class"
        description={customClassMode ? "Add a class beyond the standard Nursery–XII ladder." : "Pick a class from the standard ladder to add to your school."}
        submitLabel="Add"
        onSubmit={addClass}
        submitting={savingClass}
        size="sm"
      >
        <div className="space-y-4">
          {!customClassMode ? (
            <>
              <div className="space-y-1.5">
                <Label required>Class</Label>
                <Select value={newClassCatalogKey} onValueChange={setNewClassCatalogKey} disabled={availableCatalog.length === 0}>
                  <SelectTrigger className="rounded-md"><SelectValue placeholder={availableCatalog.length === 0 ? "All standard classes added" : "Choose a class"} /></SelectTrigger>
                  <SelectContent>
                    {availableCatalog.map((c) => <SelectItem key={c.classCatalogKey} value={c.classCatalogKey}>{c.className}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => setCustomClassMode(true)}
              >
                Can't find your class? Add a custom one instead
              </button>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label required>Class Code</Label>
                  <Input value={customClassCode} onChange={(e) => setCustomClassCode(e.target.value.toUpperCase())} placeholder="XIII" maxLength={20} className="rounded-md" required />
                </div>
                <div className="space-y-1.5">
                  <Label required>Class Name</Label>
                  <Input value={customClassName} onChange={(e) => setCustomClassName(e.target.value)} placeholder="Class XIII" className="rounded-md" required />
                </div>
              </div>
              {availableCatalog.length > 0 && (
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => setCustomClassMode(false)}
                >
                  Pick from the standard ladder instead
                </button>
              )}
            </>
          )}
        </div>
      </FormDialog>

      {/* Sections dialog -- a single Dialog root that swaps between the
          section list and the create/edit form, rather than stacking two
          separate Dialog roots. Two Radix Dialogs closing/opening in the
          same tick can leave document.body's pointer-events lock in a bad
          state, so the "top" one looks interactive but clicks (e.g. Save)
          silently do nothing -- swapping content inside one Dialog avoids
          that entirely. */}
      <FormDialog
        open={!!sectionsFor}
        onOpenChange={(v) => {
          if (v) return;
          if (sectionDialogOpen) setSectionDialogOpen(false);
          else setSectionsFor(null);
        }}
        title={sectionDialogOpen ? (editingSection ? "Edit Section" : "New Section") : `Sections — ${sectionsFor?.className ?? ""}`}
        description={sectionDialogOpen ? undefined : `For academic year ${years.find((y) => y.academicYearKey === activeYearKey)?.yearName ?? ""}.`}
        submitLabel={sectionDialogOpen ? (editingSection ? "Save Changes" : "Create Section") : "Close"}
        cancelLabel={sectionDialogOpen ? "Back" : "Close"}
        onSubmit={sectionDialogOpen ? saveSection : () => setSectionsFor(null)}
        submitting={savingSection}
        size={sectionDialogOpen ? "md" : "lg"}
      >
        {sectionDialogOpen ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label required>Section Label</Label>
                <Input value={sectionDraft.sectionLabel} onChange={(e) => setSectionDraft({ ...sectionDraft, sectionLabel: e.target.value.toUpperCase() })} placeholder="A" maxLength={2} className="rounded-md" required />
              </div>
              <div className="space-y-1.5">
                <Label required>Seating Capacity</Label>
                <Input type="number" min={1} value={sectionDraft.seatingCapacity} onChange={(e) => setSectionDraft({ ...sectionDraft, seatingCapacity: Number(e.target.value) })} className="rounded-md" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Users2 className="h-3.5 w-3.5" /> Class Teacher</Label>
              <Select value={sectionDraft.classTeacherUserKey || "none"} onValueChange={(v) => setSectionDraft({ ...sectionDraft, classTeacherUserKey: v === "none" ? "" : v })}>
                <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose a class teacher" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {users.map((u) => <SelectItem key={u.akiraUserKey} value={u.akiraUserKey}>{u.userName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Room</Label>
              <Input value={sectionDraft.roomName} onChange={(e) => setSectionDraft({ ...sectionDraft, roomName: e.target.value })} placeholder="Room 101" className="rounded-md" />
            </div>
            {isSeniorClass && (
              <div className="space-y-1.5">
                <Label>Stream</Label>
                <Select value={sectionDraft.streamKey || "none"} onValueChange={(v) => setSectionDraft({ ...sectionDraft, streamKey: v === "none" ? "" : v })}>
                  <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose a stream" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {streams.map((s) => <SelectItem key={s.streamKey} value={s.streamKey}>{s.streamName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={openNewSection}>
                <Plus className="h-3.5 w-3.5" /> New Section
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Class Teacher</TableHead>
                  <TableHead>Room</TableHead>
                  {isSeniorClass && <TableHead>Stream</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectionsLoading ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">Loading...</TableCell></TableRow>
                ) : sections.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">No sections yet.</TableCell></TableRow>
                ) : (
                  sections.map((s) => (
                    <TableRow key={s.sectionKey}>
                      <TableCell className="font-medium">{s.sectionLabel}</TableCell>
                      <TableCell>{s.seatingCapacity}</TableCell>
                      <TableCell>{s.classTeacherName ?? "—"}</TableCell>
                      <TableCell>{s.roomName ?? "—"}</TableCell>
                      {isSeniorClass && <TableCell>{s.streamName ? <Badge variant="outline" className="rounded-md">{s.streamName}</Badge> : "—"}</TableCell>}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8 rounded-md" onClick={() => openEditSection(s)}>Edit</Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive" onClick={() => setDeleteSectionTarget(s)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </FormDialog>

      <AlertDialog open={!!deleteClassTarget} onOpenChange={(v) => !v && setDeleteClassTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{deleteClassTarget?.className}"?</AlertDialogTitle>
            <AlertDialogDescription>Remove its sections first if it has any. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); confirmDeleteClass(); }}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteSectionTarget} onOpenChange={(v) => !v && setDeleteSectionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove section "{deleteSectionTarget?.sectionLabel}"?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); confirmDeleteSection(); }}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
