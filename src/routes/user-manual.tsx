import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { PageHeader } from "@/components/erp/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, HelpCircle, Sparkles, List } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MockFilterTable, MockFormPanel, MockWorkflowStrip, MockDocumentPreview } from "@/components/erp/ScreenMock";

export const Route = createFileRoute("/user-manual")({
  head: () => ({
    meta: [
      { title: "User Manual — Akira School ERP" },
      { name: "description", content: "A screen-by-screen reference guide to every module in Akira School ERP." },
    ],
  }),
  component: UserManualPage,
});

type Screen = {
  code: string;
  name: string;
  path: string;
  purpose: string;
  fields?: { label: string; value: string }[];
  rules?: string[];
  roles?: { role: string; can: string }[];
  visual?: ReactNode;
};

type ModuleGroup = {
  id: string;
  title: string;
  note: string;
  screens: Screen[];
};

const MODULES: ModuleGroup[] = [
  {
    id: "m1",
    title: "M1 — Setup",
    note: "Configured once per board, per academic year, by a School Admin or Academic Coordinator. Not a daily-use area.",
    screens: [
      {
        code: "FA-02",
        name: "Board Configuration",
        path: "Examinations → Board Configuration",
        purpose: "The master switch that tells the system which board a school follows — CBSE, ICSE, TN State Board, or a fully custom scheme. Every other screen in the module reads this instead of hardcoding board logic.",
        fields: [
          { label: "You set", value: "Board code, board name, and which classes it applies to (leave blank for \"all classes\")." },
          { label: "Key rule", value: "Once any exam series references a board, its board code becomes locked — renaming it would silently break exams already scheduled under it." },
        ],
        roles: [
          { role: "School Admin", can: "Create, edit, activate or deactivate a board" },
          { role: "Principal", can: "View only" },
        ],
        visual: (
          <MockFilterTable
            title="Board Configuration"
            filters={["Search"]}
            columns={["Board", "Applicable Classes", "Status", "Actions"]}
            rows={[
              ["CBSE", "All classes", { text: "Active", badge: { tone: "success" } }, "Edit · Delete"],
              ["ICSE", "Class VI–X", { text: "Active", badge: { tone: "success" } }, "Edit · Delete"],
              ["TN State Board", "All classes", { text: "Inactive", badge: { tone: "muted" } }, "Edit · Delete"],
            ]}
            actions={["+ New Board"]}
          />
        ),
      },
      {
        code: "FA-03",
        name: "Assessment Configuration",
        path: "Examinations → Assessment Configuration",
        purpose: "The recipe for one subject in one term: which components count (Periodic Test, Practical, Term Exam…) and how much each is worth.",
        fields: [
          { label: "You set", value: "Component name, max marks, weightage %, passing marks — per board, class, subject and term." },
          { label: "Key rule", value: "Weightages across every component in one group must add up to exactly 100.00 before it can be approved. The screen shows a running total as you type." },
          { label: "Key rule", value: "The moment any mark is entered against a config, it locks automatically — nobody can quietly change the weightage split mid-term." },
        ],
        roles: [
          { role: "Academic Coordinator", can: "Create/edit weightage, submit for approval" },
          { role: "Principal", can: "Approve or reject a submitted config" },
          { role: "Subject Teacher", can: "View own subject's config only" },
        ],
        visual: (
          <MockFilterTable
            title="Assessment Configuration — Mathematics, Class IX"
            filters={["Board", "Class", "Subject"]}
            columns={["Component", "Max Marks", "Weightage", "Pass Marks"]}
            rows={[
              ["Periodic Test", "20", "20%", "8"],
              ["Term Exam", "50", "50%", "17"],
              ["Internal Assessment", "10", "10%", "4"],
              ["Practical", "20", "20%", "8"],
            ]}
            actions={["Total: 100%"]}
          />
        ),
      },
      {
        code: "FA-04",
        name: "Academic Assessment Structure",
        path: "Examinations → Academic Assessment Structure",
        purpose: "Splits the academic year into periods (Term 1/2/3, or Half-Yearly/Annual) per board, so every exam and mark you enter later lines up with the right part of the year.",
        fields: [
          { label: "You set", value: "Period name, sequence, start/end dates, and whether it counts toward the annual result." },
          { label: "Key rule", value: "Two periods in the same board and year can never have overlapping dates." },
        ],
        roles: [
          { role: "Academic Coordinator", can: "Create/edit the term structure" },
          { role: "Principal", can: "View only" },
        ],
        visual: (
          <MockFormPanel
            title="Academic Assessment Structure"
            fields={[
              { label: "Period Name", value: "Half-Yearly" },
              { label: "Sequence", value: "10" },
              { label: "Start Date", value: "15 Sep 2026" },
              { label: "End Date", value: "30 Sep 2026" },
              { label: "Contributes to Annual", value: "Yes" },
            ]}
            footer={["Cancel", "Save Period"]}
          />
        ),
      },
      {
        code: "FA-21",
        name: "Report Card Templates",
        path: "Examinations → Report Card Templates",
        purpose: "A visual designer for the report card layout itself — header, student details, marks table, signatures, QR code — built once per board and reused every term.",
        fields: [
          { label: "Status flow", value: "DRAFT → PUBLISHED → ARCHIVED" },
          { label: "Key rule", value: "A published template is frozen. Any further edit creates a brand-new Draft version — every report card already issued keeps rendering from the exact version it was generated with." },
          { label: "Key rule", value: "Each board has its own required section before it can publish: ICSE needs Best-of-Five, CBSE needs Competency Grades, TN State Board needs Public Exam Readiness." },
        ],
        roles: [
          { role: "Academic Coordinator", can: "Design, edit, publish, create new versions" },
          { role: "Principal", can: "Approve for publish" },
        ],
        visual: (
          <MockDocumentPreview
            title="ICSE Half-Yearly Report Card — v2"
            badges={[
              { label: "Published", tone: "success" },
              { label: "QR Enabled", tone: "info" },
              { label: "v2", tone: "muted" },
            ]}
          />
        ),
      },
    ],
  },
  {
    id: "m2",
    title: "M2 — Exam Planning",
    note: "Creating and scheduling one specific round of exams, e.g. \"Half-Yearly 2026\".",
    screens: [
      {
        code: "FA-05",
        name: "Examination Series",
        path: "Examinations → Examination Series",
        purpose: "The named container everything else hangs off — every schedule, mark, and result for \"Half-Yearly 2026\" stays organized under one series.",
        fields: [
          { label: "You set", value: "Exam name, code, term, date range, and which classes it applies to." },
          { label: "Key rule", value: "Status moves through 12 fixed stages, one at a time — see the Series Lifecycle reference below. No stage can be skipped, even by an admin." },
        ],
        roles: [
          { role: "Exam Coordinator", can: "Create, edit, move through the lifecycle" },
          { role: "Principal", can: "View, approve where required" },
        ],
        visual: (
          <MockWorkflowStrip
            title="Half-Yearly 2026 — Series Status"
            stages={["Draft", "Scheduled", "Ongoing", "Completed", "Marks Entry", "Verification", "…"]}
            activeIndex={4}
          />
        ),
      },
      {
        code: "FA-06",
        name: "Examination Definition",
        path: "Examinations → within a series",
        purpose: "The specific detail for one subject's exam within a series — which class, which section, what date.",
        fields: [
          { label: "You set", value: "Class, section, subject, and exam date for one sitting." },
          { label: "Key rule", value: "Max marks are always read from the matching, locked Assessment Configuration (FA-03) — never re-typed here, so there's one source of truth." },
        ],
        visual: (
          <MockFormPanel
            title="Examination Definition"
            fields={[
              { label: "Class", value: "Class IX" },
              { label: "Section", value: "A" },
              { label: "Subject", value: "Mathematics" },
              { label: "Exam Date", value: "18 Sep 2026" },
            ]}
            footer={["Cancel", "Save Definition"]}
          />
        ),
      },
      {
        code: "FA-10",
        name: "Student Exam Eligibility",
        path: "Examinations → within a series",
        purpose: "Before marks entry opens, this confirms exactly who is sitting the exam — accounting for transfers, withdrawals, and exemptions.",
        fields: [
          { label: "Statuses", value: "ELIGIBLE · NOT_ELIGIBLE · EXEMPTED · WITHDRAWN · WITHHELD" },
          { label: "Key rule", value: "A student is never blocked purely for unpaid fees unless the school has specifically switched that policy on." },
        ],
        visual: (
          <MockFilterTable
            title="Student Exam Eligibility — Class IX Mathematics"
            filters={["Class", "Section"]}
            columns={["Student", "Status", "Reason"]}
            rows={[
              ["Devansh Krishnan", { text: "Eligible", badge: { tone: "success" } }, "—"],
              ["Riya Desai", { text: "Exempted", badge: { tone: "warning" } }, "Medical certificate on file"],
              ["Aditya Das", { text: "Eligible", badge: { tone: "success" } }, "—"],
            ]}
          />
        ),
      },
    ],
  },
  {
    id: "m3",
    title: "M3 — Marks Entry",
    note: "What teachers use, every exam, every subject.",
    screens: [
      {
        code: "FA-11",
        name: "Marks Entry",
        path: "Examinations → Marks Entry",
        purpose: "Fast, class-by-class mark entry with built-in guardrails, so a typo never quietly skews a result.",
        fields: [
          { label: "Workflow", value: "DRAFT → SUBMITTED → VERIFIED" },
          { label: "Key rule", value: "A mark can never exceed the subject's max marks, and Absent/Exempted students are never given a numeric zero — the two mean very different things." },
          { label: "Key rule", value: "Once verified, a mark is locked. Any later change has to go through Result Corrections (FA-25), never a direct edit." },
        ],
        roles: [
          { role: "Subject Teacher", can: "Enter and submit marks for their own subjects" },
          { role: "Marks Verifier", can: "Verify or return submitted marks" },
        ],
        visual: (
          <MockFilterTable
            title="Marks Entry — Term Exam / 50"
            filters={["Class", "Subject", "Component"]}
            columns={["Student", "Marks", "Attendance"]}
            rows={[
              ["Devansh Krishnan", "46", { text: "Present", badge: { tone: "muted" } }],
              ["Riya Desai", "—", { text: "Absent", badge: { tone: "warning" } }],
              ["Pranav Sharma", "48", { text: "Present", badge: { tone: "muted" } }],
            ]}
            actions={["Submit"]}
          />
        ),
      },
    ],
  },
  {
    id: "m4",
    title: "M4 — Results",
    note: "Calculating, verifying, approving, ranking, and promoting — the heart of the module.",
    screens: [
      {
        code: "FA-14",
        name: "Grade Calculation",
        path: "Runs automatically inside Result Engine",
        purpose: "Converts a percentage into a grade using the board's configured scale — never a hardcoded table.",
        rules: [
          "Supports both absolute grading (fixed percentage bands) and relative grading (curved against the class distribution).",
          "If relative grading is configured but the class is too small, it automatically falls back to absolute grading and records why.",
        ],
        visual: (
          <MockFilterTable
            title="Grade Scale (read by the Result Engine)"
            filters={[]}
            columns={["Grade", "Min %", "Max %", "Grade Point"]}
            rows={[
              ["A1", "91", "100", "10.0"],
              ["A2", "81", "90.99", "9.0"],
              ["B1", "71", "80.99", "8.0"],
            ]}
          />
        ),
      },
      {
        code: "FA-15",
        name: "Result Engine",
        path: "Examinations → Result Approval → Calculate Results",
        purpose: "The central calculator. Reads every student's verified marks and the locked weightage config, and produces one final, traceable result per subject and overall.",
        fields: [
          { label: "Key rule", value: "If even one in-scope student has an unresolved eligibility case or unverified marks, the entire batch calculation stops — it never silently skips a problem student." },
          { label: "Key rule", value: "Every calculation is versioned and stored with a full snapshot. A configuration change made next year never alters a result already calculated this year." },
          { label: "Board rule", value: "For ICSE, the engine automatically selects a student's Best-of-Five subjects and records exactly which subject was excluded and why." },
        ],
        visual: (
          <MockFormPanel
            title="Result Engine — Calculate Results"
            fields={[
              { label: "Board", value: "CBSE" },
              { label: "Exam Series", value: "Half-Yearly 2026" },
              { label: "Students in Scope", value: "10" },
            ]}
            footer={["Calculate Results"]}
          />
        ),
      },
      {
        code: "FA-18",
        name: "Result Verification",
        path: "Examinations → Result Verification",
        purpose: "A second pair of eyes on submitted marks before they go further — the class average sits alongside each mark so an outlier is obvious.",
        fields: [
          { label: "You do", value: "Verify a mark, return it to the teacher with a comment, or flag it for review." },
          { label: "Key rule", value: "The anomaly threshold (how many standard deviations from the class mean count as unusual) is configurable per school, never fixed in code." },
        ],
        visual: (
          <MockFilterTable
            title="Result Verification — Grade 8 Mathematics"
            filters={["Class", "Subject", "Status"]}
            columns={["Student", "Marks", "Class Avg", "Status"]}
            rows={[
              ["Aarav", "87", "68", { text: "Normal", badge: { tone: "muted" } }],
              ["Rahul", "12", "68", { text: "Review", badge: { tone: "destructive" } }],
              ["Priya", "71", "68", { text: "Normal", badge: { tone: "muted" } }],
            ]}
            actions={["Verify All"]}
          />
        ),
      },
      {
        code: "FA-19",
        name: "Result Approval",
        path: "Examinations → Result Approval",
        purpose: "The formal sign-off chain, with a full batch summary — total students, pass %, fail %, compartments, withheld — before anything moves toward publication.",
        fields: [
          { label: "Chain", value: "Teacher Submit → Coordinator Verify → Calculated → Academic Review → Principal Approval → Published" },
          { label: "Key rule", value: "Every stage transition records who acted, when, the before/after status, and any comment — permanently." },
        ],
        visual: (
          <MockWorkflowStrip
            title="Half-Yearly 2026 — Approval Chain"
            stages={["Teacher Submit", "Coordinator Verify", "Calculated", "Academic Review", "Principal Approval", "Published"]}
            activeIndex={3}
          />
        ),
      },
      {
        code: "FA-20",
        name: "Result Publication",
        path: "Examinations → Result Publication",
        purpose: "The moment a result becomes visible to parents and students — locked, timestamped, and no longer directly editable.",
        fields: [
          { label: "Key rule", value: "Only a fully-approved batch can be published. A partial batch requires an explicit, separately-audited \"publish subset\" action." },
          { label: "Key rule", value: "If the notification service is briefly unavailable, publication still completes — notifications simply retry independently." },
        ],
        visual: (
          <MockFormPanel
            title="Result Publication"
            fields={[
              { label: "Exam Series", value: "Half-Yearly 2026" },
              { label: "Status", value: "Approved" },
              { label: "Students", value: "10 / 10 ready" },
            ]}
            footer={["Publish Results"]}
          />
        ),
      },
      {
        code: "FA-23",
        name: "Rank / Position",
        path: "Examinations → Rank / Position",
        purpose: "Class, Section, and Subject-level ranking — entirely optional, school by school.",
        fields: [
          { label: "Tie-break methods", value: "SAME_RANK · COMPETITION · DENSE" },
          { label: "Key rule", value: "If a school has ranking switched off, no rank is calculated or stored anywhere — not merely hidden from the screen." },
        ],
        visual: (
          <MockFilterTable
            title="Rank / Position — Class IX"
            filters={["Scope: Class"]}
            columns={["Rank", "Student", "Percentage"]}
            rows={[
              ["#1", "Pranav Sharma", "94.2%"],
              ["#2", "Devansh Krishnan", "90.5%"],
              ["#3", "Anaya Krishnan", "88.1%"],
            ]}
          />
        ),
      },
      {
        code: "FA-24",
        name: "Promotion / Detention",
        path: "Examinations → Promotion / Detention",
        purpose: "The year-end decision for every student, generated from configured rules, then confirmed or overridden by a person.",
        fields: [
          { label: "Outcomes", value: "Promoted · Not Promoted · Promoted with Conditions · Compartment · Repeat · Withheld" },
          { label: "Key rule", value: "Overriding the system's recommendation always requires typing a reason — the save button stays disabled without one." },
          { label: "Key rule", value: "A batch can't be finalized while even one student's decision is still unresolved, even if the answer is simply \"yes, promote as recommended.\"" },
        ],
        roles: [
          { role: "Academic Coordinator", can: "Review, confirm, or override with reason" },
          { role: "Principal", can: "Final approval" },
        ],
        visual: (
          <MockFilterTable
            title="Promotion / Detention — Half-Yearly 2026"
            filters={["Board", "Series"]}
            columns={["Student", "System Recommendation", "Final Decision"]}
            rows={[
              ["Pranav Sharma", { text: "Promoted", badge: { tone: "success" } }, { text: "Promoted", badge: { tone: "success" } }],
              ["Aditya Das", { text: "Not Promoted", badge: { tone: "destructive" } }, { text: "Unresolved", badge: { tone: "warning" } }],
            ]}
            actions={["Finalize Batch"]}
          />
        ),
      },
      {
        code: "FA-25",
        name: "Result Corrections",
        path: "Examinations → Result Corrections",
        purpose: "The only sanctioned way to fix a mistake in an already-published result — never a silent edit.",
        fields: [
          { label: "Workflow", value: "REQUESTED → APPROVED or REJECTED → APPLIED" },
          { label: "Key rule", value: "The original value is captured automatically the moment a correction is requested — nobody, including the requester, can ever edit or erase it." },
          { label: "Key rule", value: "A teacher can request a correction but can never approve their own request." },
          { label: "Key rule", value: "Applying an approved correction automatically recalculates the result and, if a report card was already issued, generates a new Revised version." },
        ],
        visual: (
          <MockFilterTable
            title="Result Corrections — Half-Yearly 2026"
            filters={["Status"]}
            columns={["Student / Subject", "Original → New", "Status"]}
            rows={[
              ["Devansh · Mathematics", "45 → 54", { text: "Requested", badge: { tone: "warning" } }],
              ["Riya · Science", "60 → 66", { text: "Applied", badge: { tone: "success" } }],
            ]}
          />
        ),
      },
    ],
  },
  {
    id: "m5",
    title: "M5 — Report Cards",
    note: "Generating and issuing the report card document itself.",
    screens: [
      {
        code: "FA-22",
        name: "Report Card Generation",
        path: "Examinations → Report Card Generation",
        purpose: "Produces the actual PDF report cards — one student, a class, or an entire grade — using a Published template and finalized results.",
        fields: [
          { label: "Key rule", value: "Only a Published template can generate an official report card — never a Draft." },
          { label: "Key rule", value: "A generated report card permanently records exactly which template version it used. If the template is republished later, already-issued report cards never change." },
          { label: "Key rule", value: "Large batches run in the background — you get a notification when they're done rather than a frozen screen." },
        ],
        visual: (
          <MockDocumentPreview
            title="Report Card Generation — Class IX"
            badges={[
              { label: "10 Selected", tone: "info" },
              { label: "Template v2", tone: "muted" },
            ]}
          />
        ),
      },
    ],
  },
];

