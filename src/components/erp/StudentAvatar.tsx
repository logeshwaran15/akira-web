import { User } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

const GENDER_AVATAR_STYLES: Record<string, string> = {
  M: "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300",
  MALE: "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300",
  F: "bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-300",
  FEMALE: "bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-300",
};
const DEFAULT_AVATAR_STYLE = "bg-muted text-muted-foreground";

/** Shows the student's photo, or a gender-tinted default person icon when no photo is on file. */
export function StudentAvatar({
  photoUrl,
  gender,
  studentName,
  className,
  iconClassName,
}: {
  photoUrl?: string | null;
  gender?: string | null;
  studentName: string;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        !photoUrl && (GENDER_AVATAR_STYLES[gender?.trim().toUpperCase() ?? ""] ?? DEFAULT_AVATAR_STYLE),
        className,
      )}
    >
      {photoUrl ? (
        <img
          src={`${API_BASE_URL}${photoUrl}`}
          alt={studentName}
          className="h-full w-full object-cover"
        />
      ) : (
        <User className={cn("h-1/2 w-1/2", iconClassName)} />
      )}
    </div>
  );
}
