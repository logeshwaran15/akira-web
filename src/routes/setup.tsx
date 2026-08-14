import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  School, Layers, ClipboardCheck, Users2, BookOpen, GraduationCap,
  Building2, Landmark, UserCog, CalendarDays, CalendarClock, CalendarCheck2,
  ArrowUpRight, Wallet, MessageSquare, ShieldCheck, Hash, CheckCircle2,
  Search, Save, RotateCcw, Plus, Pencil, Trash2, ChevronRight, Rocket,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/erp/PageHeader";
import { InfoAlert } from "@/components/erp/InfoAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "School Setup — Akira School ERP" },
      { name: "description", content: "Configure your school profile, academic structure, staff, calendar, fees, permissions and go-live." },
    ],
  }),
  component: SetupPage,
});

type SectionKey =
  | "profile" | "academic" | "assessment" | "classes" | "subjects"
  | "curriculum" | "departments" | "campus" | "staff" | "calendar"
  | "timetable" | "attendance" | "promotion" | "fees" | "communication"
  | "roles" | "numbering" | "golive";

type Section = { key: SectionKey; label: string; icon: LucideIcon; group: string };

const SECTIONS: Section[] = [
  { key: "profile",       label: "School Profile",             icon: School,          group: "Foundation" },
  { key: "academic",      label: "Academic Structure",         icon: Layers,          group: "Foundation" },
  { key: "assessment",    label: "Assessment Pattern",         icon: ClipboardCheck,  group: "Foundation" },
  { key: "classes",       label: "Classes, Grades & Sections", icon: Users2,          group: "Academic" },
  { key: "subjects",      label: "Subject Management",         icon: BookOpen,        group: "Academic" },
  { key: "curriculum",    label: "Curriculum & Allocation",    icon: GraduationCap,   group: "Academic" },
  { key: "departments",   label: "Department Management",      icon: Building2,       group: "Academic" },
  { key: "campus",        label: "Campus / Building / Room",   icon: Landmark,        group: "Infrastructure" },
  { key: "staff",         label: "Staff & Teacher Assignment", icon: UserCog,         group: "Infrastructure" },
  { key: "calendar",      label: "Academic Calendar",          icon: CalendarDays,    group: "Operations" },
  { key: "timetable",     label: "Timetable Configuration",    icon: CalendarClock,   group: "Operations" },
  { key: "attendance",    label: "Attendance Policies",        icon: CalendarCheck2,  group: "Operations" },
  { key: "promotion",     label: "Promotion Rules",            icon: ArrowUpRight,    group: "Operations" },
  { key: "fees",          label: "Fee Configuration",          icon: Wallet,          group: "Finance & Comm" },
  { key: "communication", label: "Communication Settings",     icon: MessageSquare,   group: "Finance & Comm" },
  { key: "roles",         label: "Roles & Permissions",        icon: ShieldCheck,     group: "Governance" },
  { key: "numbering",     label: "Document Numbering",         icon: Hash,            group: "Governance" },
  { key: "golive",        label: "Validation & Go-Live",       icon: CheckCircle2,    group: "Governance" },
];

