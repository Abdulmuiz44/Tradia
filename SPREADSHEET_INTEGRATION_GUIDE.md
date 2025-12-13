# TERA Spreadsheet Integration - Implementation Guide

## Quick Start

This guide shows how to integrate the spreadsheet feature into the TERA chat interface.

## Step 1: Update Chat Message Types

**File: `src/types/chat.ts`**

Add to your `Message` interface:

```typescript
import { Spreadsheet } from '@/types/spreadsheet';

interface Message {
  // ... existing fields
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: File[];
  isTyping?: boolean;
  isVoice?: boolean;
  mode?: 'coach' | 'grok';
  variant?: 'default' | 'upgrade' | 'system';
  
  // NEW: Spreadsheet fields
  spreadsheetId?: string;
  spreadsheet?: Spreadsheet;
  spreadsheetAction?: 'create' | 'update' | 'view';
}
```

## Step 2: Update MessageBubble Component

**File: `src/components/ai/components/MessageBubble.tsx` or `src/components/chat/MessageBubble.tsx`**

Add import:
```typescript
import { SpreadsheetMessage } from '@/components/spreadsheet/SpreadsheetMessage';
import { Spreadsheet } from '@/types/spreadsheet';
```

Add to render method:
```typescript
export function MessageBubble({ message, ...props }: MessageBubbleProps) {
  // ... existing code

  // Handle spreadsheet messages
  if (message.spreadsheet) {
    return (
      <div className={`message ${message.type}`}>
        <SpreadsheetMessage
          spreadsheet={message.spreadsheet}
          editable={message.type === 'assistant'}
          onContinueChat={(prompt) => {
            // Send prompt back to chat
            props.onContinueChat?.(prompt);
          }}
          onAddRow={() => {
            // Handle add row
            updateSpreadsheet((prev) => addRowToSpreadsheet(prev));
          }}
          onDeleteRow={(rowId) => {
            updateSpreadsheet((prev) => deleteRowFromSpreadsheet(prev, rowId));
          }}
          onAddColumn={(name) => {
            updateSpreadsheet((prev) => addColumnToSpreadsheet(prev, name));
          }}
          onUpdateCell={(rowId, columnId, value) => {
            updateSpreadsheet((prev) => updateCellInSpreadsheet(prev, rowId, columnId, value));
          }}
        />
      </div>
    );
  }

  // ... existing code for regular messages
}
```

## Step 3: Add Spreadsheet Management to Chat Component

**File: `src/components/ai/AIChatInterface.tsx` or `src/components/chat/ChatInterface.tsx`**

Add imports:
```typescript
import { useSpreadsheet } from '@/hooks/useSpreadsheet';
import { Spreadsheet, SpreadsheetCommand } from '@/types/spreadsheet';
```

Add state:
```typescript
function AIChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentSpreadsheet, setCurrentSpreadsheet] = useState<Spreadsheet | null>(null);
  const {
    spreadsheet,
    addColumn,
    addRow,
    deleteRow,
    deleteColumn,
    updateCell,
    exportToCSV,
    exportToJSON,
  } = useSpreadsheet();

  // ... rest of component
}
```

Add handler for TERA responses with spreadsheets:
```typescript
const handleTeraResponse = async (response: string, spreadsheetData?: Spreadsheet) => {
  // Create message
  const message: Message = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: 'assistant',
    content: response,
    timestamp: new Date(),
    spreadsheet: spreadsheetData,
  };

  setMessages((prev) => [...prev, message]);
  setCurrentSpreadsheet(spreadsheetData || currentSpreadsheet);

  // Persist to database if needed
  if (conversationId) {
    await persistMessage(message);
  }
};
```

Add spreadsheet command processing:
```typescript
const processSpreadsheetCommand = async (prompt: string) => {
  if (!currentSpreadsheet) return;

  try {
    // Parse user intent and create command
    const command = parseSpreadsheetCommand(prompt);

    // Send to API
    const response = await fetch('/api/spreadsheet/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spreadsheet: currentSpreadsheet,
        command,
        naturalLanguage: prompt,
      }),
    });

    const result = await response.json();

    if (result.success) {
      setCurrentSpreadsheet(result.spreadsheet);
      
      // Add message from TERA about the change
      await handleTeraResponse(result.message, result.spreadsheet);
    }
  } catch (error) {
    console.error('Failed to process spreadsheet command:', error);
  }
};
```

## Step 4: Create Spreadsheet Command Parser

**File: `src/lib/spreadsheet/parser.ts`**

