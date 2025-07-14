# Standard Costs Import Modes

The Standard Costs management system supports two import modes to handle different data management scenarios.

## Import Modes

### 1. Update/Add Mode (Default)

This is the default import behavior that preserves existing data while updating or adding new records.

**How it works:**

- Existing records with the same `itemName` are updated with new values
- New records that don't exist are created
- No existing records are deleted
- Maintains data continuity

**Use cases:**

- Regular cost updates
- Adding new items to existing catalog
- Incremental data updates
- When you want to preserve existing data

### 2. Replace All Mode

This mode completely replaces all existing standard costs with the imported data.

**How it works:**

- ⚠️ **Deletes ALL existing standard cost records**
- Creates new records from the imported file
- Uses database transaction for data integrity
- Cannot be undone

**Use cases:**

- Complete data refresh from authoritative source
- Starting with clean slate
- Migrating from different system
- When existing data is outdated or corrupted

## Production Order Updates

Both import modes automatically update production orders after processing standard costs:

**Update criteria:**

- Production order has same `itemName` as updated standard cost
- Production order `costPerUnit` is NULL or 0 (empty/missing)
- Production order status is NOT 'Completed'
- Standard cost is active (`isActive = true`)

**Completed orders protection:**

- Orders with status 'Completed' are never modified
- Orders with existing non-zero costs are preserved
- This prevents accidental overwriting of finalized costs

## File Format Support

Both CSV and Excel formats are supported for both import modes:

### CSV Format

```csv
Item Name,Description,Cost Per Unit,Currency
HARNESS-123,Wire Harness Assembly,2.50,USD
PCB-456,Circuit Board Component,15.99,USD
```

### Excel Format

Supports standard Excel files (.xlsx, .xls) with same column structure.

## Safety Features

### Replace All Confirmations

- Warning dialog before executing Replace All mode
- Clear indication of destructive nature
- Requires explicit confirmation

### Transaction Safety

- Replace All uses database transactions
- All-or-nothing approach prevents partial failures
- Rollback capability if errors occur

### Detailed Reporting

- Success/error counts for all operations
- Production order update statistics
- Processing time tracking
- Error details for troubleshooting

## Usage Tips

1. **Backup before Replace All**: Always export existing data before using Replace All mode
2. **Test with small files**: Validate your data format with small test files first
3. **Monitor logs**: Check console logs for detailed processing information
4. **Use templates**: Download provided templates to ensure correct format
5. **Check production orders**: Verify production order costs were updated as expected

## Example Workflow

### Regular Updates (Update/Add Mode)

1. Export current data as backup
2. Prepare CSV/Excel with updates
3. Import without "Replace All" checkbox
4. Verify results and production order updates

### Complete Refresh (Replace All Mode)

1. Export current data as backup
2. Prepare complete dataset
3. Check "Replace all existing records" option
4. Confirm warning dialog
5. Import and verify all data replaced correctly
6. Check production orders were updated appropriately
