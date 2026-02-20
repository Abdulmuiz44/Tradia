"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
    CheckSquare,
    Square as SquareIcon,
    Shield,
    StopCircle,
    Play,
    SlidersHorizontal,
    Crown,
    Save,
    AlertTriangle
} from "lucide-react";
import { CompactUpgradePrompt } from "@/components/UpgradePrompt";

type PlanTier = 'starter' | 'pro' | 'plus' | 'elite';

export default function RiskControlsAndPropSim({
    plan,
    accountBalance,
    filteredTrades,
}: {
    plan: PlanTier;
    accountBalance: number;
    filteredTrades: any[];
}) {
    const [autoGuard, setAutoGuard] = useState(false);
    const [riskPct, setRiskPct] = useState<number>(2);
    const [maxTradesPerDay, setMaxTradesPerDay] = useState<number>(10);
    const [maxDailyLoss, setMaxDailyLoss] = useState<number>(accountBalance ? Math.max(25, accountBalance * 0.02) : 100);
    const [maxWeeklyLoss, setMaxWeeklyLoss] = useState<number>(accountBalance ? Math.max(50, accountBalance * 0.05) : 250);
    const [cooldownMins, setCooldownMins] = useState<number>(10);
    const [checklist, setChecklist] = useState<Record<string, boolean>>({
        setupValid: false,
        stopLossSet: false,
        rrOk: false,
        noRevenge: false,
        journalReady: false,
    });

    // Persist settings locally
    useEffect(() => {
        try {
            const raw = localStorage.getItem('risk_controls');
            if (raw) {
                const s = JSON.parse(raw);
                if (typeof s.autoGuard === 'boolean') setAutoGuard(s.autoGuard);
                if (typeof s.riskPct === 'number') setRiskPct(s.riskPct);
                if (typeof s.maxTradesPerDay === 'number') setMaxTradesPerDay(s.maxTradesPerDay);
                if (typeof s.maxDailyLoss === 'number') setMaxDailyLoss(s.maxDailyLoss);
                if (typeof s.maxWeeklyLoss === 'number') setMaxWeeklyLoss(s.maxWeeklyLoss);
                if (typeof s.cooldownMins === 'number') setCooldownMins(s.cooldownMins);
            }
            const rawCl = localStorage.getItem('pretrade_checklist');
            if (rawCl) setChecklist(prev => ({ ...prev, ...JSON.parse(rawCl) }));
        } catch { }
    }, []); // Empty dependency array for load only

    // Autosave
    useEffect(() => {
        try {
            localStorage.setItem('risk_controls', JSON.stringify({ autoGuard, riskPct, maxTradesPerDay, maxDailyLoss, maxWeeklyLoss, cooldownMins }));
        } catch { }
    }, [autoGuard, riskPct, maxTradesPerDay, maxDailyLoss, maxWeeklyLoss, cooldownMins]);

    useEffect(() => {
        try { localStorage.setItem('pretrade_checklist', JSON.stringify(checklist)); } catch { }
    }, [checklist]);

    // Derive daily PnL and counts
    const daily = useMemo(() => {
        const map = new Map<string, { pnl: number; count: number }>();
        if (Array.isArray(filteredTrades)) {
            filteredTrades.forEach((t) => {
                const d = new Date(t.openTime || t.closeTime || Date.now());
                const key = d.toISOString().slice(0, 10);
                const prev = map.get(key) || { pnl: 0, count: 0 };
                const pnl = parseFloat(String(t.pnl || 0)) || 0;
                map.set(key, { pnl: prev.pnl + pnl, count: prev.count + 1 });
            });
        }
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [filteredTrades]);

    // Breach checks
    const todayKey = new Date().toISOString().slice(0, 10);
    const today = daily.find(([k]) => k === todayKey)?.[1] || { pnl: 0, count: 0 };
    const overTrading = today.count > maxTradesPerDay;
    const dailyLossBreach = today.pnl < -Math.abs(maxDailyLoss);
    const weeklyLossBreach = (() => {
        // last 5 trading days aggregate
        const last = daily.slice(-5).reduce((sum, [, v]) => sum + v.pnl, 0);
        return last < -Math.abs(maxWeeklyLoss);
    })();

    // Prop firm simulator inputs (plan-aware)
    const [propBalance, setPropBalance] = useState<number>(accountBalance || 1000);
    const [propTargetPct, setPropTargetPct] = useState<number>(10);
    const [propMaxDailyLossPct, setPropMaxDailyLossPct] = useState<number>(5);
    const [propMaxTotalLossPct, setPropMaxTotalLossPct] = useState<number>(10);
    const [propDays, setPropDays] = useState<number>(20);
    const [propPhases, setPropPhases] = useState<number>(plan === 'elite' ? 2 : 1);

    // Sync prop balance with actual balance properly if not set
    useEffect(() => {
        if (accountBalance && accountBalance > 0) {
            // Only update defaults if reasonable needed, but for prop sim usually user sets it manually unless they want to sim their live account.
            // Let's default to accountBalance BUT allow override.
            // Actually, previous logic force-set it. Let's act nicely.
            // setPropBalance(accountBalance);
        }
    }, [accountBalance]);

    const canEditBasic = plan !== 'starter';
    const canEditPhases = plan === 'plus' || plan === 'elite';
    const canUseTemplates = plan === 'plus' || plan === 'elite';
    const canUseAutoStop = plan === 'pro' || plan === 'plus' || plan === 'elite'; // "Auto-stop & cooldown in Pro+"

    const applyPreset = (preset: '50k' | '100k' | '200k') => {
        if (!canUseTemplates) return;
        if (preset === '50k') {
            setPropBalance(50000); setPropTargetPct(8); setPropMaxDailyLossPct(5); setPropMaxTotalLossPct(10); setPropDays(30); setPropPhases(2);
        } else if (preset === '100k') {
            setPropBalance(100000); setPropTargetPct(10); setPropMaxDailyLossPct(5); setPropMaxTotalLossPct(10); setPropDays(35); setPropPhases(2);
        } else if (preset === '200k') {
            setPropBalance(200000); setPropTargetPct(12); setPropMaxDailyLossPct(5); setPropMaxTotalLossPct(10); setPropDays(40); setPropPhases(2);
        }
    };

    const propSim = useMemo(() => {
        const bal = propBalance || 1000;
        const series = daily.slice(-propDays).map(([date, v]) => ({ date, pnl: v.pnl, count: v.count }));
        const dailyCap = (propMaxDailyLossPct / 100) * bal;
        const totalCap = (propMaxTotalLossPct / 100) * bal;

        const phaseTargetsPct: number[] = propPhases === 2 ? [propTargetPct, Math.max(3, Math.round(propTargetPct * 0.6))] : [propTargetPct];
        const phaseResults: { phase: number; target: number; cum: number; days: number; pass: boolean; breach?: string }[] = [];

        let idx = 0;
        let overallBreach: string | undefined;
        for (let p = 0; p < phaseTargetsPct.length; p++) {
            const targetValue = (phaseTargetsPct[p] / 100) * bal;
            let cum = 0;
            let pass = false;
            let days = 0;
            let breach: string | undefined;
            for (; idx < series.length; idx++) {
                const d = series[idx];
                days += 1;
                cum += d.pnl;
                if (d.pnl < -dailyCap) { breach = 'Max daily loss breached'; overallBreach = breach; break; }
                if (cum < -totalCap) { breach = 'Max total loss breached'; overallBreach = breach; break; }
                if (cum >= targetValue) { pass = true; idx += 1; break; }
            }
            phaseResults.push({ phase: p + 1, target: targetValue, cum, days, pass, breach });
            if (breach) break;
        }

        const overallPass = phaseResults.length === phaseTargetsPct.length && phaseResults.every(r => r.pass) && !overallBreach;
        const current = phaseResults[phaseResults.length - 1];
        return {
            balance: bal,
            dailyCap,
            totalCap,
            phaseTargetsPct,
            phaseResults,
            overallPass,
            breach: overallBreach,
            target: current?.target ?? 0,
            maxDailyLoss: dailyCap,
            maxTotalLoss: totalCap,
            pass: overallPass,
            cum: current?.cum ?? 0,
        };
    }, [daily, propBalance, propTargetPct, propMaxDailyLossPct, propMaxTotalLossPct, propDays, propPhases]);

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-bold flex items-center gap-2">
                        <Shield className="w-6 h-6 text-indigo-500" />
                        Risk Controls & Prop Simulator
                    </h3>
                    <p className="text-muted-foreground mt-1">Set your guardrails, run prop-challenge demos, and protect your capital.</p>
                </div>
                <div className="flex items-center gap-2">
                    {canUseAutoStop ? (
                        <Button
                            variant={autoGuard ? 'default' : 'outline'}
                            onClick={() => setAutoGuard(!autoGuard)}
                            className={`flex items-center gap-2 ${autoGuard ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        >
                            {autoGuard ? <StopCircle className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            {autoGuard ? 'Auto-Guard ON' : 'Auto-Guard OFF'}
                        </Button>
                    ) : (
                        <Button variant="outline" disabled className="opacity-70">
                            <Crown className="w-4 h-4 mr-2 text-yellow-500" />
                            Auto-Guard (Pro+)
                        </Button>
                    )}

                    <Button variant="outline" className="flex items-center gap-2" onClick={() => { }}>
                        <Save className="w-4 h-4" />
                        <span className="hidden sm:inline">Save</span>
                    </Button>
                </div>
            </div>

            {/* Pre-trade Checklist */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <CheckSquare className="w-5 h-5 text-blue-500" />
                        Pre-Trade Checklist
                    </CardTitle>
                    <CardDescription>Verify your setup before executing every trade.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[
                            { key: 'setupValid', label: 'Setup is valid and A+ quality' },
                            { key: 'stopLossSet', label: 'Stop loss defined and placed' },
                            { key: 'rrOk', label: 'Risk/Reward ≥ 1.5R' },
                            { key: 'noRevenge', label: 'Not trading to win back losses' },
                            { key: 'journalReady', label: 'Will journal immediately after trade' },
                        ].map((item) => (
                            <div
                                key={item.key}
                                onClick={() => setChecklist((c) => ({ ...c, [item.key]: !c[item.key as keyof typeof c] }))}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${checklist[item.key as keyof typeof checklist]
                                    ? 'border-green-500/50 bg-green-500/10 dark:bg-green-900/20'
                                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                            >
                                {checklist[item.key as keyof typeof checklist]
                                    ? <CheckSquare className="w-5 h-5 text-green-500" />
                                    : <SquareIcon className="w-5 h-5 text-gray-400" />
                                }
                                <span className="text-sm font-medium">{item.label}</span>
                            </div>
                        ))}
                    </div>
                    {plan === 'starter' && (
                        <div className="mt-4">
                            <CompactUpgradePrompt currentPlan="starter" feature="Custom Checklist Templates" onUpgrade={() => { (window as any).location.hash = '#upgrade' }} />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Risk Rules */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <SlidersHorizontal className="w-5 h-5 text-orange-500" />
                        Risk Rules
                    </CardTitle>
                    <CardDescription>Define your maximum limits to prevent catastrophic losses.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <label className="text-sm font-medium">Risk per trade</label>
                                <span className="text-sm font-bold text-blue-500">{riskPct}%</span>
                            </div>
                            <Slider
                                defaultValue={[riskPct]}
                                max={5}
                                step={0.25}
                                onValueChange={(val) => setRiskPct(val[0])}
                            />
                            <p className="text-xs text-muted-foreground">Max % of account to risk per trade</p>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium">Max Trades / Day</label>
                            <Input
                                type="number"
                                value={maxTradesPerDay}
                                onChange={(e) => setMaxTradesPerDay(Number(e.target.value))}
                                className="font-mono"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium">Max Daily Loss ($)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                <Input
                                    type="number"
                                    className="pl-8 font-mono"
                                    value={maxDailyLoss}
                                    onChange={(e) => setMaxDailyLoss(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        {/* Advanced Fields */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium">Max Weekly Loss ($)</label>
                            {canEditBasic ? (
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                    <Input
                                        type="number"
                                        className="pl-8 font-mono"
                                        value={maxWeeklyLoss}
                                        onChange={(e) => setMaxWeeklyLoss(Number(e.target.value))}
                                    />
                                </div>
                            ) : (
                                <div className="p-2 border border-dashed rounded text-sm text-center text-muted-foreground bg-gray-50 dark:bg-gray-900">
                                    Available in Pro/Plus
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium">Cooldown (mins)</label>
                            {canUseAutoStop ? (
                                <Input
                                    type="number"
                                    value={cooldownMins}
                                    onChange={(e) => setCooldownMins(Number(e.target.value))}
                                    className="font-mono"
                                />
                            ) : (
                                <div className="p-2 border border-dashed rounded text-sm text-center text-muted-foreground bg-gray-50 dark:bg-gray-900">
                                    Available in Pro/Plus
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Live Guard Status */}
                    <div className="mt-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-green-500" /> Current Session Status
                        </h4>
                        <div className="grid sm:grid-cols-3 gap-4">
                            <div className={`p-3 rounded-lg border ${overTrading ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700'}`}>
                                <div className="text-xs text-muted-foreground">Trades Today</div>
                                <div className={`text-xl font-bold ${overTrading ? 'text-red-500' : ''}`}>
                                    {today.count} <span className="text-sm text-muted-foreground font-normal">/ {maxTradesPerDay}</span>
                                </div>
                            </div>
                            <div className={`p-3 rounded-lg border ${dailyLossBreach ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700'}`}>
                                <div className="text-xs text-muted-foreground">Daily P&L</div>
                                <div className={`text-xl font-bold ${today.pnl < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    ${today.pnl.toFixed(2)}
                                </div>
                                {dailyLossBreach && <span className="text-xs font-bold text-red-500">LIMIT BREACHED</span>}
                            </div>
                            <div className={`p-3 rounded-lg border ${weeklyLossBreach ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700'}`}>
                                <div className="text-xs text-muted-foreground">Weekly P&L (5d)</div>
                                <div className={`text-xl font-bold ${weeklyLossBreach ? 'text-red-500' : ''}`}>
                                    ${daily.slice(-5).reduce((s, [, v]) => s + v.pnl, 0).toFixed(2)}
                                </div>
                            </div>
                        </div>
                    </div>
                    {!canUseAutoStop && (
                        <CompactUpgradePrompt currentPlan={plan} feature="Automated Risk Guard" onUpgrade={() => { (window as any).location.hash = '#upgrade' }} />
                    )}
                </CardContent>
            </Card>

            {/* Prop Firm Simulator */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Crown className="w-5 h-5 text-purple-500" />
                        Prop Firm Simulator
                    </CardTitle>
                    <CardDescription>Simulate passing a prop firm challenge with your real trades.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-wrap gap-2 mb-4">
                        <span className="text-sm font-medium mr-2 self-center">Quick Presets:</span>
                        <Button size="sm" variant="outline" onClick={() => applyPreset('50k')} disabled={!canUseTemplates}>50k</Button>
                        <Button size="sm" variant="outline" onClick={() => applyPreset('100k')} disabled={!canUseTemplates}>100k</Button>
                        <Button size="sm" variant="outline" onClick={() => applyPreset('200k')} disabled={!canUseTemplates}>200k</Button>
                        {!canUseTemplates && <span className="text-xs self-center text-muted-foreground ml-2">(Upgrade to use presets)</span>}
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-3">
                            <label className="text-sm font-medium">Virtual Balance</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                <Input
                                    type="number"
                                    className="pl-8 font-mono"
                                    value={propBalance}
                                    onChange={(e) => setPropBalance(Number(e.target.value))}
                                />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-medium">Profit Target (%)</label>
                            <Input
                                type="number"
                                className="font-mono"
                                value={propTargetPct}
                                onChange={(e) => setPropTargetPct(Number(e.target.value))}
                                disabled={!canEditBasic}
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-medium">Max Daily Loss (%)</label>
                            <Input
                                type="number"
                                className="font-mono"
                                value={propMaxDailyLossPct}
                                onChange={(e) => setPropMaxDailyLossPct(Number(e.target.value))}
                                disabled={!canEditBasic}
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-medium">Max Total Loss (%)</label>
                            <Input
                                type="number"
                                className="font-mono"
                                value={propMaxTotalLossPct}
                                onChange={(e) => setPropMaxTotalLossPct(Number(e.target.value))}
                                disabled={!canEditBasic}
                            />
                        </div>
                    </div>

                    {/* Simulation Results Bar */}
                    <div className="mt-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                            <div className="flex items-center gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground">Profit Target</p>
                                    <p className="font-mono font-bold">${propSim.target.toFixed(0)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Max Daily Loss</p>
                                    <p className="font-mono font-bold text-red-400">${propSim.maxDailyLoss.toFixed(0)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Max Total Loss</p>
                                    <p className="font-mono font-bold text-red-400">${propSim.maxTotalLoss.toFixed(0)}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground">Status</p>
                                {propSim.breach ? (
                                    <Badge variant="destructive" className="flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> FAILED: {propSim.breach}
                                    </Badge>
                                ) : propSim.pass ? (
                                    <Badge className="bg-green-500 hover:bg-green-600 flex items-center gap-1">
                                        <Crown className="w-3 h-3" /> PASSED
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="border-blue-500 text-blue-500">
                                        IN PROGRESS
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`absolute top-0 left-0 h-full transition-all duration-500 ${propSim.pass ? 'bg-green-500' : propSim.breach ? 'bg-red-500' : 'bg-blue-500'
                                    }`}
                                style={{ width: `${Math.min(100, Math.max(0, (propSim.cum / (propSim.target || 1)) * 100))}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                            <span>$0 (Start)</span>
                            <span>${propSim.cum.toFixed(0)} (Current)</span>
                            <span>${propSim.target.toFixed(0)} (Target)</span>
                        </div>
                    </div>

                    {!canEditBasic && (
                        <CompactUpgradePrompt currentPlan={plan} feature="Advanced Prop Simulator" onUpgrade={() => { (window as any).location.hash = '#upgrade' }} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Helper components
function Badge({ variant, className, children }: any) {
    const base = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
    const variants = {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-red-500 text-white hover:bg-red-600",
        outline: "text-foreground",
    };
    return <div className={`${base} ${variants[variant as keyof typeof variants] || variants.default} ${className}`}>{children}</div>
}

function Activity({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
}
