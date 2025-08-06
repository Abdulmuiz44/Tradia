import PlanSelector from "@/components/pricing/PlanSelector";

export const metadata = {
  title: "Upgrade Plan - Tradia",
  description: "Choose a plan that fits your trading goals",
};

export default function UpgradePage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-4">Upgrade Your Plan</h1>
      <p className="text-muted-foreground mb-8">
        Choose a plan to unlock AI insights, behavior tracking, smart journaling, and more.
      </p>
      <PlanSelector />
    </div>
  );
}
