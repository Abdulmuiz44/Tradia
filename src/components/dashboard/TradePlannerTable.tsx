// components/dashboard/TradePlannerTable.tsx

"use client";

import { useContext, useState } from "react";
import { TradePlanContext } from "@/context/TradePlanContext";
import { TradePlan } from "@/types/tradePlan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TradePlannerTable() {
  const ctx = useContext(TradePlanContext)!;
  const { plans, deletePlan, updatePlan, markExecuted } = ctx;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editableData, setEditableData] = useState<Partial<TradePlan>>({});

  const handleEdit = (plan: TradePlan) => {
    setEditingId(plan.id);
    setEditableData(plan);
  };

  const handleSave = () => {
    if (editingId && editableData) {
  updatePlan(editingId, editableData as any);
      setEditingId(null);
      setEditableData({});
    }
  };

  const handleMarkExecuted = (plan: TradePlan) => {
    // use markExecuted to update status consistently
    markExecuted(plan.id);
  };

  return (
    <div className="w-full mt-8 space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">📈 Planned Trades</h2>

      {plans.length === 0 ? (
        <p className="text-muted-foreground">No trade plans yet.</p>
      ) : (
        <div className="grid gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
                className={cn(
                "p-4 rounded-2xl border border-muted bg-background shadow-sm space-y-3 transition-colors",
                // status uses lowercase values; cast dynamic map to any for cn()
                ({
                  "bg-green-50 dark:bg-green-900/10 border-green-300 dark:border-green-800":
                    plan.status === "executed",
                } as any)
              )}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-col md:flex-row md:gap-4 text-sm w-full">
                  <div className="flex-1">
                    <span className="font-medium text-muted-foreground">Pair:</span>{" "}
                    {editingId === plan.id ? (
                      <Input
                        className="mt-1 bg-muted/20"
                        value={editableData.symbol || ""}
                        onChange={(e) =>
                          setEditableData((d) => ({ ...d, symbol: e.target.value }))
                        }
                      />
                    ) : (
                      <span className="ml-1 font-semibold">{plan.symbol}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-muted-foreground">Strategy:</span>{" "}
                    {editingId === plan.id ? (
                      <Input
                        className="mt-1 bg-muted/20"
                        value={editableData.setupType || ""}
                        onChange={(e) =>
                          setEditableData((d) => ({
                            ...d,
                            setupType: e.target.value,
                          }))
                        }
                      />
                    ) : (
                      <span className="ml-1 font-semibold">{plan.setupType}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-muted-foreground">RR:</span>{" "}
                    {editingId === plan.id ? (
                      <Input
                        type="number"
                        className="mt-1 bg-muted/20"
                        value={editableData.riskReward ?? ""}
                        onChange={(e) =>
                          setEditableData((d) => ({
                            ...d,
                            riskReward: Number(e.target.value),
                          }))
                        }
                      />
                    ) : (
                      <span className="ml-1 font-semibold">{plan.riskReward}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-muted-foreground">Status:</span>{" "}
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                        {
                          "bg-yellow-100 text-yellow-700": plan.status === "planned",
                          "bg-green-100 text-green-700": plan.status === "executed",
                        } as any
                      )}
                    >
                      {plan.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2 md:mt-0">
                  {editingId === plan.id ? (
                    <Button size="sm" variant="default" onClick={handleSave}>
                      Save
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(plan)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deletePlan(plan.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                      {plan.status !== "executed" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleMarkExecuted(plan)}
                        >
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {editingId === plan.id && (
                <div className="grid md:grid-cols-2 gap-4 mt-2 text-sm">
                  <Input
                    className="bg-muted/20"
                    type="number"
                    placeholder="Planned Entry"
                    value={editableData.plannedEntry ?? ""}
                    onChange={(e) =>
                      setEditableData((d) => ({
                        ...d,
                        plannedEntry: Number(e.target.value),
                      }))
                    }
                  />
                  <Input
                    className="bg-muted/20"
                    type="number"
                    placeholder="Stop Loss"
                    value={editableData.stopLoss ?? ""}
                    onChange={(e) =>
                      setEditableData((d) => ({
                        ...d,
                        stopLoss: Number(e.target.value),
                      }))
                    }
                  />
                  <Input
                    className="bg-muted/20"
                    type="number"
                    placeholder="Take Profit"
                    value={editableData.takeProfit ?? ""}
                    onChange={(e) =>
                      setEditableData((d) => ({
                        ...d,
                        takeProfit: Number(e.target.value),
                      }))
                    }
                  />
                  <Input
                    className="bg-muted/20"
                    type="number"
                    placeholder="Lot Size"
                    value={editableData.lotSize ?? ""}
                    onChange={(e) =>
                      setEditableData((d) => ({
                        ...d,
                        lotSize: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