const LIFECYCLE = [
  "Draft", "Scheduled", "Ongoing", "Completed", "Marks Entry", "Verification",
  "Result Processing", "Approval Pending", "Approved", "Published", "Locked", "Archived",
];

const GLOSSARY = [
  { term: "Weightage", def: "The % a component (e.g. Term Exam) contributes to a subject's final mark." },
  { term: "Best-of-Five", def: "ICSE rule: two languages plus the best 3 of the remaining subjects count toward the aggregate." },
  { term: "Calculation Snapshot", def: "The permanent record of exactly how one result was computed — inputs, weightages, boundaries." },
  { term: "Relative Grading", def: "Grading curved against the class's own score distribution, instead of a fixed percentage table." },
  { term: "Compartment", def: "Failed a small number of subjects; eligible for a supplementary exam rather than repeating the year." },
  { term: "Subset Publish", def: "An explicit, separately-audited action to publish results for specific students only." },
];

function matches(screen: Screen, query: string) {
  if (!query) return true;
  const q = query.toLowerCase();
  const haystack = [
    screen.code, screen.name, screen.path, screen.purpose,
    ...(screen.fields?.map((f) => `${f.label} ${f.value}`) ?? []),
    ...(screen.rules ?? []),
  ].join(" ").toLowerCase();
  return haystack.includes(q);
}

