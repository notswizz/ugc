import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
        warning:
          "border-transparent bg-amber-100 text-amber-700 hover:bg-amber-200",
        info:
          "border-transparent bg-blue-100 text-blue-700 hover:bg-blue-200",
        pending:
          "border-transparent bg-amber-100 text-amber-700 hover:bg-amber-200",
        approved:
          "border-transparent bg-green-100 text-green-700 hover:bg-green-200",
        rejected:
          "border-transparent bg-red-100 text-red-700 hover:bg-red-200",
        locked:
          "border-transparent bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
        open:
          "border-transparent bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
        squad:
          "border-transparent bg-violet-100 text-violet-700 hover:bg-violet-200",
        invite:
          "border-transparent bg-amber-100 text-amber-700 hover:bg-amber-200",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
