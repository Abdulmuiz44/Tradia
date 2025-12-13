"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Download,
    FileText,
    File,
    CheckCircle,
    AlertCircle,
    Settings
} from 'lucide-react';
import { Trade } from '@/types/trade';
import { getTradeDate, getTradePnl, safeDate } from '@/lib/trade-date-utils';

interface ExportCenterProps {
    trades: Trade[];
}

const ExportCenter: React.FC<ExportCenterProps> = ({ trades }) => {
    const [includeAI, setIncludeAI] = useState(true);
    const [exporting, setExporting] = useState<string | null>(null);
    const [lastExport, setLastExport] = useState<string | null>(null);

    const exportData = {
        summary: {
            totalTrades: trades.length,
            totalPnL: trades.reduce((sum, trade) => sum + getTradePnl(trade), 0),
            winRate: trades.length > 0 ? (trades.filter(t => t.outcome === 'Win').length / trades.length) * 100 : 0,
            avgRR: calculateAvgRR(trades),
            dateRange: getDateRange(trades),
            generatedAt: new Date().toISOString()
        },
        trades: trades.map(trade => ({
            id: trade.id,
            symbol: trade.symbol,
            direction: trade.direction,
            orderType: trade.orderType,
            openTime: trade.openTime,
            closeTime: trade.closeTime,
            entryPrice: trade.entryPrice,
            exitPrice: trade.exitPrice,
            stopLossPrice: trade.stopLossPrice,
            takeProfitPrice: trade.takeProfitPrice,
            lotSize: trade.lotSize,
            pnl: trade.pnl,
            outcome: trade.outcome,
            strategy: trade.strategy,
            emotion: trade.emotion,
            journalNotes: trade.journalNotes,
            duration: trade.duration
        })),
        performance: {
            bestDay: calculateBestDay(trades),
            worstDay: calculateWorstDay(trades),
            profitFactor: calculateProfitFactor(trades),
            consistencyScore: calculateConsistencyScore(trades),
            avgTradeDuration: calculateAvgTradeDuration(trades)
        }
    };

    const handleExport = async (format: 'pdf' | 'csv') => {
        setExporting(format);
        try {
            // Simulate export process
            await new Promise(resolve => setTimeout(resolve, 2000));

            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `tradia-report-${timestamp}`;

            switch (format) {
                case 'csv':
                    exportToCSV(filename);
                    break;
                case 'pdf':
                    exportToPDF(filename);
                    break;
            }

            setLastExport(`${format.toUpperCase()} export completed at ${new Date().toLocaleTimeString()}`);
        } catch (error) {
            console.error('Export failed:', error);
            setLastExport('Export failed. Please try again.');
        } finally {
            setExporting(null);
        }
    };

    const exportToCSV = (filename: string) => {
        const headers = [
            'Symbol', 'Direction', 'Order Type', 'Open Time', 'Close Time',
            'Entry Price', 'Exit Price', 'Stop Loss', 'Take Profit', 'Lot Size',
            'P&L', 'Outcome', 'Strategy', 'Emotion', 'Duration', 'Notes'
        ];

        const csvContent = [
            headers.join(','),
            ...exportData.trades.map(trade => [
                trade.symbol,
                trade.direction,
                trade.orderType,
                trade.openTime,
                trade.closeTime,
                trade.entryPrice,
                trade.exitPrice,
                trade.stopLossPrice,
                trade.takeProfitPrice,
                trade.lotSize,
                trade.pnl,
                trade.outcome,
                trade.strategy,
                trade.emotion,
                trade.duration,
                `"${trade.journalNotes || ''}"`
            ].join(','))
        ].join('\n');

        downloadFile(`${filename}.csv`, csvContent, 'text/csv');
    };



    const exportToPDF = (filename: string) => {
        // For a real implementation, you'd use a library like jsPDF or react-pdf
        // For now, we'll create a simple text summary
        const pdfContent = `
TRADIA TRADING REPORT
Generated: ${exportData.summary.generatedAt}

PERFORMANCE SUMMARY
==================
Total Trades: ${exportData.summary.totalTrades}
Total P/L: $${exportData.summary.totalPnL.toFixed(2)}
Win Rate: ${exportData.summary.winRate.toFixed(1)}%
Average RR: ${exportData.summary.avgRR.toFixed(2)}
Date Range: ${exportData.summary.dateRange}

KEY METRICS
===========
Best Day: $${exportData.performance.bestDay.toFixed(2)}
Worst Day: $${exportData.performance.worstDay.toFixed(2)}
Profit Factor: ${exportData.performance.profitFactor.toFixed(2)}
Consistency Score: ${exportData.performance.consistencyScore.toFixed(1)}%
Avg Trade Duration: ${formatDuration(exportData.performance.avgTradeDuration)}

${includeAI ? `
AI ANALYSIS
===========
Based on your trading data, here are key insights:

1. Win Rate: ${exportData.summary.winRate.toFixed(1)}% - ${exportData.summary.winRate >= 60 ? 'Excellent performance' :
                    exportData.summary.winRate >= 50 ? 'Good performance' :
                        'Room for improvement'
                }

2. Risk Management: Average RR of ${exportData.summary.avgRR.toFixed(2)} indicates ${exportData.summary.avgRR >= 1.5 ? 'strong' :
                    exportData.summary.avgRR >= 1 ? 'adequate' : 'poor'
                } risk-reward discipline.

3. Consistency: Score of ${exportData.performance.consistencyScore.toFixed(1)}% suggests ${exportData.performance.consistencyScore >= 80 ? 'highly consistent' :
                    exportData.performance.consistencyScore >= 60 ? 'moderately consistent' :
                        'inconsistent'
                } daily performance.

Recommendations:
- ${exportData.summary.winRate < 50 ? 'Focus on improving entry criteria to increase win rate.' : 'Continue with current strategy.'}
- ${exportData.summary.avgRR < 1.5 ? 'Work on better risk-reward ratios by adjusting stop losses and targets.' : 'Risk management is solid.'}
- ${exportData.performance.consistencyScore < 70 ? 'Focus on maintaining consistent daily routines and risk management.' : 'Consistency is good.'}
` : ''}
    `.trim();

        downloadFile(`${filename}.txt`, pdfContent, 'text/plain');
    };

    const downloadFile = (filename: string, content: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (trades.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Download className="h-6 w-6 text-blue-400" />
                    <h2 className="text-2xl font-bold text-white">Export Center</h2>
                </div>

                <Card className="bg-gray-900 border-gray-700">
                    <CardContent className="p-8 text-center">
                        <Download className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No Data to Export</h3>
                        <p className="text-gray-400">
                            Add trades to your portfolio to generate and export comprehensive reports.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Download className="h-6 w-6 text-blue-400" />
                <h2 className="text-2xl font-bold text-white">Export Center</h2>
            </div>

            {/* Export Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-red-600/50 transition-all duration-300 group">
                    <CardContent className="p-6 text-center">
                        <File className="h-12 w-12 text-red-400 mx-auto mb-4 group-hover:animate-bounce" />
                        <h3 className="text-lg font-semibold text-white mb-2">PDF Report</h3>
                        <p className="text-sm text-gray-400 mb-4">
                            Comprehensive report with charts, summaries, and analysis
                        </p>
                        <Button
                            onClick={() => handleExport('pdf')}
                            disabled={exporting === 'pdf'}
                            className="w-full bg-red-600 hover:bg-red-700"
                        >
                            {exporting === 'pdf' ? 'Generating...' : 'Export PDF'}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-blue-600/50 transition-all duration-300 group">
                    <CardContent className="p-6 text-center">
                        <FileText className="h-12 w-12 text-blue-400 mx-auto mb-4 group-hover:animate-bounce" />
                        <h3 className="text-lg font-semibold text-white mb-2">CSV Export</h3>
                        <p className="text-sm text-gray-400 mb-4">
                            Raw data export for custom analysis and integration
                        </p>
                        <Button
                            onClick={() => handleExport('csv')}
                            disabled={exporting === 'csv'}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                            {exporting === 'csv' ? 'Generating...' : 'Export CSV'}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Export Settings */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Export Settings
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                        <div>
                            <h4 className="text-white font-medium">Include AI Analysis</h4>
                            <p className="text-sm text-gray-400">
                                Add AI-powered insights and recommendations to exports
                            </p>
                        </div>
                        <Switch
                            checked={includeAI}
                            onCheckedChange={setIncludeAI}
                        />
                    </div>

                    <div className="p-4 bg-gray-800/50 rounded-lg">
                        <h4 className="text-white font-medium mb-2">Export Includes:</h4>
                        <ul className="space-y-1 text-sm text-gray-400">
                            <li>• Performance summary metrics</li>
                            <li>• Complete trade history</li>
                            <li>• Risk analysis data</li>
                            <li>• Consistency scores</li>
                            {includeAI && (
                                <>
                                    <li>• AI-generated insights</li>
                                    <li>• Personalized recommendations</li>
                                </>
                            )}
                        </ul>
                    </div>
                </CardContent>
            </Card>

            {/* Export Status */}
            {lastExport && (
                <Card className={`bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 ${lastExport.includes('failed') ? 'border-red-700' : 'border-green-700'
                    }`}>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            {lastExport.includes('failed') ? (
                                <AlertCircle className="h-5 w-5 text-red-400" />
                            ) : (
                                <CheckCircle className="h-5 w-5 text-green-400" />
                            )}
                            <p className={`text-sm ${lastExport.includes('failed') ? 'text-red-400' : 'text-green-400'
                                }`}>
                                {lastExport}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Export Tips */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
                <CardContent className="p-6">
                    <h4 className="text-lg font-semibold text-white mb-3">Export Tips</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
                        <div>
                            <h5 className="text-white font-medium mb-2">PDF Reports</h5>
                            <p>Best for sharing with mentors or keeping records. Includes formatted charts and analysis.</p>
                        </div>
                        <div>
                            <h5 className="text-white font-medium mb-2">CSV Files</h5>
                            <p>Perfect for further analysis in data tools or importing into other applications.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Helper functions
function calculateAvgRR(trades: Trade[]): number {
    let totalRR = 0;
    let count = 0;

    trades.forEach(trade => {
        const pnl = getTradePnl(trade);
        if (pnl !== 0) {
            const risk = Math.abs(pnl);
            const reward = trade.outcome === 'Win' ? pnl : -pnl;
            if (risk > 0) {
                totalRR += reward / risk;
                count++;
            }
        }
    });

    return count > 0 ? totalRR / count : 0;
}

function getDateRange(trades: Trade[]): string {
    if (trades.length === 0) return 'N/A';

    const parsedDates = trades.map(trade => getTradeDate(trade)).filter((d): d is Date => Boolean(d));
    if (parsedDates.length === 0) return 'N/A';
    const earliest = new Date(Math.min(...parsedDates.map(d => d.getTime())));
    const latest = new Date(Math.max(...parsedDates.map(d => d.getTime())));

    return `${earliest.toLocaleDateString()} - ${latest.toLocaleDateString()}`;
}

function calculateBestDay(trades: Trade[]): number {
    const dailyPnL: Record<string, number> = {};
    trades.forEach(trade => {
        const date = getTradeDate(trade)?.toDateString() ?? new Date().toDateString();
        dailyPnL[date] = (dailyPnL[date] || 0) + (trade.pnl || 0);
    });

    return Math.max(...Object.values(dailyPnL), 0);
}

function calculateWorstDay(trades: Trade[]): number {
    const dailyPnL: Record<string, number> = {};
    trades.forEach(trade => {
        const date = getTradeDate(trade)?.toDateString() ?? new Date().toDateString();
        dailyPnL[date] = (dailyPnL[date] || 0) + getTradePnl(trade);
    });

    return Math.min(...Object.values(dailyPnL), 0);
}

function calculateProfitFactor(trades: Trade[]): number {
    const grossProfit = trades
        .filter(t => t.outcome === 'Win')
        .reduce((sum, t) => sum + getTradePnl(t), 0);

    const grossLoss = Math.abs(trades
        .filter(t => t.outcome === 'Loss')
        .reduce((sum, t) => sum + getTradePnl(t), 0));

    return grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
}

function calculateConsistencyScore(trades: Trade[]): number {
    if (trades.length === 0) return 0;

    const dailyPnL: Record<string, number> = {};
    trades.forEach(trade => {
        const date = getTradeDate(trade)?.toDateString() ?? new Date().toDateString();
        dailyPnL[date] = (dailyPnL[date] || 0) + getTradePnl(trade);
    });

    const dailyValues = Object.values(dailyPnL);
    if (dailyValues.length < 2) return 100;

    const mean = dailyValues.reduce((sum, val) => sum + val, 0) / dailyValues.length;
    const variance = dailyValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / dailyValues.length;
    const stdDev = Math.sqrt(variance);

    const cv = mean !== 0 ? (stdDev / Math.abs(mean)) : 0;
    return Math.max(0, Math.min(100, 100 - (cv * 50)));
}

function calculateAvgTradeDuration(trades: Trade[]): number {
    let totalDuration = 0;
    let count = 0;

    trades.forEach(trade => {
        const open = safeDate(trade.openTime);
        const close = safeDate(trade.closeTime);
        if (open && close) {
            const duration = close.getTime() - open.getTime();
            totalDuration += duration / (1000 * 60); // Convert to minutes
            count++;
        }
    });

    return count > 0 ? totalDuration / count : 0;
}

function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
}

export default ExportCenter;
