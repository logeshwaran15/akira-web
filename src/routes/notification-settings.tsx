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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Mail, MessageSquare, Bell, LayoutGrid } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notification-settings")({
  head: () => ({
    meta: [
      { title: "Notification Configure — Akira School ERP" },
      { name: "description", content: "Configure which channels notify users for each system event." },
    ],
  }),
  component: NotificationSettingsPage,
});

type ConfigRow = {
  akiraNotificationConfigKey: string;
  eventCode: string;
  eventName: string;
  description: string | null;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  isActive: boolean;
  createdOn: string;
  akiraEmailTemplateKey: string | null;
  emailTemplateName: string | null;
};

type ConfigDraft = {
  akiraNotificationConfigKey: string;
  eventCode: string;
  eventName: string;
  description: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  isActive: boolean;
  akiraEmailTemplateKey: string;
};

type EmailTemplateOption = { akiraEmailTemplateKey: string; templateName: string };

const empty: ConfigDraft = {
  akiraNotificationConfigKey: "", eventCode: "", eventName: "", description: "",
  emailEnabled: true, smsEnabled: false, pushEnabled: true, inAppEnabled: true, isActive: true,
  akiraEmailTemplateKey: "",
};

type ChannelKey = "emailEnabled" | "smsEnabled" | "pushEnabled" | "inAppEnabled";

const CHANNELS: { key: ChannelKey; label: string; icon: typeof Mail }[] = [
  { key: "emailEnabled", label: "Email", icon: Mail },
  { key: "smsEnabled", label: "SMS", icon: MessageSquare },
  { key: "pushEnabled", label: "Push", icon: Bell },
  { key: "inAppEnabled", label: "In-App", icon: LayoutGrid },
];

