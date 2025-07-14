# P-Chart Authentication with Axios

## Overview

To ensure consistent authentication in API requests, we've created a centralized axios instance with authentication interceptors. This ensures all API calls automatically include the correct auth headers, preventing 401 Unauthorized errors.

## Configuration

The configured axios instance is located at `src/lib/axios.ts` and automatically:

1. Adds authentication headers from the user session in local storage
2. Handles authentication errors (redirects to login when 401s occur)
3. Provides consistent error handling

## How to Use

### Import the Configured Instance

Always import the pre-configured axios instance instead of the standard axios:

```javascript
// ❌ Don't use this:
import axios from 'axios';

// ✅ Use this instead:
import api from '@/lib/axios';
```

### Making API Requests

Use the `api` instance exactly like you would use axios:

```javascript
// GET request
const fetchData = async () => {
  try {
    const response = await api.get('/api/some-endpoint');
    // Process response.data
  } catch (error) {
    // Handle errors
  }
};

// POST request
const createItem = async (data) => {
  try {
    const response = await api.post('/api/items', data);
    // Process response.data
  } catch (error) {
    // Handle errors
  }
};
```

## Troubleshooting 401 Errors

If you're experiencing 401 Unauthorized errors:

1. Check if the user is properly logged in
2. Verify that the UserSession data exists in local storage
3. Look at the console logs for "Adding auth headers to request" to confirm headers are being added
4. Check the Network tab in browser DevTools to see if headers are being sent

## How It Works

The configured axios instance adds these headers automatically:

```
X-User-Id: <user id from local storage>
X-User-Role: <user role from local storage>
```

These headers are processed by the server-side `withAuth` middleware in `src/lib/serverAuth.ts` to authenticate API requests without relying solely on session cookies.

This approach is particularly important for deployed environments where session cookies might behave differently than in local development.

## Testing

To test if your auth headers are working correctly:

```javascript
import { UserSession } from '@/lib/clientAuth';

console.log('Current auth headers:', UserSession.getAuthHeaders());
```

This should output headers containing X-User-Id and X-User-Role if the user is logged in. 