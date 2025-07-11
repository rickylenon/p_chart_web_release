# Navigation System Architecture

## Overview

The P-Chart application uses a modular navigation system that has been designed for flexibility, maintainability, and consistency. This document explains how the navigation system works and how to extend it.

## URL Structure

The application uses a flat URL structure for main sections:

```
/dashboard           - Main dashboard with metrics and overview
/production-orders   - Production order management
/master-defects      - Master defect tracking and analysis
/reports             - Reporting and analytics
/settings            - Application settings
```

Operations are managed directly within production orders. Each production order detail page (`/production-orders/[poNumber]`) includes tabs for different operation steps.

## Key Components

### Navigation Component

**File**: `src/components/layout/Navigation.tsx`

This is the main navigation component that serves as the container for all navigation elements. It:

- Renders the logo/brand
- Contains the navigation items
- Provides global search functionality for production orders
- Hosts the user menu
- Maintains the active state of navigation items

```tsx
// Example structure
<header>
  <div className="container">
    {/* Logo */}
    <nav>
      {/* Navigation Items */}
    </nav>
    {/* Search */}
    {/* User Menu */}
  </div>
</header>
```

### Global Search

The navigation bar includes a global search functionality that:

- Allows users to search for production orders by PO number
- Is accessible from any page in the application
- Provides direct navigation to production order details
- Redirects to the create page with pre-filled data if the PO doesn't exist

The search flow works as follows:

1. User enters a PO number in the search input
2. On submit, the user is navigated to `/production-orders/[poNumber]`
3. If the PO exists, the details page is displayed
4. If the PO doesn't exist, the user is redirected to `/production-orders/create` with the PO number pre-filled

```tsx
// Example search implementation
const handleSearch = (e: FormEvent) => {
  e.preventDefault();
  if (!searchQuery.trim()) return;
  router.push(`/production-orders/${searchQuery.trim()}`);
};
```

### NavItem Component

**File**: `src/components/layout/NavItem.tsx`

A reusable component for individual navigation links that:

- Handles proper styling based on active state
- Provides consistent appearance
- Simplifies the Navigation component

```tsx
interface NavItemProps {
  title: string;    // Display text
  href: string;     // Link destination
  isActive: boolean; // Highlight state
}
```

### UserMenu Component

**File**: `src/components/layout/UserMenu.tsx`

A dropdown menu for user-related actions that:

- Displays user information (name, email, role)
- Provides links to user-specific pages (profile, settings)
- Includes the sign-out functionality

## Adding Navigation Items

To add a new navigation item:

1. Open `src/components/layout/Navigation.tsx`
2. Locate the `navItems` array
3. Add a new item with `title` and `href` properties:

```tsx
const navItems = [
  // Existing items
  { title: "New Section", href: "/new-section" },
];
```

## Admin-Specific Navigation

As of April 2025, the navigation structure has been updated to streamline the user interface:

- **Regular navigation items** remain in the main Navigation component
- **Admin-specific links** have been moved to the UserMenu for a cleaner interface
- **Role-based access control** determines which menu items are visible to users

Admin users can access additional features through the UserMenu dropdown:
- Master Defects management
- User Management
- Other administrative functions

This change improves the user experience by:
- Simplifying the main navigation bar
- Grouping administrative functions logically
- Reducing visual clutter for non-admin users

## Navigation Hierarchy

The navigation components are integrated into the application through the DashboardLayout component:

1. **Pages** use DashboardLayout as their wrapper
2. **DashboardLayout** includes Navigation
3. **Navigation** renders NavItem components and UserMenu
4. **NavItem** renders individual links
5. **UserMenu** handles user-specific options

## Styling

The navigation system uses Tailwind CSS for styling:

- The header uses a glass-like effect with backdrop blur
- Active items are highlighted with the primary color
- Inactive items use a muted foreground color
- Hover effects provide feedback to users
- Search input uses consistent styling with other form elements

## Mobile Responsiveness

The navigation system has been designed with mobile considerations:

- The main navigation links are hidden on small screens (`hidden md:flex`)
- The search bar is responsive and adjusts width based on screen size
- The user name is hidden on small screens but the avatar remains visible
- Additional mobile-specific navigation can be added as needed

## Authentication Integration

The navigation components integrate with NextAuth.js:

- User information is retrieved from the session
- Authentication state determines what's displayed
- Sign-out functionality is provided through the UserMenu

## Best Practices

When working with the navigation system:

1. Always use the NavItem component for new navigation links
2. Maintain consistent naming for routes
3. Group related routes in the navigation items array
4. Consider the hierarchy of pages when organizing navigation
5. Keep the search functionality accessible and visible on all pages 