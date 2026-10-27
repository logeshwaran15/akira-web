import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { BackButton } from "@/components/erp/BackButton";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import {
  QuestionForm, emptyQuestionDraft, validateQuestionDraft, buildQuestionPayload,
  type QuestionDraft, type Subject, type SchoolClass,
} from "@/components/erp/question-bank/QuestionForm";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/question-bank-add")({
  head: () => ({
    meta: [
      { title: "Add Question — Akira School ERP" },
      { name: "description", content: "Add a new question to the question bank." },
    ],
  }),
  component: QuestionBankAddPage,
});

function QuestionBankAddPage() {
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<QuestionDraft>(emptyQuestionDraft());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/Subject").catch(() => []),
      apiFetch("/api/SchoolClass").catch(() => []),
    ])
      .then(([sub, sc]) => {
        setSubjects(sub);
        setClasses(sc);
        setDraft((prev) => ({ ...prev, subjectKey: prev.subjectKey || sub[0]?.subjectKey || "" }));
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load form data"))
      .finally(() => setLoading(false));
  }, []);

  const patchDraft = (patch: Partial<QuestionDraft>) => setDraft((prev) => ({ ...prev, ...patch }));

  const save = async () => {
    const error = validateQuestionDraft(draft);
    if (error) return toast.error(error);

    setSaving(true);
    try {
      await apiFetch("/api/Question", { method: "POST", body: JSON.stringify(buildQuestionPayload(draft)) });
      toast.success("Question added to bank as draft");
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
        title="Add Question"
        actions={<BackButton to="/question-bank" label="Back to Question Bank" className="mb-0" />}
      />
      <p className="-mt-4 mb-5 text-sm text-muted-foreground">
        Create a new reusable question for the question bank. It is saved as a draft until submitted for approval.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
        </div>
      ) : subjects.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No subjects found. Set up subjects and curriculum before creating questions.
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
              Add to Bank
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
