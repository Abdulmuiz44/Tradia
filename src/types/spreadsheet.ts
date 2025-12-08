// src/types/spreadsheet.ts

export type CellType = 'text' | 'number' | 'date' | 'currency' | 'percent' | 'formula';

export interface Cell {
  id: string;
  columnId: string;
  rowId: string;
  value: any;
  originalValue?: any;
  formula?: string;
  type?: CellType;
  validation?: CellValidation;
  formatting?: CellFormatting;
}

export interface CellValidation {
  type?: 'number' | 'list' | 'date' | 'custom';
  min?: number;
  max?: number;
  allowedValues?: any[];
  errorMessage?: string;
}

export interface CellFormatting {
  backgroundColor?: string;
  textColor?: string;
  bold?: boolean;
  italic?: boolean;
  alignment?: 'left' | 'center' | 'right';
  numberFormat?: string;
}

export interface Column {
  id: string;
  name: string;
  type: CellType;
  width?: number;
  visible?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  position: number;
}

export interface Row {
  id: string;
  cells: Cell[];
  height?: number;
  visible?: boolean;
  position: number;
}

export interface Spreadsheet {
  id: string;
  name: string;
  description?: string;
  userId: string;
  conversationId?: string;
  createdAt: Date;
  updatedAt: Date;
  columns: Column[];
  rows: Row[];
  selectedCell?: { rowId: string; columnId: string };
  metadata: {
    rowCount: number;
    columnCount: number;
    totalCells: number;
    lastModified: Date;
  };
  settings?: SpreadsheetSettings;
}

export interface SpreadsheetSettings {
  freezeRows?: number;
  freezeColumns?: number;
  showGridLines?: boolean;
  showHeaders?: boolean;
  allowSorting?: boolean;
  allowFiltering?: boolean;
  allowEditing?: boolean;
}

export interface SpreadsheetOperation {
  id: string;
  type: 'add-row' | 'delete-row' | 'add-column' | 'delete-column' | 'update-cell' | 'format-cell';
  target: { rowId?: string; columnId?: string };
  previousValue?: any;
  newValue?: any;
  timestamp: Date;
  undoable?: boolean;
}

export interface SpreadsheetHistory {
  operations: SpreadsheetOperation[];
  currentIndex: number;
}

export interface SpreadsheetExport {
  format: 'csv' | 'json' | 'xlsx';
  filename: string;
  data: string;
  mimeType: string;
}

export interface SpreadsheetCommand {
  action: 'add-row' | 'delete-row' | 'update-cell' | 'add-column' | 'delete-column' | 'export';
  target?: {
    rowId?: string;
    columnId?: string;
    row?: number;
    column?: number;
  };
  value?: any;
  columnName?: string;
  columnType?: CellType;
  format?: 'csv' | 'json';
}

export interface SpreadsheetValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}
