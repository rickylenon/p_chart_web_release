# P-Chart Notification System

This document explains the notification system implemented in the P-Chart web application.

## Overview

The notification system allows for event notifications to be sent to users through:
- Database persistence as the primary source of truth
- WebSocket connections for real-time delivery to online users
- UI components for display and interaction

## Notification Types

The system supports different notification types:

1. **System Notifications** (`system`)
   - Application-wide announcements
   - Maintenance alerts
   - Update information

2. **Message Notifications** (`message`)
   - Direct messages from other users
   - Team announcements
   - Shared documents

3. **Defect Edit Notifications** (`defect-edit`)
   - Changes to defect status
   - Edit requests and approvals
   - Defect resolution updates

## Architecture

The notification system follows a clear separation of concerns:

### Backend

- **Database Model**: All notifications are stored in the database as the source of truth
- **API Endpoints**: 
  - `/api/notifications` for creating, fetching, and marking notifications as read
  - Direct database operations from API handlers (recommended approach)
- **WebSocket Integration**: 
  - Secondary mechanism for real-time delivery to connected clients
  - Complements database persistence but doesn't replace it

### Frontend

- **NotificationContext**: React context for centralized notification state management
- **useSocket Hook**: Custom hook for WebSocket connections and real-time updates
- **UI Components**: 
  - Navigation badge showing unread count
  - Notifications page with consolidated view
  - Detail modal for viewing and acting on notifications

## Best Practices

### Creating Notifications

#### Direct Database Creation (Recommended)

For server-side API endpoints, directly create notifications using Prisma:

```javascript
// Example from an API handler
await prisma.notification.create({
  data: {
    type: 'defect-edit',
    title: 'New Defect Edit Request',
    message: `A defect edit has been requested for ${defectName}`,
    userId: adminUser.id,  // Target user ID
    sourceId: entityId.toString(),
    sourceType: 'operationDefectEditRequest',
    linkUrl: '/operation-defects-edit-requests',
    isRead: false
  }
});
```

#### API Endpoint (Alternative)

For client-side code or cross-service notifications:

```javascript
const response = await fetch('/api/notifications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'system',
    title: 'Maintenance Alert',
    message: 'System will be down for maintenance at 10pm',
    linkUrl: '/maintenance-details',  // Optional
    // Target options (choose one):
    targetUserId: '123',              // Specific user
    targetRole: 'admin',              // Role-based targeting
    emitToAll: true                   // Broadcast to all users
  })
});
```

### Real-time Updates with WebSockets

After creating a database notification, emit a WebSocket event for real-time updates:

```javascript
// Only for online users - complementary to database storage
if (isConnected && socket) {
  emit('defect-edit-requested', {
    id: requestId,
    // Other relevant data...
  });
  
  // Update notification counts for affected users
  emit('update-notification-count', {});
}
```

### Handling Notifications

You can register custom handlers for specific notification types:

```javascript
import { useNotification } from '@/contexts/NotificationContext';

function MyComponent() {
  const { registerNotificationHandler } = useNotification();
  
  useEffect(() => {
    // Register a custom handler for defect-edit notifications
    registerNotificationHandler('defect-edit', (notification) => {
      console.log('Custom handling for:', notification);
      // Custom logic here
    });
  }, [registerNotificationHandler]);
  
  // Component code...
}
```

### Querying Notifications

Fetch notifications for the current user:

```javascript
import { useNotification } from '@/contexts/NotificationContext';

function MyComponent() {
  const { notifications, fetchNotifications } = useNotification();
  
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);
  
  // Render notifications...
}
```

### Marking as Read

Mark notifications as read:

```javascript
import { useNotification } from '@/contexts/NotificationContext';

function MyComponent() {
  const { markAsRead } = useNotification();
  
  // Mark a single notification as read
  const handleMarkAsRead = (id) => {
    markAsRead(id);
  };
  
  // Mark all notifications as read
  const handleMarkAllAsRead = () => {
    markAsRead(undefined, undefined, true);
  };
  
  // Mark all notifications of a specific type as read
  const handleMarkTypeAsRead = (type) => {
    markAsRead(undefined, type);
  };
  
  // Component code...
}
```

## UI Components

### Notifications Page

The notifications page (`/notifications`) provides a consolidated view of all notifications:

- Unified list of all notification types
- Sortable columns for easier filtering
- Search functionality for finding specific notifications
- Detail modal with comprehensive information
- "Mark all as read" functionality

### Notification Detail Modal

When clicking on a notification, a detail modal shows:

- Complete notification message (not truncated)
- Timestamp and type information
- Source reference ID
- Action buttons for navigating to linked content
- Automatic marking as read when viewed

## Testing Notifications

### Test Console

Visit the Notification Test Console at `/socket-demo` to:
- Create test notifications
- View real-time notifications
- Test notification display

### Manual Testing

To test notifications:

1. Create an operation defect edit request as an encoder
2. Verify that admin users receive the notification
3. Approve/reject the request as an admin
4. Verify that the encoder receives the resolution notification

## Troubleshooting

Common issues:

1. **Notifications not appearing in real-time**
   - Check WebSocket connection status via browser console (`isConnected: true/false`)
   - Verify room subscriptions for users and roles
   - Database notifications will still work even without WebSocket

2. **Missing notification counts**
   - Check notification database records directly
   - Verify API response in Network tab
   - Ensure `fetchNotifications()` is called on relevant pages

3. **Notifications not being created**
   - Check server logs for database errors
   - Verify that the Prisma model matches the expected schema
   - Test notification creation via the API endpoint directly 