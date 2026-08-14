import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/timetable-config")({
  head: () => ({
    meta: [
      { title: "Timetable Configuration — Akira School ERP" },
      { name: "description", content: "Configure period, break and assembly parameters per academic stage." },
    ],
  }),
  component: TimetableConfigPage,
});

type Board = { boardKey: string; boardCode: string; boardName: string };
type StageConfig = {
  academicStageKey: string; stageName: string;
  periodsPerDay: number; periodDurationMinutes: number;
  assemblyEnabled: boolean; assemblyPosition: number; assemblyDurationMinutes: number;
  shortBreakAfterPeriod: number | null; shortBreakDurationMinutes: number;
  lunchBreakAfterPeriod: number | null; lunchBreakDurationMinutes: number;
  freePeriodsPerWeek: number;
};

function TimetableConfigPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardCode, setBoardCode] = useState("");
  const [stages, setStages] = useState<StageConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/Board").then((d: Board[]) => { setBoards(d); if (d.length > 0) setBoardCode(d[0].boardCode); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!boardCode) return;
    setLoading(true);
    apiFetch(`/api/TimetableConfig?boardCode=${boardCode}`)
      .then((d: StageConfig[]) => setStages(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load timetable configuration"))
      .finally(() => setLoading(false));
  }, [boardCode]);

  const updateStage = (key: string, patch: Partial<StageConfig>) => {
    setStages((rows) => rows.map((r) => (r.academicStageKey === key ? { ...r, ...patch } : r)));
  };

  const saveStage = async (s: StageConfig) => {
    setSavingKey(s.academicStageKey);
    try {
      await apiFetch("/api/TimetableConfig", {
        method: "PUT",
        body: JSON.stringify({
          academicStageKey: s.academicStageKey,
          periodsPerDay: s.periodsPerDay,
          periodDurationMinutes: s.periodDurationMinutes,
          assemblyEnabled: s.assemblyEnabled,
          assemblyPosition: s.assemblyPosition,
          assemblyDurationMinutes: s.assemblyDurationMinutes,
          shortBreakAfterPeriod: s.shortBreakAfterPeriod,
          shortBreakDurationMinutes: s.shortBreakDurationMinutes,
          lunchBreakAfterPeriod: s.lunchBreakAfterPeriod,
          lunchBreakDurationMinutes: s.lunchBreakDurationMinutes,
          freePeriodsPerWeek: s.freePeriodsPerWeek,
        }),
      });
      toast.success(`${s.stageName} configuration saved`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Timetable Configuration"
        breadcrumbs={[{ label: "School Setup" }, { label: "Timetable Configuration" }]}
      />

      <div className="mb-4 flex items-center gap-3 rounded-md border border-border bg-card p-3 shadow-sm">
        <Label className="text-sm font-medium">Board</Label>
        <Select value={boardCode} onValueChange={setBoardCode}>
          <SelectTrigger className="h-9 w-[260px] rounded-md"><SelectValue placeholder="Choose board" /></SelectTrigger>
          <SelectContent>
            {boards.map((b) => <SelectItem key={b.boardKey} value={b.boardCode}>{b.boardName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>
      ) : stages.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">No academic stages found for this board.</div>
      ) : (
        <div className="space-y-4">
          {stages.map((s) => (
            <div key={s.academicStageKey} className="rounded-md border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-base font-semibold">{s.stageName}</h2>
                <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={() => saveStage(s)} disabled={savingKey === s.academicStageKey}>
                  {savingKey === s.academicStageKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>Periods / Day</Label>
                  <Input type="number" min={1} value={s.periodsPerDay} onChange={(e) => updateStage(s.academicStageKey, { periodsPerDay: Number(e.target.value) })} className="rounded-md" />
                </div>
                <div className="space-y-1.5">
                  <Label>Period Duration (min)</Label>
                  <Input type="number" min={1} value={s.periodDurationMinutes} onChange={(e) => updateStage(s.academicStageKey, { periodDurationMinutes: Number(e.target.value) })} className="rounded-md" />
                </div>
                <div className="space-y-1.5">
                  <Label>Free Periods / Week</Label>
                  <Input type="number" min={0} value={s.freePeriodsPerWeek} onChange={(e) => updateStage(s.academicStageKey, { freePeriodsPerWeek: Number(e.target.value) })} className="rounded-md" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={s.assemblyEnabled} onCheckedChange={(v) => updateStage(s.academicStageKey, { assemblyEnabled: !!v })} />
                    Assembly
                  </label>
                </div>

                {s.assemblyEnabled && (
                  <>
                    <div className="space-y-1.5">
                      <Label>Assembly Position (period #)</Label>
                      <Input type="number" min={1} value={s.assemblyPosition} onChange={(e) => updateStage(s.academicStageKey, { assemblyPosition: Number(e.target.value) })} className="rounded-md" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Assembly Duration (min)</Label>
                      <Input type="number" min={1} value={s.assemblyDurationMinutes} onChange={(e) => updateStage(s.academicStageKey, { assemblyDurationMinutes: Number(e.target.value) })} className="rounded-md" />
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <Label>Short Break After Period</Label>
                  <Input type="number" min={1} value={s.shortBreakAfterPeriod ?? ""} onChange={(e) => updateStage(s.academicStageKey, { shortBreakAfterPeriod: e.target.value ? Number(e.target.value) : null })} placeholder="e.g. 3" className="rounded-md" />
                </div>
                <div className="space-y-1.5">
                  <Label>Short Break Duration (min)</Label>
                  <Input type="number" min={1} value={s.shortBreakDurationMinutes} onChange={(e) => updateStage(s.academicStageKey, { shortBreakDurationMinutes: Number(e.target.value) })} className="rounded-md" />
                </div>
                <div className="space-y-1.5">
                  <Label>Lunch Break After Period</Label>
                  <Input type="number" min={1} value={s.lunchBreakAfterPeriod ?? ""} onChange={(e) => updateStage(s.academicStageKey, { lunchBreakAfterPeriod: e.target.value ? Number(e.target.value) : null })} placeholder="e.g. 5" className="rounded-md" />
                </div>
                <div className="space-y-1.5">
                  <Label>Lunch Break Duration (min)</Label>
                  <Input type="number" min={1} value={s.lunchBreakDurationMinutes} onChange={(e) => updateStage(s.academicStageKey, { lunchBreakDurationMinutes: Number(e.target.value) })} className="rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
