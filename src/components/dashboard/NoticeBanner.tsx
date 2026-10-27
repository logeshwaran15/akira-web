import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { noticeFileSrc, type NoticeRow } from "@/lib/notice-board";

const ROTATE_MS = 4000;

/**
 * Banners created on the Notice Board page (/comm-notice-board). The API already
 * filters to banners that are active and inside their from/expiry dates.
 * A failed request just yields no banners; it must never break a dashboard.
 */
export function useActiveNotices() {
  const [banners, setBanners] = useState<NoticeRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/NoticeBoard/active")
      .then((data: NoticeRow[] | null) => {
        if (!cancelled) setBanners((data ?? []).filter((b) => b.fileUrl));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return banners;
}

/** Auto-scrolling banner images, shown whole. Pauses on hover. Pass negative margins to run it edge to edge in a padded card. */
export function NoticeCarousel({ banners, className }: { banners: NoticeRow[]; className?: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = banners.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [count, paused]);

  if (count === 0) return null;

  const current = Math.min(index, count - 1);
  const go = (delta: number) => setIndex((current + delta + count) % count);

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="flex items-center transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {banners.map((b) => (
          <img
            key={b.akiraNoticeBoardKey}
            src={noticeFileSrc(b.fileUrl) ?? undefined}
            alt={b.title}
            className="block h-auto w-full shrink-0"
          />
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous banner"
            className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next banner"
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.akiraNoticeBoardKey}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show banner ${i + 1}`}
                aria-current={i === current}
                className={cn(
                  "h-1.5 rounded-full shadow transition-all",
                  i === current ? "w-5 bg-white" : "w-1.5 bg-white/60",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
