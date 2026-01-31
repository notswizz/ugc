import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-[colors,transform,box-shadow,opacity] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-brand hover:shadow-brand-lg hover:from-brand-700 hover:to-accent-700",
        primary: "bg-brand-600 text-white shadow-soft hover:shadow-soft-lg hover:bg-brand-700",
        secondary: "bg-zinc-100 text-zinc-900 shadow-soft hover:shadow-soft-lg hover:bg-zinc-200",
        outline: "border-2 border-brand-300 bg-white text-brand-700 hover:bg-brand-50 hover:border-brand-400",
        ghost: "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900",
        destructive: "bg-red-600 text-white shadow-soft hover:shadow-soft-lg hover:bg-red-700",
        success: "bg-green-600 text-white shadow-soft hover:shadow-soft-lg hover:bg-green-700",
        link: "text-brand-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2.5",
        sm: "h-8 rounded-md px-4 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }