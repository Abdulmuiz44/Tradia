// src/components/spreadsheet/SpreadsheetMessage.tsx
'use client';

import React, { useState } from 'react';
import { Spreadsheet } from '@/types/spreadsheet';
import { SpreadsheetViewer } from './SpreadsheetViewer';
import { Download, Copy, Plus, MessageCircle } from 'lucide-react';

interface SpreadsheetMessageProps {
  spreadsheet: Spreadsheet;
  onAddRow?: () => void;
  onDeleteRow?: (rowId: string) => void;
  onAddColumn?: (name: string) => void;
  onUpdateCell?: (rowId: string, columnId: string, value: any) => void;
  onContinueChat?: (message: string) => void;
  editable?: boolean;
  conversationId?: string;
}

export function SpreadsheetMessage({
  spreadsheet,
  onAddRow,
  onDeleteRow,
  onAddColumn,
  onUpdateCell,
  onContinueChat,
  editable = true,
  conversationId,
}: SpreadsheetMessageProps) {
  const [exportLoading, setExportLoading] = useState(false);
  const [promptText, setPromptText] = useState('');

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      setExportLoading(true);

      const response = await fetch('/api/spreadsheet/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheet, format }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Export failed');
      }

      // Create blob and download
      const blob = new Blob([result.data], { type: result.mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Notify user
      if (onContinueChat) {
        onContinueChat(`I've downloaded the spreadsheet as ${format.toUpperCase()}.`);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const handlePrompt = async () => {
    if (!promptText.trim() || !onContinueChat) return;

    onContinueChat(`Update spreadsheet: ${promptText}`);
    setPromptText('');
  };

  return (
    <div className="spreadsheet-message-wrapper">
      <SpreadsheetViewer
        spreadsheet={spreadsheet}
        editable={editable}
        onAddRow={onAddRow}
        onDeleteRow={onDeleteRow}
        onAddColumn={onAddColumn}
        onCellChange={onUpdateCell}
        onExport={handleExport}
      />

      <div className="spreadsheet-actions">
        <div className="action-buttons">
          <button
            onClick={() => handleExport('csv')}
            disabled={exportLoading}
            className="btn-action"
            title="Download as CSV"
          >
            <Download size={16} />
            CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            disabled={exportLoading}
            className="btn-action"
            title="Download as JSON"
          >
            <Copy size={16} />
            JSON
          </button>
        </div>

        {onContinueChat && (
          <div className="continue-chat-section">
            <p className="section-label">Ask TERA to modify:</p>
            <div className="prompt-input-group">
              <input
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePrompt();
                  }
                }}
                placeholder="e.g., 'Add a column for Notes' or 'Change row 2 to...'  "
                className="prompt-input"
              />
              <button
                onClick={handlePrompt}
                disabled={!promptText.trim()}
                className="btn-prompt"
                title="Send to TERA"
              >
                <MessageCircle size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