function ManualNavItem({
  label, index, active, onClick,
}: { label: string; index?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex w-full items-center gap-2 rounded-md py-1.5 pl-3 pr-2 text-left text-[13px] leading-tight transition-colors",
        active ? "bg-warning/15 font-medium text-warning-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {active && <span className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-warning" />}
      {index != null && <span className="shrink-0 tabular-nums">{index}.</span>}
      <span>{label}</span>
    </button>
  );
}

function ManualFooterLink({
  icon: Icon, label, onClick,
}: { icon: typeof HelpCircle; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function UserManualPage() {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string>(MODULES[0].screens[0].code);

  const scrollTo = (code: string) => {
    setActiveId(code);
    document.getElementById(code)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const q = query.trim();
  const filteredModules = MODULES.map((m) => ({ ...m, screens: m.screens.filter((s) => matches(s, q)) })).filter((m) => m.screens.length > 0);

  return (
    <div>
      <PageHeader title="User Manual" actions={null} />
      <p className="-mt-4 mb-6 max-w-2xl text-sm text-muted-foreground">
        A screen-by-screen reference for the Examination &amp; Result Management module — set up once per board, plan one exam series, enter and verify marks, run results, and issue report cards.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Sidebar TOC */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <List className="h-4 w-4 text-foreground" />
              <span className="text-sm font-semibold text-foreground">Contents</span>
            </div>

            <div className="border-b p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the manual..." className="h-8 rounded-md pl-8 text-sm" />
              </div>
            </div>

            <div className="max-h-[calc(100vh-15rem)] overflow-y-auto p-2">
              {q ? (
                // Search results: flat list, no accordion, so matches across every module are visible at once.
                <div className="space-y-3 px-1 py-1">
                  {filteredModules.map((m) => (
                    <div key={m.id}>
                      <div className="mb-1 px-2 text-[11px] font-bold uppercase tracking-wide text-primary">{m.title}</div>
                      {m.screens.map((s) => (
                        <ManualNavItem key={s.code} label={s.name} active={activeId === s.code} onClick={() => scrollTo(s.code)} />
                      ))}
                    </div>
                  ))}
                  {filteredModules.length === 0 && (
                    <p className="px-2 py-4 text-center text-xs text-muted-foreground">No matches.</p>
                  )}
                </div>
              ) : (
                <Accordion type="single" collapsible defaultValue={MODULES[0].id} className="space-y-1.5">
                  {MODULES.map((m) => (
                    <AccordionItem key={m.id} value={m.id} className="overflow-hidden rounded-md border-0">
                      <AccordionTrigger className="rounded-md px-2.5 py-2 text-[13px] font-bold text-primary hover:bg-muted hover:no-underline [&[data-state=open]]:bg-primary/5">
                        {m.title}
                      </AccordionTrigger>
                      <AccordionContent className="pb-1">
                        <ol className="space-y-0.5">
                          {m.screens.map((s, i) => (
                            <li key={s.code}>
                              <ManualNavItem label={s.name} index={i + 1} active={activeId === s.code} onClick={() => scrollTo(s.code)} />
                            </li>
                          ))}
                        </ol>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>

            <div className="space-y-0.5 border-t p-2">
              <ManualFooterLink icon={HelpCircle} label="FAQs" onClick={() => scrollTo("glossary")} />
              <ManualFooterLink icon={Sparkles} label="What's New" onClick={() => scrollTo("lifecycle")} />
            </div>
          </div>
        </aside>

        {/* Content */}
        <div className="min-w-0 space-y-10">
          {(q ? filteredModules : MODULES).map((m) => (
            <section key={m.id}>
              <h2 className="border-b pb-2 font-display text-lg font-bold text-foreground">{m.title}</h2>
              <p className="mb-4 mt-1.5 max-w-2xl text-sm text-muted-foreground">{m.note}</p>

              <div className="space-y-4">
                {m.screens.map((s) => (
                  <article key={s.code} id={s.code} className="scroll-mt-4 rounded-md border bg-card p-5 shadow-sm">
                    <div className="mb-1 flex flex-wrap items-baseline gap-2">
                      <Badge className="rounded-md border-0 bg-info/15 font-mono text-[11px] text-info">{s.code}</Badge>
                      <h3 className="font-display text-base font-semibold text-foreground">{s.name}</h3>
                    </div>
                    <p className="mb-3 font-mono text-xs text-muted-foreground">{s.path}</p>

                    <div className={cn("grid grid-cols-1 gap-4", s.visual && "lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]")}>
                      {s.visual && (
                        <div className="lg:order-2">
                          {s.visual}
                          <p className="mt-1.5 text-center text-[10px] text-muted-foreground/70">Simplified view — actual screen may differ slightly</p>
                        </div>
                      )}

                      <div className="lg:order-1">
                        <p className="mb-3 text-sm text-foreground">{s.purpose}</p>

                        {s.fields && (
                          <dl className="divide-y divide-border border-t">
                            {s.fields.map((f, i) => (
                              <div key={i} className="grid grid-cols-[110px_1fr] gap-3 py-2 text-sm">
                                <dt className="text-[11px] font-semibold uppercase tracking-wide text-primary">{f.label}</dt>
                                <dd className="text-foreground">{f.value}</dd>
                              </div>
                            ))}
                          </dl>
                        )}

                        {s.rules && (
                          <ul className="mt-2 space-y-1.5 text-sm">
                            {s.rules.map((r, i) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-primary">→</span>
                                <span>{r}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {s.roles && (
                          <div className="mt-3 overflow-x-auto">
                            <table className="w-full min-w-[380px] text-sm">
                              <thead>
                                <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                                  <th className="py-1.5 pr-3 font-semibold">Role</th>
                                  <th className="py-1.5 font-semibold">Can do</th>
                                </tr>
                              </thead>
                              <tbody>
                                {s.roles.map((r, i) => (
                                  <tr key={i} className="border-b last:border-0">
                                    <td className="whitespace-nowrap py-1.5 pr-3 font-medium text-primary">{r.role}</td>
                                    <td className="py-1.5 text-foreground">{r.can}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}

          {!q && (
            <>
              <section id="lifecycle" className="scroll-mt-4">
                <h2 className="border-b pb-2 font-display text-lg font-bold text-foreground">Reference — Examination Series Lifecycle</h2>
                <p className="mb-4 mt-1.5 max-w-2xl text-sm text-muted-foreground">
                  Every series moves through these 12 stages in strict order. No stage can be skipped, by anyone, from any screen.
                </p>
                <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-card p-4 shadow-sm">
                  {LIFECYCLE.map((stage, i) => (
                    <span key={stage} className="flex items-center gap-1.5">
                      <span className="rounded-md bg-muted px-2.5 py-1 font-mono text-xs text-foreground">{stage}</span>
                      {i < LIFECYCLE.length - 1 && <span className="text-muted-foreground/50">→</span>}
                    </span>
                  ))}
                </div>
              </section>

              <section id="glossary" className="scroll-mt-4">
                <h2 className="border-b pb-2 font-display text-lg font-bold text-foreground">Glossary</h2>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {GLOSSARY.map((g) => (
                    <div key={g.term} className="rounded-md border bg-card p-3 shadow-sm">
                      <div className="mb-1 font-mono text-xs font-medium text-primary">{g.term}</div>
                      <div className="text-xs text-muted-foreground">{g.def}</div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {q && filteredModules.length === 0 && (
            <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
              No manual entries match "{query}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
