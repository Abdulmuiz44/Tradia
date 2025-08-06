"use client";

import { useContext, useState } from "react";
import { TradePlanContext } from "@/context/TradePlanContext";
import { TradePlan } from "@/types/tradePlan";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const TradePlannerForm = () => {
  const { addPlan } = useContext(TradePlanContext);

  const [form, setForm] = useState<Omit<TradePlan, "id" | "status">>({
    symbol: "",
    setupType: "",
    plannedEntry: 0,
    stopLoss: 0,
    takeProfit: 0,
    riskReward: 0,
    lotSize: 0,
    reason: "",
    confidence: 50,
    preChecklist: [],
    emotion: "",
    date: new Date().toISOString().split("T")[0],
    screenshotUrl: "",
  });

  const handleChange = (key: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    if (!form.symbol || !form.setupType || !form.plannedEntry)
      return alert("Please fill required fields");

    const newPlan: TradePlan = {
      ...form,
      id: crypto.randomUUID(),
      status: "Planned",
    };

    addPlan(newPlan);
    setForm({
      symbol: "",
      setupType: "",
      plannedEntry: 0,
      stopLoss: 0,
      takeProfit: 0,
      riskReward: 0,
      lotSize: 0,
      reason: "",
      confidence: 50,
      preChecklist: [],
      emotion: "",
      date: new Date().toISOString().split("T")[0],
      screenshotUrl: "",
    });
    alert("Trade plan saved successfully");
  };

  return (
    <div className="w-full max-w-2xl space-y-6 p-6 border border-muted rounded-2xl shadow-sm bg-background">
      <h2 className="text-xl font-semibold tracking-tight">📋 Plan a New Trade</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          className="bg-muted/30 focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Symbol (e.g., EURUSD)"
          value={form.symbol}
          onChange={(e) => handleChange("symbol", e.target.value)}
        />

        <Input
          className="bg-muted/30 focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Setup Type (e.g., Breakout, Reversal)"
          value={form.setupType}
          onChange={(e) => handleChange("setupType", e.target.value)}
        />

        <Input
          className="bg-muted/30 focus-visible:ring-1 focus-visible:ring-ring"
          type="number"
          placeholder="Planned Entry Price"
          value={form.plannedEntry}
          onChange={(e) =>
            handleChange("plannedEntry", parseFloat(e.target.value))
          }
        />

        <Input
          className="bg-muted/30 focus-visible:ring-1 focus-visible:ring-ring"
          type="number"
          placeholder="Stop Loss"
          value={form.stopLoss}
          onChange={(e) =>
            handleChange("stopLoss", parseFloat(e.target.value))
          }
        />

        <Input
          className="bg-muted/30 focus-visible:ring-1 focus-visible:ring-ring"
          type="number"
          placeholder="Take Profit"
          value={form.takeProfit}
          onChange={(e) =>
            handleChange("takeProfit", parseFloat(e.target.value))
          }
        />

        <Input
          className="bg-muted/30 focus-visible:ring-1 focus-visible:ring-ring"
          type="number"
          placeholder="Risk Reward Ratio"
          value={form.riskReward}
          onChange={(e) =>
            handleChange("riskReward", parseFloat(e.target.value))
          }
        />

        <Input
          className="bg-muted/30 focus-visible:ring-1 focus-visible:ring-ring"
          type="number"
          placeholder="Lot Size"
          value={form.lotSize}
          onChange={(e) =>
            handleChange("lotSize", parseFloat(e.target.value))
          }
        />

        <Input
          className="bg-muted/30 focus-visible:ring-1 focus-visible:ring-ring"
          type="date"
          value={form.date}
          onChange={(e) => handleChange("date", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason for trade plan</Label>
        <Textarea
          id="reason"
          placeholder="Reason for the trade plan..."
          value={form.reason}
          onChange={(e) => handleChange("reason", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Confidence Level: {form.confidence}%</Label>
        <Slider
          defaultValue={[form.confidence]}
          max={100}
          step={1}
          onValueChange={(val) => handleChange("confidence", val[0])}
        />
      </div>

      <div className="space-y-2">
        <Label>Emotion before planning</Label>
        <Select onValueChange={(val) => handleChange("emotion", val)}>
          <SelectTrigger className="bg-muted/30 focus-visible:ring-1 focus-visible:ring-ring">
            <SelectValue placeholder="Select your emotion..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Calm">Calm</SelectItem>
            <SelectItem value="Greedy">Greedy</SelectItem>
            <SelectItem value="Fearful">Fearful</SelectItem>
            <SelectItem value="Revenge">Revenge</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="screenshotUrl">Optional Screenshot URL</Label>
        <Input
          id="screenshotUrl"
          className="bg-muted/30 focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Screenshot URL"
          value={form.screenshotUrl}
          onChange={(e) => handleChange("screenshotUrl", e.target.value)}
        />
      </div>

      <Button onClick={handleSubmit} className="w-full mt-2">
        ✅ Save Trade Plan
      </Button>
    </div>
  );
};

export default TradePlannerForm;
