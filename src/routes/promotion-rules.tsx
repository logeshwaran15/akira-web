import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/promotion-rules")({
  head: () => ({
    meta: [
      { title: "Promotion Rules — Akira School ERP" },
      { name: "description", content: "Configure pass marks, grace marks and detention thresholds per class." },
    ],
  }),
  component: PromotionRulesPage,
});

type Board = { boardKey: string; boardCode: string; boardName: string };
type Rule = {
  schoolClassKey: string; className: string;
  promotionRuleKey: string | null;
  minMarksPerSubjectTheory: number; minMarksPerSubjectPractical: number | null; minAggregatePercent: number;
  maxGraceMarksPerSubject: number; maxTotalGraceMarks: number;
  supplementaryFailureThreshold: number; detentionFailureThreshold: number;
  autoPromote: boolean; remedialTriggerPercent: number | null; allowStreamChangeXIToXII: boolean;
};

function PromotionRulesPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardCode, setBoardCode] = useState("");
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch("/api/PromotionRule")
      .then((d: Rule[]) => setRules(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load promotion rules"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    apiFetch("/api/Board").then((d: Board[]) => { setBoards(d); if (d.length > 0) setBoardCode(d[0].boardCode); }).catch(() => {});
    load();
  }, []);

  const updateRule = (key: string, patch: Partial<Rule>) => {
    setRules((rows) => rows.map((r) => (r.schoolClassKey === key ? { ...r, ...patch } : r)));
  };

  const saveRule = async (r: Rule) => {
    setSavingKey(r.schoolClassKey);
    try {
      await apiFetch("/api/PromotionRule", {
        method: "PUT",
        body: JSON.stringify({
          schoolClassKey: r.schoolClassKey,
          minMarksPerSubjectTheory: r.minMarksPerSubjectTheory,
          minMarksPerSubjectPractical: r.minMarksPerSubjectPractical,
          minAggregatePercent: r.minAggregatePercent,
          maxGraceMarksPerSubject: r.maxGraceMarksPerSubject,
          maxTotalGraceMarks: r.maxTotalGraceMarks,
          supplementaryFailureThreshold: r.supplementaryFailureThreshold,
          detentionFailureThreshold: r.detentionFailureThreshold,
          autoPromote: r.autoPromote,
          remedialTriggerPercent: r.remedialTriggerPercent,
          allowStreamChangeXIToXII: r.allowStreamChangeXIToXII,
        }),
      });
      toast.success(`${r.className} promotion rule saved`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save promotion rule");
    } finally {
      setSavingKey(null);
    }
  };

  const seedDefaults = async () => {
    if (!boardCode) return;
    setSeeding(true);
    try {
      const data = await apiFetch("/api/PromotionRule/seed-defaults", { method: "POST", body: JSON.stringify({ boardCode }) });
      setRules(data);
      toast.success("Default promotion rules applied");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to seed default promotion rules");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Promotion Rules"
        breadcrumbs={[{ label: "School Setup" }, { label: "Promotion Rules" }]}
        actions={
          <div className="flex items-center gap-2">
            <Select value={boardCode} onValueChange={setBoardCode}>
              <SelectTrigger className="h-10 w-[220px] rounded-md"><SelectValue placeholder="Choose board" /></SelectTrigger>
              <SelectContent>
                {boards.map((b) => <SelectItem key={b.boardKey} value={b.boardCode}>{b.boardName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" className="h-10 gap-1.5 rounded-md" onClick={seedDefaults} disabled={seeding || !boardCode}>
              <Sparkles className="h-4 w-4" /> {seeding ? "Applying..." : "Seed Defaults"}
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>
      ) : rules.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">No classes configured yet — add classes on the Classes & Sections page first.</div>
      ) : (
        <div className="space-y-4">
          {rules.map((r) => (
            <div key={r.schoolClassKey} className="rounded-md border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-semibold">{r.className}</h2>
                  {r.autoPromote && <Badge className="rounded-md border-0 bg-info/15 text-info">RTE Auto-Promote</Badge>}
                </div>
                <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={() => saveRule(r)} disabled={savingKey === r.schoolClassKey}>
                  {savingKey === r.schoolClassKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                </Button>
              </div>

              <div className="mb-3 flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={r.autoPromote} onCheckedChange={(v) => updateRule(r.schoolClassKey, { autoPromote: !!v })} />
                  Auto-Promote (RTE, no detention)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={r.allowStreamChangeXIToXII} onCheckedChange={(v) => updateRule(r.schoolClassKey, { allowStreamChangeXIToXII: !!v })} />
                  Allow Stream Change (XI → XII)
                </label>
              </div>

              {!r.autoPromote && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label>Min Marks / Subject (Theory)</Label>
                    <Input type="number" min={0} max={100} value={r.minMarksPerSubjectTheory} onChange={(e) => updateRule(r.schoolClassKey, { minMarksPerSubjectTheory: Number(e.target.value) })} className="rounded-md" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Min Marks / Subject (Practical)</Label>
                    <Input type="number" min={0} max={100} value={r.minMarksPerSubjectPractical ?? ""} onChange={(e) => updateRule(r.schoolClassKey, { minMarksPerSubjectPractical: e.target.value ? Number(e.target.value) : null })} placeholder="N/A" className="rounded-md" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Min Aggregate %</Label>
                    <Input type="number" min={0} max={100} value={r.minAggregatePercent} onChange={(e) => updateRule(r.schoolClassKey, { minAggregatePercent: Number(e.target.value) })} className="rounded-md" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Remedial Trigger % (soft)</Label>
                    <Input type="number" min={0} max={100} value={r.remedialTriggerPercent ?? ""} onChange={(e) => updateRule(r.schoolClassKey, { remedialTriggerPercent: e.target.value ? Number(e.target.value) : null })} placeholder="None" className="rounded-md" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Max Grace Marks / Subject</Label>
                    <Input type="number" min={0} value={r.maxGraceMarksPerSubject} onChange={(e) => updateRule(r.schoolClassKey, { maxGraceMarksPerSubject: Number(e.target.value) })} className="rounded-md" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Max Total Grace Marks</Label>
                    <Input type="number" min={0} value={r.maxTotalGraceMarks} onChange={(e) => updateRule(r.schoolClassKey, { maxTotalGraceMarks: Number(e.target.value) })} className="rounded-md" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Failures → Supplementary</Label>
                    <Input type="number" min={0} value={r.supplementaryFailureThreshold} onChange={(e) => updateRule(r.schoolClassKey, { supplementaryFailureThreshold: Number(e.target.value) })} className="rounded-md" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Failures → Detention</Label>
                    <Input type="number" min={0} value={r.detentionFailureThreshold} onChange={(e) => updateRule(r.schoolClassKey, { detentionFailureThreshold: Number(e.target.value) })} className="rounded-md" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
