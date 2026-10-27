import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Clock, UserRound } from "lucide-react";
import { PageHeader } from "@/components/erp/PageHeader";
import { StudentAvatar } from "@/components/erp/StudentAvatar";
import { PageLoader } from "@/components/PageLoader";
import { apiFetch } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/parent-subjects")({
  head: () => ({
    meta: [
      { title: "Subjects — Akira School ERP" },
      { name: "description", content: "Subjects, teachers and weekly periods for your child." },
    ],
  }),
  component: ParentSubjectsPage,
});

// Backed by the PARENT-only /api/Parent/children/{id}/subjects endpoint (read-only).
type Child = {
  studentKey: string;
  studentName: string;
  className: string | null;
  sectionLabel: string | null;
  gender: string | null;
  photoUrl: string | null;
};
type SubjectRow = {
  subjectKey: string;
  subjectName: string;
  weeklyPeriods: number;
  teacherName: string | null;
};

function ParentSubjectsPage() {
  const { user, loading: userLoading } = useCurrentUser();

  const [children, setChildren] = useState<Child[]>([]);
  const [childKey, setChildKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  useEffect(() => {
    apiFetch("/api/Parent/children")
      .then((list: Child[]) => {
        setChildren(list ?? []);
        setChildKey(list?.[0]?.studentKey ?? null);
      })
      .catch(() => toast.error("Failed to load your children"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!childKey) return;
    setSubjectsLoading(true);
    setSubjects([]);
    apiFetch(`/api/Parent/children/${childKey}/subjects`)
      .then((rows: SubjectRow[]) => setSubjects(rows ?? []))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load subjects"))
      .finally(() => setSubjectsLoading(false));
  }, [childKey]);

  if (userLoading) return <PageLoader />;
  if (user && user.roleCode !== "PARENT") return <Navigate to="/dashboard" replace />;

  const totalPeriods = subjects.reduce((n, s) => n + (s.weeklyPeriods ?? 0), 0);

  return (
    <div>
      <PageHeader title="Subjects" />

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>
      ) : children.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
          No children are linked to your account. Please contact the school office.
        </div>
      ) : (
        <>
          <div className="-mx-1 mb-5 flex gap-2.5 overflow-x-auto px-1 pb-1">
            {children.map((c) => {
              const active = c.studentKey === childKey;
              return (
                <button
                  key={c.studentKey}
                  type="button"
                  onClick={() => setChildKey(c.studentKey)}
                  aria-pressed={active}
                  className={cn(
                    "flex shrink-0 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25"
                      : "border-border bg-card shadow-sm hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
                  )}
                >
                  <StudentAvatar photoUrl={c.photoUrl} gender={c.gender} studentName={c.studentName} className="h-9 w-9" />
                  <span>
                    <span className="block text-sm font-semibold leading-tight">{c.studentName}</span>
                    <span className={cn("block text-xs", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {[c.className, c.sectionLabel].filter(Boolean).join(" - ") || "—"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {subjectsLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading subjects...</div>
          ) : subjects.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
              <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
              <div className="mt-2 text-sm font-semibold">No subjects assigned yet</div>
              <div className="text-xs text-muted-foreground">
                Subjects will appear here once the school sets up the class curriculum.
              </div>
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                {subjects.length} subjects · {totalPeriods} periods per week
              </p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {subjects.map((s) => (
                  <div key={s.subjectKey} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <BookOpen className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="font-display text-base font-bold leading-tight">{s.subjectName}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <UserRound className="h-3.5 w-3.5" />
                          {s.teacherName ?? "Teacher not assigned"}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {s.weeklyPeriods} periods / week
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
