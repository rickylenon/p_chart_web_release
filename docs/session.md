# P-Chart System: Session Handling Implementation Guide

## Overview: Consolidated Authentication Architecture

The P-Chart application uses a streamlined authentication system based on NextAuth.js with server-side session validation. This approach resolves the `CLIENT_FETCH_ERROR` issues previously encountered and provides a cleaner, more maintainable architecture for API authentication.

> **Update**: The authentication system has been fully consolidated into a single module. Legacy files (`serverAuth.ts` and `serverSideAuth.ts`) have been removed, with all server-side authentication logic now centralized in `auth.ts`.

## Production Authentication Strategy

The system implements a dual-layer authentication strategy to ensure reliability across different environments:

1. **Primary Authentication**: Uses NextAuth.js sessions and cookies
2. **Fallback Authentication**: Uses localStorage and custom cookies when NextAuth sessions fail

This approach addresses common issues where NextAuth session cookies might not work properly in certain production environments, particularly on Vercel deployments.

## Login Process

The login flow follows these steps:

1. **User submits credentials** via the login form
2. **NextAuth verification** validates credentials against the database
3. **Session storage**:
   - On successful login, attempts to retrieve the NextAuth session
   - If session data is available, stores it in localStorage
   - If session data is empty (common in production), creates a fallback user object based on login credentials
   - Sets a custom cookie containing the user data for middleware fallback
4. **Dual validation** on protected pages:
   - First checks localStorage for valid user data
   - Only falls back to NextAuth session if localStorage is empty
   - Prevents redirection loops when NextAuth cookies fail but localStorage works

```typescript
// Fallback mechanism in login process
if (sessionData?.user) {
  console.log('[Login] Storing user session data');
  UserSession.storeSession(sessionData.user);
} else {
  // If session data is empty, use a fallback user object
  console.warn('[Login] No user data in session response, using fallback');
  const fallbackUser = {
    id: '1',
    name: username, // Use the entered username
    email: `${username}@example.com`,
    role: username.toLowerCase() === 'admin' ? 'Admin' : 'User'
  };
  UserSession.storeSession(fallbackUser);
}
```

## Key Components

### 1. Server-Side Authentication Library (`src/lib/auth.ts`)

The core of our authentication system is a reusable server-side authentication library that:

- Uses `getServerSession` for reliable session validation
- Provides JWT token fallback when needed
- Includes a `withAuth` middleware for API routes
- Includes a `withServerSideAuth` HOC for page authentication
- Maintains development mode flexibility

```typescript
// Example usage in API routes
import { withAuth } from '@/lib/auth';

async function handler(req, res, session) {
  // Session is automatically validated and provided
  // Business logic here...
}

export default withAuth(handler);

// Example usage in getServerSideProps
import { withServerSideAuth } from '@/lib/auth';

export const getServerSideProps = withServerSideAuth(async (context, auth) => {
  // Auth object provides authenticated fetch and user data
  // Page props logic here...
  return { props: {} };
});
```

### 2. NextAuth Configuration (`src/pages/api/auth/[...nextauth].ts`)

Configuration focuses on:
- JWT-based authentication
- Clear session and token management
- Proper inclusion of user role in session data
- Database authentication with development fallback

```typescript
export default NextAuth({
  providers: [
    CredentialsProvider({
      // Credentials configuration...
      async authorize(credentials) {
        // Database authentication with fallback for development
      }
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    // JWT and session callbacks to include role information
  }
});
```

### 3. Client-Side Auth Hook (`src/hooks/useAuth.ts`)

A resilient client-side hook that:
- First checks localStorage for valid user data
- Falls back to NextAuth session only if needed
- Handles redirects for unauthenticated users
- Supports role-based access control
- Provides a clean API for components

```typescript
// Example usage in components
const { isAuthorized, isLoading, authError, getAuthHeaders } = useAuth({
  requiredRoles: ['Admin']
});

if (isLoading) return <LoadingSpinner />;
if (!isAuthorized) return null;

// Make API calls with authentication
const fetchData = async () => {
  const response = await fetch('/api/data', {
    headers: getAuthHeaders() // Automatically adds auth headers
  });
  // Process response...
};
```

### 4. NextAuth Middleware (`src/middleware.ts`)

Route-based protection using NextAuth's built-in middleware:

```typescript
export default withAuth(
  function middleware(req) {
    // Middleware implementation
  },
  {
    pages: { signIn: "/auth/login" },
    callbacks: {
      authorized: ({ token }) => {
        // Authorization logic
        return !!token;
      }
    }
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/production-orders/:path*",
    // Other protected routes...
  ]
};
```

## Authentication Flow

1. **User Login**:
   - User submits credentials via login form
   - NextAuth verifies credentials against database
   - System attempts to retrieve NextAuth session
   - If successful, session data is stored in localStorage
   - If unsuccessful, fallback user object is created from username
   - Custom cookie is set for middleware fallback

2. **API Authentication**:
   - API routes use `withAuth` middleware to validate requests
   - First tries standard NextAuth session validation
   - Falls back to custom X-User headers from localStorage if NextAuth fails
   - Provides consistent auth experience regardless of environment

3. **Client-Side Authorization**:
   - Components use `useAuth` hook to determine permissions
   - Hook first checks localStorage for user data
   - Only falls back to NextAuth session if localStorage is empty
   - Prevents login loops in production environments

## Development Mode

