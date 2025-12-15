# Bulk Import Feature - User Guide

## Quick Start

### 1. Navigate to Trade History
Go to `/dashboard/trade-history` to view your trades.

### 2. Click Import Button
Look for the **import icon** (📁+) in the top-right toolbar next to the export button.

### 3. You're on the Import Page
You'll be redirected to `/dashboard/trades/import` where you can:

## The Import Page

### Upload Section
- **Drag & Drop**: Drag CSV/Excel files into the upload area
- **Click to Select**: Click "Choose file" to browse your computer
- **Supported Formats**:
  - CSV (.csv)
  - Excel (.xlsx, .xls)
  - Tab-separated (.tsv)

### Preview Section
Shows:
- **Parsing Progress**: Visual progress bar during file parsing
- **Detected Headers**: Column names from your file
- **Auto-Mapping Preview**: How columns are mapped to trade fields
- **Preview Rows**: First 20 rows of your data (expandable to show all)

### Info Cards
- 📋 **Supported Formats**: Lists accepted file types
- ✨ **Required Columns**: symbol, direction, entryPrice
- 💡 **Optional Columns**: All additional trade details
- ⚡ **Pro Tip**: Export from MetaTrader, TradingView, or your broker

### Actions
- **Import Button**: Submits the trades for bulk import
- **Cancel**: Goes back to trade history
- **Import More**: After successful import, upload another file

## Expected CSV/Excel Format

### Minimal Format (Required)
```csv
symbol,direction,entryPrice
EURUSD,Buy,1.0850
GBPUSD,Sell,1.2650
```

### Complete Format (Optional Fields)
```csv
symbol,direction,entryPrice,stopLossPrice,takeProfitPrice,openTime,closeTime,outcome,pnl
EURUSD,Buy,1.0850,1.0800,1.0900,2024-01-15 10:30,2024-01-15 11:45,Win,50
GBPUSD,Sell,1.2650,1.2700,1.2600,2024-01-15 09:00,2024-01-15 10:15,Loss,-30
```

## Column Name Examples

The system auto-detects these variations:

| Trade Field | Accepted Names |
|---|---|
| Symbol | symbol, ticker, instrument, pair |
| Direction | direction, side, Buy/Sell |
| Entry Price | entryPrice, entry_price, openPrice, price_open |
| Stop Loss | stopLossPrice, stop_loss_price, SL |
| Take Profit | takeProfitPrice, take_profit_price, TP |
| Open Time | openTime, open_time, entry_time, time |
| Close Time | closeTime, close_time, exit_time |
| Outcome | outcome, result |
| PnL | pnl, profit, profit_loss, netpl |
| Lot Size | lotSize, lots, volume, size |
| Order Type | orderType, order_type, type |

## Success Confirmation

After importing:
1. ✅ **Success Toast**: "Trades imported successfully - X trades have been added to your history"
2. 🔄 **Auto-Redirect**: Redirected to trade history after 1.5 seconds
3. 📊 **View Trades**: New trades appear in your trade history table

## Example Workflows

### From MetaTrader 5
1. Export trade history from MT5 as CSV
2. Open the import page
3. Upload the CSV
4. System auto-maps MT5 columns to Tradia fields
5. Click Import

### From TradingView
1. Export your trades as CSV
2. Go to import page
3. Select and upload the file
4. Review the auto-mapping preview
5. Click Import

### From Spreadsheet
1. Create or open your trades spreadsheet
2. Ensure required columns: symbol, direction, entryPrice
3. Add optional columns as needed
4. Save as CSV or Excel
5. Upload via import page

## Troubleshooting

### "No rows to import"
- Ensure your file contains data rows (not just headers)
- Check file format is CSV or Excel

### "Failed to parse file"
- Verify file format is correct
- Ensure proper encoding (UTF-8)
- Check for unusual characters in file

### Column Mapping Issues
- Review the auto-mapping preview table
- Column names are case-insensitive
- Spaces around names are trimmed
- Use common naming conventions when possible

### Import Button Not Working
- Ensure you've selected a file
- Check file size (should be reasonable)
- Verify you're authenticated

## Plan Limits

- **Free Plan**: Import up to 30 days of trade history
- **Pro Plan**: Import up to 6 months of trade history
- Older trades require plan upgrade

## Tips & Best Practices

1. **Start Small**: Import a small batch first to verify format
2. **Consistent Formatting**: Use consistent date and number formats
3. **Symbol Format**: Use standard symbol names (EURUSD, AAPL, etc.)
4. **Direction**: Use "Buy" or "Sell" (case-insensitive)
5. **Outcome**: Use "Win", "Loss", or "Breakeven"
6. **Review Data**: Check the preview before importing
7. **Backup**: Keep original files as backup

## What Gets Imported

For each trade, the system imports:
- ✅ Symbol and direction (required)
- ✅ Entry and exit prices
- ✅ Stop loss and take profit levels
- ✅ Trade open/close times
- ✅ Trade outcome (Win/Loss/Breakeven)
- ✅ Profit/Loss amount
- ✅ Duration (calculated if times provided)
- ✅ Order type and session
- ✅ Strategy and emotion
- ✅ Journal notes
- ✅ Tags and other metadata

## After Import

All imported trades:
- Are added to your trade history
- Can be edited individually
- Appear in analytics and statistics
- Support all filtering and sorting
- Can be exported again
