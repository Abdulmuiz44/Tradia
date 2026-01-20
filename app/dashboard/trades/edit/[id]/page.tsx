"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import LayoutClient from "@/components/LayoutClient";
import { UserProvider } from "@/context/UserContext";
import { useNotification } from "@/context/NotificationContext";
import Spinner from "@/components/ui/spinner";
import { ArrowLeft, Trash2 } from "lucide-react";
import EditTradeForm from "@/components/forms/EditTradeForm";
import type { Trade } from "@/types/trade";

function EditTradeContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams() || {};
  const { notify } = useNotification();
  const tradeId = (params as any)?.id as string;
  const supabase = createClientComponentClient();

  const [trade, setTrade] = useState<Trade | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch trade by ID
  useEffect(() => {
    if (!tradeId) return;

    const fetchTrade = async () => {
      try {
        const response = await fetch(`/api/trades/${tradeId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch trade");
        }
        const data = await response.json();
        setTrade(data);
      } catch (error) {
        notify({
          variant: "destructive",
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load trade",
        });
        router.push("/dashboard/trade-history");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrade();
  }, [tradeId, router, notify]);

  // Handle screenshot upload to Supabase Storage
  const handleUploadScreenshot = useCallback(async (file: File, type: 'before' | 'after'): Promise<string> => {
    if (!session?.user?.id) {
      throw new Error("You must be logged in to upload screenshots");
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const fileName = `${session.user.id}/${timestamp}_${randomId}_${type}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('trade-screenshots')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Screenshot upload error:', error);
      if (error.message.includes('Bucket not found') || error.message.includes('not found')) {
        throw new Error("Screenshot storage is not configured. Please contact support.");
      }
      throw new Error(`Failed to upload screenshot: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('trade-screenshots')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }, [session?.user?.id, supabase]);

  const handleUpdateTrade = async (updatedData: Partial<Trade>) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/trades/${tradeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update trade");
      }

      notify({
        variant: "success",
        title: "Trade updated",
        description: `Trade for ${updatedData.symbol} has been saved.`,
      });

      setTimeout(() => router.push("/dashboard/trade-history"), 500);
    } catch (error) {
      notify({
        variant: "destructive",
        title: "Error updating trade",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTrade = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/trades/${tradeId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete trade");
      }

      notify({
        variant: "success",
        title: "Trade deleted",
        description: "The trade has been removed from your history.",
      });

      router.push("/dashboard/trade-history");
    } catch (error) {
      notify({
        variant: "destructive",
        title: "Error deleting trade",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  if (status === "loading" || isLoading) {
    return <Spinner />;
  }

  if (!session) {
    router.push("/login");
    return <Spinner />;
  }

  if (!trade) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0D1117] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold dark:text-white mb-2">Trade not found</h2>
          <button
            onClick={() => router.push("/dashboard/trade-history")}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Go back to trade history
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0D1117]">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold dark:text-white">Edit Trade</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                {trade.symbol} • {trade.direction} • ID: {trade.id?.slice(0, 8)}...
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-3 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg transition-colors"
            disabled={isSaving}
            title="Delete this trade"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-[#161B22] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <EditTradeForm
            trade={trade}
            onSubmit={handleUpdateTrade}
            isLoading={isSaving}
            onUploadScreenshot={handleUploadScreenshot}
          />
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            💡 Editing Tips
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <li>• All your previously entered data is pre-filled in the form</li>
            <li>• Update the RR by modifying entry, stop loss, or take profit prices</li>
            <li>• Add or replace screenshots to document your trade setup and result</li>
          </ul>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#161B22] rounded-lg p-6 max-w-md">
            <h2 className="text-xl font-bold dark:text-white mb-4">Delete Trade?</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This action cannot be undone. The trade will be permanently removed from your history.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTrade}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditTradePage() {
  return (
    <LayoutClient>
      <UserProvider>
        <EditTradeContent />
      </UserProvider>
    </LayoutClient>
  );
}
