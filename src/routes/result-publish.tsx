import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Send, Undo2, CheckCircle2, AlertTriangle, Users } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useFormatDate } from "@/hooks/use-tenant-setting";

export const Route = createFileRoute("/result-publish")({
  head: () => ({
    meta: [
      { title: "Result Publish — Akira School ERP" },
      { name: "description", content: "Release processed exam results to students and parents." },
    ],
  }),
  component: ResultPublishPage,
});

type ExamType = { examTypeKey: string; examTypeName: string };
type SchoolClass = { schoolClassKey: string; className: string };
type Subject = { subjectKey: string; subjectName: string };

type PublishItem = {
  examConfigKey: string;
  schoolClassKey: string;
  subjectKey: string;
  totalStudents: number;
  isProcessed: boolean;
  isPublished: boolean;
  processedOn: string | null;
  publishedOn: string | null;
};

function ResultPublishPage() {
  const formatDate = useFormatDate();
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [items, setItems] = useState<PublishItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [examTypeKey, setExamTypeKey] = useState("");
  const [target, setTarget] = useState<{ item: PublishItem; action: "publish" | "unpublish" } | null>(null);
  const [acting, setActing] = useState(false);

  const loadLookups = () => {
    Promise.all([
      apiFetch("/api/ExamType").catch(() => []),
      apiFetch("/api/SchoolClass").catch(() => []),
      apiFetch("/api/Subject").catch(() => []),
    ]).then(([et, sc, sub]) => {
      setExamTypes(et);
      setClasses(sc);
      setSubjects(sub);
      if (!examTypeKey && et.length > 0) setExamTypeKey(et[0].examTypeKey);
    });
  };

  useEffect(loadLookups, []);

  const loadItems = (examTypeId: string) => {
    if (!examTypeId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    apiFetch(`/api/ExamResult/publish-list?examTypeId=${examTypeId}`)
      .then((d: PublishItem[]) => setItems(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load publish list"))
      .finally(() => setLoading(false));
  };

  useEffect(() => loadItems(examTypeKey), [examTypeKey]);

  const className = (k: string) => classes.find((c: any) => c.schoolClassKey === k)?.className ?? "—";
  const subjectName = (k: string) => subjects.find((s: any) => s.subjectKey === k)?.subjectName ?? "—";

  const doToggle = async () => {
    if (!target) return;
    setActing(true);
    try {
      await apiFetch("/api/ExamResult/publish", {
        method: "POST",
        body: JSON.stringify({ examConfigKey: target.item.examConfigKey, isPublished: target.action === "publish" }),
      });
      toast.success(target.action === "publish" ? "Results published" : "Results unpublished");
      setTarget(null);
      loadItems(examTypeKey);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update publish status");
    } finally {
      setActing(false);
    }
  };

  const publishedCount = items.filter((i) => i.isPublished).length;
  const processedCount = items.filter((i) => i.isProcessed).length;

  return (
    <div>
      <PageHeader title="Result Publish" />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={examTypeKey} onValueChange={setExamTypeKey}>
          <SelectTrigger className="h-9 w-full rounded-md sm:w-[200px]"><SelectValue placeholder="Select exam" /></SelectTrigger>
          <SelectContent>
            {examTypes.map((e) => <SelectItem key={e.examTypeKey} value={e.examTypeKey}>{e.examTypeName}</SelectItem>)}
          </SelectContent>
        </Select>
        {items.length > 0 && (
          <>
            <Badge variant="outline" className="rounded-md">{processedCount} processed</Badge>
            <Badge className="rounded-md border-0 bg-success text-success-foreground font-semibold">{publishedCount} published</Badge>
          </>
        )}
      </div>

      {!examTypeKey ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Select an exam to view its result publish status.
        </div>
      ) : loading ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Loading...</div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No exam configurations found for this exam type.
        </div>
      ) : (
        <div className="rounded-md border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Processed On</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.examConfigKey}>
                    <TableCell className="font-medium">{className(item.schoolClassKey)}</TableCell>
                    <TableCell>{subjectName(item.subjectKey)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" /> {item.totalStudents}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.processedOn ? formatDate(item.processedOn) : "—"}</TableCell>
                    <TableCell>
                      {!item.isProcessed ? (
                        <Badge className="gap-1 rounded-md border-0 bg-muted text-muted-foreground">
                          <AlertTriangle className="h-3 w-3" /> Not processed
                        </Badge>
                      ) : item.isPublished ? (
                        <Badge className="gap-1 rounded-md border-0 bg-success text-success-foreground font-semibold">
                          <CheckCircle2 className="h-3 w-3" /> Published
                        </Badge>
                      ) : (
                        <Badge className="gap-1 rounded-md border-0 bg-warning text-warning-foreground font-semibold">
                          <AlertTriangle className="h-3 w-3" /> Unpublished
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.isProcessed && (
                        item.isPublished ? (
                          <Button
                            variant="outline" size="sm"
                            className="h-8 gap-1.5 rounded-md"
                            onClick={() => setTarget({ item, action: "unpublish" })}
                          >
                            <Undo2 className="h-3.5 w-3.5" /> Unpublish
                          </Button>
                        ) : (
                          <Button
                            variant="success" size="sm"
                            className="h-8 gap-1.5 rounded-md"
                            onClick={() => setTarget({ item, action: "publish" })}
                          >
                            <Send className="h-3.5 w-3.5" /> Publish
                          </Button>
                        )
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <AlertDialog open={!!target} onOpenChange={(v) => !v && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {target?.action === "publish" ? "Publish these results?" : "Unpublish these results?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target?.action === "publish"
                ? `Students and parents will be able to see ${target ? subjectName(target.item.subjectKey) : ""} results for ${target ? className(target.item.schoolClassKey) : ""} once published.`
                : "This hides the results from students and parents until republished. The underlying data is not deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); doToggle(); }} disabled={acting}>
              {target?.action === "publish" ? "Publish" : "Unpublish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
