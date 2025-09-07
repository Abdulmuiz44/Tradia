// src/components/payment/PaymentMethodSelector.tsx
"use client";

import React from "react";
import { getPaymentMethodOptions, type PaymentMethod } from "@/lib/flutterwave.server";

interface PaymentMethodSelectorProps {
  selectedMethod: string | null | undefined;
  onMethodChange: (methodId: string) => void;
  className?: string;
}

export default function PaymentMethodSelector({
  selectedMethod,
  onMethodChange,
  className = "",
}: PaymentMethodSelectorProps) {
  const paymentMethods: PaymentMethod[] = getPaymentMethodOptions();

  return (
    <div className={`space-y-4 ${className}`}>
      <h4 className="text-lg font-medium text-white">Choose Payment Method</h4>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {paymentMethods.map((method: PaymentMethod) => (
          <PaymentMethodCard
            key={method.id}
            method={method}
            isSelected={selectedMethod === method.id}
            onClick={() => onMethodChange(method.id)}
          />
        ))}
      </div>

      <div className="text-sm text-gray-400">
        Selected:{" "}
        <span className="text-blue-400 font-medium">
          {paymentMethods.find((m: PaymentMethod) => m.id === selectedMethod)?.name || "None"}
        </span>
      </div>
    </div>
  );
}

interface PaymentMethodCardProps {
  method: PaymentMethod;
  isSelected: boolean;
  onClick: () => void;
}

function PaymentMethodCard({ method, isSelected, onClick }: PaymentMethodCardProps) {
  const Icon = method.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-4 rounded-lg border-2 transition-all duration-200 text-left flex flex-col items-center ${
        isSelected
          ? "border-blue-500 bg-blue-500/10 shadow-lg"
          : "border-gray-600 hover:border-gray-500 bg-gray-800/50 hover:bg-gray-700/50"
      }`}
    >
      <div className="flex flex-col items-center space-y-2 w-full">
        <div className="text-2xl h-10 flex items-center justify-center">
          {Icon ? (
            // allow icon to be a React node or a string
            typeof Icon === "string" ? <span>{Icon}</span> : <>{Icon}</>
          ) : (
            // fallback SVG icon
            <svg
              className="w-6 h-6 text-gray-200"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M12 3v12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 7l4-4 4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        <div className="text-center w-full">
          <div
            className={`text-sm font-medium ${
              isSelected ? "text-blue-400" : "text-white"
            }`}
          >
            {method.name}
          </div>
          <div className="text-xs text-gray-400 mt-1">{method.description}</div>
        </div>
      </div>
    </button>
  );
}

// Export individual components for reuse
export { PaymentMethodCard };
export type { PaymentMethodSelectorProps, PaymentMethodCardProps };
