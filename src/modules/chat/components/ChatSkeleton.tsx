import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ConversationListSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg px-2.5 py-2.5">
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessageListSkeleton() {
  const widths = ["w-40", "w-56", "w-32", "w-48", "w-28"];
  return (
    <div className="space-y-4 p-5">
      {widths.map((w, i) => (
        <div key={i} className={cn("flex items-end gap-2.5", i % 2 === 1 && "flex-row-reverse")}>
          {i % 2 === 0 && <Skeleton className="h-10 w-10 shrink-0 rounded-full" />}
          <Skeleton className={cn("h-10 rounded-2xl", w)} />
        </div>
      ))}
    </div>
  );
}
