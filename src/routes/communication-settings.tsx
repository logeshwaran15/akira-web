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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Save, Loader2, MessageSquare, Mail, Smartphone, Bell } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/communication-settings")({
  head: () => ({
    meta: [
      { title: "Communication Settings — Akira School ERP" },
      { name: "description", content: "Configure SMS, WhatsApp, email and push notification providers." },
    ],
  }),
  component: CommunicationSettingsPage,
});

type Settings = {
  smsProvider: string | null; smsApiKey: string | null; smsSenderId: string | null; smsDltEntityId: string | null;
  whatsAppBusinessAccountId: string | null; whatsAppPhoneNumberId: string | null; whatsAppAccessToken: string | null;
  smtpHost: string | null; smtpPort: number | null; smtpUseSsl: boolean; smtpSenderEmail: string | null; smtpSenderName: string | null;
  fcmServerKey: string | null; dndStartTime: string | null; dndEndTime: string | null;
  defaultLanguage: string; attendanceSmsTime: string; feeReminderDaysBefore: number; feeOverdueReminderDaysAfter: number; examResultAutoRelease: boolean;
};

type DltTemplate = { dltTemplateKey: string; templateType: string; dltTemplateId: string; templateText: string | null; isApproved: boolean };

const SMS_PROVIDERS = ["MSG91", "TEXTLOCAL", "EXOTEL", "KALEYRA"];
const TEMPLATE_TYPES = [
  { code: "FEE_DUE", label: "Fee Due Reminder" },
  { code: "ATTENDANCE_ALERT", label: "Attendance Alert" },
  { code: "EXAM_RESULT", label: "Exam Result Notification" },
  { code: "ADMISSION_CONFIRMATION", label: "Admission Confirmation" },
  { code: "TRANSPORT_ALERT", label: "Transport Alert" },
  { code: "HOLIDAY_ANNOUNCEMENT", label: "Holiday Announcement" },
  { code: "PTM_REMINDER", label: "PTM Reminder" },
  { code: "EMERGENCY_NOTICE", label: "Emergency Notice" },
];

const empty: Settings = {
  smsProvider: "", smsApiKey: "", smsSenderId: "", smsDltEntityId: "",
  whatsAppBusinessAccountId: "", whatsAppPhoneNumberId: "", whatsAppAccessToken: "",
  smtpHost: "", smtpPort: null, smtpUseSsl: true, smtpSenderEmail: "", smtpSenderName: "",
  fcmServerKey: "", dndStartTime: "22:00", dndEndTime: "07:00",
  defaultLanguage: "English", attendanceSmsTime: "10:00", feeReminderDaysBefore: 3, feeOverdueReminderDaysAfter: 3, examResultAutoRelease: false,
};

