import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

const notificationVariants = cva(
  // Glassy card that blends with dark UI and Overview
  "relative w-full rounded-xl border border-white/10 bg-white/6 backdrop-blur-sm text-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-4\n   [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4",
  {
    variants: {
      variant: {
        default: "",
        destructive:
          // Subtle red tint that fits dark backgrounds
          "border-red-400/30 bg-red-500/10 text-red-100 [&>svg]:text-red-300",
        success:
          "border-emerald-400/30 bg-emerald-500/10 text-emerald-100 [&>svg]:text-emerald-300",
        warning:
          "border-amber-400/30 bg-amber-500/10 text-amber-100 [&>svg]:text-amber-300",
        info:
          "border-sky-400/30 bg-sky-500/10 text-sky-100 [&>svg]:text-sky-300",
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
