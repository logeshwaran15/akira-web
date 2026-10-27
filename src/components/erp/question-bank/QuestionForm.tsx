import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type Subject = { subjectKey: string; subjectName: string };
export type SchoolClass = { schoolClassKey: string; className: string };

export type QuestionType = "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER" | "LONG_ANSWER" | "FILL_BLANK" | "MATCH";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export type QuestionDraft = {
  subjectKey: string;
  schoolClassKey: string;
  chapterName: string;
  topicName: string;
  questionText: string;
  questionType: QuestionType;
  difficultyLevel: Difficulty;
  bloomLevel: string;
  marks: number;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  modelAnswer: string;
  tags: string;
  isActive: boolean;
};

export const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "MCQ", label: "Multiple Choice" },
  { value: "TRUE_FALSE", label: "True / False" },
  { value: "SHORT_ANSWER", label: "Short Answer" },
  { value: "LONG_ANSWER", label: "Long Answer" },
  { value: "FILL_BLANK", label: "Fill in the Blank" },
  { value: "MATCH", label: "Match the Following" },
];

export const BLOOM_LEVELS = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];

export const QUESTION_TEXT_MAX = 2000;

export const emptyQuestionDraft = (): QuestionDraft => ({
  subjectKey: "", schoolClassKey: "", chapterName: "", topicName: "",
  questionText: "", questionType: "MCQ", difficultyLevel: "MEDIUM", bloomLevel: "",
  marks: 1, optionA: "", optionB: "", optionC: "", optionD: "", correctOption: "",
  modelAnswer: "", tags: "", isActive: true,
});

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      {children}
    </div>
  );
}

/**
 * Full sectioned question form -- classification, question text, answer
 * (type-dependent), assessment and organization. Shared between the Add and
 * Edit question pages so the two routes stay in lockstep instead of drifting
 * apart as separate copies.
 */
