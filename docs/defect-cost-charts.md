# Defect Cost Charts Documentation

## Overview

The Defect Cost Charts provide real-time financial impact analysis of manufacturing defects by visualizing the monetary cost of defective products. These charts are integrated into the main dashboard and use the existing universal filter system to provide targeted cost analysis.

## Chart Types

### 1. Total Cost Summary Card

**Purpose**: Displays the total financial impact of defects for the selected filters.

**Features**:

- Large, prominent display of total defect cost
- Red color scheme to highlight the financial impact
- Updates based on applied dashboard filters
- Only appears when there is cost data available

**Usage**:

- Provides at-a-glance view of total defect costs
- Helps management understand overall financial impact
- Useful for budget tracking and cost reduction initiatives

### 2. Defect Cost by Operation Chart

**Purpose**: Bar chart showing which operations (OP10, OP15, OP20, etc.) generate the highest defect costs.

**Features**:

- Horizontal bar chart with cost values on X-axis
- Operation codes on Y-axis
- Dollar formatting on tooltips and axes
- Only shows operations that have defect costs > $0
- Interactive tooltips showing exact cost amounts

**Usage**:

- Identify which operations are most expensive for defects
- Prioritize process improvement efforts
- Allocate resources to high-cost operations
- Track improvement progress over time

### 3. Daily Defect Cost Trend Chart

**Purpose**: Line chart showing defect cost trends over time (last 30 days or filtered period).

**Features**:

- Time-series line chart with dates on X-axis
- Cost values on Y-axis with dollar formatting
- Interactive tooltips with formatted dates and costs
- Smooth line visualization with data points
- Responsive date formatting (MM/DD)

**Usage**:

- Track cost trends over time
- Identify patterns or seasonal variations
- Monitor improvement initiatives effectiveness
- Spot cost spikes that need investigation

## Cost Calculation Logic

### Data Sources

The defect cost calculation uses the following data relationships:

```
StandardCost (itemName) → ProductionOrder (costPerUnit) → Operation → OperationDefects
```

### Cost Formula

**Effective Defect Quantity**:

```javascript
effectiveDefects = defectReworkable
  ? Math.max(0, quantity - quantityRework)
  : quantity;
```

**Operation Defect Cost**:

```javascript
operationCost = effectiveDefects × costPerUnit;
```

**Total Defect Cost**:

```javascript
totalCost = sum(operationCost for all operations);
```

### Key Principles

1. **Cost Per Unit Source**: Retrieved from `ProductionOrder.costPerUnit` (originally sourced from `StandardCost` table)

2. **Effective Defects**:

   - For **reworkable defects**: Only count defects that weren't successfully reworked
   - For **non-reworkable defects**: Count all reported defects

3. **Real-time Calculation**: Costs are calculated on-demand from actual defect quantities, not stored values

4. **Completed Operations Only**: Only includes operations with `endTime` (completed operations)

## Universal Filters Integration

The defect cost charts integrate seamlessly with the existing dashboard filter system:

### Supported Filters

- **Year**: Filter by production year
- **Month**: Filter by specific month (or "All" for entire year)
- **Line**: Filter by production line
- **Series**: Filter by item series/name
- **Status**: Filter by production order status
- **PO Number**: Filter by specific production order number

### Filter Behavior

- **Cumulative**: All active filters are applied together
- **Real-time**: Charts update immediately when filters change
- **Consistent**: Uses same filter logic as other dashboard charts
- **Performance**: Efficient database queries with proper indexing

## Using the Charts

### Accessing the Charts

1. Navigate to **Dashboard** from the main navigation
2. Scroll down to view the defect cost charts section
3. Use the universal filters at the top to refine the data
4. Charts update automatically when filters are changed

### Interpreting the Data

**No Data Scenarios**:

- Operations without defects won't appear
- Production orders without cost per unit won't contribute
- Charts show "No data available" message with guidance

**Data Availability**:

- Requires completed operations (with end times)
- Requires production orders with cost per unit
- Requires actual defect records

### Best Practices

1. **Regular Monitoring**: Check charts daily/weekly to track cost trends
2. **Filter Usage**: Use filters to focus on specific time periods, lines, or products
3. **Comparative Analysis**: Compare different time periods to measure improvement
4. **Action Planning**: Use high-cost operations data to prioritize improvements

## Technical Implementation

### API Endpoint

**URL**: `/api/dashboard/cost-charts`
**Method**: `GET`
**Authentication**: Required (uses `withAuth` middleware)

**Query Parameters**:

- `year`: Production year filter
- `month`: Month filter (1-12 or "All")
- `line`: Production line filter
- `series`: Item series filter
- `status`: Production order status filter
- `poNumber`: Production order number filter

