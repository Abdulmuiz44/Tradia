"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useAccount } from "@/context/AccountContext";
import { useNotification } from "@/context/NotificationContext";
import AccountForm from "@/components/accounts/AccountForm";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/spinner";
import type { UpdateAccountPayload } from "@/types/account";

function EditAccountContent() {
  const router = useRouter();
  const params = useParams();
  const accountId = (params?.id || "") as string;
  const { accounts, updateAccount, deleteAccount, loading } = useAccount();
  const { notify } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [account, setAccount] = useState(accountId ? accounts.find((a) => a.id === accountId) : undefined);



  useEffect(() => {
    const foundAccount = accounts.find((a) => a.id === accountId);
    setAccount(foundAccount);
    if (!foundAccount && !loading) {
      notify({
        variant: "destructive",
        title: "Account Not Found",
        description: "The account you're looking for doesn't exist.",
      });
      router.push("/dashboard/accounts");
    }
  }, [accountId, accounts, loading, router, notify]);

  const handleUpdateAccount = async (payload: UpdateAccountPayload) => {
    if (!account) return;
    setIsSubmitting(true);
    try {
      await updateAccount(account.id, payload);
      notify({
        variant: "success",
        title: "Account Updated",
        description: `Trading account has been updated successfully.`,
      });
      setTimeout(() => router.push("/dashboard/accounts"), 500);
    } catch (error) {
      console.error("Error updating account:", error);
      notify({
        variant: "destructive",
        title: "Error updating account",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!account) return;
    try {
      await deleteAccount(account.id);
      notify({
        variant: "success",
        title: "Account Deleted",
        description: "The account has been deleted successfully.",
      });
      setTimeout(() => router.push("/dashboard/accounts"), 500);
    } catch (error) {
      console.error("Error deleting account:", error);
      notify({
        variant: "destructive",
        title: "Error deleting account",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  if (loading) {
    return <Spinner />;
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0D1117] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold dark:text-white mb-2">Account Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The account you&apos;re looking for doesn&apos;t exist.
          </p>
          <button
            onClick={() => router.push("/dashboard/accounts")}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
          >
            Back to Accounts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0D1117]">
      <div className="max-w-2xl mx-auto p-6">
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
              <h1 className="text-3xl font-bold dark:text-white">Edit Trading Account</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                {account.name}
              </p>
            </div>
          </div>
          {accounts.length > 1 && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded-lg transition"
              title="Delete this account"
            >
              <Trash2 size={18} />
              Delete
            </button>
          )}
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-[#161B22] rounded-lg border border-gray-200 dark:border-gray-700 p-8">
          <AccountForm
            initialData={{
              name: account.name,
              account_size: account.account_size,
              currency: account.currency,
              platform: account.platform,
              broker: account.broker || undefined,
              mode: account.mode,
            }}
            onSubmit={handleUpdateAccount}
            onCancel={() => router.back()}
            isLoading={isSubmitting || loading}
            isEdit={true}
          />
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            💡 Account Information
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <li>• Created: {new Date(account.created_at).toLocaleDateString()}</li>
            <li>• Initial Balance: ${account.initial_balance.toFixed(2)}</li>
            <li>• Current Size: ${account.account_size.toFixed(2)}</li>
            <li>• Status: {account.is_active ? "Active" : "Inactive"}</li>
          </ul>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account"
        description="Are you sure you want to delete this account? All associated trades will be kept but unassociated. This action cannot be undone."
        size="sm"
      >
        <div className="mt-4 p-3 bg-[#0f1319] rounded">
          <p className="font-semibold">{account.name}</p>
          <p className="text-sm text-gray-400">
            ${account.account_size.toFixed(2)} {account.currency}
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 mt-4">
          <button
            onClick={() => setShowDeleteModal(false)}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/15"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setShowDeleteModal(false);
              handleDeleteAccount();
            }}
            className="px-4 py-2 rounded bg-red-600 hover:bg-red-500"
          >
            Delete Account
          </button>
        </div>
      </Modal>
    </div>
  );
}

// Export directly as the providers are global in app/layout.tsx
export default function EditAccountPage() {
  return <EditAccountContent />;
}
