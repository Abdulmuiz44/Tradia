// src/components/ui/Modal.tsx
"use client";

import React, { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import classNames from "classnames";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
}) => {
  // Close modal on ESC key press (keeps previous behavior)
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const sizeClass = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        {/* overlay: translucent and not pure black so it doesn't create a stark contrast */}
        <Dialog.Overlay className="fixed inset-0 z-40 bg-white/5 backdrop-blur-sm" />

        {/* content uses 'card' like styling from your OverviewCards (semi-transparent + blur) */}
        <Dialog.Content
          className={classNames(
            "fixed left-1/2 top-1/2 z-50 w-full translate-x-[-50%] translate-y-[-50%] rounded-xl p-6 shadow-lg transition",
            "bg-white/4 backdrop-blur-sm border border-white/10 text-white",
            sizeClass[size]
          )}
        >
          <div className="flex items-center justify-between mb-4">
            {/* Always include a Dialog.Title for accessibility.
                If the caller didn't supply a visible title, keep it available for screen readers by using sr-only */}
            <Dialog.Title className={title ? "text-lg font-bold" : "sr-only"}>
              {title ?? "Dialog"}
            </Dialog.Title>

            <button onClick={onClose} aria-label="Close dialog" className="p-1 rounded hover:bg-white/6">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {description && (
            <Dialog.Description className="text-sm text-white/80 mb-4">
              {description}
            </Dialog.Description>
          )}

          <div>{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default Modal;