**Response Format**:

```json
{
  "operationCostData": [
    {
      "name": "OP10",
      "cost": 125.5
    }
  ],
  "dailyCostData": [
    {
      "date": "2024-01-15",
      "cost": 89.25
    }
  ],
  "totalDefectCost": 1250.75,
  "appliedFilters": {
    "year": "2024",
    "month": "1",
    "line": "Line 01",
    "series": "HARNESS-123",
    "status": "COMPLETED",
    "poNumber": null
  }
}
```

### Database Queries

The system performs optimized queries to:

1. **Fetch Operations**: Get operations with defects and production order costs
2. **Calculate Costs**: Compute effective defects and multiply by cost per unit
3. **Group Data**: Aggregate by operation and date for chart display

**Key Query Features**:

- Uses database joins for efficient data retrieval
- Applies filters at database level for performance
- Only fetches necessary fields to minimize data transfer

### Component Architecture

**Location**: `src/components/dashboard/defect-cost-chart.tsx`

**Key Features**:

- React hooks for state management
- Recharts library for chart rendering
- Integration with universal filter context
- Error handling and loading states
- Responsive design

## Data Requirements

### Prerequisites

1. **Standard Costs**: Items must have standard costs defined
2. **Production Orders**: Must have `costPerUnit` populated
3. **Operations**: Must be completed (have `endTime`)
4. **Defects**: Must have actual defect records

### Data Quality Considerations

**Missing Cost Data**:

- Operations without cost per unit won't contribute to charts
- Warning messages guide users to check data setup

**Defect Recording**:

- Accurate defect quantities are essential for meaningful cost data
- Rework quantities should be properly recorded for reworkable defects

## Troubleshooting

### Common Issues

**"No defect cost data available"**:

- Check if production orders have `costPerUnit` populated
- Verify operations have defect records
- Ensure operations are completed (have end times)
- Check if filters are too restrictive

**Charts Loading Slowly**:

- Large date ranges may take longer to process
- Consider using more specific filters
- Check database performance and indexing

**Incorrect Cost Calculations**:

- Verify `costPerUnit` accuracy in production orders
- Check defect quantities and rework data
- Review effective defect calculation logic

### Debugging

**Console Logs**:
The system provides detailed console logging:

- Filter application details
- Sample operation data
- Cost calculation results
- Performance timing information

**Data Validation**:

- Check browser developer tools for API response details
- Verify filter parameters in network requests
- Review console logs for calculation details

## Performance Considerations

### Optimization Features

1. **Database Indexing**: Proper indexes on filter columns
2. **Efficient Queries**: Single query with joins vs multiple requests
3. **Data Filtering**: Server-side filtering reduces data transfer
4. **Caching**: Filter-based result caching (future enhancement)

### Scalability

- Designed to handle large datasets efficiently
- Pagination support for extremely large result sets (future enhancement)
- Background calculation for complex aggregations (future enhancement)

## Future Enhancements

### Planned Features

1. **Cost Breakdown by Defect Type**: Show costs by specific defect categories
2. **Comparative Analysis**: Side-by-side period comparisons
3. **Export Functionality**: CSV/Excel export of cost data
4. **Alerts**: Automated alerts for cost thresholds
5. **Predictive Analytics**: Trend-based cost forecasting

### Integration Opportunities

1. **Report Generation**: Include cost charts in automated reports
2. **Budget Integration**: Link with financial planning systems
3. **Mobile Dashboard**: Responsive mobile-optimized views
4. **Real-time Updates**: WebSocket-based live updates

## Security and Access Control

### Authentication

- All chart data requires valid user authentication
- Uses existing session-based authentication system
- API endpoints protected with `withAuth` middleware

### Data Access

- Users see data based on their role permissions
- Filters respect existing data access controls
- No sensitive financial data exposed beyond authorized users

## Maintenance

### Regular Tasks

1. **Data Validation**: Periodic checks for data consistency
2. **Performance Monitoring**: Track query performance and optimize
3. **User Feedback**: Gather feedback for UI/UX improvements
4. **Documentation Updates**: Keep documentation current with changes

### Version History

- **v1.0**: Initial implementation with basic cost calculations
- **v1.1**: Enhanced filter integration and performance optimization
- **v1.2**: Improved error handling and user feedback (current)

---

## Support

For technical support or questions about the defect cost charts:

1. Check this documentation first
2. Review console logs for debugging information
3. Contact the development team with specific error details
4. Provide reproduction steps for any issues encountered

**Last Updated**: January 2024
**Version**: 1.2
