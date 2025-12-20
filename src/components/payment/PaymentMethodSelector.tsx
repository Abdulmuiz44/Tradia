// src/components/payment/PaymentMethodSelector.tsx
"use client";

import React from "react";
import { getPaymentMethodOptions, type PaymentMethod } from "@/lib/payment-options";

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
            onClick={() => {
              if (!method.comingSoon) {
                onMethodChange(method.id);
              }
            }}
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
      disabled={method.comingSoon}
      className={`p-4 rounded-lg border-2 transition-all duration-200 text-left flex flex-col items-center relative ${
        method.comingSoon
          ? "border-gray-700 bg-gray-900/50 opacity-60 cursor-not-allowed"
          : isSelected
          ? "border-blue-500 bg-blue-500/10 shadow-lg"
          : "border-gray-600 hover:border-gray-500 bg-gray-800/50 hover:bg-gray-700/50 cursor-pointer"
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
          <div className={`text-xs mt-1 ${method.comingSoon ? "text-yellow-500/70 font-medium" : "text-gray-400"}`}>
            {method.description}
          </div>
        </div>
      </div>
      {method.comingSoon && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/20 backdrop-blur-sm">
          <span className="text-xs font-semibold text-yellow-400 bg-yellow-500/20 px-2 py-1 rounded">
            Coming Soon
          </span>
        </div>
      )}
    </button>
  );
}

// Export individual components for reuse
export { PaymentMethodCard };
export type { PaymentMethodSelectorProps, PaymentMethodCardProps };
