import { useEffect, useRef, useState } from "react";
import { FileText, Paperclip, Send, Smile, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmojiPicker } from "./EmojiPicker";

export function MessageComposer({
  draft,
  onDraftChange,
  onSend,
  onAttach,
  sending,
  uploading,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onAttach: (file: File) => void;
  sending: boolean;
  uploading: boolean;
}) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  // Picking a file only stages it here for preview -- it's not uploaded
  // until the user actually presses Send, same as a normal messaging app.
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  // Auto-grow the textarea up to a small cap so a multi-line message (via
  // Shift+Enter) doesn't force the whole composer to jump around wildly.
  // Resetting to "auto" first (rather than leaving the previous inline
  // height in place) is what lets it shrink back down to one line too --
  // without it, deleting text back to empty left the row tall and made the
  // icons/placeholder look misaligned.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 40), 120)}px`;
  }, [draft]);

  useEffect(() => {
    if (!emojiOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [emojiOpen]);

  // Revoke the object URL whenever it's replaced/cleared so we don't leak
  // memory across repeated attach/remove cycles.
  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  const clearPendingFile = () => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(null);
    setPendingPreviewUrl(null);
  };

  const doSend = () => {
    if (pendingFile) {
      onAttach(pendingFile);
      clearPendingFile();
      // A caption typed alongside the attachment still needs sending as its
      // own message -- the attachment endpoint doesn't carry a body.
      if (draft.trim()) onSend();
      return;
    }
    onSend();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
    // Shift+Enter falls through to the textarea's default newline behavior.
  };

  const handleEmojiSelect = (emoji: string) => {
    onDraftChange(draft + emoji);
    textareaRef.current?.focus();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      clearPendingFile();
      setPendingFile(file);
      if (file.type.startsWith("image/")) {
        setPendingPreviewUrl(URL.createObjectURL(file));
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const disabled = sending || uploading;
  const canSend = (!!draft.trim() || !!pendingFile) && !disabled;

  return (
    <div className="border-t border-border bg-card p-3">
      {pendingFile && (
        <div className="mb-2 flex items-center gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-2">
          {pendingPreviewUrl ? (
            <img src={pendingPreviewUrl} alt={pendingFile.name} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <FileText className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{pendingFile.name}</p>
            <p className="text-xs text-muted-foreground">{(pendingFile.size / 1024).toFixed(0)} KB</p>
          </div>
          <button
            onClick={clearPendingFile}
            disabled={uploading}
            className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
            aria-label="Remove attachment"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-1 rounded-full border border-border bg-secondary/40 py-1 pl-1 pr-1.5 transition-colors focus-within:border-primary/50 focus-within:bg-background">
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
          aria-label="Attach file"
          type="button"
        >
          <Paperclip className="h-4.5 w-4.5" />
        </button>

        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={pendingFile ? "Add a caption (optional)..." : "Type a message..."}
          rows={1}
          className="h-10 max-h-[120px] min-h-[40px] flex-1 resize-none bg-transparent py-2 text-sm leading-6 outline-none placeholder:text-muted-foreground"
        />

        <div ref={emojiRef} className="relative shrink-0">
          <button
            onClick={() => setEmojiOpen((o) => !o)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
              emojiOpen && "bg-secondary text-foreground",
            )}
            aria-label="Emoji"
            type="button"
          >
            <Smile className="h-4.5 w-4.5" />
          </button>
          {emojiOpen && <EmojiPicker onSelect={handleEmojiSelect} />}
        </div>

        <button
          onClick={doSend}
          disabled={!canSend}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-40"
          aria-label="Send message"
          type="button"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
