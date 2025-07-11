# Dashboard Series Filter

## Overview

The dashboard series filter has been updated to use the first 5 digits of the production order item name as the series identifier. This change was implemented to standardize how series are grouped and filtered in the dashboard.

## Implementation Details

- The number of digits used for the series filter is defined as a constant in `src/lib/constants.ts` as `SERIES_FILTER_DIGITS`.
- This constant is currently set to 5, but can be adjusted in the future if the series naming convention changes.
- The series filter extracts the first 5 digits from each production order item name and uses these as the series code.
- Only complete series codes (exactly 5 digits) are included in the filter options.

## Technical Implementation

1. The series filter options are generated in the API endpoint `src/pages/api/dashboard/filter-options.ts`.
2. When fetching series options, the API extracts the first N digits (defined by `SERIES_FILTER_DIGITS`) from each production order item name.
3. The UI component in `src/components/dashboard/filters.tsx` displays these series codes as the filter options.
4. A tooltip and info message are shown to users to explain this behavior.

## Example

If a production order item name is "12345-ABC-XYZ", the series filter will extract "12345" as the series code. All items starting with these same 5 digits will be grouped together when this series filter is applied.
