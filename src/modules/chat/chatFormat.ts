// Formatting helpers shared across the chat module. Kept tiny and
// dependency-free (no date-fns) since the app already renders similar
// relative times ad hoc elsewhere (see AppLayout's timeAgo).

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const AVATAR_COLORS = [
  "bg-slate-700", "bg-rose-400", "bg-amber-500", "bg-red-500",
  "bg-emerald-600", "bg-sky-600", "bg-violet-600", "bg-teal-600",
];

/** Deterministic avatar color per user key, so the same person always gets the same color across the app. */
export function colorForKey(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** Short form for conversation list rows / message timestamps ("2:40 PM", "Yesterday", "Monday", or a date). */
export function formatShortTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  const daysDiff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (daysDiff < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString();
}

/** Full label for a date-separator pill above a run of same-day messages. */
export function formatDateSeparator(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return `Today, ${d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", day: "2-digit", month: "short", year: "numeric" });
}

export function formatClockTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Groups a chronological message list into per-day buckets for date-separator rendering. */
export function groupMessagesByDay<T extends { createdOn: string }>(messages: T[]): { dateLabel: string; items: T[] }[] {
  const groups: { dateLabel: string; items: T[] }[] = [];
  for (const message of messages) {
    const label = formatDateSeparator(message.createdOn);
    const last = groups[groups.length - 1];
    if (last && last.dateLabel === label) {
      last.items.push(message);
    } else {
      groups.push({ dateLabel: label, items: [message] });
    }
  }
  return groups;
}
