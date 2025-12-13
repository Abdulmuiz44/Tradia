// src/hooks/useSpreadsheet.ts
'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Spreadsheet,
  Column,
  Row,
  Cell,
  SpreadsheetOperation,
  SpreadsheetHistory,
  CellType,
} from '@/types/spreadsheet';
import { v4 as uuidv4 } from 'uuid';

export function useSpreadsheet(initialData?: Spreadsheet) {
  const [spreadsheet, setSpreadsheet] = useState<Spreadsheet>(
    initialData || {
      id: uuidv4(),
      name: 'Untitled Spreadsheet',
      userId: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      columns: [],
      rows: [],
      metadata: {
        rowCount: 0,
        columnCount: 0,
        totalCells: 0,
        lastModified: new Date(),
      },
    }
  );

  const historyRef = useRef<SpreadsheetHistory>({
    operations: [],
    currentIndex: -1,
  });

  // Add a column
  const addColumn = useCallback(
    (name: string, type: CellType = 'text', position?: number) => {
      setSpreadsheet((prev) => {
        const newColumn: Column = {
          id: uuidv4(),
          name,
          type,
          position: position ?? prev.columns.length,
          width: 150,
          visible: true,
          sortable: true,
          filterable: true,
        };

        const updatedColumns = [...prev.columns, newColumn].sort((a, b) => a.position - b.position);

        // Add cells for existing rows
        const updatedRows = prev.rows.map((row) => ({
          ...row,
          cells: [
            ...row.cells,
            {
              id: uuidv4(),
              columnId: newColumn.id,
              rowId: row.id,
              value: null,
              type: type as CellType | undefined,
            } as Cell,
          ],
        }));

        return {
          ...prev,
          columns: updatedColumns,
          rows: updatedRows,
          metadata: {
            ...prev.metadata,
            columnCount: updatedColumns.length,
            totalCells: updatedRows.length * updatedColumns.length,
          },
          updatedAt: new Date(),
        };
      });
    },
    []
  );

  // Delete a column
  const deleteColumn = useCallback((columnId: string) => {
    setSpreadsheet((prev) => {
      const updatedColumns = prev.columns.filter((col) => col.id !== columnId);
      const updatedRows = prev.rows.map((row) => ({
        ...row,
        cells: row.cells.filter((cell) => cell.columnId !== columnId),
      }));

      return {
        ...prev,
        columns: updatedColumns,
        rows: updatedRows,
        metadata: {
          ...prev.metadata,
          columnCount: updatedColumns.length,
          totalCells: updatedRows.length * updatedColumns.length,
        },
        updatedAt: new Date(),
      };
    });
  }, []);

  // Add a row
  const addRow = useCallback((position?: number) => {
    setSpreadsheet((prev) => {
      const newRowId = uuidv4();
      const newRow: Row = {
        id: newRowId,
        position: position ?? prev.rows.length,
        cells: prev.columns.map((col) => ({
          id: uuidv4(),
          columnId: col.id,
          rowId: newRowId,
          value: null,
          type: col.type as CellType | undefined,
        } as Cell)),
      };

      const updatedRows = [...prev.rows, newRow].sort((a, b) => a.position - b.position);

      return {
        ...prev,
        rows: updatedRows,
        metadata: {
          ...prev.metadata,
          rowCount: updatedRows.length,
          totalCells: updatedRows.length * prev.columns.length,
        },
        updatedAt: new Date(),
      };
    });
  }, []);

  // Delete a row
  const deleteRow = useCallback((rowId: string) => {
    setSpreadsheet((prev) => {
      const updatedRows = prev.rows.filter((row) => row.id !== rowId);

      return {
        ...prev,
        rows: updatedRows,
        metadata: {
          ...prev.metadata,
          rowCount: updatedRows.length,
          totalCells: updatedRows.length * prev.columns.length,
        },
        updatedAt: new Date(),
      };
    });
  }, []);

  // Update cell value
  const updateCell = useCallback((rowId: string, columnId: string, value: any) => {
    setSpreadsheet((prev) => {
      const updatedRows = prev.rows.map((row) => {
        if (row.id === rowId) {
          return {
            ...row,
            cells: row.cells.map((cell) => {
              if (cell.columnId === columnId) {
                return { ...cell, value };
              }
              return cell;
            }),
          };
        }
        return row;
      });

      return {
        ...prev,
        rows: updatedRows,
        updatedAt: new Date(),
      };
    });
  }, []);

  // Update cell formatting
  const formatCell = useCallback((rowId: string, columnId: string, formatting: any) => {
    setSpreadsheet((prev) => {
      const updatedRows = prev.rows.map((row) => {
        if (row.id === rowId) {
          return {
            ...row,
            cells: row.cells.map((cell) => {
              if (cell.columnId === columnId) {
                return { ...cell, formatting: { ...cell.formatting, ...formatting } };
              }
              return cell;
            }),
          };
        }
        return row;
      });

      return {
        ...prev,
        rows: updatedRows,
        updatedAt: new Date(),
      };
    });
  }, []);

  // Get cell by row and column
  const getCell = useCallback(
    (rowId: string, columnId: string): Cell | undefined => {
      return spreadsheet.rows
        .find((row) => row.id === rowId)
        ?.cells.find((cell) => cell.columnId === columnId);
    },
    [spreadsheet.rows]
  );

  // Get column by ID
  const getColumn = useCallback(
    (columnId: string): Column | undefined => {
      return spreadsheet.columns.find((col) => col.id === columnId);
    },
    [spreadsheet.columns]
  );

  // Import data from array
  const importData = useCallback((data: any[][]) => {
    if (!data.length) return;

    // Create columns from first row
    const headers = data[0];
    const newColumns: Column[] = headers.map((header, index) => ({
      id: uuidv4(),
      name: String(header),
      type: 'text',
      position: index,
      width: 150,
      visible: true,
      sortable: true,
      filterable: true,
    }));

    // Create rows from data
    const newRows: Row[] = data.slice(1).map((rowData, rowIndex) => {
      const newRowId = uuidv4();
      return {
        id: newRowId,
        position: rowIndex,
        cells: newColumns.map((col, colIndex) => ({
          id: uuidv4(),
          columnId: col.id,
          rowId: newRowId,
          value: rowData[colIndex] ?? null,
          type: col.type,
        })),
      };
    });

    setSpreadsheet((prev) => ({
      ...prev,
      columns: newColumns,
      rows: newRows,
      metadata: {
        ...prev.metadata,
        rowCount: newRows.length,
        columnCount: newColumns.length,
        totalCells: newRows.length * newColumns.length,
      },
      updatedAt: new Date(),
    }));
  }, []);

  // Export to CSV
  const exportToCSV = useCallback((): string => {
    const headers = spreadsheet.columns.map((col) => `"${col.name}"`).join(',');
    const rows = spreadsheet.rows
      .map((row) =>
        row.cells.map((cell) => `"${cell.value ?? ''}"`).join(',')
      )
      .join('\n');

    return `${headers}\n${rows}`;
  }, [spreadsheet.columns, spreadsheet.rows]);

  // Export to JSON
  const exportToJSON = useCallback((): string => {
    const data = spreadsheet.rows.map((row) => {
      const obj: Record<string, any> = {};
      row.cells.forEach((cell) => {
        const column = spreadsheet.columns.find((col) => col.id === cell.columnId);
        if (column) {
          obj[column.name] = cell.value;
        }
      });
      return obj;
    });

    return JSON.stringify(data, null, 2);
  }, [spreadsheet.columns, spreadsheet.rows]);

  // Update spreadsheet metadata
  const updateMetadata = useCallback((updates: Partial<Spreadsheet>) => {
    setSpreadsheet((prev) => ({
      ...prev,
      ...updates,
      updatedAt: new Date(),
    }));
  }, []);

  return {
    spreadsheet,
    setSpreadsheet,
    addColumn,
    deleteColumn,
    addRow,
    deleteRow,
    updateCell,
    formatCell,
    getCell,
    getColumn,
    importData,
    exportToCSV,
    exportToJSON,
    updateMetadata,
  };
}