export function QuestionForm({
  draft, onChange, subjects, classes,
}: {
  draft: QuestionDraft;
  onChange: (patch: Partial<QuestionDraft>) => void;
  subjects: Subject[];
  classes: SchoolClass[];
}) {
  return (
    <div className="space-y-6">
      <FormSection title="Question Classification">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label required>Subject</Label>
            <Select value={draft.subjectKey} onValueChange={(v) => onChange({ subjectKey: v })}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {subjects.map((s) => <SelectItem key={s.subjectKey} value={s.subjectKey}>{s.subjectName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Class (optional)</Label>
            <Select value={draft.schoolClassKey || "none"} onValueChange={(v) => onChange({ schoolClassKey: v === "none" ? "" : v })}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Any class" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Any class</SelectItem>
                {classes.map((c) => <SelectItem key={c.schoolClassKey} value={c.schoolClassKey}>{c.className}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Chapter</Label>
            <Input value={draft.chapterName} onChange={(e) => onChange({ chapterName: e.target.value })} placeholder="e.g. Photosynthesis" className="rounded-md" />
          </div>
          <div className="space-y-1.5">
            <Label>Topic</Label>
            <Input value={draft.topicName} onChange={(e) => onChange({ topicName: e.target.value })} placeholder="e.g. Light Reactions" className="rounded-md" />
          </div>
        </div>
      </FormSection>

      <FormSection title="Question">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Question Type</Label>
            <Select value={draft.questionType} onValueChange={(v) => onChange({ questionType: v as QuestionType })}>
              <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label required>Question Text</Label>
            <Textarea
              value={draft.questionText}
              onChange={(e) => onChange({ questionText: e.target.value.slice(0, QUESTION_TEXT_MAX) })}
              placeholder="Type the question..."
              className="rounded-md"
              rows={4}
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Use clear wording and include all required information.</span>
              <span>{draft.questionText.length} / {QUESTION_TEXT_MAX}</span>
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection title="Answer">
        {draft.questionType === "MCQ" && (
          <div className="space-y-2 rounded-md border border-border p-3">
            <Label>Options (mark the correct one)</Label>
            {(["A", "B", "C", "D"] as const).map((opt) => (
              <div key={opt} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ correctOption: opt })}
                  title={`Mark option ${opt} as correct`}
                  aria-label={`Mark option ${opt} as correct`}
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                    draft.correctOption === opt ? "border-success bg-success text-success-foreground" : "border-input text-muted-foreground hover:border-primary",
                  )}
                >
                  {opt}
                </button>
                <Input
                  value={draft[`option${opt}` as "optionA" | "optionB" | "optionC" | "optionD"]}
                  onChange={(e) => onChange({ [`option${opt}`]: e.target.value } as Partial<QuestionDraft>)}
                  placeholder={`Option ${opt}${opt === "A" || opt === "B" ? " (required)" : " (optional)"}`}
                  className="rounded-md"
                />
              </div>
            ))}
          </div>
        )}

        {draft.questionType === "TRUE_FALSE" && (
          <div className="space-y-1.5">
            <Label>Correct Answer</Label>
            <div className="flex gap-2">
              {["True", "False"].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onChange({ correctOption: v })}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    draft.correctOption === v ? "border-success bg-success/10 text-success" : "border-input text-muted-foreground hover:border-primary",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {draft.questionType === "SHORT_ANSWER" && (
          <div className="space-y-1.5">
            <Label>Model Answer (optional)</Label>
            <Textarea value={draft.modelAnswer} onChange={(e) => onChange({ modelAnswer: e.target.value })} placeholder="Expected short answer" className="rounded-md" rows={2} />
          </div>
        )}

        {draft.questionType === "LONG_ANSWER" && (
          <div className="space-y-1.5">
            <Label>Model Answer (optional)</Label>
            <Textarea value={draft.modelAnswer} onChange={(e) => onChange({ modelAnswer: e.target.value })} placeholder="Expected answer / key points" className="rounded-md" rows={4} />
          </div>
        )}

        {draft.questionType === "FILL_BLANK" && (
          <div className="space-y-1.5">
            <Label>Expected Answer</Label>
            <Input value={draft.modelAnswer} onChange={(e) => onChange({ modelAnswer: e.target.value })} placeholder="Word(s) that fill the blank" className="rounded-md" />
          </div>
        )}

        {draft.questionType === "MATCH" && (
          <div className="space-y-1.5">
            <Label>Matching Pairs (optional)</Label>
            <Textarea
              value={draft.modelAnswer}
              onChange={(e) => onChange({ modelAnswer: e.target.value })}
              placeholder={"Column A ↔ Column B, one pair per line\ne.g. Mitochondria ↔ Powerhouse of the cell"}
              className="rounded-md"
              rows={3}
            />
          </div>
        )}
      </FormSection>

      <FormSection title="Assessment">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label required>Difficulty</Label>
            <Select value={draft.difficultyLevel} onValueChange={(v) => onChange({ difficultyLevel: v as Difficulty })}>
              <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EASY">Easy</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HARD">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Bloom's Level</Label>
            <Select value={draft.bloomLevel || "none"} onValueChange={(v) => onChange({ bloomLevel: v === "none" ? "" : v })}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Not set" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                {BLOOM_LEVELS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label required>Marks</Label>
            <Input type="number" min={0.5} step="0.5" value={draft.marks} onChange={(e) => onChange({ marks: Number(e.target.value) })} className="rounded-md" />
          </div>
        </div>
      </FormSection>

      <FormSection title="Organization">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tags (comma-separated)</Label>
            <Input value={draft.tags} onChange={(e) => onChange({ tags: e.target.value })} placeholder="e.g. important, previous-year, numerical" className="rounded-md" />
          </div>
          <label className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <div className="text-sm font-medium">Active</div>
              <div className="text-xs text-muted-foreground">Inactive questions are hidden from paper generation.</div>
            </div>
            <input type="checkbox" checked={draft.isActive} onChange={(e) => onChange({ isActive: e.target.checked })} className="h-4 w-4 rounded" aria-label="Active" />
          </label>
        </div>
      </FormSection>
    </div>
  );
}

export function validateQuestionDraft(draft: QuestionDraft): string | null {
  if (!draft.subjectKey) return "Select a subject.";
  if (!draft.questionText.trim()) return "Question text is required.";
  if (draft.questionType === "MCQ") {
    if (!draft.optionA.trim() || !draft.optionB.trim()) return "MCQ needs at least options A and B.";
    if (!draft.correctOption) return "Mark the correct option for this MCQ.";
  }
  return null;
}

export function buildQuestionPayload(draft: QuestionDraft) {
  return {
    subjectKey: draft.subjectKey,
    schoolClassKey: draft.schoolClassKey || null,
    chapterName: draft.chapterName || null,
    topicName: draft.topicName || null,
    questionText: draft.questionText,
    questionType: draft.questionType,
    difficultyLevel: draft.difficultyLevel,
    bloomLevel: draft.bloomLevel || null,
    marks: draft.marks,
    optionA: draft.optionA || null,
    optionB: draft.optionB || null,
    optionC: draft.optionC || null,
    optionD: draft.optionD || null,
    correctOption: draft.correctOption || null,
    modelAnswer: draft.modelAnswer || null,
    tags: draft.tags || null,
    isActive: draft.isActive,
  };
}
