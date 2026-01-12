import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Badge component - STRICT MONOCHROME THEME
 * All variants use only black/white/gray colors
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Default: Black bg in light mode, white bg in dark mode
        default:
          "border-transparent bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200",
        // Secondary: Light gray
        secondary:
          "border-transparent bg-gray-200 text-black dark:bg-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700",
        // Destructive: Dark gray
        destructive:
          "border-transparent bg-gray-700 text-white dark:bg-gray-300 dark:text-black hover:bg-gray-600 dark:hover:bg-gray-400",
        // Outline: Border only
        outline: "text-black dark:text-white border-gray-300 dark:border-gray-600",
        // Success: Now grayscale (no green)
        success:
          "border-transparent bg-gray-200 text-black dark:bg-gray-800 dark:text-white",
        // Warning: Now grayscale (no yellow)
        warning:
          "border-transparent bg-gray-300 text-black dark:bg-gray-700 dark:text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }