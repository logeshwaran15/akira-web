import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { BackButton } from "@/components/erp/BackButton";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import {
  QuestionForm, validateQuestionDraft, buildQuestionPayload,
  type QuestionDraft, type Subject, type SchoolClass,
} from "@/components/erp/question-bank/QuestionForm";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/question-bank-edit")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : "",
  }),
  head: () => ({
    meta: [
      { title: "Edit Question — Akira School ERP" },
      { name: "description", content: "Edit a question in the question bank." },
    ],
  }),
  component: QuestionBankEditPage,
});

function QuestionBankEditPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<QuestionDraft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) {
      toast.error("No question selected to edit.");
      navigate({ to: "/question-bank" });
      return;
    }

    setLoading(true);
    Promise.all([
      apiFetch("/api/Subject").catch(() => []),
      apiFetch("/api/SchoolClass").catch(() => []),
      apiFetch("/api/Question").catch(() => []),
    ])
      .then(([sub, sc, all]) => {
        setSubjects(sub);
        setClasses(sc);
        // No single-question GET endpoint exists on the API -- find it in the
        // full list instead, same source of truth the old edit dialog used.
        const q = (all as any[]).find((item) => item.questionKey === id);
        if (!q) throw new Error("Question not found.");
        setDraft({
          subjectKey: q.subjectKey, schoolClassKey: q.schoolClassKey ?? "", chapterName: q.chapterName ?? "", topicName: q.topicName ?? "",
          questionText: q.questionText, questionType: q.questionType, difficultyLevel: q.difficultyLevel, bloomLevel: q.bloomLevel ?? "",
          marks: q.marks, optionA: q.optionA ?? "", optionB: q.optionB ?? "", optionC: q.optionC ?? "", optionD: q.optionD ?? "",
          correctOption: q.correctOption ?? "", modelAnswer: q.modelAnswer ?? "", tags: q.tags ?? "", isActive: q.isActive,
        });
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to load question");
        navigate({ to: "/question-bank" });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const patchDraft = (patch: Partial<QuestionDraft>) => setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const save = async () => {
    if (!draft) return;
    const error = validateQuestionDraft(draft);
    if (error) return toast.error(error);

    setSaving(true);
    try {
      await apiFetch(`/api/Question/${id}`, { method: "PUT", body: JSON.stringify({ questionKey: id, ...buildQuestionPayload(draft) }) });
      toast.success("Question updated");
      navigate({ to: "/question-bank" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save question");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Edit Question"
        actions={<BackButton to="/question-bank" label="Back to Question Bank" className="mb-0" />}
      />
      <p className="-mt-4 mb-5 text-sm text-muted-foreground">
        Update this question's classification, content, answer, and assessment details.
      </p>

      {loading || !draft ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
        </div>
      ) : (
        <div className="max-w-3xl">
          <div className="rounded-md border border-border bg-card p-5 shadow-sm">
            <QuestionForm draft={draft} onChange={patchDraft} subjects={subjects} classes={classes} />
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" className="h-10 rounded-md" onClick={() => navigate({ to: "/question-bank" })} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" className="h-10 gap-1.5 rounded-md shadow-sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