function NotificationSettingsPage() {
  const [rows, setRows] = useState<ConfigRow[]>([]);
  const [templates, setTemplates] = useState<EmailTemplateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ConfigRow | null>(null);
  const [draft, setDraft] = useState<ConfigDraft>(empty);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ConfigRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch("/api/NotificationConfig")
      .then((data: ConfigRow[]) => setRows(data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load notification settings"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    apiFetch("/api/EmailTemplate")
      .then((data: EmailTemplateOption[]) => setTemplates(data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load email templates"));
  }, []);

  const openNew = () => { setEditing(null); setDraft(empty); setOpen(true); };
  const openEdit = (r: ConfigRow) => {
    setEditing(r);
    setDraft({
      akiraNotificationConfigKey: r.akiraNotificationConfigKey,
      eventCode: r.eventCode,
      eventName: r.eventName,
      description: r.description ?? "",
      emailEnabled: r.emailEnabled,
      smsEnabled: r.smsEnabled,
      pushEnabled: r.pushEnabled,
      inAppEnabled: r.inAppEnabled,
      isActive: r.isActive,
      akiraEmailTemplateKey: r.akiraEmailTemplateKey ?? "",
    });
    setOpen(true);
  };

  const toggleChannel = (r: ConfigRow, channel: ChannelKey, value: boolean) => {
    setRows((prev) => prev.map((row) => row.akiraNotificationConfigKey === r.akiraNotificationConfigKey ? { ...row, [channel]: value } : row));
    apiFetch(`/api/NotificationConfig/${r.akiraNotificationConfigKey}`, {
      method: "PUT",
      body: JSON.stringify({
        akiraNotificationConfigKey: r.akiraNotificationConfigKey,
        eventCode: r.eventCode,
        eventName: r.eventName,
        description: r.description,
        emailEnabled: r.emailEnabled,
        smsEnabled: r.smsEnabled,
        pushEnabled: r.pushEnabled,
        inAppEnabled: r.inAppEnabled,
        isActive: r.isActive,
        akiraEmailTemplateKey: r.akiraEmailTemplateKey,
        [channel]: value,
      }),
    }).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update channel");
      load();
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        eventCode: draft.eventCode,
        eventName: draft.eventName,
        description: draft.description || null,
        emailEnabled: draft.emailEnabled,
        smsEnabled: draft.smsEnabled,
        pushEnabled: draft.pushEnabled,
        inAppEnabled: draft.inAppEnabled,
        akiraEmailTemplateKey: draft.akiraEmailTemplateKey || null,
      };

      if (editing) {
        await apiFetch(`/api/NotificationConfig/${editing.akiraNotificationConfigKey}`, {
          method: "PUT",
          body: JSON.stringify({ akiraNotificationConfigKey: editing.akiraNotificationConfigKey, ...body, isActive: draft.isActive }),
        });
        toast.success("Notification config updated");
      } else {
        await apiFetch("/api/NotificationConfig", { method: "POST", body: JSON.stringify(body) });
        toast.success("Notification config created");
      }

      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save notification config");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/NotificationConfig/${deleteTarget.akiraNotificationConfigKey}`, { method: "DELETE" });
      toast.success("Notification config deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete notification config");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<ConfigRow>[] = [
    {
      key: "eventName", header: "Event", sortable: true,
      accessor: (r) => (
        <div>
          <div className="font-medium">{r.eventName}</div>
          <div className="font-mono text-xs text-muted-foreground">{r.eventCode}</div>
        </div>
      ),
    },
    {
      key: "channels", header: "Channels",
      accessor: (r) => (
        <div className="flex items-center gap-4">
          {CHANNELS.map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-center gap-1.5" title={label}>
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <Switch
                checked={r[key]}
                onCheckedChange={(v) => toggleChannel(r, key, v)}
              />
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "emailTemplateName", header: "Email Template",
      accessor: (r) => r.emailTemplateName
        ? <Badge variant="outline" className="rounded-md">{r.emailTemplateName}</Badge>
        : <span className="text-xs text-muted-foreground">None</span>,
    },
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
        title="Notification Configure"
        breadcrumbs={[{ label: "System" }, { label: "Notification Configure" }]}
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> New Event
          </Button>
        }
      />

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.akiraNotificationConfigKey}
        selectable
        storageKey="notification-settings"
        searchPlaceholder="Search events..."
        searchFields={(r) => `${r.eventName} ${r.eventCode}`}
        dateField={(r) => r.createdOn}
        dateFilterLabel="Created"
        emptyMessage={loading ? "Loading notification settings..." : "No notification events configured."}
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Notification Event" : "New Notification Event"}
        description={editing ? "Update which channels notify users for this event." : "Define a new event and its notification channels."}
        submitLabel={editing ? "Save Changes" : "Create Event"}
        onSubmit={save}
        submitting={saving}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label required>Event Name</Label>
            <Input value={draft.eventName} onChange={(e) => setDraft({ ...draft, eventName: e.target.value })} placeholder="Fee Due Reminder" className="rounded-md" required />
          </div>
          <div className="space-y-1.5">
            <Label required>Event Code</Label>
            <Input value={draft.eventCode} onChange={(e) => setDraft({ ...draft, eventCode: e.target.value.toUpperCase() })} placeholder="FEE_DUE" className="rounded-md" required />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Description</Label>
            <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="rounded-md" rows={2} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Email Template</Label>
            <Select
              value={draft.akiraEmailTemplateKey || "none"}
              onValueChange={(v) => setDraft({ ...draft, akiraEmailTemplateKey: v === "none" ? "" : v })}
            >
              <SelectTrigger className="rounded-md"><SelectValue placeholder="No template" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.akiraEmailTemplateKey} value={t.akiraEmailTemplateKey}>{t.templateName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Used when the Email channel is enabled for this event.</p>
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Channels</Label>
            <div className="grid grid-cols-2 gap-3 rounded-md border border-border p-3 sm:grid-cols-4">
              {CHANNELS.map(({ key, label, icon: Icon }) => (
                <label key={key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </span>
                  <Switch
                    checked={draft[key]}
                    onCheckedChange={(v) => setDraft({ ...draft, [key]: v })}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.eventName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Notifications will no longer be sent for this event on any channel. This action cannot be undone.
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
