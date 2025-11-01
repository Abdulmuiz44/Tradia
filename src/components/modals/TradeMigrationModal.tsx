"use client";

import { useState } from "react";
import { ShieldCheck, CloudUpload, Lock, CheckCircle } from "lucide-react";
import { useTrade } from "@/context/TradeContext";

type Props = {
  open: boolean;
  onClose: () => void;
  onMigrated?: () => void;
};

export default function TradeMigrationModal({ open, onClose, onMigrated }: Props) {
  const { migrateLocalTrades, migrationLoading } = useTrade();
  const [error, setError] = useState<string | null>(null);
  const [migrationSuccess, setMigrationSuccess] = useState(false);
  const [migratedCount, setMigratedCount] = useState(0);

  if (!open) return null;

  const handleMigrate = async () => {
    setError(null);
    setMigrationSuccess(false);
    
    try {
      console.log("Starting migration from modal...");
      const result = await migrateLocalTrades();
      console.log("Migration completed:", result);
      
      setMigratedCount(result.migratedCount);
      setMigrationSuccess(true);
      onMigrated?.();
      
      // Auto-close after 3 seconds on success
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (err) {
      console.error("Migration error in modal:", err);
      let message = "Migration failed. Please try again.";
      
      if (err instanceof Error) {
        message = err.message;
        
        // Don't add duplicate hints if already in message
        if (!message.includes("refresh") && !message.includes("sign in")) {
          if (message.includes("Unauthorized") || message.includes("Authentication")) {
            message = "Authentication required. Please refresh the page and sign in again.";
          } else if (message.includes("Network") || message.includes("fetch") || message.includes("Failed to fetch")) {
            message = "Network error. Please check your internet connection and try again.";
          } else if (message.includes("Server error")) {
            message = "Server error. Please try again in a few moments.";
          }
        }
      }
      
      setError(message);
    }
  };

  const handleClose = () => {
    setMigrationSuccess(false);
    setMigratedCount(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !migrationLoading && handleClose()} />
      <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[#0D1117] p-6 text-white shadow-2xl">
        <div className="flex items-center gap-3">
          {migrationSuccess ? (
            <>
              <CheckCircle className="h-6 w-6 text-emerald-400" />
              <h2 className="text-xl font-semibold">Migration Complete!</h2>
            </>
          ) : (
            <>
              <CloudUpload className="h-6 w-6 text-blue-400" />
              <h2 className="text-xl font-semibold">Secure your trade history</h2>
            </>
          )}
        </div>

        <p className="mt-3 text-sm text-gray-300">
          {migrationSuccess ? (
            migratedCount > 0 ? (
              `Successfully migrated ${migratedCount} trade${migratedCount !== 1 ? 's' : ''} to the secure cloud. Your data is now backed up and accessible everywhere.`
            ) : (
              "Migration completed. Your trades are now synced with the cloud."
            )
          ) : (
            "We now store trades in Supabase with per-user encryption keys. Migrate your existing local trades to keep them backed up, encrypted, and accessible across devices."
          )}
        </p>

        <ul className="mt-4 space-y-2 text-sm text-gray-200">
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-400" />
            <span>End-to-end encryption keeps journal notes and emotions private.</span>
          </li>
          <li className="flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 text-sky-400" />
            <span>No duplicates — we merge matching trades automatically.</span>
          </li>
          <li className="flex items-start gap-2">
            <CloudUpload className="mt-0.5 h-4 w-4 text-blue-400" />
            <span>Future manual and CSV imports save directly to the secure cloud.</span>
          </li>
        </ul>

        {error && (
          <div className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2">
            <p className="text-sm font-medium text-red-200">Error</p>
            <p className="text-sm text-red-300 mt-1">{error}</p>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {!migrationSuccess && (
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleClose}
              disabled={migrationLoading}
            >
              Not now
            </button>
          )}
          {migrationSuccess ? (
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium transition hover:bg-emerald-500"
              onClick={handleClose}
            >
              <CheckCircle className="w-4 h-4" />
              Done
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleMigrate}
              disabled={migrationLoading}
            >
              {migrationLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4" />
                  Migrate now
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}