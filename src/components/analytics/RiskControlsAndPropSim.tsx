"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CheckSquare, Square as SquareIcon, Shield, StopCircle, Play, SlidersHorizontal, Crown } from "lucide-react";

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
            if (rawCl) setChecklist({ ...checklist, ...JSON.parse(rawCl) });
        } catch { }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
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
        filteredTrades.forEach((t) => {
            const d = new Date(t.openTime || t.closeTime || Date.now());
            const key = d.toISOString().slice(0, 10);
            const prev = map.get(key) || { pnl: 0, count: 0 };
            const pnl = parseFloat(String(t.pnl || 0)) || 0;
            map.set(key, { pnl: prev.pnl + pnl, count: prev.count + 1 });
        });
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
    const [propTargetPct, setPropTargetPct] = useState<number>(10); // e.g., 10%
    const [propMaxDailyLossPct, setPropMaxDailyLossPct] = useState<number>(5);
    const [propMaxTotalLossPct, setPropMaxTotalLossPct] = useState<number>(10);
    const [propDays, setPropDays] = useState<number>(20);
    const [propPhases, setPropPhases] = useState<number>(plan === 'elite' ? 2 : 1);

    useEffect(() => {
        if (accountBalance && accountBalance > 0) {
            setMaxDailyLoss(Math.max(25, accountBalance * 0.02));
            setMaxWeeklyLoss(Math.max(50, accountBalance * 0.05));
            setPropBalance(accountBalance);
        }
    }, [accountBalance]);

    const canEditBasic = plan !== 'starter';
    const canEditPhases = plan === 'plus' || plan === 'elite';
    const canUseTemplates = plan === 'plus' || plan === 'elite';

    const applyPreset = (preset: '50k' | '100k' | '200k') => {
        if (!canUseTemplates) return;
        if (preset === '50k') {
            setPropBalance(50000);
            setPropTargetPct(8);
            setPropMaxDailyLossPct(5);
            setPropMaxTotalLossPct(10);
            setPropDays(30);
            setPropPhases(2);
        } else if (preset === '100k') {
            setPropBalance(100000);
            setPropTargetPct(10);
            setPropMaxDailyLossPct(5);
            setPropMaxTotalLossPct(10);
            setPropDays(35);
            setPropPhases(2);
        } else if (preset === '200k') {
            setPropBalance(200000);
            setPropTargetPct(12);
            setPropMaxDailyLossPct(5);
            setPropMaxTotalLossPct(10);
            setPropDays(40);
            setPropPhases(2);
        }
    };

    const propSim = useMemo(() => {
        const bal = propBalance || 1000;
        const series = daily.slice(-propDays).map(([date, v]) => ({ date, pnl: v.pnl, count: v.count }));

        const dailyCap = (propMaxDailyLossPct / 100) * bal;
        const totalCap = (propMaxTotalLossPct / 100) * bal;

        // Phase targets: phase 1 uses propTargetPct; phase 2 uses 60% of that by default
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
            // reset accumulation for next phase
        }

        const overallPass = phaseResults.length === phaseTargetsPct.length && phaseResults.every(r => r.pass) && !overallBreach;
        const progressPct = (() => {
            const current = phaseResults[phaseResults.length - 1];
            if (!current) return 0;
            return Math.min(100, Math.max(0, (current.cum / (current.target || 1)) * 100));
        })();

        const current = phaseResults[phaseResults.length - 1];
        return {
            balance: bal,
            dailyCap,
            totalCap,
            phaseTargetsPct,
            phaseResults,
            overallPass,
            breach: overallBreach,
            series,
            progressPct,
            // compatibility fields for UI (to be refactored):
            target: current?.target ?? 0,
            maxDailyLoss: dailyCap,
            maxTotalLoss: totalCap,
            pass: overallPass,
            cum: current?.cum ?? 0,
        };
    }, [daily, propBalance, propTargetPct, propMaxDailyLossPct, propMaxTotalLossPct, propDays, propPhases]);

    const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
        <div className="rounded-xl border border-white/10 bg-white/5 dark:bg-white/5 p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Shield className="w-4 h-4 text-indigo-500" /> {title}</h3>
            {children}
        </div>
    );

    const ControlsInput = (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="p-3 rounded bg-black/5 dark:bg-white/5">
                <div className="text-xs text-muted-foreground mb-1">Risk per trade</div>
                <div className="flex items-center gap-2">
                    <input type="range" min={0.25} max={3} step={0.25} value={riskPct} onChange={(e) => setRiskPct(parseFloat(e.target.value))} className="w-full" />
                    <span className="text-sm font-medium">{riskPct.toFixed(2)}%</span>
                </div>
            </div>
            <div className="p-3 rounded bg-black/5 dark:bg-white/5">
                <div className="text-xs text-muted-foreground mb-1">Max trades/day</div>
                <div className="flex items-center gap-2">
                    <input type="number" min={1} max={50} value={maxTradesPerDay} onChange={(e) => setMaxTradesPerDay(parseInt(e.target.value || '0'))} className="w-24 bg-transparent border rounded px-2 py-1" />
                </div>
            </div>
            <div className="p-3 rounded bg-black/5 dark:bg-white/5">
                <div className="text-xs text-muted-foreground mb-1">Max daily loss</div>
                <div className="flex items-center gap-2">
                    <span className="text-sm">$</span>
                    <input type="number" min={10} step={10} value={Math.round(maxDailyLoss)} onChange={(e) => setMaxDailyLoss(parseFloat(e.target.value || '0'))} className="w-28 bg-transparent border rounded px-2 py-1" />
                </div>
            </div>
            {(plan === 'plus' || plan === 'elite' || plan === 'pro') && (
                <div className="p-3 rounded bg-black/5 dark:bg-white/5">
                    <div className="text-xs text-muted-foreground mb-1">Max weekly loss</div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm">$</span>
                        <input type="number" min={50} step={10} value={Math.round(maxWeeklyLoss)} onChange={(e) => setMaxWeeklyLoss(parseFloat(e.target.value || '0'))} className="w-28 bg-transparent border rounded px-2 py-1" />
                    </div>
                </div>
            )}
            {(plan === 'plus' || plan === 'elite') && (
                <div className="p-3 rounded bg-black/5 dark:bg-white/5">
                    <div className="text-xs text-muted-foreground mb-1">Cooldown after loss</div>
                    <div className="flex items-center gap-2">
                        <input type="number" min={5} step={5} value={cooldownMins} onChange={(e) => setCooldownMins(parseInt(e.target.value || '0'))} className="w-20 bg-transparent border rounded px-2 py-1" />
                        <span className="text-sm">mins</span>
                    </div>
                </div>
            )}
        </div>
    );

    const Checklist = (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[
                { key: 'setupValid', label: 'Setup is valid and A+ quality' },
                { key: 'stopLossSet', label: 'Stop loss defined and placed' },
                { key: 'rrOk', label: 'Risk/Reward ≥ 1.5R' },
                { key: 'noRevenge', label: 'Not trading to win back losses' },
                { key: 'journalReady', label: 'Will journal immediately after trade' },
            ].map((item) => (
                <button
                    key={item.key}
                    onClick={() => setChecklist((c) => ({ ...c, [item.key]: !c[item.key as keyof typeof c] }))}
                    className={`flex items-center gap-2 p-2 rounded border ${checklist[item.key as keyof typeof checklist] ? 'border-green-500 bg-green-500/10' : 'border-white/10 hover:bg-white/5'}`}
                >
                    {checklist[item.key as keyof typeof checklist] ? <CheckSquare className="w-4 h-4 text-green-500" /> : <SquareIcon className="w-4 h-4 text-gray-400" />}
                    <span className="text-sm">{item.label}</span>
                </button>
            ))}
        </div>
    );

    const GuardStatus = (
        <div className="grid sm:grid-cols-3 gap-3">
            <div className={`p-3 rounded ${overTrading ? 'bg-red-500/10 border border-red-500/30' : 'bg-white/5'}`}>
                <div className="text-xs text-muted-foreground">Today trades</div>
                <div className="text-lg font-bold">{today.count} / {maxTradesPerDay}</div>
                {overTrading && <div className="text-xs text-red-400 mt-1">Overtrading detected. Consider stopping.</div>}
            </div>
            <div className={`p-3 rounded ${dailyLossBreach ? 'bg-red-500/10 border border-red-500/30' : 'bg-white/5'}`}>
                <div className="text-xs text-muted-foreground">Today P/L</div>
                <div className="text-lg font-bold">${today.pnl.toFixed(2)}</div>
                {dailyLossBreach && <div className="text-xs text-red-400 mt-1">Max daily loss breached.</div>}
            </div>
            <div className={`p-3 rounded ${weeklyLossBreach ? 'bg-red-500/10 border border-red-500/30' : 'bg-white/5'}`}>
                <div className="text-xs text-muted-foreground">Last 5 days P/L</div>
                <div className="text-lg font-bold">${daily.slice(-5).reduce((s, [, v]) => s + v.pnl, 0).toFixed(2)}</div>
                {weeklyLossBreach && <div className="text-xs text-red-400 mt-1">Max weekly loss breached.</div>}
            </div>
        </div>
    );

    const PropSimUI = (
        <div className="space-y-3">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded bg-black/5 dark:bg-white/5">
                    <div className="text-xs text-muted-foreground mb-1">Balance</div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm">$</span>
                        <input type="number" min={100} step={50} value={Math.round(propBalance)} onChange={(e) => setPropBalance(parseFloat(e.target.value || '0'))} className="w-28 bg-transparent border rounded px-2 py-1" />
                    </div>
                </div>
                <div className="p-3 rounded bg-black/5 dark:bg-white/5">
                    <div className="text-xs text-muted-foreground mb-1">Profit target</div>
                    <div className="flex items-center gap-2">
                        <input type="range" min={5} max={20} step={1} value={propTargetPct} onChange={(e) => canEditBasic && setPropTargetPct(parseFloat(e.target.value))} className="w-full" disabled={!canEditBasic} />
                        <span className="text-sm font-medium">{propTargetPct}%</span>
                    </div>
                </div>
                <div className="p-3 rounded bg-black/5 dark:bg-white/5">
                    <div className="text-xs text-muted-foreground mb-1">Max daily loss</div>
                    <div className="flex items-center gap-2">
                        <input type="range" min={2} max={10} step={1} value={propMaxDailyLossPct} onChange={(e) => canEditBasic && setPropMaxDailyLossPct(parseFloat(e.target.value))} className="w-full" disabled={!canEditBasic} />
                        <span className="text-sm font-medium">{propMaxDailyLossPct}%</span>
                    </div>
                </div>
                <div className="p-3 rounded bg-black/5 dark:bg-white/5">
                    <div className="text-xs text-muted-foreground mb-1">Max total loss</div>
                    <div className="flex items-center gap-2">
                        <input type="range" min={5} max={20} step={1} value={propMaxTotalLossPct} onChange={(e) => canEditBasic && setPropMaxTotalLossPct(parseFloat(e.target.value))} className="w-full" disabled={!canEditBasic} />
                        <span className="text-sm font-medium">{propMaxTotalLossPct}%</span>
                    </div>
                </div>
                <div className="p-3 rounded bg-black/5 dark:bg-white/5">
                    <div className="text-xs text-muted-foreground mb-1">Challenge days</div>
                    <div className="flex items-center gap-2">
                        <input type="number" min={5} max={60} value={propDays} onChange={(e) => setPropDays(parseInt(e.target.value || '0'))} className="w-20 bg-transparent border rounded px-2 py-1" />
                        <span className="text-sm">days</span>
                    </div>
                </div>
            </div>
            {/* Advanced controls by plan */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded bg-black/5 dark:bg-white/5">
                    <div className="text-xs text-muted-foreground mb-1">Phases</div>
                    <div className="flex items-center gap-2">
                        <input type="number" min={1} max={2} value={propPhases} onChange={(e) => canEditPhases && setPropPhases(Math.min(2, Math.max(1, parseInt(e.target.value || '1'))))} className="w-20 bg-transparent border rounded px-2 py-1" disabled={!canEditPhases} />
                        <span className="text-sm">{propPhases === 2 ? 'Two-phase' : 'One-phase'}</span>
                    </div>
                </div>
                {canUseTemplates && (
                    <div className="p-3 rounded bg-black/5 dark:bg-white/5">
                        <div className="text-xs text-muted-foreground mb-1">Templates</div>
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => applyPreset('50k')}>50k</Button>
                            <Button size="sm" variant="outline" onClick={() => applyPreset('100k')}>100k</Button>
                            <Button size="sm" variant="outline" onClick={() => applyPreset('200k')}>200k</Button>
                        </div>
                    </div>
                )}
            </div>
            <div className="rounded-lg p-4 bg-white/5">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="text-sm">Target: <span className="font-semibold">${propSim.target.toFixed(0)}</span></div>
                    <div className="text-sm">Max Daily Loss: <span className="font-semibold">${propSim.maxDailyLoss.toFixed(0)}</span></div>
                    <div className="text-sm">Max Total Loss: <span className="font-semibold">${propSim.maxTotalLoss.toFixed(0)}</span></div>
                    <div className="ml-auto text-sm font-semibold">
                        {propSim.breach ? <span className="text-red-400">{propSim.breach}</span> : propSim.pass ? <span className="text-green-400">Target reached ✓</span> : <span className="text-yellow-400">In progress</span>}
                    </div>
                </div>
                <div className="mt-3 w-full bg-black/20 rounded h-2 overflow-hidden">
                    <div className={`h-full ${propSim.pass ? 'bg-green-500' : propSim.breach ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, Math.max(0, (propSim.cum / (propSim.target || 1)) * 100))}%` }} />
                </div>
            </div>
        </div>
    );

    const upgradeCta = (label = 'Upgrade to unlock') => (
        <Button variant="outline" size="sm" onClick={() => { try { (window as any).location.hash = '#upgrade'; } catch { } }}>
            <Crown className="w-4 h-4 mr-1 text-yellow-500" /> {label}
        </Button>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-5 h-5 text-indigo-500" /> Automated Risk Controls & Prop Firm Simulator</h3>
                    <p className="text-muted-foreground">Set your guardrails, run prop-challenge demos, and keep yourself from blowing up.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant={autoGuard ? 'default' : 'outline'}
                        onClick={() => setAutoGuard(!autoGuard)}
                        className="flex items-center gap-2"
                    >
                        {autoGuard ? <StopCircle className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {autoGuard ? 'Auto-Guard ON' : 'Auto-Guard OFF'}
                    </Button>
                    <Button variant="outline" className="flex items-center gap-2" onClick={() => alert('Saved!')}><SlidersHorizontal className="w-4 h-4" /> Save</Button>
                </div>
            </div>

            {/* Pre-trade Checklist */}
            <Section title="Pre-Trade Checklist">
                {Checklist}
                {plan === 'starter' && (
                    <div className="mt-2 text-xs text-yellow-400 flex items-center gap-2"><Crown className="w-3 h-3" /> More checklist templates in Pro and Plus. {upgradeCta('Upgrade')}</div>
                )}
            </Section>

            {/* Risk Rules */}
            <Section title="Risk Rules & Auto-Stop">
                {ControlsInput}
                <div className="mt-3">
                    {GuardStatus}
                </div>
                {plan === 'starter' && (
                    <div className="mt-2 text-xs text-yellow-400 flex items-center gap-2"><Crown className="w-3 h-3" /> Auto-stop & cooldown in Pro+. {upgradeCta()}</div>
                )}
            </Section>

            {/* Prop Firm Simulator */}
            <Section title="Prop Firm Simulator">
                {PropSimUI}
                {plan === 'starter' && (
                    <div className="mt-2 text-xs text-yellow-400 flex items-center gap-2"><Crown className="w-3 h-3" /> Custom prop templates in Elite. {upgradeCta('Unlock Elite')}</div>
                )}
            </Section>
        </div>
    );
}