function CommunicationSettingsPage() {
  const [settings, setSettings] = useState<Settings>(empty);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [templates, setTemplates] = useState<Record<string, DltTemplate | undefined>>({});
  const [templateSavingType, setTemplateSavingType] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/CommunicationSettings")
      .then((d: Settings | null) => { if (d) setSettings(d); })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load communication settings"))
      .finally(() => setLoading(false));

    apiFetch("/api/CommunicationSettings/dlt-templates")
      .then((d: DltTemplate[]) => {
        const map: Record<string, DltTemplate> = {};
        d.forEach((t) => { map[t.templateType] = t; });
        setTemplates(map);
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/CommunicationSettings", { method: "PUT", body: JSON.stringify(settings) });
      toast.success("Communication settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save communication settings");
    } finally {
      setSaving(false);
    }
  };

  const updateTemplate = (type: string, patch: Partial<DltTemplate>) => {
    setTemplates((prev) => ({
      ...prev,
      [type]: { dltTemplateKey: prev[type]?.dltTemplateKey ?? "", templateType: type, dltTemplateId: prev[type]?.dltTemplateId ?? "", templateText: prev[type]?.templateText ?? null, isApproved: prev[type]?.isApproved ?? false, ...patch },
    }));
  };

  const saveTemplate = async (type: string) => {
    const t = templates[type];
    if (!t?.dltTemplateId) {
      toast.error("Enter a DLT template ID first.");
      return;
    }
    setTemplateSavingType(type);
    try {
      await apiFetch("/api/CommunicationSettings/dlt-templates", {
        method: "PUT",
        body: JSON.stringify({ templateType: type, dltTemplateId: t.dltTemplateId, templateText: t.templateText, isApproved: t.isApproved }),
      });
      toast.success("Template saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setTemplateSavingType(null);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div>
      <PageHeader
        title="Communication Settings"
        breadcrumbs={[{ label: "School Setup" }, { label: "Communication Settings" }]}
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save All
          </Button>
        }
      />

      <div className="space-y-6">
        {/* SMS Gateway */}
        <div className="rounded-md border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-semibold">SMS Gateway</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select value={settings.smsProvider || "none"} onValueChange={(v) => setSettings({ ...settings, smsProvider: v === "none" ? "" : v })}>
                <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose provider" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {SMS_PROVIDERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>API Key</Label>
              <Input type="password" value={settings.smsApiKey ?? ""} onChange={(e) => setSettings({ ...settings, smsApiKey: e.target.value })} className="rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Label>Sender ID (DLT-registered, 6 char)</Label>
              <Input value={settings.smsSenderId ?? ""} onChange={(e) => setSettings({ ...settings, smsSenderId: e.target.value.toUpperCase() })} maxLength={6} className="rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Label>DLT Entity ID</Label>
              <Input value={settings.smsDltEntityId ?? ""} onChange={(e) => setSettings({ ...settings, smsDltEntityId: e.target.value })} className="rounded-md" />
            </div>
          </div>
        </div>

        {/* WhatsApp */}
        <div className="rounded-md border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-semibold">WhatsApp Business API</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Business Account ID</Label>
              <Input value={settings.whatsAppBusinessAccountId ?? ""} onChange={(e) => setSettings({ ...settings, whatsAppBusinessAccountId: e.target.value })} className="rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone Number ID</Label>
              <Input value={settings.whatsAppPhoneNumberId ?? ""} onChange={(e) => setSettings({ ...settings, whatsAppPhoneNumberId: e.target.value })} className="rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Label>Access Token</Label>
              <Input type="password" value={settings.whatsAppAccessToken ?? ""} onChange={(e) => setSettings({ ...settings, whatsAppAccessToken: e.target.value })} className="rounded-md" />
            </div>
          </div>
        </div>

        {/* SMTP */}
        <div className="rounded-md border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-semibold">Email (SMTP)</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>SMTP Host</Label>
              <Input value={settings.smtpHost ?? ""} onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })} placeholder="smtp.sendgrid.net" className="rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Label>Port</Label>
              <Input type="number" value={settings.smtpPort ?? ""} onChange={(e) => setSettings({ ...settings, smtpPort: e.target.value ? Number(e.target.value) : null })} placeholder="587" className="rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Label>Sender Email</Label>
              <Input type="email" value={settings.smtpSenderEmail ?? ""} onChange={(e) => setSettings({ ...settings, smtpSenderEmail: e.target.value })} className="rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Label>Sender Name</Label>
              <Input value={settings.smtpSenderName ?? ""} onChange={(e) => setSettings({ ...settings, smtpSenderName: e.target.value })} className="rounded-md" />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={settings.smtpUseSsl} onCheckedChange={(v) => setSettings({ ...settings, smtpUseSsl: !!v })} /> Use SSL/TLS
              </label>
            </div>
          </div>
        </div>

        {/* Push / DND */}
        <div className="rounded-md border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-semibold">Push Notifications</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Firebase (FCM) Server Key</Label>
              <Input type="password" value={settings.fcmServerKey ?? ""} onChange={(e) => setSettings({ ...settings, fcmServerKey: e.target.value })} className="rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Label>Do-Not-Disturb Start</Label>
              <Input type="time" value={settings.dndStartTime ?? ""} onChange={(e) => setSettings({ ...settings, dndStartTime: e.target.value })} className="rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Label>Do-Not-Disturb End</Label>
              <Input type="time" value={settings.dndEndTime ?? ""} onChange={(e) => setSettings({ ...settings, dndEndTime: e.target.value })} className="rounded-md" />
            </div>
          </div>
        </div>

        {/* Trigger timing */}
        <div className="rounded-md border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-display text-base font-semibold">Notification Timing</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Default Language</Label>
              <Select value={settings.defaultLanguage} onValueChange={(v) => setSettings({ ...settings, defaultLanguage: v })}>
                <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Tamil">Tamil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Daily Attendance SMS Time</Label>
              <Input type="time" value={settings.attendanceSmsTime} onChange={(e) => setSettings({ ...settings, attendanceSmsTime: e.target.value })} className="rounded-md" />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={settings.examResultAutoRelease} onCheckedChange={(v) => setSettings({ ...settings, examResultAutoRelease: !!v })} /> Auto-release exam result notifications
              </label>
            </div>
            <div className="space-y-1.5">
              <Label>Fee Reminder (days before due)</Label>
              <Input type="number" min={0} value={settings.feeReminderDaysBefore} onChange={(e) => setSettings({ ...settings, feeReminderDaysBefore: Number(e.target.value) })} className="rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Label>Overdue Reminder (days after due)</Label>
              <Input type="number" min={0} value={settings.feeOverdueReminderDaysAfter} onChange={(e) => setSettings({ ...settings, feeOverdueReminderDaysAfter: Number(e.target.value) })} className="rounded-md" />
            </div>
          </div>
        </div>

        {/* DLT Templates */}
        <div className="rounded-md border border-border bg-card shadow-sm">
          <div className="border-b border-border p-4">
            <h2 className="font-display text-base font-semibold">DLT Template Registry</h2>
            <p className="text-xs text-muted-foreground">Only registered template IDs may be used — unregistered messages get blocked by the telecom operator.</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Type</TableHead>
                <TableHead>DLT Template ID</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead className="text-right">Save</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TEMPLATE_TYPES.map((t) => {
                const row = templates[t.code];
                return (
                  <TableRow key={t.code}>
                    <TableCell className="font-medium">{t.label}</TableCell>
                    <TableCell>
                      <Input value={row?.dltTemplateId ?? ""} onChange={(e) => updateTemplate(t.code, { dltTemplateId: e.target.value })} placeholder="1234567890123456789" className="h-9 w-56 rounded-md" />
                    </TableCell>
                    <TableCell>
                      {row?.isApproved ? (
                        <Badge className="rounded-md border-0 bg-success/15 text-success">Approved</Badge>
                      ) : (
                        <label className="flex items-center gap-2 text-xs">
                          <Checkbox checked={row?.isApproved ?? false} onCheckedChange={(v) => updateTemplate(t.code, { isApproved: !!v })} /> Mark approved
                        </label>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => saveTemplate(t.code)} disabled={templateSavingType === t.code}>
                        {templateSavingType === t.code ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
