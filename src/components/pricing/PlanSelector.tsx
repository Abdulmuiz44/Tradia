"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Plan = {
  name: string;
  usdMonthly: number;
  usdYearly: number;
  ngnMonthly: number;
  ngnYearly: number;
  features: string[];
  planKey: string;
};

const plans: Plan[] = [
  {
    name: "Plus",
    usdMonthly: 9,
    usdYearly: 90,
    ngnMonthly: 9000,
    ngnYearly: 90000,
    planKey: "plus",
    features: [
      "Smart analytics",
      "Behavior tracking",
      "Unlimited trade history",
    ],
  },
  {
    name: "Premium",
    usdMonthly: 19,
    usdYearly: 190,
    ngnMonthly: 19000,
    ngnYearly: 190000,
    planKey: "premium",
    features: [
      "AI summaries",
      "Advanced filtering",
      "PDF & Excel export",
    ],
  },
  {
    name: "Pro",
    usdMonthly: 39,
    usdYearly: 390,
    ngnMonthly: 39000,
    ngnYearly: 390000,
    planKey: "pro",
    features: [
      "Integrations (MT5, TradingView)",
      "Auto alerts + strategy tracking",
      "Deep performance intelligence",
    ],
  },
];

export default function PlanSelector() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const router = useRouter();

  const handleSelect = (planKey: string) => {
    router.push(`/payment?plan=${planKey}&billing=${billing}`);
  };

  return (
    <div>
      <div className="flex justify-center mb-8 gap-4">
        <Button
          variant={billing === "monthly" ? "default" : "outline"}
          onClick={() => setBilling("monthly")}
        >
          Monthly Billing
        </Button>
        <Button
          variant={billing === "yearly" ? "default" : "outline"}
          onClick={() => setBilling("yearly")}
        >
          Yearly Billing
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const priceUSD = billing === "monthly" ? plan.usdMonthly : plan.usdYearly;
          const priceNGN = billing === "monthly" ? plan.ngnMonthly : plan.ngnYearly;

          return (
            <div
              key={plan.name}
              className="bg-white dark:bg-muted border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <h3 className="text-2xl font-semibold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  ${priceUSD} / {billing} — ₦{priceNGN.toLocaleString()} / {billing}
                </p>
                <ul className="mb-6 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2 text-sm">
                      <CheckCircle size={16} className="text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <Button onClick={() => handleSelect(plan.planKey)}>
                Choose {plan.name}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
