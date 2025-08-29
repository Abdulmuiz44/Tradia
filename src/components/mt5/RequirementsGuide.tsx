// src/components/mt5/RequirementsGuide.tsx
"use client";

import React, { useState } from "react";
import { MT5Requirements } from "@/lib/mt5-integration";
import {
  CheckCircle,
  AlertCircle,
  Info,
  ExternalLink,
  Download,
  Settings,
  Wifi,
  Shield,
  Monitor,
  Globe
} from "lucide-react";

interface RequirementsGuideProps {
  requirements: MT5Requirements[];
  onClose?: () => void;
  className?: string;
}

export function RequirementsGuide({ requirements, onClose, className = "" }: RequirementsGuideProps) {
  const [expandedReq, setExpandedReq] = useState<string | null>(null);

  const getRequirementIcon = (title: string) => {
    switch (title) {
      case 'MT5 Terminal':
        return <Monitor className="w-5 h-5 text-blue-500" />;
      case 'Server Address':
        return <Globe className="w-5 h-5 text-green-500" />;
      case 'Account Login':
        return <Shield className="w-5 h-5 text-purple-500" />;
      case 'Password':
        return <Shield className="w-5 h-5 text-red-500" />;
      case 'Network Connection':
        return <Wifi className="w-5 h-5 text-cyan-500" />;
      case 'MT5 API Access':
        return <Settings className="w-5 h-5 text-orange-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getDetailedInstructions = (title: string) => {
    switch (title) {
      case 'MT5 Terminal':
        return {
          steps: [
            "Download MetaTrader 5 from your broker's website",
            "Install the terminal on your computer",
            "Launch MT5 and log in to your account",
            "Keep MT5 running during sync operations"
          ],
          links: [
            { text: "MetaTrader 5 Download", url: "https://www.metatrader5.com/en/download" }
          ]
        };
      case 'Server Address':
        return {
          steps: [
            "Find your broker's MT5 server address",
            "Common formats: BrokerName-MT5, BrokerName-Live, etc.",
            "Check your broker's website or MT5 login screen",
            "Examples: ICMarketsSC-MT5, Pepperstone-Live, etc."
          ],
          links: []
        };
      case 'Account Login':
        return {
          steps: [
            "Use your MT5 account number (not email)",
            "Find it in MT5: Tools → Options → Server",
            "Or check your broker's account dashboard",
            "Should be 5-10 digits long"
          ],
          links: []
        };
      case 'Password':
        return {
          steps: [
            "Use your MT5 investor password (recommended)",
            "Or master password if you have automated trading enabled",
            "Never use your broker login password",
            "Password should be at least 4 characters"
          ],
          links: []
        };
      case 'Network Connection':
        return {
          steps: [
            "Ensure stable internet connection",
            "MT5 requires connection to broker servers",
            "Check your firewall settings",
            "Try connecting to MT5 directly first"
          ],
          links: []
        };
      case 'MT5 API Access':
        return {
          steps: [
            "In MT5: Tools → Options → Expert Advisors",
            "Check 'Allow automated trading'",
            "Check 'Allow DLL imports'",
            "Uncheck 'Disable automated trading when...' options"
          ],
          links: []
        };
      default:
        return { steps: [], links: [] };
    }
  };

  return (
    <div className={`bg-gray-800/50 border border-gray-700 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Info className="w-6 h-6 text-blue-500" />
          <div>
            <h3 className="text-lg font-semibold text-white">MT5 Connection Requirements</h3>
            <p className="text-sm text-gray-400">
              Ensure all requirements are met before connecting your account
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <AlertCircle className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Requirements List */}
      <div className="space-y-4">
        {requirements.map((req) => {
          const isExpanded = expandedReq === req.title;
          const details = getDetailedInstructions(req.title);

          return (
            <div key={req.title} className="border border-gray-600 rounded-lg p-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedReq(isExpanded ? null : req.title)}
              >
                <div className="flex items-center gap-3">
                  {getRequirementIcon(req.title)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{req.title}</span>
                      {req.required && (
                        <span className="px-2 py-1 bg-red-900/50 text-red-300 text-xs rounded">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{req.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-400">
                    {isExpanded ? 'Hide' : 'Show'} details
                  </span>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && details.steps.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <h4 className="text-sm font-medium text-white mb-3">Setup Instructions:</h4>
                  <ol className="space-y-2">
                    {details.steps.map((step, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center mt-0.5">
                          {index + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>

                  {details.links.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-600">
                      <h5 className="text-sm font-medium text-white mb-2">Helpful Links:</h5>
                      <div className="space-y-1">
                        {details.links.map((link, index) => (
                          <a
                            key={index}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {link.text}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Common Issues Section */}
      <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-300 mb-2">Common Issues & Solutions</h4>
            <ul className="text-sm text-yellow-200 space-y-1">
              <li>• <strong>"Failed to fetch"</strong> - Check if MT5 backend is running (port 5000)</li>
              <li>• <strong>"Invalid server"</strong> - Verify server address with your broker</li>
              <li>• <strong>"Login failed"</strong> - Use investor password, not broker password</li>
              <li>• <strong>"API disabled"</strong> - Enable automated trading in MT5 settings</li>
              <li>• <strong>"Network error"</strong> - Check firewall and internet connection</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Account Limits Info */}
      <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-300 mb-2">Account Limits by Plan</h4>
            <div className="grid grid-cols-2 gap-4 text-sm text-blue-200">
              <div>
                <div className="font-medium">Starter (Free)</div>
                <div>1 MT5 Account</div>
              </div>
              <div>
                <div className="font-medium">Pro ($9/mo)</div>
                <div>3 MT5 Accounts</div>
              </div>
              <div>
                <div className="font-medium">Plus ($19/mo)</div>
                <div>5 MT5 Accounts</div>
              </div>
              <div>
                <div className="font-medium">Elite ($39/mo)</div>
                <div>Unlimited Accounts</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => window.open('https://www.metatrader5.com/en/download', '_blank')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Download className="w-4 h-4" />
          Download MT5
        </button>

        <button
          onClick={() => window.open('/pricing', '_blank')}
          className="flex items-center gap-2 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
        >
          <ExternalLink className="w-4 h-4" />
          View Plans
        </button>
      </div>
    </div>
  );
}

export default RequirementsGuide;