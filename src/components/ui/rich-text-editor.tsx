import * as React from "react";
import {
  Bold, Italic, Underline, List, ListOrdered, Heading2, Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  /** Adds heading, link and alignment tools to the toolbar. */
  extended?: boolean;
}

export interface RichTextEditorHandle {
  /** Inserts text at the caret (or at the end if the editor has no selection). */
  insertText: (text: string) => void;
}

type ToolbarAction = { command: string; arg?: string; icon: typeof Bold; label: string };

const BASE_ACTIONS: ToolbarAction[] = [
  { command: "bold", icon: Bold, label: "Bold" },
  { command: "italic", icon: Italic, label: "Italic" },
  { command: "underline", icon: Underline, label: "Underline" },
  { command: "insertUnorderedList", icon: List, label: "Bullet list" },
  { command: "insertOrderedList", icon: ListOrdered, label: "Numbered list" },
];

const EXTENDED_ACTIONS: ToolbarAction[] = [
  { command: "formatBlock", arg: "h2", icon: Heading2, label: "Heading" },
  { command: "bold", icon: Bold, label: "Bold" },
  { command: "italic", icon: Italic, label: "Italic" },
  { command: "underline", icon: Underline, label: "Underline" },
  { command: "insertUnorderedList", icon: List, label: "Bullet list" },
  { command: "insertOrderedList", icon: ListOrdered, label: "Numbered list" },
  { command: "createLink", icon: LinkIcon, label: "Link" },
  { command: "justifyLeft", icon: AlignLeft, label: "Align left" },
  { command: "justifyCenter", icon: AlignCenter, label: "Align center" },
  { command: "justifyRight", icon: AlignRight, label: "Align right" },
];

export const RichTextEditor = React.forwardRef<RichTextEditorHandle, RichTextEditorProps>(function RichTextEditor(
  { value, onChange, placeholder, className, minHeight = "min-h-[110px]", extended = false },
  ref,
) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const isEmpty = !value || value === "<br>" || value === "<p></p>";
  const actions = extended ? EXTENDED_ACTIONS : BASE_ACTIONS;

  React.useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const emit = () => onChange(editorRef.current?.innerHTML ?? "");

  const exec = (action: ToolbarAction) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    if (action.command === "createLink") {
      const url = window.prompt("Link URL", "https://");
      if (!url) return;
      document.execCommand("createLink", false, url);
    } else {
      document.execCommand(action.command, false, action.arg);
    }
    emit();
  };

  React.useImperativeHandle(ref, () => ({
    insertText: (text: string) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      document.execCommand("insertText", false, text);
      emit();
    },
  }));

  return (
    <div className={cn("rounded-md border border-input bg-transparent shadow-sm", className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-input px-1.5 py-1">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            title={action.label}
            aria-label={action.label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(action)}
            className="flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <action.icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
      <div className="relative">
        {isEmpty && placeholder && (
          <span className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">
            {placeholder}
          </span>
        )}
        <div
          ref={editorRef}
          contentEditable
          role="textbox"
          aria-multiline="true"
          className={cn(
            "w-full overflow-y-auto rounded-b-md px-3 py-2 text-sm leading-relaxed focus-visible:outline-none [&_a]:text-primary [&_a]:underline [&_h2]:text-base [&_h2]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5",
            minHeight,
          )}
          onInput={emit}
          onBlur={emit}
        />
      </div>
    </div>
  );
});