function SetupPage() {
  const [active, setActive] = useState<SectionKey>("profile");
  const [q, setQ] = useState("");
  const [completed, setCompleted] = useState<Record<SectionKey, boolean>>({} as any);

  const grouped = useMemo(() => {
    const filtered = SECTIONS.filter(s => s.label.toLowerCase().includes(q.toLowerCase()));
    return filtered.reduce<Record<string, Section[]>>((acc, s) => {
      (acc[s.group] ||= []).push(s); return acc;
    }, {});
  }, [q]);

  const current = SECTIONS.find(s => s.key === active)!;
  const currentIndex = SECTIONS.findIndex(s => s.key === active);
  const progress = Math.round((Object.values(completed).filter(Boolean).length / SECTIONS.length) * 100);

  const markDone = () => {
    setCompleted(c => ({ ...c, [active]: true }));
    toast.success(`${current.label} saved`);
  };
  const gotoNext = () => {
    const next = SECTIONS[Math.min(currentIndex + 1, SECTIONS.length - 1)];
    setActive(next.key);
  };

  return (
    <div>
      <PageHeader
        title="School Setup"
        breadcrumbs={[{ label: "Setup" }]}
        actions={
          <>
            <Button variant="outline" className="rounded-md"><RotateCcw className="mr-2 h-4 w-4" /> Reset</Button>
            <Button className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
              <Rocket className="mr-2 h-4 w-4" /> Publish setup
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-border bg-card p-4">
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Setup progress</div>
          <div className="mt-2 flex items-center justify-between">
            <div className="font-display text-2xl font-bold">{progress}%</div>
            <Badge className="rounded-md bg-primary/10 text-primary hover:bg-primary/15">
              {Object.values(completed).filter(Boolean).length}/{SECTIONS.length}
            </Badge>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="rounded-md border border-border bg-card p-4 md:col-span-2">
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Currently editing</div>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
              <current.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate font-semibold">{current.label}</div>
              <div className="text-xs text-muted-foreground">{current.group} · Step {currentIndex + 1} of {SECTIONS.length}</div>
            </div>
            <div className="ml-auto hidden gap-2 sm:flex">
              <Button variant="outline" className="rounded-md" onClick={markDone}>
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>
              <Button className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90" onClick={gotoNext}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
        {/* Sub-nav */}
        <aside className="rounded-md border border-border bg-card">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search steps"
                className="h-9 rounded-md pl-9"
              />
            </div>
          </div>
          <nav className="max-h-[70vh] space-y-4 overflow-y-auto p-3">
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {group}
                </div>
                <div className="space-y-0.5">
                  {items.map(s => {
                    const isActive = s.key === active;
                    const done = completed[s.key];
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.key}
                        onClick={() => setActive(s.key)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors",
                          isActive ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-secondary",
                        )}
                      >
                        <span className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-md",
                          isActive ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
                        )}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1 truncate">{s.label}</span>
                        {done && <CheckCircle2 className="h-4 w-4 text-success" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Panel */}
        <section className="min-w-0 rounded-md border border-border bg-card p-4 sm:p-6">
          <SectionRenderer section={current} onSave={markDone} onNext={gotoNext} />
        </section>
      </div>
    </div>
  );
}

