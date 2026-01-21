"use client";

import React, { useState, useEffect } from "react";
import { Lock, Zap, CheckCircle } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CreateAccountPayload, UpdateAccountPayload } from "@/types/account";
import { getCurrencySymbol } from "@/lib/currency";

interface AccountFormProps {
  onSubmit: (payload: CreateAccountPayload | UpdateAccountPayload) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<CreateAccountPayload>;
  isEdit?: boolean;
}

export default function AccountForm({
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
  isEdit = false,
}: AccountFormProps) {
  const { plan } = useUser();
  const router = useRouter();
  const userPlan = String(plan || 'starter').toLowerCase();
  const isPaidPlan = ['pro', 'plus', 'elite'].includes(userPlan);

  const [formData, setFormData] = useState<CreateAccountPayload>({
    name: initialData?.name || "",
    account_size: initialData?.account_size || 0,
    currency: initialData?.currency || "USD",
    platform: initialData?.platform || "MT5",
    broker: initialData?.broker || "",
    mode: initialData?.mode || "manual",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        account_size: initialData.account_size || 0,
        currency: initialData.currency || "USD",
        platform: initialData.platform || "MT5",
        broker: initialData.broker || "",
        mode: initialData.mode || "manual",
      });
    }
  }, [initialData]);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Account name is required";
    }

    if (formData.account_size <= 0) {
      newErrors.account_size = "Account size must be greater than 0";
    }

    // Prevent broker mode for non-paid users
    if (formData.mode === "broker" && !isPaidPlan) {
      newErrors.mode = "Broker-linked mode requires a Pro plan or higher";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (name: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleModeSelect = (mode: "manual" | "broker") => {
    if (mode === "broker" && !isPaidPlan) {
      // Don't allow selection, show upgrade prompt
      return;
    }
    handleChange("mode", mode);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Account Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Account Name</Label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="e.g., Personal Account, Prop Firm Account"
          disabled={submitting || isLoading}
          className={`bg-transparent dark:bg-[#0f1319] dark:focus:bg-[#0f1319] border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 [&:-webkit-autofill]:shadow-[0_0_0_1000px_#0f1319_inset] [&:-webkit-autofill]:-webkit-text-fill-color-white ${errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}`}
        />
        {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
      </div>

      {/* Account Size */}
      <div className="space-y-2">
        <Label>Account Size / Balance</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-muted-foreground">
              {getCurrencySymbol(formData.currency)}
            </span>
            <Input
              type="number"
              value={formData.account_size || ""}
              onChange={(e) => handleChange("account_size", parseFloat(e.target.value) || 0)}
              placeholder="10000"
              step="0.01"
              min="0"
              className={`pl-7 bg-transparent dark:bg-[#0f1319] dark:focus:bg-[#0f1319] border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 [&:-webkit-autofill]:shadow-[0_0_0_1000px_#0f1319_inset] [&:-webkit-autofill]:-webkit-text-fill-color-white ${errors.account_size ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              disabled={submitting || isLoading}
            />
          </div>
          <Select
            value={formData.currency}
            onValueChange={(value) => handleChange("currency", value)}
            disabled={submitting || isLoading}
          >
            <SelectTrigger className="w-24 bg-transparent dark:bg-[#0f1319] border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
              <SelectItem value="JPY">JPY</SelectItem>
              <SelectItem value="AUD">AUD</SelectItem>
              <SelectItem value="CAD">CAD</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {errors.account_size && <p className="text-red-500 text-xs">{errors.account_size}</p>}
      </div>

      {/* Platform */}
      <div className="space-y-2">
        <Label>Trading Platform</Label>
        <Select
          value={formData.platform}
          onValueChange={(value) => handleChange("platform", value)}
          disabled={submitting || isLoading}
        >
          <SelectTrigger className="bg-transparent dark:bg-[#0f1319] border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MT5">MetaTrader 5 (MT5)</SelectItem>
            <SelectItem value="MetaTrader4">MetaTrader 4 (MT4)</SelectItem>
            <SelectItem value="cTrader">cTrader</SelectItem>
            <SelectItem value="TradingView">TradingView</SelectItem>
            <SelectItem value="Manual">Manual Entry</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Broker (optional) */}
      <div className="space-y-2">
        <Label>Broker (Optional)</Label>
        <Input
          type="text"
          value={formData.broker || ""}
          onChange={(e) => handleChange("broker", e.target.value)}
          placeholder="e.g., XM, FxPro, FTMO"
          disabled={submitting || isLoading}
          className="bg-transparent dark:bg-[#0f1319] dark:focus:bg-[#0f1319] border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 [&:-webkit-autofill]:shadow-[0_0_0_1000px_#0f1319_inset] [&:-webkit-autofill]:-webkit-text-fill-color-white"
        />
      </div>

      {/* Account Mode */}
      <div className="space-y-3">
        <Label>Account Mode</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Manual Entry */}
          <Card
            className={`cursor-pointer transition-all ${formData.mode === "manual"
              ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            onClick={() => handleModeSelect("manual")}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.mode === "manual" ? "border-blue-500 bg-blue-500" : "border-gray-300 dark:border-gray-600"
                  }`}>
                  {formData.mode === "manual" && <CheckCircle size={12} className="text-white" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">Manual Entry</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manually enter trades to track your account. Perfect for paper trading or brokers without API support.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Broker-Linked (Premium) */}
          <Card
            className={`cursor-pointer transition-all relative ${formData.mode === "broker"
              ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : isPaidPlan
                ? "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                : "opacity-75"
              }`}
            onClick={() => handleModeSelect("broker")}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.mode === "broker" ? "border-blue-500 bg-blue-500" : "border-gray-300 dark:border-gray-600"
                  }`}>
                  {formData.mode === "broker" && <CheckCircle size={12} className="text-white" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">Broker-Linked</p>
                    {!isPaidPlan && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full">
                        <Lock size={10} />
                        Pro+
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Connect your broker API for automatic trade syncing and real-time updates.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upgrade Prompt for non-paid users selecting broker mode */}
        {!isPaidPlan && formData.mode !== "broker" && (
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <Zap size={18} className="text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Unlock Broker-Linked Mode
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Upgrade to Pro to connect your broker and auto-sync trades
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => router.push("/dashboard/upgrade")}
            >
              Upgrade
            </Button>
          </div>
        )}

        {errors.mode && <p className="text-red-500 text-xs">{errors.mode}</p>}
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting || isLoading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting || isLoading}
          className="flex-1"
        >
          {submitting || isLoading ? "Saving..." : isEdit ? "Update Account" : "Create Account"}
        </Button>
      </div>
    </form>
  );
}
