// src/components/mt5/CredentialManager.tsx
"use client";

import React, { useState, useEffect } from "react";
import { StoredCredential, MT5Credentials } from "@/types/mt5";
import { credentialStorage } from "@/lib/credential-storage";
import { encryptionService } from "@/lib/encryption";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Key,
  Server,
  User,
  MoreVertical,
  Copy,
  RefreshCw
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CredentialManagerProps {
  onCredentialSelect?: (credential: StoredCredential) => void;
  selectedCredentialId?: string;
  className?: string;
}

interface CredentialFormData {
  server: string;
  login: string;
  investorPassword: string;
  name: string;
}

export default function CredentialManager({
  onCredentialSelect,
  selectedCredentialId,
  className = ""
}: CredentialManagerProps) {
  const [credentials, setCredentials] = useState<StoredCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCredential, setEditingCredential] = useState<StoredCredential | null>(null);
  const [formData, setFormData] = useState<CredentialFormData>({
    server: "",
    login: "",
    investorPassword: "",
    name: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load credentials on mount
  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would call the API
      // For now, we'll show a placeholder
      setCredentials([]);
    } catch (err) {
      console.error("Failed to load credentials:", err);
      setError("Failed to load credentials");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      server: "",
      login: "",
      investorPassword: "",
      name: ""
    });
    setEditingCredential(null);
    setShowForm(false);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (editingCredential) {
        // Update existing credential
        const response = await fetch(`/api/mt5/credentials/${editingCredential.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            investorPassword: formData.investorPassword || undefined
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Failed to update credential");
        }

        setSuccess("Credential updated successfully");
      } else {
        // Create new credential
        const response = await fetch("/api/mt5/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Failed to create credential");
        }

        setSuccess("Credential created successfully");
      }

      await loadCredentials();
      setTimeout(() => resetForm(), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (credential: StoredCredential) => {
    setEditingCredential(credential);
    setFormData({
      server: credential.server,
      login: credential.login,
      investorPassword: "", // Don't show existing password
      name: credential.name
    });
    setShowForm(true);
  };

  const handleDelete = async (credential: StoredCredential) => {
    if (!confirm(`Are you sure you want to delete the credential for ${credential.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/mt5/credentials/${credential.id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete credential");
      }

      setSuccess("Credential deleted successfully");
      await loadCredentials();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete credential");
    }
  };

  const handleCopyLogin = (login: string) => {
    navigator.clipboard.writeText(login);
    setSuccess("Login copied to clipboard");
    setTimeout(() => setSuccess(null), 2000);
  };

  const getSecurityIcon = (level: string) => {
    switch (level) {
      case 'high':
        return <Shield className="w-4 h-4 text-green-500" />;
      case 'medium':
        return <Shield className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Shield className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSecurityColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'border-green-200 bg-green-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading credentials...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">MT5 Credentials</h2>
          <p className="text-sm text-gray-600">Manage your stored MT5 account credentials securely</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Add Credential
        </button>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm text-green-700">{success}</span>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {editingCredential ? 'Edit Credential' : 'Add New Credential'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Server *
                </label>
                <input
                  type="text"
                  value={formData.server}
                  onChange={(e) => setFormData(prev => ({ ...prev, server: e.target.value }))}
                  placeholder="e.g. ICMarketsSC-MT5"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                  disabled={!!editingCredential}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Login *
                </label>
                <input
                  type="text"
                  value={formData.login}
                  onChange={(e) => setFormData(prev => ({ ...prev, login: e.target.value }))}
                  placeholder="Account number"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                  disabled={!!editingCredential}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Investor Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.investorPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, investorPassword: e.target.value }))}
                  placeholder={editingCredential ? "Leave empty to keep current password" : "Enter investor password"}
                  className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required={!editingCredential}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Live Account, Demo Account"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {editingCredential ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    {editingCredential ? 'Update Credential' : 'Create Credential'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Credentials List */}
      {credentials.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Credentials Stored</h3>
          <p className="text-gray-600 mb-4">
            Add your first MT5 credential to get started with secure account management.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Add Your First Credential
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {credentials.map((credential) => (
            <div
              key={credential.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedCredentialId === credential.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : `${getSecurityColor(credential.securityLevel)} hover:shadow-md`
              }`}
              onClick={() => onCredentialSelect?.(credential)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getSecurityIcon(credential.securityLevel)}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{credential.name}</h4>
                        {credential.rotationRequired && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                            Rotation Required
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <div className="flex items-center gap-1">
                          <Server className="w-3 h-3" />
                          {credential.server}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {credential.login}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {credential.lastUsedAt
                            ? `Last used ${credential.lastUsedAt.toLocaleDateString()}`
                            : 'Never used'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyLogin(credential.login);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="Copy login"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleEdit(credential)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(credential)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900">Security Information</h4>
            <p className="text-sm text-blue-700 mt-1">
              All credentials are encrypted using AES-256-GCM and stored securely.
              Passwords are never displayed in plain text and are only decrypted when needed for MT5 connections.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}