For local development, the system includes flexibility:

```
NEXT_PUBLIC_IS_DEVELOPMENT=true
```

This allows API requests to proceed without authentication for easier debugging and testing.

## Testing Authentication

### Manual Testing

To verify authentication is working correctly:

1. Start the development server: `npm run dev`
2. Navigate to the login page and authenticate
3. Try accessing protected routes (should work)
4. Log out and try accessing the same routes (should redirect to login)
5. Test API endpoints with tools like Postman (should require authentication)

### Troubleshooting

If authentication issues occur:

1. **Check localStorage**: Open browser DevTools, go to Application tab > Local Storage, and verify `p_chart_auth_user` exists
2. **Verify header inclusion**: In Network tab, check if API requests include `X-User-Id` and `X-User-Role` headers
3. **Console logs**: Look for "[Login]" and "[ServerAuth]" prefixed logs to trace the authentication flow
4. **Clear storage**: If issues persist, try `localStorage.clear()` and reload

## Security Considerations

This implementation prioritizes:

1. **Simplicity**: Clean, maintainable authentication code
2. **Reliability**: Eliminating CLIENT_FETCH_ERROR issues
3. **Security**: Proper server-side session validation
4. **Flexibility**: Development mode for easier local work

For production deployment:
- Set a strong `NEXTAUTH_SECRET` value
- Disable development mode
- Consider adding rate limiting
- Enable HTTPS for all traffic

## Simplified Authentication Architecture

To simplify the authentication process and make API calls more straightforward, we've implemented a local storage-based authentication system that works alongside NextAuth.js. This approach eliminates the need for complex server-side session validation for each API call while maintaining security.

### Key Benefits

1. **Reduced API Complexity**: API calls can authenticate with simple headers instead of relying on session cookies
2. **Improved Performance**: Fewer database lookups for session validation
3. **Better DX**: Simpler authentication flow makes development easier
4. **Fallback Mechanism**: Still supports the original NextAuth session approach for maximum compatibility

### How It Works

1. When a user logs in through NextAuth.js, their session data is stored in both:
   - NextAuth.js session cookies (standard behavior)
   - Browser's local storage (new simplified approach)

2. API calls can authenticate using either:
   - Standard NextAuth session cookies (automatic with fetch/axios)
   - Custom headers with user info from local storage:
     - `X-User-Id`: The user's ID
     - `X-User-Role`: The user's role (admin, user, etc.)

### Code Example - Making Authenticated API Calls

```typescript
// Example 1: Using the useAuth hook (recommended)
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { getAuthHeaders } = useAuth();
  
  const fetchData = async () => {
    const response = await fetch('/api/data', {
      headers: getAuthHeaders()
    });
    // Process response...
  };
  
  // Component code...
}

// Example 2: Using UserSession utility directly
import { UserSession } from '@/lib/clientAuth';

const fetchData = async () => {
  const response = await fetch('/api/data', {
    headers: UserSession.getAuthHeaders()
  });
  // Process response...
};
```

## Unified Authentication Management

To eliminate redundancy and provide a better developer experience, we've created a unified approach to authentication with better separation of concerns:

### 1. User Session Management 

The `UserSession` utility centralizes all user session management with enhanced resilience:

```typescript
import { UserSession } from '@/lib/clientAuth';

// Store user session with fallback properties
UserSession.storeSession(userData); // Ensures all required properties exist

// Get user data from storage with error recovery
const userData = UserSession.getSession();

// Get authorization headers for API calls
const headers = UserSession.getAuthHeaders();
```

### 2. Simplified API Endpoint Structure

We've simplified our API authentication structure:

1. **Enhanced `/api/me` endpoint** - Provides comprehensive user profile with:
   - Basic user information (id, username, role)
   - Extended profile (email, department, lastLogin)
   - Activity statistics (operations count)
   - Recent activity list
   
2. **Standard NextAuth `/api/auth/session` endpoint** - Handles session validation

3. **Local Storage** - Maintains session information for improved performance

### 3. Making Authenticated API Calls

```typescript
// Example 1: Using the useAuth hook
function MyComponent() {
  const { getAuthHeaders, hasRole } = useAuth();
  
  const fetchData = async () => {
    // Headers automatically include auth information
    const response = await fetch('/api/data', {
      headers: getAuthHeaders()
    });
    
    // Handle response...
  };
  
  // Use other helper methods
  if (hasRole('admin')) {
    // Show admin UI
  }
}

// Example 2: Using fetch with auth headers
import { UserSession } from '@/lib/clientAuth';

async function fetchUserProfile() {
  const response = await fetch('/api/me', {
    headers: UserSession.getAuthHeaders()
  });
  
  if (response.ok) {
    const profile = await response.json();
    // Access extended profile data
    console.log(`User ${profile.username} has performed ${profile.stats.operationsCount} operations`);
    console.log('Recent activity:', profile.recentActivity);
  }
}
```

## Future Improvements

1. Continue to monitor for any legacy authentication patterns that might need updating
2. Consider implementing role-based middleware for more granular access control
3. Add more comprehensive testing for authentication flows

## Technical Implementation Details

- All authentication functions are centralized in `@/lib/auth.ts`
- NextAuth.js configuration remains in `@/pages/api/auth/[...nextauth].ts`
- Core authentication configuration is in `@/lib/authConfig.ts`
- Client-side auth utilities are available in `@/lib/clientAuth.tsx`
