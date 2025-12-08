# TERA Spreadsheet Integration Guide

## Overview
This guide explains how to use the new spreadsheet functionality integrated with TERA AI assistant. Users can now create, edit, and manipulate spreadsheets entirely within the TERA chat interface.

## Features

### 1. **Create Spreadsheets**
- Create new spreadsheets with custom columns and rows
- Define column types (text, number, date, currency, percent)
- Save spreadsheets in memory during conversation

### 2. **Edit Data**
- Click cells to edit values inline
- Add new rows and columns
- Delete rows and columns
- Undo/redo operations (future)

### 3. **TERA Commands**
- Ask TERA to modify spreadsheet via natural language
- Examples:
  - "Add a column for 'Strategy'"
  - "Change cell B2 to 'Scalping'"
  - "Delete row 3"
  - "Add 5 new rows"

### 4. **Export & Download**
- Export as CSV for Excel compatibility
- Export as JSON for web applications
- Download files for future use
- Maintain all formatting and data

### 5. **Mobile Responsive**
- Full functionality on mobile devices
- Touch-friendly interface
- Scrollable tables on small screens

## How to Use

### Quick Start

1. **Tell TERA to create a spreadsheet:**
   ```
   "Create a spreadsheet for my trading data with columns: Date, Symbol, EntryPrice, ExitPrice, PnL"
   ```

2. **Add data:**
   ```
   "Add 10 rows to the spreadsheet"
   ```
   Or click cells directly to edit

3. **Modify structure:**
   ```
   "Add a 'Strategy' column after Symbol"
   "Delete the last row"
   "Rename the first column to 'Trade Date'"
   ```

4. **Download:**
   ```
   "Export this as CSV"
   "Download as JSON"
   ```

### Detailed Commands

#### Creating Spreadsheets
```typescript
// In TERA chat:
"Create a spreadsheet named 'Trading Log' with these columns:
- Date (date type)
- Symbol (text)
- Quantity (number)
- EntryPrice (currency)
- ExitPrice (currency)
- PnL (currency)
- Notes (text)"
```

#### Adding Data
```typescript
// Click cells to edit values
// Or ask TERA:
"In the trading log, add a row with:
Date: 2025-12-08
Symbol: AAPL
Quantity: 100
EntryPrice: $150.25
ExitPrice: $152.50
PnL: $225"
```

#### Filtering & Sorting
```typescript
// Ask TERA:
"Show me only profitable trades"
"Sort by symbol"
"Filter for symbol AAPL"
```

#### Exporting
```typescript
// Click export buttons or ask:
"Download this spreadsheet as CSV"
"Export the data as JSON"
"Give me a copy I can open in Excel"
```

## API Reference

### Process Spreadsheet Command
**Endpoint:** `POST /api/spreadsheet/process`

```typescript
// Request
{
  "spreadsheet": Spreadsheet,
  "command": {
    "action": "add-row" | "delete-row" | "update-cell" | "add-column" | "delete-column" | "export",
    "target": { rowId?: string, columnId?: string, row?: number, column?: number },
    "value": any,
    "columnName": string,
    "columnType": "text" | "number" | "date" | "currency" | "percent"
  },
  "naturalLanguage": string // Original user message
}

// Response
{
  "success": boolean,
  "spreadsheet": Spreadsheet,
  "message": string
}
```

### Export Spreadsheet
**Endpoint:** `POST /api/spreadsheet/export`

```typescript
// Request
{
  "spreadsheet": Spreadsheet,
  "format": "csv" | "json"
}

// Response
{
  "success": boolean,
  "data": string, // CSV or JSON content
  "mimeType": string,
  "filename": string,
  "format": string
}
```

## TypeScript Interfaces

### Spreadsheet
```typescript
interface Spreadsheet {
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
```

### Column
```typescript
interface Column {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'percent' | 'formula';
  width?: number;
  visible?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  position: number;
}
```

### Cell
```typescript
interface Cell {
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
```

## Components

### SpreadsheetViewer
Main component for displaying and editing spreadsheets.

```typescript
<SpreadsheetViewer
  spreadsheet={spreadsheet}
  editable={true}
  onCellChange={(rowId, columnId, value) => {}}
  onAddRow={() => {}}
  onDeleteRow={(rowId) => {}}
  onAddColumn={(name) => {}}
  onExport={(format) => {}}
  compact={false}
/>
```

### SpreadsheetMessage
Component for displaying spreadsheets in chat messages.

