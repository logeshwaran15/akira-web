import { cn } from "@/lib/utils";
import { chatAttachmentUrl } from "@/hooks/use-chat";
import { colorForKey, initials } from "../chatFormat";

export function ChatAvatar({
  name,
  userKey,
  imagePath,
  online,
  size = "md",
}: {
  name: string;
  userKey: string;
  imagePath?: string | null;
  /** Omit (rather than false) when presence for this person is unknown, so no dot renders at all. */
  online?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const dims = size === "lg" ? "h-16 w-16 text-lg" : size === "sm" ? "h-10 w-10 text-xs" : "h-11 w-11 text-sm";
  const dotSize = size === "lg" ? "h-4 w-4" : "h-3 w-3";

  return (
    <div className="relative shrink-0">
      {imagePath ? (
        <img
          src={chatAttachmentUrl(imagePath)}
          alt={name}
          className={cn("rounded-full object-cover", dims)}
        />
      ) : (
        <div className={cn("flex items-center justify-center rounded-full font-semibold text-white", colorForKey(userKey), dims)}>
          {initials(name)}
        </div>
      )}
      {online !== undefined && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-background",
            dotSize,
            online ? "bg-success" : "bg-muted-foreground/40",
          )}
        />
      )}
    </div>
  );
}
