import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PageHeader, IconTile } from "@/components/erp/PageHeader";
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Save, Loader2, MessageSquare, Mail, Bell, MoreVertical, Eye, EyeOff,
  Plug, Globe, CalendarCheck, Wallet, GraduationCap, FileText, Radio, Pencil,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

type DltTemplate = { dltTemplateKey: string; templateType: string; dltTemplateId: string; templateText: string | null; isApproved: boolean; updatedOn?: string | null };

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

const filled = (...values: (string | number | null | undefined)[]) =>
  values.every((v) => v !== null && v !== undefined && String(v).trim() !== "");

type TemplateStatus = "approved" | "pending" | "none";
const templateStatus = (t?: DltTemplate): TemplateStatus =>
  !t?.dltTemplateId ? "none" : t.isApproved ? "approved" : "pending";

function StatusBadge({ ok, okLabel = "Active", noLabel = "Not Configured" }: { ok: boolean; okLabel?: string; noLabel?: string }) {
  return ok ? (
    <Badge variant="success">{okLabel}</Badge>
  ) : (
    <Badge variant="secondary">{noLabel}</Badge>
  );
}

function TemplateStatusBadge({ status }: { status: TemplateStatus }) {
  if (status === "approved")
    return <Badge variant="success">Approved</Badge>;
  if (status === "pending")
    return <Badge variant="warning">Pending</Badge>;
  return <Badge variant="secondary">Not Configured</Badge>;
}

