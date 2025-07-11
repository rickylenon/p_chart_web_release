# P-Chart Project Structure Documentation

## Overview

P-Chart is a web application for production monitoring and quality control. This documentation provides an overview of the project structure to help developers understand and contribute to the codebase.

## Technology Stack

- **Frontend Framework**: Next.js with React
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **UI Components**: Custom component library

## Core Folder Structure

```
src/
├── components/       # All React components
│   ├── dashboard/    # Dashboard-specific components
│   ├── layout/       # Layout components used across the app
│   └── ui/           # Reusable UI components
├── lib/              # Utility functions and shared code
│   ├── auth.ts       # Authentication utilities
│   ├── prisma.ts     # Database connection and utilities
│   ├── constants.ts  # Application-wide constants and configuration values
│   └── utils.ts      # General utility functions
├── pages/            # Next.js pages (routes)
│   ├── api/          # API routes and endpoints
│   ├── auth/         # Authentication-related pages
│   ├── dashboard/    # Dashboard overview page
│   ├── production-orders/ # Production orders pages (includes operation management)
│   ├── master-defects/    # Master defects pages
│   ├── reports/      # Reports pages
│   └── settings/     # Settings pages
└── styles/           # Global styles
```

## Routing Structure

The application uses a flat routing structure for main sections:

- `/dashboard` - Main dashboard with overview and metrics
- `/production-orders` - Production order management (includes operation tracking)
- `/master-defects` - Master defect management
- `/reports` - Reporting and analytics
- `/settings` - Application settings

Operations are managed directly within the production order details page, with each production order having multiple operation steps.

## Component Architecture

### Layout System

The application uses a hierarchical layout system:

1. **DashboardLayout** (`/src/components/layout/DashboardLayout.tsx`)

   - Main layout wrapper for authenticated pages
   - Includes the Navigation component
   - Provides consistent page structure with container

2. **Navigation** (`/src/components/layout/Navigation.tsx`)

   - Main navigation bar shown at the top of all authenticated pages
   - Contains links to main application sections
   - Integrates with the UserMenu component
   - Uses NavItem components for individual navigation links

3. **UserMenu** (`/src/components/layout/UserMenu.tsx`)

   - Dropdown menu for user-related actions
   - Shows user information, role, and profile options
   - Handles sign-out functionality
   - Accessible throughout the application

4. **NavItem** (`/src/components/layout/NavItem.tsx`)
   - Reusable component for navigation links
   - Handles active state styling automatically
   - Provides consistent appearance for all navigation items

### Authentication Flow

The application uses NextAuth.js for authentication with the following flow:

1. User accesses the application
2. Unauthenticated users are redirected to the login page
3. After login, users are directed to the dashboard
4. Navigation and all authenticated pages check session state

### Main Application Sections

The application is divided into the following main sections:

- **Dashboard**: Overview of key metrics and status
- **Production Orders**: Management of production orders
- **Operations**: Tracking production operations
- **Master Defects**: Monitoring and analyzing defects
- **Reports**: Statistical reports and analytics
- **Settings**: Application configuration

## Component Relationships

```
DashboardLayout
└── Navigation
    ├── NavItem (multiple)
    └── UserMenu
```

This structure ensures:

- Consistent UI across the application
- Clear separation of concerns
- Reusable components
- Maintainable codebase

## Development Guidelines

When working on this project, follow these guidelines:

1. Create new components in the appropriate folder based on their purpose:

   - UI components in `/components/ui/`
   - Layout components in `/components/layout/`
   - Feature-specific components in dedicated feature folders

2. Maintain the established component hierarchy

   - Don't skip intermediate components in the hierarchy
   - Use existing layout components rather than creating new ones

3. Follow the established naming conventions and coding style
   - Use PascalCase for component names
   - Use camelCase for variables and functions
   - Follow the TypeScript interface patterns for props
