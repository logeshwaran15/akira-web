import type { ReactNode } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  submitting?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClass: Record<NonNullable<FormDialogProps["size"]>, string> = {
  sm: "sm:max-w-lg",
  md: "sm:max-w-xl",
  lg: "sm:max-w-3xl",
  xl: "sm:max-w-5xl",
};

export function FormDialog({
  open, onOpenChange, title, description, children,
  onSubmit, submitLabel = "Save", cancelLabel = "Cancel",
  submitting, size = "md",
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${sizeClass[size]} rounded-md`}>
        <DialogHeader>
          <DialogTitle className="font-display text-lg">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          className="space-y-4 py-2"
          onSubmit={(e) => { e.preventDefault(); onSubmit?.(); }}
        >
          <div className="space-y-4">{children}</div>
          <DialogFooter className="gap-2 pt-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="rounded-md border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => onOpenChange(false)}
            >
              {cancelLabel}
            </Button>
            <Button type="submit" className="rounded-md" disabled={submitting}>
              {submitting ? "Saving..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
