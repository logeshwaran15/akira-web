// Curated set rather than a full emoji library -- keeps the composer light
// without a new dependency; covers the reactions people actually reach for.
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    emojis: ["😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😉", "😎", "🤔", "😅", "😇", "🙂", "😢", "😭", "😡", "😱", "🥳", "😴", "🤗"],
  },
  {
    label: "Gestures",
    emojis: ["👍", "👎", "👏", "🙏", "💪", "🤝", "✌️", "👌", "🤞", "👋"],
  },
  {
    label: "Hearts",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🔥", "✨", "🎉"],
  },
];

export function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  return (
    <div className="absolute bottom-[calc(100%+10px)] right-0 z-30 w-72 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
      <div className="max-h-64 overflow-y-auto p-3">
        {EMOJI_GROUPS.map((group) => (
          <div key={group.label} className="mb-3 last:mb-0">
            <div className="mb-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </div>
            <div className="grid grid-cols-8 gap-0.5">
              {group.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onSelect(emoji)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-secondary/60"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
