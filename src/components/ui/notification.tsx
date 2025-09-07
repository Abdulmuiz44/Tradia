import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

const notificationVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "destructive border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        success:
          "border-green-500/50 bg-green-50 text-green-900 dark:bg-green-900/10 dark:text-green-100 [&>svg]:text-green-600",
        warning:
          "border-yellow-500/50 bg-yellow-50 text-yellow-900 dark:bg-yellow-900/10 dark:text-yellow-100 [&>svg]:text-yellow-600",
        info:
          "border-blue-500/50 bg-blue-50 text-blue-900 dark:bg-blue-900/10 dark:text-blue-100 [&>svg]:text-blue-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export interface NotificationProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof notificationVariants> {
  title?: string;
  description?: string;
  onClose?: () => void;
  icon?: keyof typeof icons;
}

const Notification = React.forwardRef<HTMLDivElement, NotificationProps>(
  ({ className, variant, title, description, onClose, icon, children, ...props }, ref) => {
    const Icon = icon ? icons[icon] : null;

    return (
      <div
        ref={ref}
        className={cn(notificationVariants({ variant }), className)}
        {...props}
      >
        {Icon && <Icon className="h-4 w-4" />}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {title && <h4 className="font-semibold">{title}</h4>}
            {description && <p className="text-sm opacity-90">{description}</p>}
            {children}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }
);
Notification.displayName = "Notification";

export { Notification, notificationVariants };