```typescript
<SpreadsheetMessage
  spreadsheet={spreadsheet}
  onAddRow={() => {}}
  onDeleteRow={(rowId) => {}}
  onAddColumn={(name) => {}}
  onUpdateCell={(rowId, columnId, value) => {}}
  onContinueChat={(message) => {}}
  editable={true}
  conversationId={conversationId}
/>
```

## Hooks

### useSpreadsheet
State management hook for spreadsheet operations.

```typescript
const {
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
} = useSpreadsheet(initialData);
```

## Integration with TERA Chat

### Step 1: Add Spreadsheet Message Type
Update `src/types/chat.ts`:
```typescript
interface Message {
  // ... existing fields
  spreadsheetId?: string;
  spreadsheet?: Spreadsheet;
}
```

### Step 2: Handle in Message Renderer
In your message rendering component:
```typescript
if (message.spreadsheet) {
  return (
    <SpreadsheetMessage
      spreadsheet={message.spreadsheet}
      onContinueChat={handleContinueChat}
      // ... other props
    />
  );
}
```

### Step 3: Update TERA AI Prompt
Add to your AI system prompt:
```
When a user asks about creating or modifying spreadsheets:
1. Create/update the spreadsheet structure
2. Return the spreadsheet in a message block
3. Suggest next steps to the user
4. Remember the spreadsheet for future modifications in this conversation

Spreadsheet operations:
- Creating: Define columns and initial data
- Editing: Modify specific cells or structure
- Exporting: Provide download options
- Analyzing: Show statistics and insights
```

## Examples

### Example 1: Trading Journal
```
User: "Create a trading journal spreadsheet for my account"

TERA: I'll create a trading journal with all the essential fields:
[Spreadsheet displayed with columns: Date, Symbol, Direction, EntryPrice, ExitPrice, 
Quantity, PnL, Win/Loss, Notes, Strategy]

You can now click any cell to edit, or ask me to:
- Add more rows for new trades
- Add columns for additional metrics
- Filter by symbol or date range
- Export to CSV/JSON
```

### Example 2: Performance Analysis
```
User: "Analyze my trades and create a summary spreadsheet"

TERA: I'll create a performance summary:
[Spreadsheet with: Month, TotalTrades, WinRate, TotalPnL, AvgWin, AvgLoss, etc.]

Key insights:
- Best month: August with 72% win rate
- Worst month: June with 45% win rate
- Trend: Improvement over time

Would you like me to add more columns or filter by specific months?
```

### Example 3: Risk Management
```
User: "Create a position sizing spreadsheet"

TERA: I'll set up a position sizing calculator:
[Spreadsheet with: Symbol, AccountSize, RiskPercent, StopDistance, PositionSize]

Just enter your account size and risk percentage, and I'll calculate position sizes automatically.
```

## Best Practices

1. **Clear Column Names**: Use descriptive names that are easy to understand
2. **Data Types**: Specify appropriate types (currency for money, date for dates)
3. **Regular Exports**: Download spreadsheets regularly to avoid losing data
4. **Use Filtering**: Ask TERA to filter and analyze subsets of data
5. **Document Changes**: Keep notes of what each column represents
6. **Mobile Friendly**: Use on mobile when needed, spreadsheets are responsive

## Limitations & Future Enhancements

### Current Limitations
- ✗ No formulas/calculations (coming soon)
- ✗ No pivot tables (planned)
- ✗ No charts/visualizations (planned)
- ✗ No collaborative editing (planned)
- ✗ Limited to conversation memory (consider database storage)

### Planned Features
- ✅ Formulas: =SUM(), =AVG(), etc.
- ✅ Pivot tables: Summarize and aggregate data
- ✅ Charts: Visualize trends
- ✅ Database persistence: Save spreadsheets long-term
- ✅ Sharing: Share with other users
- ✅ Templates: Pre-built templates for common use cases
- ✅ Bulk operations: Upload CSV to import data
- ✅ Advanced filtering: Complex filters with AND/OR

## Troubleshooting

### Spreadsheet Not Showing
- Ensure TERA returned a spreadsheet object
- Check browser console for errors
- Refresh the page

### Data Not Saving
- Remember: Data saves in memory during conversation
- Export/download before closing chat
- Use "Download as CSV" for permanent storage

### Export Not Working
- Check file download in browser
- Try a different format (CSV vs JSON)
- Ensure spreadsheet has data

## Support

For issues or feature requests, please create an issue on GitHub with:
- Description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Browser/device information

---

**Last Updated**: 2025-12-08
**Version**: 1.0.0
