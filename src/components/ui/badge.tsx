import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-[oklch(0.6_0_0)] text-white",
        destructive: "border-transparent bg-[oklch(0.6_0.22_25)] text-white",
        success: "border-transparent bg-[oklch(0.62_0.17_145)] text-white",
        warning: "border-transparent bg-[oklch(0.68_0.16_55)] text-white",
        info: "border-transparent bg-[oklch(0.65_0.15_220)] text-white",
        outline: "border-border bg-transparent text-foreground shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
