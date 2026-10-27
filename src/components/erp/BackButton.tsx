import { ArrowLeft } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Compact, consistent "Back" navigation control used at the top of detail/
 * form pages across the app. Pass `to` to navigate to a specific route
 * (preferred — keeps the back destination predictable regardless of how the
 * user arrived); omit it to fall back to native browser history.
 */
export function BackButton({
  to,
  label = "Back",
  className,
}: {
  to?: string;
  label?: string;
  className?: string;
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate({ to });
    } else {
      window.history.back();
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("mb-4 gap-1.5 rounded-md", className)}
      onClick={handleClick}
    >
      <ArrowLeft className="h-3.5 w-3.5" /> {label}
    </Button>
  );
}
