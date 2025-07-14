# Page Header Standards

## Overview

This document outlines the standards for page headers in the P-Chart application to ensure consistency across all pages. A standardized page header component has been created to achieve a professional and unified look throughout the application.

## PageHeader Component

The `PageHeader` component is a reusable component that provides a consistent layout for page headers. It includes:

1. A title section with page title and optional description
2. A search section with customizable placeholder text
3. An actions section for buttons or other controls

### Location

```
src/components/layout/PageHeader.tsx
```

### Interface

```tsx
interface PageHeaderProps {
  title: string;                  // Required: The page title
  description?: string;           // Optional: Description text below title
  searchPlaceholder?: string;     // Optional: Placeholder for search input
  searchValue?: string;           // Optional: Current search value
  onSearchChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; // Optional: Search handler
  actions?: ReactNode;            // Optional: Action buttons (JSX)
}
```

## Usage Guidelines

### Basic Usage

```tsx
import PageHeader from '@/components/layout/PageHeader';

// In your component:
<PageHeader 
  title="Page Title"
  description="Optional page description"
/>
```

### With Search Functionality

```tsx
<PageHeader 
  title="Production Orders"
  description="Manage your production orders here."
  searchPlaceholder="Search PO number, lot number, or item..."
  searchValue={searchQuery}
  onSearchChange={(e) => setSearchQuery(e.target.value)}
/>
```

### With Action Buttons

```tsx
<PageHeader 
  title="Production Orders"
  description="Manage your production orders here."
  searchPlaceholder="Search PO number, lot number, or item..."
  searchValue={searchQuery}
  onSearchChange={(e) => setSearchQuery(e.target.value)}
  actions={
    <Button 
      onClick={() => router.push('/production-orders/create')}
    >
      Create New
    </Button>
  }
/>
```

## Visual Structure

The PageHeader has a simple, streamlined layout:

- **Left Side**:
  - Main title in purple (text-2xl, font-semibold, text-purple-700)
  - Optional description text below the title (text-gray-600)

- **Right Side**:
  - Search input with icon (if search handler is provided)
  - Action buttons or other controls (if provided)

This simplified, single-row layout provides a clean and consistent look while reducing vertical space usage.

## Examples

### Production Orders Page

```tsx
<PageHeader
  title="Production Orders"
  description="Manage your production orders here."
  searchPlaceholder="Search PO number, lot number, or item..."
  searchValue={searchQuery}
  onSearchChange={(e) => setSearchQuery(e.target.value)}
  actions={
    <Button 
      className="bg-purple-600 hover:bg-purple-700 text-white"
      onClick={() => router.push('/production-orders/create')}
    >
      Create New
    </Button>
  }
/>
```

### Defects Management Page

```tsx
<PageHeader
  title="Defects Management"
  description="Add and manage defect categories for quality control"
  searchPlaceholder="Search by name, description, etc."
  searchValue={searchInput}
  onSearchChange={handleSearchChange}
  actions={
    <Button
      onClick={handleAddDefect}
      className="bg-blue-600 hover:bg-blue-700 text-white"
    >
      Add New Defect
    </Button>
  }
/>
```

## Button Style Guidelines

To maintain consistency, use these button style guidelines:

- Primary actions: `bg-purple-600 hover:bg-purple-700 text-white`
- Secondary actions: `variant="outline"`

## Integration with Existing Pages

All main pages in the application should use the PageHeader component to ensure consistent layout and styling. Pages to update include:

- Dashboard
- Production Orders
- Defects Management
- Edit Requests
- Settings
- Reports

## Debugging

The PageHeader component includes console logs to help with debugging. Each time it renders, it will log:

```
PageHeader: Rendering for {title}
``` 