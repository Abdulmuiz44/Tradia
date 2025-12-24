// src/components/ui/AnimatedDropdown.tsx
"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";

type AnimatedDropdownProps = {
  trigger: React.ReactNode;
  children: React.ReactNode;
  title?: string;
  positionClassName?: string; // e.g., "right-4 top-16"
  panelClassName?: string; // e.g., width overrides
};

export default function AnimatedDropdown({
  trigger,
  children,
  title,
  positionClassName = "right-4 top-16",
  panelClassName = "w-[95%] max-w-md",
}: AnimatedDropdownProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <div onClick={() => setOpen(true)} className="inline-flex">
        {trigger}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[1200]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />

            <motion.div
              role="dialog"
              aria-modal="true"
              className={`absolute ${positionClassName} ${panelClassName} bg-white dark:bg-[#0f1319] text-black dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden`}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              {title && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f1319]">
                  <div className="font-semibold text-black dark:text-white">{title}</div>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10"
                    aria-label="Close"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4 text-black dark:text-white"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>
              )}

              <div className="max-h-[70vh] overflow-y-auto">
                {children}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

