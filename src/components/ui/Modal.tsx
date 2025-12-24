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
        {/* Overlay and content styled to match AddTradeModal / EditTradeModal */}
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />

        <Dialog.Content
          className={classNames(
            "fixed left-1/2 top-1/2 z-50 w-full translate-x-[-50%] translate-y-[-50%]",
            "rounded-lg border border-zinc-800 bg-[#0f1319] text-white shadow-2xl p-6",
            sizeClass[size]
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className={title ? "text-lg font-semibold" : "sr-only"}>
              {title ?? "Dialog"}
            </Dialog.Title>

            <button onClick={onClose} aria-label="Close dialog" className="text-sm text-zinc-300 hover:text-white px-2 py-1 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          {description && (
            <Dialog.Description className="text-sm text-zinc-300 mb-4">
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
