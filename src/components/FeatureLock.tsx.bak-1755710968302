"use client";

import { useUser } from "@/context/UserContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  requiredPlan?: "plus" | "premium" | "pro";
  blurMode?: boolean; // If true, blur the feature instead of hiding it
};

export default function FeatureLock({
  children,
  requiredPlan = "plus",
  blurMode = true,
}: Props) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);

  const planLevels = {
    free: 0,
    plus: 1,
    premium: 2,
    pro: 3,
  };

  const userLevel = planLevels[user?.plan || "free"];
  const requiredLevel = planLevels[requiredPlan];

  const isLocked = userLevel < requiredLevel;

  if (!isLocked) return <>{children}</>;

  return (
    <>
      <div className="relative">
        <div
          className={cn(
            blurMode && "filter blur-sm pointer-events-none select-none opacity-70",
            !blurMode && "hidden"
          )}
        >
          {children}
        </div>

        <div className="absolute inset-0 flex items-center justify-center z-20">
          <Button onClick={() => setOpen(true)} className="z-30">
            Unlock with {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} Plan
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Required</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            This feature is available to <strong>{requiredPlan}</strong> users and above.
          </div>
          <div className="mt-4">
            <Button
              className="w-full"
              onClick={() => {
                setOpen(false);
                window.location.href = "/upgrade"; // Replace with your upgrade page
              }}
            >
              Upgrade to {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
