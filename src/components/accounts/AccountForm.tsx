"use client";

import React, { useState, useEffect } from "react";
import type { CreateAccountPayload, UpdateAccountPayload } from "@/types/account";

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "number"
          ? value === ""
            ? 0
            : parseFloat(value)
          : value,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Account Name */}
      <div>
        <label className="block text-sm font-medium mb-2">Account Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Personal Account, Prop Firm Account"
          className={`w-full px-3 py-2 rounded bg-gray-800 border ${
            errors.name ? "border-red-500" : "border-gray-700"
          } text-white placeholder-gray-500 focus:outline-none focus:border-blue-500`}
          disabled={submitting || isLoading}
        />
        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
      </div>

      {/* Account Size */}
      <div>
        <label className="block text-sm font-medium mb-2">Account Size / Balance</label>
        <div className="flex gap-2">
          <input
            type="number"
            name="account_size"
            value={formData.account_size || ""}
            onChange={handleChange}
            placeholder="e.g., 10000"
            step="0.01"
            min="0"
            className={`flex-1 px-3 py-2 rounded bg-gray-800 border ${
              errors.account_size ? "border-red-500" : "border-gray-700"
            } text-white placeholder-gray-500 focus:outline-none focus:border-blue-500`}
            disabled={submitting || isLoading}
          />
          <select
            name="currency"
            value={formData.currency}
            onChange={handleChange}
            className="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500"
            disabled={submitting || isLoading}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="JPY">JPY</option>
            <option value="AUD">AUD</option>
            <option value="CAD">CAD</option>
          </select>
        </div>
        {errors.account_size && (
          <p className="text-red-400 text-xs mt-1">{errors.account_size}</p>
        )}
      </div>

      {/* Platform */}
      <div>
        <label className="block text-sm font-medium mb-2">Trading Platform</label>
        <select
          name="platform"
          value={formData.platform}
          onChange={handleChange}
          className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500"
          disabled={submitting || isLoading}
        >
          <option value="MT5">MetaTrader 5 (MT5)</option>
          <option value="MetaTrader4">MetaTrader 4 (MT4)</option>
          <option value="cTrader">cTrader</option>
          <option value="Manual">Manual Entry</option>
        </select>
      </div>

      {/* Broker (optional) */}
      <div>
        <label className="block text-sm font-medium mb-2">Broker (Optional)</label>
        <input
          type="text"
          name="broker"
          value={formData.broker || ""}
          onChange={handleChange}
          placeholder="e.g., XM, FxPro, Saxo Bank"
          className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          disabled={submitting || isLoading}
        />
      </div>

      {/* Account Mode */}
      <div>
        <label className="block text-sm font-medium mb-2">Account Mode</label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 p-3 rounded bg-gray-800 border border-gray-700 cursor-pointer hover:bg-gray-750">
            <input
              type="radio"
              name="mode"
              value="manual"
              checked={formData.mode === "manual"}
              onChange={handleChange}
              disabled={submitting || isLoading}
              className="w-4 h-4"
            />
            <span className="text-sm">Manual Entry</span>
          </label>
          <label className="flex items-center gap-2 p-3 rounded bg-gray-800 border border-gray-700 cursor-pointer hover:bg-gray-750">
            <input
              type="radio"
              name="mode"
              value="broker"
              checked={formData.mode === "broker"}
              onChange={handleChange}
              disabled={submitting || isLoading}
              className="w-4 h-4"
            />
            <span className="text-sm">Broker-Linked</span>
          </label>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {formData.mode === "manual"
            ? "Manually enter trades to track your account"
            : "Link your broker account to auto-sync trades"}
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting || isLoading}
          className="flex-1 px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 transition disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || isLoading}
          className="flex-1 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50 font-semibold"
        >
          {submitting || isLoading ? "Creating..." : "Create Account"}
        </button>
      </div>
    </form>
  );
}
