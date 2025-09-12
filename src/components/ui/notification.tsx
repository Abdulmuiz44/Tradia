import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

const notificationVariants = cva(
  // Solid dark card to match Add/Edit modal style
  "relative w-full rounded-lg border border-zinc-800 bg-gray-900 text-white shadow-2xl p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-white/80",
  {
    variants: {
      variant: {
        default: "",
        destructive: "border-red-500/60",
        success: "border-emerald-500/60",
        warning: "border-amber-500/60",
        info: "border-sky-500/60",
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
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {title && <h4 className="font-semibold leading-tight drop-shadow-sm">{title}</h4>}
            {description && <p className="text-sm opacity-90 mt-0.5 leading-snug">{description}</p>}
            {children}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-4 text-white/60 hover:text-white transition-colors"
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
