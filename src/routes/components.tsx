import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Users, BookOpen, Calendar as CalendarIcon, Wallet, GraduationCap,
  BellRing, CheckCircle2, ClipboardList, Plus, Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/erp/PageHeader";
import { StatCard } from "@/components/erp/StatCard";
import { InfoAlert } from "@/components/erp/InfoAlert";
import { DatePickerField } from "@/components/erp/DatePickerField";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter,
  DialogTitle, DialogDescription, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/components")({
  head: () => ({
    meta: [
      { title: "Components — Akira School ERP" },
      { name: "description", content: "Reusable UI building blocks: cards, buttons, alerts, date pickers and grids for Akira ERP." },
    ],
  }),
  component: ComponentsPage,
});

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-card p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function ComponentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Component Library"
        breadcrumbs={[{ label: "System" }, { label: "Components" }]}
        actions={
          <Button variant="outline" className="h-10 gap-1.5">
            <ClipboardList className="h-4 w-4" /> View Docs
          </Button>
        }
      />

      <Section title="Stat Cards" description="Grid view of KPI cards with trend indicators.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Enrolled" value="2,847" icon={Users} tone="primary" delta={{ value: "8%", direction: "up" }} />
          <StatCard label="Classes" value="86" icon={BookOpen} tone="info" delta={{ value: "2", direction: "up", suffix: "this term" }} />
          <StatCard label="Fee Collected" value="₹1.2Cr" icon={Wallet} tone="success" delta={{ value: "4.1%", direction: "up" }} />
          <StatCard label="Graduating" value="184" icon={GraduationCap} tone="purple" delta={{ value: "3", direction: "down" }} />
        </div>
      </Section>

      <Section title="Buttons" description="Primary, secondary, outline, ghost and destructive variants.">
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button disabled>Disabled</Button>
          <Button size="lg">Large</Button>
          <Button size="sm">Small</Button>
        </div>
      </Section>

      <Section title="Alert Messages" description="Contextual feedback for the user.">
        <div className="grid gap-3 md:grid-cols-2">
          <InfoAlert tone="info" title="Reminder">Staff meeting at 4 PM in room 204.</InfoAlert>
          <InfoAlert tone="success" title="Payment received">Fee payment of ₹42,000 recorded successfully.</InfoAlert>
          <InfoAlert tone="warning" title="Low library stock">Only 3 copies of "Physics XII" available.</InfoAlert>
          <InfoAlert tone="error" title="Backup failed">Nightly backup did not complete. Check settings.</InfoAlert>
        </div>
      </Section>

      <Section title="Form Controls" description="Inputs, date picker, switches and labels.">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sname">Student Name</Label>
            <Input id="sname" placeholder="e.g. Riya Sharma" />
          </div>
          <div className="space-y-2">
            <Label>Admission Date</Label>
            <div><DatePickerField /></div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Guardian Email</Label>
            <Input id="email" type="email" placeholder="parent@example.com" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <div className="text-sm font-semibold">SMS Notifications</div>
              <div className="text-xs text-muted-foreground">Send attendance updates to parents</div>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </Section>

      <Section title="Badges" description="Status pills for records.">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge className="bg-success/15 text-success shadow-none">Active</Badge>
          <Badge className="bg-warning/25 text-[oklch(0.45_0.12_65)] shadow-none">Pending</Badge>
          <Badge className="bg-destructive/15 text-destructive shadow-none">Overdue</Badge>
          <Badge className="bg-info/15 text-info shadow-none">New</Badge>
          <Badge variant="outline">Grade 10 • A</Badge>
        </div>
      </Section>

      <Section title="Cards Grid" description="Reusable content cards for modules.">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: "Attendance", desc: "Track daily attendance across classes.", icon: CalendarIcon },
            { title: "Exams", desc: "Schedule and publish exam results.", icon: ClipboardList },
            { title: "Fees", desc: "Collect, remind and reconcile fees.", icon: Wallet },
          ].map((c) => (
            <Card key={c.title} className="border-border shadow-sm transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <c.icon className="h-5 w-5" />
                </div>
                <CardTitle className="font-display">{c.title}</CardTitle>
                <CardDescription>{c.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">Open module</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Progress & Tabs">
        <Tabs defaultValue="term">
          <TabsList>
            <TabsTrigger value="term">Term Goals</TabsTrigger>
            <TabsTrigger value="fees">Fee Collection</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
          </TabsList>
          <TabsContent value="term" className="mt-4 space-y-4">
            {[{ l: "Syllabus", v: 72 }, { l: "Assessments", v: 54 }, { l: "Projects", v: 88 }].map((r) => (
              <div key={r.l}>
                <div className="mb-1 flex justify-between text-sm"><span>{r.l}</span><span className="font-semibold">{r.v}%</span></div>
                <Progress value={r.v} className="h-2" />
              </div>
            ))}
          </TabsContent>
          <TabsContent value="fees" className="mt-4">
            <InfoAlert tone="success" title="Fee collection healthy">88% of term fees collected on time.</InfoAlert>
          </TabsContent>
          <TabsContent value="events" className="mt-4 text-sm text-muted-foreground">
            No upcoming events this week.
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Table" description="Row-based data with sortable-looking headers.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Attendance</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              { name: "Riya Sharma", grade: "10-A", attendance: "96%", status: "Active" },
              { name: "Arjun Mehta", grade: "9-B", attendance: "88%", status: "Active" },
              { name: "Kabir Singh", grade: "11-C", attendance: "72%", status: "Warning" },
            ].map((s) => (
              <TableRow key={s.name}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.grade}</TableCell>
                <TableCell>{s.attendance}</TableCell>
                <TableCell>
                  <Badge className={s.status === "Active" ? "bg-success/15 text-success shadow-none" : "bg-warning/25 text-[oklch(0.45_0.12_65)] shadow-none"}>
                    {s.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title="Dialog" description="Modal confirmation and form flows.">
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-1.5"><Plus className="h-4 w-4" /> Add Student</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add student</DialogTitle>
              <DialogDescription>Enter the student's details to create a new record.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="dlg-name">Full name</Label>
                <Input id="dlg-name" placeholder="e.g. Riya Sharma" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dlg-grade">Grade</Label>
                <Input id="dlg-grade" placeholder="e.g. 10-A" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>

      <Section title="Select, Checkbox & Radio Group" description="Common form controls for filters and settings.">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Class</Label>
            <Select defaultValue="10a">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10a">Grade 10-A</SelectItem>
                <SelectItem value="10b">Grade 10-B</SelectItem>
                <SelectItem value="11a">Grade 11-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notify via</Label>
            <div className="flex items-center gap-2">
              <Checkbox id="notify-email" defaultChecked />
              <Label htmlFor="notify-email" className="font-normal">Email</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="notify-sms" />
              <Label htmlFor="notify-sms" className="font-normal">SMS</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Fee cycle</Label>
            <RadioGroup defaultValue="monthly">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="monthly" id="fee-monthly" />
                <Label htmlFor="fee-monthly" className="font-normal">Monthly</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="term" id="fee-term" />
                <Label htmlFor="fee-term" className="font-normal">Per term</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </Section>

      <Section title="Avatar & Tooltip" description="Identity chips with hover context.">
        <TooltipProvider>
          <div className="flex flex-wrap items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar>
                  <AvatarImage src="/akira-logo.png" alt="Riya Sharma" />
                  <AvatarFallback>RS</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>Riya Sharma — Grade 10-A</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar>
                  <AvatarFallback>AM</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>Arjun Mehta — Grade 9-B</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon"><Trash2 className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Remove record</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </Section>

      <Section title="Accordion" description="Collapsible sections for FAQs and grouped settings.">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>How is attendance calculated?</AccordionTrigger>
            <AccordionContent>
              Attendance percentage is the ratio of days present to total working days recorded for the term.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Can parents view fee history?</AccordionTrigger>
            <AccordionContent>
              Yes, parents can view fee receipts and pending dues from the parent portal under the Fees tab.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>How do I export exam results?</AccordionTrigger>
            <AccordionContent>
              Go to Exams → Results, select a class and term, then use the Export button to download a CSV.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Section>

      <Section title="Toasts">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => toast.success("Student added", { description: "Riya Sharma — Grade 10A", icon: <CheckCircle2 className="h-4 w-4" /> })}>Success toast</Button>
          <Button variant="outline" onClick={() => toast.error("Failed to save record")}>Error toast</Button>
          <Button variant="outline" onClick={() => toast("Reminder", { description: "PTM starts in 15 minutes.", icon: <BellRing className="h-4 w-4" /> })}>Info toast</Button>
        </div>
      </Section>
    </div>
  );
}
