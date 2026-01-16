"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { X, Crown, Zap, TrendingUp, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCheckoutUrl } from "@/lib/checkout-urls";

interface UpgradeModalProps {
    /** If true, shows even if already shown this session (for testing) */
    forceShow?: boolean;
}

export default function UpgradeModal({ forceShow = false }: UpgradeModalProps) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userPlan, setUserPlan] = useState<string>("starter");

    useEffect(() => {
        const checkAndShowModal = async () => {
            if (status !== "authenticated" || !session?.user) {
                setLoading(false);
                return;
            }

            try {
                // Fetch user plan and modal status from API
                const res = await fetch("/api/user/upgrade-modal-status");
                if (!res.ok) {
                    setLoading(false);
                    return;
                }

                const data = await res.json();
                setUserPlan(data.plan || "starter");

                // Show modal only for starter plan users who haven't seen it this session
                const isStarterPlan = data.plan === "starter" || !data.plan;
                const hasSeenThisSession = data.modalShownThisSession === true;

                if (isStarterPlan && (!hasSeenThisSession || forceShow)) {
                    setIsOpen(true);
                    // Mark modal as shown for this session
                    await fetch("/api/user/upgrade-modal-status", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "mark_shown" }),
                    });
                }
            } catch (error) {
                console.error("Failed to check upgrade modal status:", error);
            } finally {
                setLoading(false);
            }
        };

        checkAndShowModal();
    }, [session, status, forceShow]);

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleUpgrade = (plan: "pro" | "plus" | "elite") => {
        const checkoutUrl = getCheckoutUrl(plan, "monthly");
        window.location.href = checkoutUrl;
    };

    const handleViewPlans = () => {
        setIsOpen(false);
        router.push("/dashboard/upgrade");
    };

    if (loading || !isOpen) {
        return null;
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="relative w-full max-w-2xl bg-white dark:bg-[#0f1319] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            {/* Close button */}
                            <button
                                onClick={handleClose}
                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
                                aria-label="Close modal"
                            >
                                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>

                            {/* Header */}
                            <div className="p-6 pb-4 text-center border-b border-gray-200 dark:border-gray-700">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                                    <Crown className="w-8 h-8 text-black dark:text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-black dark:text-white mb-2">
                                    Unlock Your Trading Potential
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                                    Upgrade to access advanced AI features, unlimited trade history, and personalized insights.
                                </p>
                            </div>

                            {/* Quick Plans */}
                            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Pro */}
                                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="w-5 h-5 text-black dark:text-white" />
                                        <span className="font-semibold text-black dark:text-white">Pro</span>
                                    </div>
                                    <div className="text-2xl font-bold text-black dark:text-white mb-2">$9<span className="text-sm font-normal text-gray-500">/mo</span></div>
                                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
                                        <li>• 6 months history</li>
                                        <li>• AI weekly summary</li>
                                        <li>• Strategy tips</li>
                                    </ul>
                                    <button
                                        onClick={() => handleUpgrade("pro")}
                                        className="w-full py-2 px-3 rounded-lg bg-gray-200 dark:bg-gray-700 text-black dark:text-white font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
                                    >
                                        Upgrade
                                    </button>
                                </div>

                                {/* Plus - Featured */}
                                <div className="p-4 rounded-xl border-2 border-black dark:border-white bg-gray-50 dark:bg-gray-900 shadow-lg relative">
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-black dark:bg-white text-white dark:text-black">
                                            Popular
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-2 mt-2">
                                        <Zap className="w-5 h-5 text-black dark:text-white" />
                                        <span className="font-semibold text-black dark:text-white">Plus</span>
                                    </div>
                                    <div className="text-2xl font-bold text-black dark:text-white mb-2">$19<span className="text-sm font-normal text-gray-500">/mo</span></div>
                                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
                                        <li>• Unlimited history</li>
                                        <li>• AI trade reviews</li>
                                        <li>• Image processing</li>
                                    </ul>
                                    <button
                                        onClick={() => handleUpgrade("plus")}
                                        className="w-full py-2 px-3 rounded-lg bg-white dark:bg-white text-black font-medium hover:bg-gray-100 transition-colors text-sm border border-black"
                                    >
                                        Upgrade
                                    </button>
                                </div>

                                {/* Elite */}
                                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Crown className="w-5 h-5 text-black dark:text-white" />
                                        <span className="font-semibold text-black dark:text-white">Elite</span>
                                    </div>
                                    <div className="text-2xl font-bold text-black dark:text-white mb-2">$39<span className="text-sm font-normal text-gray-500">/mo</span></div>
                                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
                                        <li>• AI strategy builder</li>
                                        <li>• Prop-firm dashboard</li>
                                        <li>• Priority support</li>
                                    </ul>
                                    <button
                                        onClick={() => handleUpgrade("elite")}
                                        className="w-full py-2 px-3 rounded-lg bg-gray-200 dark:bg-gray-700 text-black dark:text-white font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
                                    >
                                        Upgrade
                                    </button>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 pt-2 flex flex-col sm:flex-row gap-3 justify-center border-t border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={handleViewPlans}
                                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-black dark:text-white font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Compare All Plans
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    Continue to Dashboard
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
