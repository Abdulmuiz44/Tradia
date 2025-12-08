// app/api/spreadsheet/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { Spreadsheet } from '@/types/spreadsheet';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { spreadsheet, format = 'csv' } = await req.json();

    if (!spreadsheet) {
      return NextResponse.json({ error: 'Missing spreadsheet' }, { status: 400 });
    }

    let data: string;
    let mimeType: string;
    let filename: string;

    if (format === 'csv') {
      data = spreadsheetToCSV(spreadsheet);
      mimeType = 'text/csv';
      filename = `${spreadsheet.name || 'spreadsheet'}_${Date.now()}.csv`;
    } else if (format === 'json') {
      data = spreadsheetToJSON(spreadsheet);
      mimeType = 'application/json';
      filename = `${spreadsheet.name || 'spreadsheet'}_${Date.now()}.json`;
    } else {
      return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data,
      mimeType,
      filename,
      format,
    });
  } catch (error) {
    console.error('Error exporting spreadsheet:', error);
    return NextResponse.json({ error: 'Failed to export spreadsheet' }, { status: 500 });
  }
}

function spreadsheetToCSV(spreadsheet: Spreadsheet): string {
  const headers = spreadsheet.columns
    .map((col) => escapeCSV(col.name))
    .join(',');

  const rows = spreadsheet.rows
    .map((row) => {
      const cells = row.cells
        .sort((a, b) => {
          const colA = spreadsheet.columns.find((c) => c.id === a.columnId);
          const colB = spreadsheet.columns.find((c) => c.id === b.columnId);
          return (colA?.position || 0) - (colB?.position || 0);
        })
        .map((cell) => escapeCSV(String(cell.value ?? '')))
        .join(',');
      return cells;
    })
    .join('\n');

  return `${headers}\n${rows}`;
}

function spreadsheetToJSON(spreadsheet: Spreadsheet): string {
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
}

function escapeCSV(value: string): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // Escape quotes and wrap in quotes if contains comma, newline, or quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}