/* ---------- Reusable form primitives ---------- */

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="border-b border-border pb-6 last:border-0 last:pb-0">
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({ label, hint, children, full }: { label: string; hint?: string; children: ReactNode; full?: boolean }) {
  return (
    <div className={cn("space-y-1.5", full && "sm:col-span-2")}>
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ToggleRow({ title, description, defaultChecked }: { title: string; description: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-border bg-background p-3">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}

function MiniTable({ head, rows }: { head: string[]; rows: (string | ReactNode)[][] }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>{head.map(h => <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>)}
            <th className="w-16 px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border hover:bg-secondary/40">
              {r.map((c, j) => <td key={j} className="px-3 py-2">{c}</td>)}
              <td className="px-3 py-2 text-right">
                <button className="mr-1 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                <button className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FooterActions({ onSave, onNext }: { onSave: () => void; onNext: () => void }) {
  return (
    <div className="mt-6 flex flex-wrap justify-end gap-2">
      <Button variant="outline" className="rounded-md">Cancel</Button>
      <Button variant="outline" className="rounded-md" onClick={onSave}>
        <Save className="mr-2 h-4 w-4" /> Save changes
      </Button>
      <Button className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90" onClick={onNext}>
        Save & Continue <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}

/* ---------- Section content ---------- */

function SectionRenderer({ section, onSave, onNext }: { section: Section; onSave: () => void; onNext: () => void }) {
  const Header = (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        <section.icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-display text-lg font-bold">{section.label}</h2>
        <p className="text-sm text-muted-foreground">{SECTION_DESCRIPTIONS[section.key]}</p>
      </div>
    </div>
  );

  return (
    <div>
      {Header}
      {renderBody(section.key)}
      <FooterActions onSave={onSave} onNext={onNext} />
    </div>
  );
}

const SECTION_DESCRIPTIONS: Record<SectionKey, string> = {
  profile: "Basic school identity, branding, contact and legal details.",
  academic: "Define academic year, session naming and grading system.",
  assessment: "Choose assessment approach and grade boundaries.",
  classes: "Manage grades and their sections in one place.",
  subjects: "Master list of subjects offered across the school.",
  curriculum: "Allocate subjects to grades and set weekly periods.",
  departments: "Organize staff into academic departments.",
  campus: "Register campuses, buildings and classroom capacities.",
  staff: "Assign class teachers and subject teachers.",
  calendar: "Holidays, term dates and school events.",
  timetable: "Working days, period duration and break structure.",
  attendance: "Rules for daily attendance and leave workflow.",
  promotion: "Criteria to promote students to next grade.",
  fees: "Fee heads, discounts, late fees and payment gateways.",
  communication: "SMS, Email and Push notification defaults.",
  roles: "Roles for admin, teacher, parent, student and permissions.",
  numbering: "Prefixes and sequences for admissions, invoices, IDs.",
  golive: "Final checks before switching your school ERP live.",
};

function UncontrolledDatePicker({ defaultValue, className }: { defaultValue: string; className?: string }) {
  const [value, setValue] = useState(defaultValue);
  return <DatePicker value={value} onChange={setValue} className={className} />;
}

function renderBody(key: SectionKey): ReactNode {
  switch (key) {
    case "profile": return (<>
      <Section title="Identity" description="Displayed across reports, invoices and portals.">
        <Field label="School name" full><Input defaultValue="Akira International School" className="h-10 rounded-md" /></Field>
        <Field label="Short code"><Input defaultValue="AKR" className="h-10 rounded-md" /></Field>
        <Field label="Established"><Input defaultValue="1998" className="h-10 rounded-md" /></Field>
        <Field label="Affiliation board">
          <Select defaultValue="cbse"><SelectTrigger className="h-10 rounded-md"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="cbse">CBSE</SelectItem><SelectItem value="icse">ICSE</SelectItem><SelectItem value="ib">IB</SelectItem><SelectItem value="state">State Board</SelectItem></SelectContent>
          </Select>
        </Field>
        <Field label="Affiliation number"><Input defaultValue="AF-773241" className="h-10 rounded-md" /></Field>
      </Section>
      <Section title="Contact">
        <Field label="Address" full><Textarea defaultValue="12 Rosewood Avenue, Bengaluru 560001" rows={2} /></Field>
        <Field label="Phone"><Input defaultValue="+91 80 4000 1200" className="h-10 rounded-md" /></Field>
        <Field label="Email"><Input defaultValue="office@akira.edu" className="h-10 rounded-md" /></Field>
        <Field label="Website"><Input defaultValue="https://akira.edu" className="h-10 rounded-md" /></Field>
        <Field label="Timezone">
          <Select defaultValue="ist"><SelectTrigger className="h-10 rounded-md"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="ist">Asia/Kolkata (IST)</SelectItem><SelectItem value="utc">UTC</SelectItem><SelectItem value="est">America/New_York</SelectItem></SelectContent>
          </Select>
        </Field>
      </Section>
    </>);

    case "academic": return (<>
      <Section title="Academic year">
        <Field label="Session name"><Input defaultValue="2025 – 2026" className="h-10 rounded-md" /></Field>
        <Field label="Start date"><UncontrolledDatePicker defaultValue="2025-06-01" className="h-10" /></Field>
        <Field label="End date"><UncontrolledDatePicker defaultValue="2026-04-30" className="h-10" /></Field>
        <Field label="Working days / week">
          <Select defaultValue="6"><SelectTrigger className="h-10 rounded-md"><SelectValue /></SelectTrigger>
            <SelectContent>{[5,6,7].map(n => <SelectItem key={n} value={String(n)}>{n} days</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </Section>
      <Section title="Grading system">
        <Field label="Grading scheme">
          <Select defaultValue="letter"><SelectTrigger className="h-10 rounded-md"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="letter">A–F Letter grades</SelectItem><SelectItem value="cgpa">CGPA 10-point</SelectItem><SelectItem value="percent">Percentage</SelectItem></SelectContent>
          </Select>
        </Field>
        <Field label="Passing marks (%)"><Input type="number" defaultValue={35} className="h-10 rounded-md" /></Field>
      </Section>
    </>);

    case "assessment": return (<>
      <Section title="Assessment approach">
        <Field label="Pattern">
          <Select defaultValue="term"><SelectTrigger className="h-10 rounded-md"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="term">Term based (Mid + Final)</SelectItem><SelectItem value="continuous">Continuous (CCE)</SelectItem><SelectItem value="semester">Semester system</SelectItem></SelectContent>
          </Select>
        </Field>
        <Field label="Terms per year"><Input type="number" defaultValue={2} className="h-10 rounded-md" /></Field>
      </Section>
      <Section title="Grade boundaries">
        <div className="sm:col-span-2">
          <MiniTable
            head={["Grade", "Min %", "Max %", "Remark"]}
            rows={[
              ["A+", "90", "100", "Outstanding"],
              ["A", "80", "89", "Excellent"],
              ["B", "70", "79", "Very Good"],
              ["C", "50", "69", "Good"],
              ["D", "35", "49", "Needs improvement"],
            ]}
          />
          <Button variant="outline" className="mt-3 rounded-md"><Plus className="mr-2 h-4 w-4" /> Add grade band</Button>
        </div>
      </Section>
    </>);

    case "classes": return (<>
      <Section title="Grades & sections">
        <div className="sm:col-span-2">
          <MiniTable
            head={["Grade", "Sections", "Capacity", "Class Teacher"]}
            rows={[
              ["Grade 6", "A, B, C", "40", "Priya Sharma"],
              ["Grade 7", "A, B", "40", "Rahul Menon"],
              ["Grade 8", "A, B, C", "38", "Meera Iyer"],
              ["Grade 9", "A, B", "36", "Karan Verma"],
              ["Grade 10", "A, B, C", "35", "Ananya Rao"],
            ]}
          />
          <Button variant="outline" className="mt-3 rounded-md"><Plus className="mr-2 h-4 w-4" /> Add grade</Button>
        </div>
      </Section>
    </>);

    case "subjects": return (<>
      <Section title="Subject master">
        <div className="sm:col-span-2">
          <MiniTable
            head={["Code", "Subject", "Type", "Language"]}
            rows={[
              ["MTH", "Mathematics", <Badge className="rounded-md bg-info/15 text-info">Core</Badge>, "English"],
              ["ENG", "English Literature", <Badge className="rounded-md bg-info/15 text-info">Core</Badge>, "English"],
              ["SCI", "Science", <Badge className="rounded-md bg-info/15 text-info">Core</Badge>, "English"],
              ["ART", "Fine Arts", <Badge className="rounded-md bg-success/15 text-success">Elective</Badge>, "English"],
              ["MUS", "Music", <Badge className="rounded-md bg-success/15 text-success">Elective</Badge>, "English"],
            ]}
          />
          <Button variant="outline" className="mt-3 rounded-md"><Plus className="mr-2 h-4 w-4" /> Add subject</Button>
        </div>
      </Section>
    </>);

    case "curriculum": return (<>
      <Section title="Subject allocation">
        <Field label="Grade">
          <Select defaultValue="8"><SelectTrigger className="h-10 rounded-md"><SelectValue /></SelectTrigger>
            <SelectContent>{[6,7,8,9,10,11,12].map(g => <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Stream">
          <Select defaultValue="general"><SelectTrigger className="h-10 rounded-md"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="general">General</SelectItem><SelectItem value="science">Science</SelectItem><SelectItem value="commerce">Commerce</SelectItem><SelectItem value="arts">Arts</SelectItem></SelectContent>
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <MiniTable
            head={["Subject", "Periods / week", "Teacher", "Credits"]}
            rows={[
              ["Mathematics", "6", "R. Menon", "5"],
              ["English", "5", "S. Kapoor", "4"],
              ["Science", "6", "P. Sharma", "5"],
              ["Social Studies", "4", "N. Bose", "3"],
              ["Physical Ed.", "2", "V. Singh", "1"],
            ]}
          />
        </div>
      </Section>
    </>);

    case "departments": return (<>
      <Section title="Departments">
        <div className="sm:col-span-2">
          <MiniTable
            head={["Department", "Head", "Members", "Extension"]}
            rows={[
              ["Mathematics", "Rahul Menon", "8", "1201"],
              ["Science", "Priya Sharma", "11", "1202"],
              ["Languages", "Sneha Kapoor", "9", "1203"],
              ["Arts & Sports", "Vikram Singh", "6", "1204"],
            ]}
          />
          <Button variant="outline" className="mt-3 rounded-md"><Plus className="mr-2 h-4 w-4" /> Add department</Button>
        </div>
      </Section>
    </>);

    case "campus": return (<>
      <Section title="Campuses">
        <Field label="Primary campus" full><Input defaultValue="Main Campus — Bengaluru" className="h-10 rounded-md" /></Field>
      </Section>
      <Section title="Buildings & classrooms">
        <div className="sm:col-span-2">
          <MiniTable
            head={["Building", "Floors", "Rooms", "Capacity"]}
            rows={[
              ["Block A – Primary", "3", "18", "540"],
              ["Block B – Middle", "3", "16", "480"],
              ["Block C – Senior", "4", "20", "600"],
              ["Science Wing", "2", "8", "240"],
            ]}
          />
          <Button variant="outline" className="mt-3 rounded-md"><Plus className="mr-2 h-4 w-4" /> Add building</Button>
        </div>
      </Section>
    </>);

    case "staff": return (<>
      <Section title="Class teacher assignment">
        <div className="sm:col-span-2">
          <MiniTable
            head={["Grade / Section", "Class Teacher", "Assistant", "Subjects"]}
            rows={[
              ["10 – A", "Ananya Rao", "K. Verma", "Math, Sci"],
              ["10 – B", "Rahul Menon", "P. Sharma", "Math"],
              ["9 – A", "Karan Verma", "S. Kapoor", "Sci"],
              ["8 – A", "Meera Iyer", "N. Bose", "Eng, Soc"],
            ]}
          />
        </div>
      </Section>
    </>);

    case "calendar": return (<>
      <Section title="Terms">
        <Field label="Term 1 start"><UncontrolledDatePicker defaultValue="2025-06-01" className="h-10" /></Field>
        <Field label="Term 1 end"><UncontrolledDatePicker defaultValue="2025-10-15" className="h-10" /></Field>
        <Field label="Term 2 start"><UncontrolledDatePicker defaultValue="2025-11-01" className="h-10" /></Field>
        <Field label="Term 2 end"><UncontrolledDatePicker defaultValue="2026-04-15" className="h-10" /></Field>
      </Section>
      <Section title="Holidays">
        <div className="sm:col-span-2">
          <MiniTable
            head={["Date", "Occasion", "Type"]}
            rows={[
              ["Aug 15, 2025", "Independence Day", <Badge className="rounded-md bg-warning/25 text-warning-foreground">National</Badge>],
              ["Oct 02, 2025", "Gandhi Jayanti", <Badge className="rounded-md bg-warning/25 text-warning-foreground">National</Badge>],
              ["Dec 25, 2025", "Christmas", <Badge className="rounded-md bg-info/15 text-info">Festival</Badge>],
            ]}
          />
        </div>
      </Section>
    </>);

    case "timetable": return (<>
      <Section title="Period structure">
        <Field label="Periods / day"><Input type="number" defaultValue={8} className="h-10 rounded-md" /></Field>
        <Field label="Period length (min)"><Input type="number" defaultValue={40} className="h-10 rounded-md" /></Field>
        <Field label="First bell"><Input type="time" defaultValue="08:00" className="h-10 rounded-md" /></Field>
        <Field label="Last bell"><Input type="time" defaultValue="14:30" className="h-10 rounded-md" /></Field>
      </Section>
      <Section title="Breaks">
        <div className="sm:col-span-2">
          <MiniTable
            head={["Break", "After period", "Duration"]}
            rows={[["Short break", "3", "10 min"], ["Lunch", "5", "30 min"]]}
          />
        </div>
      </Section>
    </>);

    case "attendance": return (<>
      <Section title="Policy">
        <Field label="Minimum attendance (%)"><Input type="number" defaultValue={75} className="h-10 rounded-md" /></Field>
        <Field label="Grace late (min)"><Input type="number" defaultValue={10} className="h-10 rounded-md" /></Field>
      </Section>
      <Section title="Options">
        <div className="sm:col-span-2 space-y-2">
          <ToggleRow title="Twice a day marking" description="Enable morning + afternoon marking." defaultChecked />
          <ToggleRow title="Auto SMS on absence" description="Notify parents when a student is absent." defaultChecked />
          <ToggleRow title="Biometric integration" description="Sync attendance from campus biometric devices." />
        </div>
      </Section>
    </>);

    case "promotion": return (<>
      <Section title="Promotion criteria">
        <Field label="Minimum overall %"><Input type="number" defaultValue={40} className="h-10 rounded-md" /></Field>
        <Field label="Minimum attendance %"><Input type="number" defaultValue={75} className="h-10 rounded-md" /></Field>
        <Field label="Max failed subjects allowed"><Input type="number" defaultValue={1} className="h-10 rounded-md" /></Field>
        <Field label="Re-exam policy">
          <Select defaultValue="allowed"><SelectTrigger className="h-10 rounded-md"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="allowed">Allowed</SelectItem><SelectItem value="conditional">Conditional</SelectItem><SelectItem value="none">Not allowed</SelectItem></SelectContent>
          </Select>
        </Field>
      </Section>
    </>);

    case "fees": return (<>
      <Section title="Fee heads">
        <div className="sm:col-span-2">
          <MiniTable
            head={["Fee head", "Amount", "Frequency", "Applies to"]}
            rows={[
              ["Tuition", "₹ 24,000", "Quarterly", "All grades"],
              ["Transport", "₹ 3,500", "Monthly", "Opted"],
              ["Library", "₹ 1,200", "Annual", "All grades"],
              ["Exam", "₹ 800", "Term", "All grades"],
            ]}
          />
          <Button variant="outline" className="mt-3 rounded-md"><Plus className="mr-2 h-4 w-4" /> Add fee head</Button>
        </div>
      </Section>
      <Section title="Late fee & discounts">
        <Field label="Late fee / day"><Input defaultValue="₹ 20" className="h-10 rounded-md" /></Field>
        <Field label="Sibling discount (%)"><Input type="number" defaultValue={10} className="h-10 rounded-md" /></Field>
      </Section>
    </>);

    case "communication": return (<>
      <Section title="Channels">
        <div className="sm:col-span-2 space-y-2">
          <ToggleRow title="SMS notifications" description="Send transactional SMS via configured gateway." defaultChecked />
          <ToggleRow title="Email notifications" description="Send emails via SMTP / provider." defaultChecked />
          <ToggleRow title="Push notifications" description="Send push updates to the Akira parent app." />
        </div>
      </Section>
      <Section title="Provider settings">
        <Field label="SMS sender ID"><Input defaultValue="AKIRAS" className="h-10 rounded-md" /></Field>
        <Field label="From email"><Input defaultValue="no-reply@akira.edu" className="h-10 rounded-md" /></Field>
      </Section>
    </>);

    case "roles": return (<>
      <Section title="Roles">
        <div className="sm:col-span-2">
          <MiniTable
            head={["Role", "Members", "Scope"]}
            rows={[
              ["Super Admin", "2", "Full access"],
              ["Principal", "1", "All modules (read + approve)"],
              ["Teacher", "48", "Attendance, marks, timetable"],
              ["Accountant", "3", "Fees, invoices, reports"],
              ["Parent", "1,240", "Own child data"],
              ["Student", "1,820", "Portal, timetable, results"],
            ]}
          />
          <Button variant="outline" className="mt-3 rounded-md"><Plus className="mr-2 h-4 w-4" /> Add role</Button>
        </div>
      </Section>
    </>);

    case "numbering": return (<>
      <Section title="Document sequences">
        <Field label="Admission number"><Input defaultValue="AKR-{YY}-{####}" className="h-10 rounded-md" /></Field>
        <Field label="Invoice number"><Input defaultValue="INV-{YY}{MM}-{####}" className="h-10 rounded-md" /></Field>
        <Field label="Receipt number"><Input defaultValue="RCP-{####}" className="h-10 rounded-md" /></Field>
        <Field label="Transfer certificate"><Input defaultValue="TC-{YYYY}-{####}" className="h-10 rounded-md" /></Field>
      </Section>
      <Section title="Reset behaviour">
        <ToggleRow title="Reset yearly" description="Start counters from 0001 every academic year." defaultChecked />
        <ToggleRow title="Zero padding" description="Pad numeric portion with leading zeros." defaultChecked />
      </Section>
    </>);

    case "golive": return (<>
      <div className="mb-4">
        <InfoAlert tone="warning" title="Final review">
          Once you publish, students, staff and parents will see the changes across every module. Make sure the previous sections look right.
        </InfoAlert>
      </div>
      <Section title="Readiness checklist">
        <div className="sm:col-span-2 space-y-2">
          {[
            "School profile filled",
            "Academic year & grading configured",
            "Grades, sections and subjects added",
            "Class & subject teachers assigned",
            "Calendar, timetable and attendance rules set",
            "Fee heads and payment methods verified",
            "Roles and permissions reviewed",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-md border border-border bg-background p-3">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="text-sm">{item}</span>
              <Badge className="ml-auto rounded-md bg-success/15 text-success">Ready</Badge>
            </div>
          ))}
        </div>
      </Section>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-primary/40 bg-primary/5 p-4">
        <div>
          <div className="font-semibold">Ready to go live?</div>
          <div className="text-sm text-muted-foreground">You can always come back and edit any section later.</div>
        </div>
        <Button className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
          <Rocket className="mr-2 h-4 w-4" /> Publish & Go Live
        </Button>
      </div>
    </>);
  }
}
