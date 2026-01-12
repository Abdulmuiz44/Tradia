import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button variants - STRICT MONOCHROME THEME
 * All colors are black/white/gray only
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        // Primary: Black bg in light mode, White bg in dark mode
        default: "bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 focus:ring-black dark:focus:ring-white",
        // Secondary: Gray background
        secondary: "bg-gray-200 text-black hover:bg-gray-300 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 focus:ring-gray-400",
        // Destructive: Dark gray to indicate danger
        destructive: "bg-gray-700 text-white hover:bg-gray-600 dark:bg-gray-300 dark:text-black dark:hover:bg-gray-400 focus:ring-gray-500",
        // Outline: Border only
        outline: "border border-gray-300 bg-transparent text-black hover:bg-gray-100 dark:border-gray-600 dark:text-white dark:hover:bg-gray-800 focus:ring-gray-400",
        // Ghost: Minimal styling
        ghost: "bg-transparent text-black hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800 focus:ring-gray-400",
        // Link: Underline style
        link: "underline-offset-4 hover:underline text-black dark:text-white bg-transparent",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  icon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, variant, size, icon, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {icon && <span className="mr-2">{icon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