function Field({ label, htmlFor, children, className = "" }: { label: string; htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SecretInput({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="rounded-md pr-10" autoComplete="off" />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide value" : "Show value"}
        className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// Brand glyph (Simple Icons). lucide-react ships no brand logos.
function WhatsAppTile() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#25D366" role="img" aria-label="WhatsApp">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
    </div>
  );
}

function SectionCard({
  icon, customIcon, title, description, status, menu, footer, children,
}: {
  icon?: LucideIcon; customIcon?: ReactNode; title: string; description: string; status?: ReactNode; menu?: ReactNode; footer?: ReactNode; children: ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-xl border border-border bg-card shadow-sm">
      <header className="flex items-start gap-3 p-5 pb-4">
        {customIcon ?? (icon && <IconTile icon={icon} size="sm" />)}
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {status}
          {menu}
        </div>
      </header>
      <div className="flex-1 px-5 pb-5">{children}</div>
      {footer && (
        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">{footer}</footer>
      )}
    </section>
  );
}

function CardMenu({ onClear }: { onClear: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More options">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onClear}>Clear fields</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


function PageSection({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function CommunicationSettingsPage() {
  const [settings, setSettings] = useState<Settings>(empty);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("channels");

  const [templates, setTemplates] = useState<Record<string, DltTemplate | undefined>>({});
  const [editingType, setEditingType] = useState<string | null>(null);
  const [draft, setDraft] = useState<DltTemplate | null>(null);
  const [templateSaving, setTemplateSaving] = useState(false);

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

  const patch = (p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p }));

  // The backend stores one settings row per tenant, so every Save Changes
  // button persists the full object through the same PUT.
  const save = async (label: string) => {
    setSaving(true);
    try {
      await apiFetch("/api/CommunicationSettings", { method: "PUT", body: JSON.stringify(settings) });
      toast.success(`${label} saved`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save communication settings");
    } finally {
      setSaving(false);
    }
  };

  const [testing, setTesting] = useState<string | null>(null);

  // The backend tests the saved settings, so save first and then test.
  const testConnection = async (channel: string, label: string) => {
    setTesting(channel);
    try {
      await apiFetch("/api/CommunicationSettings", { method: "PUT", body: JSON.stringify(settings) });
      const res = (await apiFetch(`/api/CommunicationSettings/test/${channel}`, { method: "POST" })) as {
        success: boolean; liveCheck: boolean; message: string;
      };
      if (!res.success) toast.error(`${label}: ${res.message}`);
      else if (res.liveCheck) toast.success(`${label}: ${res.message}`);
      else toast.info(`${label}: ${res.message}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${label} test failed`);
    } finally {
      setTesting(null);
    }
  };

  const sms = filled(settings.smsProvider, settings.smsApiKey, settings.smsSenderId, settings.smsDltEntityId);
  const whatsapp = filled(settings.whatsAppBusinessAccountId, settings.whatsAppPhoneNumberId, settings.whatsAppAccessToken);
  const email = filled(settings.smtpHost, settings.smtpPort, settings.smtpSenderEmail);
  const push = filled(settings.fcmServerKey);

  const counts = useMemo(() => {
    const c = { approved: 0, pending: 0, none: 0 };
    TEMPLATE_TYPES.forEach((t) => { c[templateStatus(templates[t.code])]++; });
    return c;
  }, [templates]);

  const openTemplate = (code: string) => {
    const t = templates[code];
    setDraft({
      dltTemplateKey: t?.dltTemplateKey ?? "", templateType: code,
      dltTemplateId: t?.dltTemplateId ?? "", templateText: t?.templateText ?? "", isApproved: t?.isApproved ?? false,
    });
    setEditingType(code);
  };

  const saveTemplate = async () => {
    if (!draft) return;
    if (!draft.dltTemplateId.trim()) {
      toast.error("Enter a DLT template ID first.");
      return;
    }
    setTemplateSaving(true);
    try {
      await apiFetch("/api/CommunicationSettings/dlt-templates", {
        method: "PUT",
        body: JSON.stringify({
          templateType: draft.templateType,
          dltTemplateId: draft.dltTemplateId,
          templateText: draft.templateText,
          isApproved: draft.isApproved,
        }),
      });
      setTemplates((prev) => ({ ...prev, [draft.templateType]: { ...draft, updatedOn: new Date().toISOString() } }));
      toast.success("Template saved");
      setEditingType(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setTemplateSaving(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>;
  }

  const saveButton = (label: string) => (
    <Button variant="success" className="h-9 gap-1.5 rounded-md" onClick={() => save(label)} disabled={saving}>
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
    </Button>
  );

  const testButton = (channel: string, label: string) => (
    <Button variant="outline" className="h-9 gap-1.5 rounded-md" onClick={() => testConnection(channel, label)} disabled={testing !== null || saving}>
      {testing === channel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />} Test Connection
    </Button>
  );

  const tabClass =
    "relative -mb-px gap-2 rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none";

  const editingLabel = TEMPLATE_TYPES.find((t) => t.code === editingType)?.label ?? "";

  return (
    <div>
      <PageHeader title="Communication Settings" />
      <p className="-mt-4 mb-5 text-sm text-muted-foreground">
        Configure communication channels, notification preferences and SMS templates.
      </p>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-transparent p-0">
          <TabsTrigger value="channels" className={tabClass}><Radio className="h-4 w-4" /> Channels</TabsTrigger>
          <TabsTrigger value="notifications" className={tabClass}><Bell className="h-4 w-4" /> Notifications</TabsTrigger>
          <TabsTrigger value="templates" className={tabClass}><FileText className="h-4 w-4" /> SMS Templates (DLT)</TabsTrigger>
        </TabsList>

        {/* ───────── Channels ───────── */}
        <TabsContent value="channels" className="mt-6">
          <PageSection title="Message Channels" subtitle="Connect and configure the communication channels used to send messages to parents." />
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <SectionCard
              icon={MessageSquare} title="SMS Gateway"
              description="Send SMS alerts and notifications using Indian DLT registered providers."
              status={<StatusBadge ok={sms} />}
              menu={<CardMenu onClear={() => patch({ smsProvider: "", smsApiKey: "", smsSenderId: "", smsDltEntityId: "" })} />}
              footer={
                <>
                  <div className="flex gap-2">{testButton("sms", "SMS Gateway")}{saveButton("SMS Gateway")}</div>
                </>
              }
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Provider">
                  <Select value={settings.smsProvider || "none"} onValueChange={(v) => patch({ smsProvider: v === "none" ? "" : v })}>
                    <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose provider" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {SMS_PROVIDERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="API Key" htmlFor="sms-api-key">
                  <SecretInput id="sms-api-key" placeholder="Enter provider API key" value={settings.smsApiKey ?? ""} onChange={(v) => patch({ smsApiKey: v })} />
                </Field>
                <Field label="Sender ID (6 characters)" htmlFor="sms-sender">
                  <Input id="sms-sender" placeholder="AKIRAS" value={settings.smsSenderId ?? ""} onChange={(e) => patch({ smsSenderId: e.target.value.toUpperCase() })} maxLength={6} className="rounded-md" />
                </Field>
                <Field label="DLT Entity ID" htmlFor="sms-dlt">
                  <Input id="sms-dlt" placeholder="e.g. 1101234567890123456" value={settings.smsDltEntityId ?? ""} onChange={(e) => patch({ smsDltEntityId: e.target.value })} className="rounded-md" />
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              customIcon={<WhatsAppTile />} title="WhatsApp Business API"
              description="Send approved template messages to parents on WhatsApp."
              status={<StatusBadge ok={whatsapp} />}
              menu={<CardMenu onClear={() => patch({ whatsAppBusinessAccountId: "", whatsAppPhoneNumberId: "", whatsAppAccessToken: "" })} />}
              footer={
                <>
                  <div className="flex gap-2">{testButton("whatsapp", "WhatsApp")}{saveButton("WhatsApp settings")}</div>
                </>
              }
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Business Account ID" htmlFor="wa-account">
                  <Input id="wa-account" placeholder="e.g. 123456789012345" value={settings.whatsAppBusinessAccountId ?? ""} onChange={(e) => patch({ whatsAppBusinessAccountId: e.target.value })} className="rounded-md" />
                </Field>
                <Field label="Phone Number ID" htmlFor="wa-phone">
                  <Input id="wa-phone" placeholder="e.g. 109876543210987" value={settings.whatsAppPhoneNumberId ?? ""} onChange={(e) => patch({ whatsAppPhoneNumberId: e.target.value })} className="rounded-md" />
                </Field>
                <Field label="Access Token" htmlFor="wa-token" className="sm:col-span-2">
                  <SecretInput id="wa-token" placeholder="Enter permanent access token" value={settings.whatsAppAccessToken ?? ""} onChange={(v) => patch({ whatsAppAccessToken: v })} />
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              icon={Mail} title="Email (SMTP)"
              description="Send emails to parents through your own mail server."
              status={<StatusBadge ok={email} />}
              menu={<CardMenu onClear={() => patch({ smtpHost: "", smtpPort: null, smtpSenderEmail: "", smtpSenderName: "", smtpUseSsl: true })} />}
              footer={
                <>
                  <div className="flex gap-2">{testButton("email", "Email")}{saveButton("Email settings")}</div>
                </>
              }
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="SMTP Host" htmlFor="smtp-host">
                  <Input id="smtp-host" value={settings.smtpHost ?? ""} onChange={(e) => patch({ smtpHost: e.target.value })} placeholder="smtp.sendgrid.net" className="rounded-md" />
                </Field>
                <Field label="Port" htmlFor="smtp-port">
                  <Input id="smtp-port" type="number" value={settings.smtpPort ?? ""} onChange={(e) => patch({ smtpPort: e.target.value ? Number(e.target.value) : null })} placeholder="587" className="rounded-md" />
                </Field>
                <Field label="Sender Email" htmlFor="smtp-email">
                  <Input id="smtp-email" placeholder="noreply@yourschool.edu" type="email" value={settings.smtpSenderEmail ?? ""} onChange={(e) => patch({ smtpSenderEmail: e.target.value })} className="rounded-md" />
                </Field>
                <Field label="Sender Name" htmlFor="smtp-name">
                  <Input id="smtp-name" placeholder="Your School Name" value={settings.smtpSenderName ?? ""} onChange={(e) => patch({ smtpSenderName: e.target.value })} className="rounded-md" />
                </Field>
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 sm:col-span-2">
                  <Label htmlFor="smtp-ssl" className="text-sm">Use SSL/TLS</Label>
                  <Switch id="smtp-ssl" checked={settings.smtpUseSsl} onCheckedChange={(v) => patch({ smtpUseSsl: v })} />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              icon={Bell} title="Push Notifications"
              description="Deliver instant alerts to the Akira mobile app through Firebase."
              status={<StatusBadge ok={push} />}
              menu={<CardMenu onClear={() => patch({ fcmServerKey: "" })} />}
              footer={
                <>
                  <span className="mr-auto text-xs text-muted-foreground">Push is silenced during Do Not Disturb hours.</span>
                  {saveButton("Push settings")}
                </>
              }
            >
              <div className="space-y-4">
                <Field label="Firebase (FCM) Server Key" htmlFor="fcm-key">
                  <SecretInput id="fcm-key" placeholder="Enter Firebase server key" value={settings.fcmServerKey ?? ""} onChange={(v) => patch({ fcmServerKey: v })} />
                </Field>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Do Not Disturb</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Start Time" htmlFor="dnd-start">
                      <Input id="dnd-start" type="time" value={settings.dndStartTime ?? ""} onChange={(e) => patch({ dndStartTime: e.target.value })} className="rounded-md" />
                    </Field>
                    <Field label="End Time" htmlFor="dnd-end">
                      <Input id="dnd-end" type="time" value={settings.dndEndTime ?? ""} onChange={(e) => patch({ dndEndTime: e.target.value })} className="rounded-md" />
                    </Field>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        {/* ───────── Notifications ───────── */}
        <TabsContent value="notifications" className="mt-6">
          <PageSection title="Notification Preferences" subtitle="Configure when and how automatic notifications are triggered." />

          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Default Language", value: settings.defaultLanguage },
              { label: "Attendance Alert", value: settings.attendanceSmsTime || "—" },
              { label: "Fee Reminder", value: `${settings.feeReminderDaysBefore} day(s) before` },
              { label: "Exam Notification", value: settings.examResultAutoRelease ? "Auto-release" : "Manual" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="mt-0.5 font-display text-sm font-semibold text-foreground">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <SectionCard
              icon={Globe} title="General" description="Language used for automatic messages."
            >
              <Field label="Default Language">
                <Select value={settings.defaultLanguage} onValueChange={(v) => patch({ defaultLanguage: v })}>
                  <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Tamil">Tamil</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </SectionCard>

            <SectionCard
              icon={CalendarCheck} title="Attendance" description="When daily absence alerts go out."
            >
              <Field label="Daily Attendance SMS Time" htmlFor="att-time">
                <Input id="att-time" type="time" value={settings.attendanceSmsTime} onChange={(e) => patch({ attendanceSmsTime: e.target.value })} className="rounded-md" />
              </Field>
            </SectionCard>

            <SectionCard
              icon={Wallet} title="Fees" description="Reminder timing around the fee due date."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Reminder — Days Before Due" htmlFor="fee-before">
                  <Input id="fee-before" type="number" min={0} value={settings.feeReminderDaysBefore} onChange={(e) => patch({ feeReminderDaysBefore: Number(e.target.value) })} className="rounded-md" />
                </Field>
                <Field label="Overdue — Days After Due" htmlFor="fee-after">
                  <Input id="fee-after" type="number" min={0} value={settings.feeOverdueReminderDaysAfter} onChange={(e) => patch({ feeOverdueReminderDaysAfter: Number(e.target.value) })} className="rounded-md" />
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              icon={GraduationCap} title="Examinations" description="How exam results are notified."
            >
              <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2">
                <div>
                  <Label htmlFor="exam-auto" className="text-sm">Auto-release exam result notifications</Label>
                  <p className="text-xs text-muted-foreground">Notify parents as soon as results are published.</p>
                </div>
                <Switch id="exam-auto" checked={settings.examResultAutoRelease} onCheckedChange={(v) => patch({ examResultAutoRelease: v })} />
              </div>
            </SectionCard>
          </div>

          <div className="mt-5 flex justify-end">{saveButton("Notification preferences")}</div>
        </TabsContent>

        {/* ───────── SMS Templates ───────── */}
        <TabsContent value="templates" className="mt-6">
          <PageSection title="SMS Templates" subtitle="Manage DLT-registered SMS templates used for school notifications." />

          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Total Templates", value: TEMPLATE_TYPES.length },
              { label: "Approved", value: counts.approved },
              { label: "Pending", value: counts.pending },
              { label: "Not Configured", value: counts.none },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="mt-0.5 font-display text-xl font-semibold text-foreground">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Template Type</TableHead>
                  <TableHead>DLT Template ID</TableHead>
                  <TableHead>Approval Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TEMPLATE_TYPES.map((t) => {
                  const row = templates[t.code];
                  const status = templateStatus(row);
                  return (
                    <TableRow key={t.code}>
                      <TableCell className="font-medium">{t.label}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{t.code}</TableCell>
                      <TableCell className="font-mono text-xs">{row?.dltTemplateId || "—"}</TableCell>
                      <TableCell><TemplateStatusBadge status={status} /></TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {row?.updatedOn ? new Date(row.updatedOn).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant={status === "none" ? "default" : "outline"} size="sm" className="gap-1.5 rounded-md" onClick={() => openTemplate(t.code)}>
                          <Pencil className="h-3.5 w-3.5" /> {status === "none" ? "Configure" : "Edit"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Sheet open={editingType !== null} onOpenChange={(o) => { if (!o) setEditingType(null); }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editingLabel}</SheetTitle>
            <SheetDescription>Enter the template exactly as registered on your DLT portal.</SheetDescription>
          </SheetHeader>
          {draft && (
            <div className="mt-6 space-y-4">
              <Field label="Template Type" htmlFor="dlt-type">
                <Input id="dlt-type" value={draft.templateType} readOnly className="rounded-md bg-muted font-mono text-xs" />
              </Field>
              <Field label="DLT Template ID" htmlFor="dlt-id">
                <Input id="dlt-id" value={draft.dltTemplateId} onChange={(e) => setDraft({ ...draft, dltTemplateId: e.target.value })} placeholder="1234567890123456789" className="rounded-md" />
              </Field>
              <Field label="Template Text" htmlFor="dlt-text">
                <Textarea id="dlt-text" placeholder="Dear Parent, {#var#} fee of Rs.{#var#} is due on {#var#}." rows={5} value={draft.templateText ?? ""} onChange={(e) => setDraft({ ...draft, templateText: e.target.value })} className="rounded-md" />
              </Field>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <Label htmlFor="dlt-approved" className="text-sm">Approved by operator</Label>
                  <p className="text-xs text-muted-foreground">Turn on once the template is approved on DLT.</p>
                </div>
                <Switch id="dlt-approved" checked={draft.isApproved} onCheckedChange={(v) => setDraft({ ...draft, isApproved: v })} />
              </div>
            </div>
          )}
          <SheetFooter className="mt-6 gap-2 sm:space-x-0">
            <Button variant="outline" className="rounded-md" onClick={() => setEditingType(null)}>Cancel</Button>
            <Button variant="success" className="gap-1.5 rounded-md" onClick={saveTemplate} disabled={templateSaving}>
              {templateSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
