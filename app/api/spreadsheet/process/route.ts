// app/api/spreadsheet/process/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { Spreadsheet, SpreadsheetCommand } from '@/types/spreadsheet';

/**
 * Process natural language spreadsheet commands via TERA
 * Converts user intent into spreadsheet operations
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { spreadsheet, command, naturalLanguage } = await req.json();

    if (!spreadsheet || !command) {
      return NextResponse.json({ error: 'Missing spreadsheet or command' }, { status: 400 });
    }

    // Parse and execute command
    const updatedSpreadsheet = processCommand(spreadsheet, command);

    if (!updatedSpreadsheet) {
      return NextResponse.json({ error: 'Invalid command' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      spreadsheet: updatedSpreadsheet,
      message: generateCommandResponse(command, naturalLanguage),
    });
  } catch (error) {
    console.error('Error processing spreadsheet command:', error);
    return NextResponse.json({ error: 'Failed to process command' }, { status: 500 });
  }
}

function processCommand(
  spreadsheet: Spreadsheet,
  command: SpreadsheetCommand
): Spreadsheet | null {
  try {
    switch (command.action) {
      case 'add-row':
        return addRowToSpreadsheet(spreadsheet);

      case 'delete-row':
        if (!command.target?.rowId) return null;
        return deleteRowFromSpreadsheet(spreadsheet, command.target.rowId);

      case 'add-column':
        if (!command.columnName) return null;
        return addColumnToSpreadsheet(spreadsheet, command.columnName, command.columnType || 'text');

      case 'delete-column':
        if (!command.target?.columnId) return null;
        return deleteColumnFromSpreadsheet(spreadsheet, command.target.columnId);

      case 'update-cell':
        if (!command.target?.rowId || !command.target?.columnId || command.value === undefined)
          return null;
        return updateCellInSpreadsheet(spreadsheet, command.target.rowId, command.target.columnId, command.value);

      case 'export':
        return spreadsheet; // Export is handled separately

      default:
        return null;
    }
  } catch (error) {
    console.error('Error processing command:', error);
    return null;
  }
}

function addRowToSpreadsheet(spreadsheet: Spreadsheet): Spreadsheet {
  const newRowId = `row_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const newCells = spreadsheet.columns.map((col) => ({
    id: `cell_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    columnId: col.id,
    rowId: newRowId,
    value: null,
    type: col.type,
  }));

  const newRow = {
    id: newRowId,
    cells: newCells,
    position: spreadsheet.rows.length,
  };

  return {
    ...spreadsheet,
    rows: [...spreadsheet.rows, newRow],
    metadata: {
      ...spreadsheet.metadata,
      rowCount: spreadsheet.rows.length + 1,
      totalCells: (spreadsheet.rows.length + 1) * spreadsheet.columns.length,
      lastModified: new Date(),
    },
    updatedAt: new Date(),
  };
}

function deleteRowFromSpreadsheet(spreadsheet: Spreadsheet, rowId: string): Spreadsheet {
  const updatedRows = spreadsheet.rows.filter((row) => row.id !== rowId);

  return {
    ...spreadsheet,
    rows: updatedRows,
    metadata: {
      ...spreadsheet.metadata,
      rowCount: updatedRows.length,
      totalCells: updatedRows.length * spreadsheet.columns.length,
      lastModified: new Date(),
    },
    updatedAt: new Date(),
  };
}

function addColumnToSpreadsheet(
  spreadsheet: Spreadsheet,
  columnName: string,
  columnType: string
): Spreadsheet {
  const newColumnId = `col_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const newColumn = {
    id: newColumnId,
    name: columnName,
    type: columnType as any,
    position: spreadsheet.columns.length,
    width: 150,
    visible: true,
    sortable: true,
    filterable: true,
  };

  const updatedRows = spreadsheet.rows.map((row) => ({
    ...row,
    cells: [
      ...row.cells,
      {
        id: `cell_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        columnId: newColumnId,
        rowId: row.id,
        value: null,
        type: columnType,
      },
    ],
  }));

  return {
    ...spreadsheet,
    columns: [...spreadsheet.columns, newColumn],
    rows: updatedRows,
    metadata: {
      ...spreadsheet.metadata,
      columnCount: spreadsheet.columns.length + 1,
      totalCells: updatedRows.length * (spreadsheet.columns.length + 1),
      lastModified: new Date(),
    },
    updatedAt: new Date(),
  };
}

function deleteColumnFromSpreadsheet(spreadsheet: Spreadsheet, columnId: string): Spreadsheet {
  const updatedColumns = spreadsheet.columns.filter((col) => col.id !== columnId);
  const updatedRows = spreadsheet.rows.map((row) => ({
    ...row,
    cells: row.cells.filter((cell) => cell.columnId !== columnId),
  }));

  return {
    ...spreadsheet,
    columns: updatedColumns,
    rows: updatedRows,
    metadata: {
      ...spreadsheet.metadata,
      columnCount: updatedColumns.length,
      totalCells: updatedRows.length * updatedColumns.length,
      lastModified: new Date(),
    },
    updatedAt: new Date(),
  };
}

function updateCellInSpreadsheet(
  spreadsheet: Spreadsheet,
  rowId: string,
  columnId: string,
  value: any
): Spreadsheet {
  const updatedRows = spreadsheet.rows.map((row) => {
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
    ...spreadsheet,
    rows: updatedRows,
    metadata: {
      ...spreadsheet.metadata,
      lastModified: new Date(),
    },
    updatedAt: new Date(),
  };
}

function generateCommandResponse(command: SpreadsheetCommand, naturalLanguage?: string): string {
  switch (command.action) {
    case 'add-row':
      return 'Added a new row to the spreadsheet.';
    case 'delete-row':
      return 'Deleted the row from the spreadsheet.';
    case 'add-column':
      return `Added a new column "${command.columnName}" to the spreadsheet.`;
    case 'delete-column':
      return 'Deleted the column from the spreadsheet.';
    case 'update-cell':
      return `Updated cell value to "${command.value}".`;
    case 'export':
      return `Exported spreadsheet as ${command.format || 'CSV'}.`;
    default:
      return 'Command executed successfully.';
  }
}
