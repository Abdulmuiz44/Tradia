// src/components/spreadsheet/SpreadsheetViewer.tsx
'use client';

import React, { useState } from 'react';
import { Spreadsheet, Cell } from '@/types/spreadsheet';
import { Edit2, Download, Copy, Plus, Trash2 } from 'lucide-react';
import './SpreadsheetViewer.css';

interface SpreadsheetViewerProps {
  spreadsheet: Spreadsheet;
  editable?: boolean;
  onCellChange?: (rowId: string, columnId: string, value: any) => void;
  onAddRow?: () => void;
  onDeleteRow?: (rowId: string) => void;
  onAddColumn?: (name: string) => void;
  onExport?: (format: 'csv' | 'json') => void;
  compact?: boolean;
}

export function SpreadsheetViewer({
  spreadsheet,
  editable = false,
  onCellChange,
  onAddRow,
  onDeleteRow,
  onAddColumn,
  onExport,
  compact = false,
}: SpreadsheetViewerProps) {
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleCellClick = (rowId: string, columnId: string, currentValue: any) => {
    if (editable) {
      setEditingCell({ rowId, columnId });
      setEditValue(String(currentValue ?? ''));
    }
  };

  const handleCellSave = (rowId: string, columnId: string) => {
    if (onCellChange) {
      onCellChange(rowId, columnId, editValue);
    }
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowId: string, columnId: string) => {
    if (e.key === 'Enter') {
      handleCellSave(rowId, columnId);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  if (!spreadsheet.columns.length || !spreadsheet.rows.length) {
    return (
      <div className="spreadsheet-empty">
        <p>No data in spreadsheet</p>
        {onAddColumn && (
          <button onClick={() => onAddColumn('Column 1')} className="btn-primary">
            Add Column
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`spreadsheet-container ${compact ? 'compact' : ''}`}>
      <div className="spreadsheet-toolbar">
        <div className="toolbar-group">
          <h3 className="spreadsheet-title">{spreadsheet.name}</h3>
          <span className="spreadsheet-info">
            {spreadsheet.metadata.rowCount} rows × {spreadsheet.metadata.columnCount} columns
          </span>
        </div>
        <div className="toolbar-actions">
          {onAddRow && (
            <button title="Add Row" onClick={onAddRow} className="btn-icon">
              <Plus size={16} />
            </button>
          )}
          {onExport && (
            <>
              <button title="Export CSV" onClick={() => onExport('csv')} className="btn-icon">
                <Download size={16} />
              </button>
              <button title="Export JSON" onClick={() => onExport('json')} className="btn-icon">
                <Copy size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="spreadsheet-wrapper">
        <table className="spreadsheet-table">
          <thead>
            <tr className="header-row">
              {editable && <th className="action-column"></th>}
              {spreadsheet.columns.map((column) => (
                <th key={column.id} style={{ width: column.width || 150 }} className="header-cell">
                  {column.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {spreadsheet.rows.map((row) => (
              <tr key={row.id} className="data-row">
                {editable && (
                  <td className="action-column">
                    <button
                      onClick={() => onDeleteRow?.(row.id)}
                      className="btn-delete"
                      title="Delete row"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
                {row.cells.map((cell) => (
                  <td
                    key={`${row.id}-${cell.columnId}`}
                    className={`data-cell ${
                      editingCell?.rowId === row.id && editingCell?.columnId === cell.columnId
                        ? 'editing'
                        : ''
                    }`}
                    onClick={() => handleCellClick(row.id, cell.columnId, cell.value)}
                    style={cell.formatting ? getCellStyle(cell.formatting) : {}}
                  >
                    {editingCell?.rowId === row.id && editingCell?.columnId === cell.columnId ? (
                      <input
                        autoFocus
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellSave(row.id, cell.columnId)}
                        onKeyDown={(e) => handleKeyDown(e, row.id, cell.columnId)}
                        className="cell-input"
                      />
                    ) : (
                      <span className="cell-value">
                        {editable && <Edit2 size={12} className="edit-icon" />}
                        {formatCellValue(cell)}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCellValue(cell: Cell): string {
  if (cell.value === null || cell.value === undefined) {
    return '';
  }

  switch (cell.type) {
    case 'currency':
      return `$${Number(cell.value).toFixed(2)}`;
    case 'percent':
      return `${Number(cell.value).toFixed(2)}%`;
    case 'date':
      return new Date(cell.value).toLocaleDateString();
    case 'number':
      return Number(cell.value).toLocaleString();
    default:
      return String(cell.value);
  }
}

function getCellStyle(formatting: any) {
  return {
    backgroundColor: formatting.backgroundColor || 'transparent',
    color: formatting.textColor || 'inherit',
    fontWeight: formatting.bold ? 'bold' : 'normal',
    fontStyle: formatting.italic ? 'italic' : 'normal',
    textAlign: (formatting.alignment || 'left') as any,
  };
}
