"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTrade } from "@/context/TradeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Database,
  Cloud,
  HardDrive,
  Info
} from "lucide-react";

export default function MigrationDebugPanel() {
  const { data: session } = useSession();
  const { 
    trades, 
    needsMigration, 
    migrateLocalTrades, 
    migrationLoading,
    refreshTrades 
  } = useTrade();
  
  const [localTradesCount, setLocalTradesCount] = useState(0);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    // Check localStorage for local trades
    try {
      const stored = localStorage.getItem("trade-history");
      if (stored) {
        const parsed = JSON.parse(stored);
        setLocalTradesCount(Array.isArray(parsed) ? parsed.length : 0);
      } else {
        setLocalTradesCount(0);
      }
    } catch {
      setLocalTradesCount(0);
    }
  }, [needsMigration]);

  const testMigration = async () => {
    setTestResult(null);
    setTestError(null);
    
    try {
      const result = await migrateLocalTrades();
      setTestResult(`Migration successful! Migrated ${result.migratedCount} trades.`);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Migration failed");
    }
  };

  const testApiEndpoint = async () => {
    setTestResult(null);
    setTestError(null);
    
    try {
      const response = await fetch("/api/trades/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trades: [{
            symbol: "TEST",
            direction: "Buy",
            openTime: new Date().toISOString(),
            pnl: 10,
            outcome: "Win"
          }],
          source: "debug-test"
        }),
        credentials: "include"
      });

      const data = await response.json();
      
      if (response.ok) {
        setTestResult(`API test successful: ${JSON.stringify(data, null, 2)}`);
      } else {
        setTestError(`API test failed (${response.status}): ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setTestError(`API test error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Migration Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Local Storage</span>
            </div>
            <p className="text-2xl font-bold">{localTradesCount}</p>
            <p className="text-xs text-muted-foreground">trades in localStorage</p>
          </div>

          <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <Cloud className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Cloud Database</span>
            </div>
            <p className="text-2xl font-bold">{trades.length}</p>
            <p className="text-xs text-muted-foreground">trades in Supabase</p>
          </div>

          <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">Migration Status</span>
            </div>
            <Badge variant={needsMigration ? "destructive" : "default"}>
              {needsMigration ? "Needs Migration" : "Up to Date"}
            </Badge>
          </div>
        </div>

        {/* Session Info */}
        <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Session Information
          </h3>
          <div className="space-y-1 text-xs font-mono">
            <p>User ID: {session?.user?.id || "Not found"}</p>
            <p>Email: {session?.user?.email || "Not found"}</p>
            <p>Session Status: {session ? "Active" : "No session"}</p>
          </div>
        </div>

        {/* Test Results */}
        {testResult && (
          <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900/20 border border-green-500">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Success</p>
                <pre className="text-xs mt-1 whitespace-pre-wrap">{testResult}</pre>
              </div>
            </div>
          </div>
        )}

        {testError && (
          <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/20 border border-red-500">
            <div className="flex items-start gap-2">
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">Error</p>
                <pre className="text-xs mt-1 whitespace-pre-wrap">{testError}</pre>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={testMigration}
            disabled={migrationLoading || !needsMigration}
            variant="default"
          >
            {migrationLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Migrating...
              </>
            ) : (
              <>
                <Cloud className="w-4 h-4 mr-2" />
                Test Migration
              </>
            )}
          </Button>

          <Button
            onClick={testApiEndpoint}
            variant="outline"
          >
            <Database className="w-4 h-4 mr-2" />
            Test API Endpoint
          </Button>

          <Button
            onClick={() => refreshTrades()}
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Trades
          </Button>

          <Button
            onClick={() => {
              setTestResult(null);
              setTestError(null);
            }}
            variant="ghost"
          >
            Clear Results
          </Button>
        </div>

        {/* Instructions */}
        <div className="p-4 rounded-lg bg-blue-100 dark:bg-blue-900/20 border border-blue-500">
          <h3 className="text-sm font-medium mb-2 text-blue-700 dark:text-blue-300">
            How to Test Migration
          </h3>
          <ol className="text-xs space-y-1 text-blue-600 dark:text-blue-400 list-decimal list-inside">
            <li>Check if you have local trades in localStorage</li>
            <li>Verify your session is active (User ID should be present)</li>
            <li>Click "Test API Endpoint" to verify authentication works</li>
            <li>If API test passes, click "Test Migration" to migrate trades</li>
            <li>Check the results and verify trades appear in cloud database</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}