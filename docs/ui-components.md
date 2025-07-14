# UI Components and Styling

This project uses shadcn/ui components built on top of Tailwind CSS for a consistent and modern user interface.

## Technology Stack

- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Component Library**: React

## Installation and Setup

### Adding New Components

To add new shadcn/ui components to the project, use the following command:

```bash
pnpm dlx shadcn@latest add <component-name>
```

For example, to add the Sonner toast component:

```bash
pnpm dlx shadcn@latest add sonner
```

### Component Usage

After installation, components can be imported from the `@/components/ui` directory:

```tsx
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"
```

## Available Components

The project includes various shadcn/ui components. Here are some commonly used ones:

- Button
- Card
- Dialog
- Input
- Select
- Table
- Toast
- And more...

## Standardized Custom Components

### DataTable

The project uses a standardized DataTable component for all tables in the application. This component provides a consistent UI and behavior across pages.

#### Location

```
src/components/shared/DataTable.tsx
```

#### Features

- Consistent table styling across all pages
- Standardized pagination controls
- Loading states
- Error handling
- Empty state messaging
- Sorting functionality
- Optional integrated search

#### Usage Example

```tsx
import { DataTable, Column } from '@/components/shared/DataTable';

// Define columns for the DataTable
const columns: Column<YourDataType>[] = [
  {
    key: "id",
    header: "ID",
    sortable: true,
  },
  {
    key: "name",
    header: "Name",
    sortable: true,
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (item) => (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
        item.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {item.isActive ? 'Active' : 'Inactive'}
      </span>
    ),
  },
  // ... more columns
];

// In your component:
<DataTable
  data={yourData}
  columns={columns}
  keyField="id"
  isLoading={loading}
  error={error}
  sortField={sortField}
  sortDirection={sortDirection}
  onSortChange={handleSortChange}
  pagination={{
    currentPage: page,
    totalPages: totalPages,
    totalItems: total,
    itemsPerPage: limit,
    onPageChange: (newPage) => setPage(newPage),
    onItemsPerPageChange: (newLimit) => {
      setLimit(newLimit);
      setPage(1);
    }
  }}
  emptyMessage="No items found."
/>
```

### PageHeader

For consistent page headers, see the documentation in [Page Header Standards](./page-header-standards.md).

## Toast Notifications

The project uses toast notifications for user feedback instead of inline alerts. This provides a consistent, non-blocking user experience.

### Implementation

The toast system is implemented using shadcn/ui's toast component:

```tsx
// Import the hook
import { useToast } from "@/components/ui/use-toast";

// Use within a component
const { toast } = useToast();

// Show a success toast
toast({
  title: "Success",
  description: "Operation completed successfully",
});

// Show an error toast
toast({
  title: "Error",
  description: "Something went wrong",
  variant: "destructive",
});
```

### Best Practices

- Use toasts for temporary notifications that don't require user action
- Success toasts should have a short duration
- Error toasts can have a longer duration and should be descriptive
- Toasts should not be used for critical information that users must see
- Avoid showing multiple toasts simultaneously

### Toast vs. Inline Alerts

| Scenario | Toast | Inline Alert |
|----------|-------|--------------|
| Successful form submission | ✅ | ❌ |
| Form validation errors | ❌ | ✅ |
| Successful operation feedback | ✅ | ❌ |
| Session expiration warning | ❌ | ✅ |
| System notifications | ✅ | ❌ |

## Styling Guidelines

### Tailwind CSS

The project uses Tailwind CSS for utility-first styling. Key points:

- All styles are defined using Tailwind utility classes
- Custom styles can be added in `tailwind.config.js`
- Component-specific styles are co-located with their components

### Theme Customization

The project supports both light and dark themes. Theme configuration can be found in:

- `tailwind.config.js` - For color schemes and other theme variables
- `components.json` - For shadcn/ui component theming

## Best Practices

1. Use shadcn/ui components when available instead of creating custom ones
2. Follow the project's established styling patterns
3. Maintain consistent spacing and typography using Tailwind's utility classes
4. Use the provided theme variables for colors and other design tokens
5. Use toast notifications for transient feedback rather than inline alerts
6. Use the standardized DataTable component for all tables in the application
7. Use the PageHeader component for all page headers
8. Maintain consistent component behavior and styling across pages
9. For primary action buttons, use `bg-purple-600 hover:bg-purple-700 text-white`

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Documentation](https://react.dev) 