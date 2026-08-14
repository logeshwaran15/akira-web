import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/email-templates")({
  head: () => ({
    meta: [
      { title: "Email Templates — Akira School ERP" },
      { name: "description", content: "Manage reusable email templates for notifications." },
    ],
  }),
  component: EmailTemplatesPage,
});

type TemplateRow = {
  akiraEmailTemplateKey: string;
  templateCode: string;
  templateName: string;
  subject: string;
  body: string;
  description: string | null;
  isActive: boolean;
  createdOn: string;
};

type TemplateDraft = {
  akiraEmailTemplateKey: string;
  templateCode: string;
  templateName: string;
  subject: string;
  body: string;
  description: string;
  isActive: boolean;
};

const empty: TemplateDraft = {
  akiraEmailTemplateKey: "", templateCode: "", templateName: "", subject: "", body: "", description: "", isActive: true,
};

const PLACEHOLDER_HINT = "Use {{UserName}}, {{SchoolName}}, {{Amount}}, {{Date}} etc. as placeholders — replaced when the email is sent.";

function EmailTemplatesPage() {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateRow | null>(null);
  const [draft, setDraft] = useState<TemplateDraft>(empty);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TemplateRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState<TemplateRow | null>(null);

  const load = () => {
    setLoading(true);
    apiFetch("/api/EmailTemplate")
      .then((data: TemplateRow[]) => setRows(data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load email templates"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => { setEditing(null); setDraft(empty); setOpen(true); };
  const openEdit = (r: TemplateRow) => {
    setEditing(r);
    setDraft({
      akiraEmailTemplateKey: r.akiraEmailTemplateKey,
      templateCode: r.templateCode,
      templateName: r.templateName,
      subject: r.subject,
      body: r.body,
      description: r.description ?? "",
      isActive: r.isActive,
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        templateCode: draft.templateCode,
        templateName: draft.templateName,
        subject: draft.subject,
        body: draft.body,
        description: draft.description || null,
      };

      if (editing) {
        await apiFetch(`/api/EmailTemplate/${editing.akiraEmailTemplateKey}`, {
          method: "PUT",
          body: JSON.stringify({ akiraEmailTemplateKey: editing.akiraEmailTemplateKey, ...body, isActive: draft.isActive }),
        });
        toast.success("Email template updated");
      } else {
        await apiFetch("/api/EmailTemplate", { method: "POST", body: JSON.stringify(body) });
        toast.success("Email template created");
      }

      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save email template");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/EmailTemplate/${deleteTarget.akiraEmailTemplateKey}`, { method: "DELETE" });
      toast.success("Email template deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete email template");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<TemplateRow>[] = [
    {
      key: "templateName", header: "Template", sortable: true,
      accessor: (r) => (
        <button className="text-left hover:underline" onClick={() => setPreview(r)}>
          <div className="font-medium">{r.templateName}</div>
          <div className="font-mono text-xs text-muted-foreground">{r.templateCode}</div>
        </button>
      ),
    },
    { key: "subject", header: "Subject", accessor: (r) => <span className="text-sm text-muted-foreground">{r.subject}</span> },
    {
      key: "isActive", header: "Status",
      accessor: (r) => (
        <Badge className={cn("rounded-md border-0", r.isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
          {r.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions", header: "Actions",
      accessor: (r) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => openEdit(r)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive" onClick={() => setDeleteTarget(r)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Email Templates"
        breadcrumbs={[{ label: "System" }, { label: "Email Templates" }]}
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> New Template
          </Button>
        }
      />

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.akiraEmailTemplateKey}
        selectable
        storageKey="email-templates"
        searchPlaceholder="Search templates..."
        searchFields={(r) => `${r.templateName} ${r.templateCode} ${r.subject}`}
        dateField={(r) => r.createdOn}
        dateFilterLabel="Created"
        emptyMessage={loading ? "Loading email templates..." : "No email templates yet."}
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Email Template" : "New Email Template"}
        description={editing ? "Update this email template." : "Create a reusable email template."}
        submitLabel={editing ? "Save Changes" : "Create Template"}
        onSubmit={save}
        submitting={saving}
        size="xl"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label required>Template Name</Label>
            <Input value={draft.templateName} onChange={(e) => setDraft({ ...draft, templateName: e.target.value })} placeholder="Fee Due Reminder" className="rounded-md" required />
          </div>
          <div className="space-y-1.5">
            <Label required>Template Code</Label>
            <Input value={draft.templateCode} onChange={(e) => setDraft({ ...draft, templateCode: e.target.value.toUpperCase() })} placeholder="FEE_DUE_EMAIL" className="rounded-md" required />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label required>Subject</Label>
            <Input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="Your fee payment is due, {{UserName}}" className="rounded-md" required />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label required>Body (HTML)</Label>
            <Textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} className="min-h-[220px] rounded-md font-mono text-xs" required />
            <p className="text-xs text-muted-foreground">{PLACEHOLDER_HINT}</p>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Description</Label>
            <Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="rounded-md" />
          </div>
        </div>
      </FormDialog>

      <FormDialog
        open={!!preview}
        onOpenChange={(v) => !v && setPreview(null)}
        title={preview?.templateName ?? ""}
        description={preview?.subject}
        submitLabel="Close"
        onSubmit={() => setPreview(null)}
        size="lg"
      >
        <div
          className="max-h-[420px] overflow-y-auto rounded-md border border-border bg-secondary/30 p-4 text-sm"
          dangerouslySetInnerHTML={{ __html: preview?.body ?? "" }}
        />
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.templateName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Any notification event using this template will fall back to no template. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