```typescript
import { SpreadsheetCommand } from '@/types/spreadsheet';

export function parseSpreadsheetCommand(userInput: string): SpreadsheetCommand {
  const input = userInput.toLowerCase().trim();

  // Add row
  if (input.includes('add row') || input.includes('new row')) {
    return { action: 'add-row' };
  }

  // Delete row
  if (input.includes('delete row') || input.includes('remove row')) {
    const rowMatch = input.match(/row (\d+)/);
    return {
      action: 'delete-row',
      target: { row: rowMatch ? parseInt(rowMatch[1]) - 1 : 0 },
    };
  }

  // Add column
  if (input.includes('add column') || input.includes('add a column')) {
    const nameMatch = input.match(/(?:column|named?|called?)\s+['"]?([^'"]+)['"]?/);
    const typeMatch = input.match(/(text|number|date|currency|percent)/);
    return {
      action: 'add-column',
      columnName: nameMatch ? nameMatch[1] : 'New Column',
      columnType: (typeMatch ? typeMatch[1] : 'text') as any,
    };
  }

  // Delete column
  if (input.includes('delete column') || input.includes('remove column')) {
    const nameMatch = input.match(/(?:column|named?)\s+['"]?([^'"]+)['"]?/);
    return {
      action: 'delete-column',
      target: { columnId: nameMatch ? nameMatch[1] : '' },
    };
  }

  // Update cell
  if (input.includes('change') || input.includes('update')) {
    const cellMatch = input.match(/(?:row|r)\s+(\d+)\s+(?:column|col|c)\s+(\d+)/);
    const valueMatch = input.match(/(?:to|=)\s+['"]?([^'"]+)['"]?/);
    
    if (cellMatch && valueMatch) {
      return {
        action: 'update-cell',
        target: { row: parseInt(cellMatch[1]) - 1, column: parseInt(cellMatch[2]) - 1 },
        value: valueMatch[1],
      };
    }
  }

  // Export
  if (input.includes('export') || input.includes('download')) {
    const format = input.includes('json') ? 'json' : 'csv';
    return { action: 'export', format };
  }

  // Default
  return { action: 'add-row' };
}
```

## Step 5: Enhance AI Prompts

**File: `src/lib/ai/advancedAnalysis.ts` or your AI prompt file**

Add spreadsheet capability to system prompt:

```typescript
export const TERA_SYSTEM_PROMPT = `You are TERA, the Tradia AI assistant.

${MODE_PROMPTS[mode]}

SPREADSHEET CAPABILITIES:
When users ask about creating or managing spreadsheets:
1. Offer to create a spreadsheet with relevant columns
2. Help organize data in table format
3. Suggest useful columns and data types
4. Support CSV/JSON export for future use
5. Remember spreadsheet during conversation
6. Respond to modification requests

SPREADSHEET OPERATIONS:
- Creating: Define columns with appropriate types (text, number, date, currency)
- Editing: Update cells, add/delete rows and columns
- Formatting: Apply colors, alignment, bold/italic
- Analysis: Calculate statistics, filter, sort
- Exporting: Provide CSV/JSON downloads

When suggesting a spreadsheet, show it in a formatted table.
When user modifies it, confirm the change and show updated data.`;
```

## Step 6: Test Integration

### Test Case 1: Create Spreadsheet
```
User: "Create a spreadsheet for trading journal"
TERA: Should display a spreadsheet with columns: Date, Symbol, Quantity, EntryPrice, ExitPrice, PnL
```

### Test Case 2: Modify Spreadsheet
```
User: "Add a column for Strategy"
TERA: Should add the column and confirm
```

### Test Case 3: Edit Cell
```
User: Click on a cell and type value
TERA: Should save and update
```

### Test Case 4: Export
```
User: Click CSV button
TERA: Should download file
```

## Integration Checklist

- [ ] Update Message type with spreadsheet fields
- [ ] Add spreadsheet imports to chat component
- [ ] Integrate SpreadsheetMessage into MessageBubble
- [ ] Add useSpreadsheet hook to chat state
- [ ] Create spreadsheet command parser
- [ ] Add API endpoint handlers for create/update
- [ ] Update TERA AI prompts
- [ ] Test all spreadsheet operations
- [ ] Test mobile responsiveness
- [ ] Test export functionality
- [ ] Add database persistence (optional)

## Database Persistence (Optional)

To save spreadsheets to database:

```typescript
// In database schema
CREATE TABLE spreadsheets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  conversation_id UUID,
  name TEXT,
  data JSONB, -- Store the entire Spreadsheet object
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

// In API endpoint
const { error } = await supabase
  .from('spreadsheets')
  .insert({
    id: spreadsheet.id,
    user_id: session.user.id,
    conversation_id,
    name: spreadsheet.name,
    data: spreadsheet,
  });
```

## Performance Optimization

1. **Large Datasets**: Paginate rows for >1000 items
2. **Cell Editing**: Debounce updates to avoid excessive re-renders
3. **Memory**: Consider cleanup when conversation ends
4. **Export**: Stream large files instead of loading into memory

## Troubleshooting

**Spreadsheet Not Appearing**
- Ensure Message includes `spreadsheet` field
- Check MessageBubble renders SpreadsheetMessage
- Verify imports are correct

**Commands Not Working**
- Check parseSpreadsheetCommand regex patterns
- Verify API endpoint is callable
- Review error logs in browser console

**Mobile Issues**
- Ensure CSS includes mobile media queries
- Test touch interactions on device
- Check table scroll behavior

## Support Resources

- **Documentation**: `TERA_SPREADSHEET_INTEGRATION.md`
- **Feature Plan**: `SPREADSHEET_FEATURE_PLAN.md`
- **Type Definitions**: `src/types/spreadsheet.ts`
- **Components**: `src/components/spreadsheet/`
- **API Endpoints**: `app/api/spreadsheet/`

---

## Next Steps

1. Implement the integration following this guide
2. Test with sample data
3. Gather user feedback
4. Add advanced features:
   - Formulas and calculations
   - Pivot tables
   - Charts and visualizations
   - Collaborative editing
   - Long-term persistence

---

**Last Updated**: 2025-12-08
**Version**: 1.0.0
