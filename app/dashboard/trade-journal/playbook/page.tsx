"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { CompactUpgradePrompt } from "@/components/UpgradePrompt";
import { PLAN_LIMITS, PlanType } from "@/lib/planAccess";

interface Playbook {
    id: string;
    name: string;
    entry: string;
    exit: string;
    notes?: string;
}

export default function PlaybookPage() {
    const { data: session } = useSession();

    const rawPlan = (session?.user as any)?.plan;
    const planType = (String(rawPlan || "").toLowerCase() || "starter") as PlanType;
    const planLimits = PLAN_LIMITS[planType] || PLAN_LIMITS.starter;
    const canUsePlaybook = planLimits.maxTradePlans !== 0;
    const playbookLimit = planLimits.maxTradePlans === -1 ? Infinity : planLimits.maxTradePlans;

    const storageKey = "trade_playbooks_" + (session?.user?.email ?? session?.user?.name ?? "anon");
    const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Omit<Playbook, "id">>({
        name: "",
        entry: "",
        exit: "",
        notes: "",
    });

    useEffect(() => {
        try {
            if (typeof window !== "undefined") {
                const saved = localStorage.getItem(storageKey);
                if (saved) setPlaybooks(JSON.parse(saved));
            }
        } catch {
            // Ignore corrupted data
        }
    }, [storageKey]);

    useEffect(() => {
        try {
            if (typeof window !== "undefined") {
                localStorage.setItem(storageKey, JSON.stringify(playbooks));
            }
        } catch {
            // Ignore write failures
        }
    }, [playbooks, storageKey]);

    const handleAdd = () => {
        if (!formData.name.trim()) return;
        if (playbooks.length >= playbookLimit) {
            alert(`You've reached the limit of ${playbookLimit} playbooks for your plan.`);
            return;
        }

        const newPlaybook: Playbook = {
            id: Date.now().toString(),
            ...formData,
        };
        setPlaybooks((prev) => [...prev, newPlaybook]);
        setFormData({ name: "", entry: "", exit: "", notes: "" });
    };

    const handleEdit = (playbook: Playbook) => {
        setEditingId(playbook.id);
        setFormData({
            name: playbook.name,
            entry: playbook.entry,
            exit: playbook.exit,
            notes: playbook.notes || "",
        });
    };

    const handleSave = () => {
        if (!editingId || !formData.name.trim()) return;
        setPlaybooks((prev) =>
            prev.map((p) =>
                p.id === editingId ? { ...p, ...formData } : p
            )
        );
        setEditingId(null);
        setFormData({ name: "", entry: "", exit: "", notes: "" });
    };

    const handleDelete = (id: string) => {
        setPlaybooks((prev) => prev.filter((p) => p.id !== id));
    };

    const handleCancel = () => {
        setEditingId(null);
        setFormData({ name: "", entry: "", exit: "", notes: "" });
    };

    if (!canUsePlaybook) {
        return (
            <div className="max-w-2xl mx-auto py-12">
                <CompactUpgradePrompt
                    currentPlan={planType}
                    feature="Strategy Playbook"
                    onUpgrade={() => { }}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Add/Edit Form */}
            <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-500" />
                        {editingId ? "Edit Strategy" : "Add New Strategy"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Strategy Name
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Breakout Strategy"
                            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0D1117] text-gray-900 dark:text-white placeholder:text-gray-400"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Entry Rules
                            </label>
                            <textarea
                                value={formData.entry}
                                onChange={(e) => setFormData((prev) => ({ ...prev, entry: e.target.value }))}
                                placeholder="When to enter..."
                                rows={3}
                                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0D1117] text-gray-900 dark:text-white placeholder:text-gray-400 resize-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Exit Rules
                            </label>
                            <textarea
                                value={formData.exit}
                                onChange={(e) => setFormData((prev) => ({ ...prev, exit: e.target.value }))}
                                placeholder="When to exit..."
                                rows={3}
                                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0D1117] text-gray-900 dark:text-white placeholder:text-gray-400 resize-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                            placeholder="Additional notes..."
                            rows={2}
                            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0D1117] text-gray-900 dark:text-white placeholder:text-gray-400 resize-none"
                        />
                    </div>
                    <div className="flex gap-2">
                        {editingId ? (
                            <>
                                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Changes
                                </Button>
                                <Button onClick={handleCancel} variant="outline" className="border-gray-300 dark:border-gray-600">
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel
                                </Button>
                            </>
                        ) : (
                            <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Strategy
                            </Button>
                        )}
                    </div>
                    {playbookLimit !== Infinity && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {playbooks.length} / {playbookLimit} strategies used
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Playbook List */}
            <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-gray-900 dark:text-white">
                        Your Strategies ({playbooks.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {playbooks.length === 0 ? (
                        <div className="p-8 text-center">
                            <Star className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg font-medium text-gray-900 dark:text-white">No strategies yet</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Add your first trading strategy above
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {playbooks.map((playbook) => (
                                <div key={playbook.id} className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                                {playbook.name}
                                            </h3>
                                            <div className="grid grid-cols-2 gap-4 mt-3">
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                        Entry Rules
                                                    </p>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                                                        {playbook.entry || "—"}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                        Exit Rules
                                                    </p>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                                                        {playbook.exit || "—"}
                                                    </p>
                                                </div>
                                            </div>
                                            {playbook.notes && (
                                                <div className="mt-3">
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                        Notes
                                                    </p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                        {playbook.notes}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2 ml-4">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleEdit(playbook)}
                                                className="text-gray-500 hover:text-gray-700"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDelete(playbook.id)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
