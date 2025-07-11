import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { useSession } from "next-auth/react";
import useSocket from "@/hooks/useSocket";
import { showCompactToast } from "@/components/ui/compact-toast";
import api from "@/lib/axios";

// Define notification interfaces
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  linkUrl?: string;
  sourceId?: string;
  sourceType?: string;
  metadata?: any;
}

// Define the shape of our context data
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: {
    total: number;
    byType: Record<string, number>;
  };
  socket: any;
  isConnected: boolean;
  emit: (event: string, data: any) => void;
  subscribe: (event: string, callback: (data: any) => void) => () => void;
  fetchNotifications: (type?: string) => Promise<void>;
  markAsRead: (id?: string, type?: string, all?: boolean) => Promise<void>;
  registerNotificationHandler: (
    type: string,
    handler?: (notification: Notification) => void
  ) => void;
}

// Create the context with default values
const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: {
    total: 0,
    byType: {},
  },
  socket: null,
  isConnected: false,
  emit: () => {},
  subscribe: () => () => {},
  fetchNotifications: async () => {},
  markAsRead: async () => {},
  registerNotificationHandler: () => {},
});

// Interface for the provider props
interface NotificationProviderProps {
  children: React.ReactNode;
}

// Custom hook to access the notification context
export const useNotification = () => useContext(NotificationContext);

// Track active notifications to prevent duplicates and limit total number
const activeToasts = new Set<string>();
const MAX_VISIBLE_TOASTS = 3;

// Default notification handler that shows a toast
const defaultNotificationHandler = (notification: Notification) => {
  // Generate a unique key for this notification toast
  const toastKey = `notification-${notification.id}`;

  // Check if we're already showing this toast
  if (activeToasts.has(toastKey)) {
    return;
  }

  // Limit the number of visible toasts
  if (activeToasts.size >= MAX_VISIBLE_TOASTS) {
    return;
  }

  // Add this toast to active toasts
  activeToasts.add(toastKey);

  // Create action object if we have a link URL
  const action = notification.linkUrl
    ? {
        label: "View",
        onClick: () => {
          window.location.href = notification.linkUrl as string;
        },
      }
    : undefined;

  // Show the toast
  showCompactToast(notification.title, notification.message, action, {
    duration: 4000,
    id: toastKey,
  });

  // Remove from active toasts after a delay
  setTimeout(() => {
    activeToasts.delete(toastKey);
  }, 4500); // Add buffer to toast duration
};

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<{
    total: number;
    byType: Record<string, number>;
  }>({
    total: 0,
    byType: {},
  });
  const { data: session } = useSession();

  // Create a stable reference to the session user
  const user = session?.user as { id?: string; role?: string } | undefined;

  // Initialize socket - it will handle authentication internally
  const { socket, isConnected, subscribe, emit } = useSocket();

  // Handlers storage - use a ref object that persists across renders
  const handlersRef = useRef<
    Record<string, ((notification: Notification) => void) | undefined>
  >({});

  // Subscription tracking - this must be a module level variable to prevent all subscription resets
  const subscriptionsRef = useRef<{
    isSetup: boolean;
    cleanupFunctions: Array<() => void>;
  }>({
    isSetup: false,
    cleanupFunctions: [],
  });

  // Skip state updates during initial setup or when not needed
  const skipUpdateRef = useRef(false);
  // Track if initial fetch has been done
  const initialFetchDoneRef = useRef(false);

  // Fetch notifications from the API - use useCallback to create a stable function reference
  const fetchNotifications = useCallback(
    async (type?: string) => {
      if (!user?.id || skipUpdateRef.current) return;

      try {
        console.log(
          "NotificationContext: Fetching notifications",
          type ? `for type: ${type}` : ""
        );

        // First build query params for counts
        const countParams = new URLSearchParams();
        countParams.append("count", "true");
        if (type) {
          countParams.append("type", type);
        }

        // Get notification counts
        const countResponse = await api.get(
          `/api/notifications?${countParams.toString()}`
        );

        if (countResponse.data) {
          console.log(
            "NotificationContext: Received notification counts:",
            countResponse.data
          );

          // Use type assertion to help TypeScript understand the response shape
          interface NotificationCountResponse {
            total: number;
            unread: number;
            byType: Record<string, number>;
          }

          const countData =
            countResponse.data as Partial<NotificationCountResponse>;

          // Update the unread counts with safe defaults
          setUnreadCount({
            total: countData.unread ?? 0,
            byType: countData.byType ?? {},
          });
        }

        // Now fetch the actual notifications data
        const dataParams = new URLSearchParams();
        // Fetch a larger number of notifications for the list
        dataParams.append("limit", "50");
        if (type) {
          dataParams.append("type", type);
        }

        // Get actual notification data
        const dataResponse = await api.get(
          `/api/notifications?${dataParams.toString()}`
        );

        // Define the expected response type for notifications data
        interface NotificationDataResponse {
          notifications: Notification[];
          pagination?: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        }

        if (dataResponse.data) {
          const notificationData =
            dataResponse.data as NotificationDataResponse;

          if (
            notificationData.notifications &&
            notificationData.notifications.length > 0
          ) {
            console.log(
              "NotificationContext: Received notifications data:",
              notificationData.notifications.length,
              "notifications"
            );

            // Update notifications state with the data
            setNotifications(notificationData.notifications);
          } else {
            console.log("NotificationContext: No notifications received");
            // Set empty array to clear any old data
            setNotifications([]);
          }
        }
      } catch (error) {
        console.error(
          "NotificationContext: Error fetching notifications:",
          error
        );
      }
    },
    [user?.id]
  );

  // Mark notifications as read
  const markAsRead = useCallback(
    async (id?: string, type?: string, all?: boolean) => {
      if (!user?.id) return;

      try {
        console.log("NotificationContext: Marking notifications as read", {
          id,
          type,
          all,
        });

        const requestBody: any = {};
        if (id) requestBody.id = id;
        if (type) requestBody.type = type;
        if (all) requestBody.all = true;

        const response = await api.put("/api/notifications", requestBody);

        if (response.data) {
          console.log(
            "NotificationContext: Marked as read response:",
            response.data
          );

          // Refresh notification counts
          await fetchNotifications();

          // Update local notifications list if we have one
          if (id && notifications.length > 0) {
            setNotifications((prev) =>
              prev.map((notif) =>
                notif.id === id ? { ...notif, isRead: true } : notif
              )
            );
          } else if ((type || all) && notifications.length > 0) {
            setNotifications((prev) =>
              prev.map((notif) => {
                if (all || notif.type === type) {
                  return { ...notif, isRead: true };
                }
                return notif;
              })
            );
          }
        }
      } catch (error) {
        console.error("NotificationContext: Error marking as read:", error);
      }
    },
    [user?.id, fetchNotifications]
  );

  // Register a custom notification handler for a specific type
  const registerNotificationHandler = useCallback(
    (type: string, handler?: (notification: Notification) => void) => {
      console.log(
        `NotificationContext: Registering handler for ${type} notifications`
      );
      handlersRef.current[type] = handler;
    },
    []
  );

  // Handle notification receipt - must be stable across renders
  const handleNotification = useCallback(
    (eventName: string, notification: Notification) => {
      console.log(
        `NotificationContext: Received ${eventName} event:`,
        notification
      );

      // Extract the notification type from the event name
      const type = eventName.replace("notification-", "");

      // Check if we have a custom handler for this notification type
      const handler = handlersRef.current[type];

      if (handler) {
        // Use the custom handler
        handler(notification);
      } else {
        // Use the default handler
        defaultNotificationHandler(notification);
      }
    },
    []
  );

  // Fetch notifications when user session is available, regardless of socket status
  useEffect(() => {
    if (!user?.id || initialFetchDoneRef.current) return;

    console.log(
      "NotificationContext: Initial notification fetch after session load"
    );
    initialFetchDoneRef.current = true;

    // Small delay to ensure API is ready
    setTimeout(() => {
      fetchNotifications();
    }, 500);
  }, [user?.id, fetchNotifications]);

  // Initialize WebSocket connection when the user session is loaded
  useEffect(() => {
    if (!user?.id || !isConnected || !socket) return;

    console.log(
      "NotificationContext: User authenticated, setting up socket rooms"
    );

    // Join user-specific room
    emit("join-user-room", user.id);
    console.log(`Joined user room for user ID: ${user.id}`);

    // Join role-specific room if role exists
    if (user.role) {
      emit("join-role-room", user.role);
      console.log(`Joined role room: ${user.role}`);
    }

    // Fetch notification counts when socket is connected (only once)
    setTimeout(() => {
      fetchNotifications();
    }, 100);
  }, [user?.id, user?.role, isConnected, socket, emit, fetchNotifications]);

  // Set up event listeners for notifications - completely separate from the data fetching
  useEffect(() => {
    // Only proceed if connected and not already set up
    if (!isConnected || !socket || subscriptionsRef.current.isSetup) return;

    // Mark as set up immediately
    subscriptionsRef.current.isSetup = true;
    console.log("NotificationContext: Setting up notification event listeners");

    // Clean up any existing subscriptions
    if (subscriptionsRef.current.cleanupFunctions.length > 0) {
      console.log(
        "NotificationContext: Cleaning up existing subscriptions first"
      );
      subscriptionsRef.current.cleanupFunctions.forEach((cleanup) => cleanup());
      subscriptionsRef.current.cleanupFunctions = [];
    }

    // Listen for notification count updates
    const unsubscribeCountUpdate = subscribe(
      "notification-count-update",
      (data: any) => {
        console.log(
          "NotificationContext: Received notification count update event",
          data
        );
        // Use timeout to prevent recursive calls
        setTimeout(() => {
          fetchNotifications(data?.type);
        }, 100);
      }
    );
    subscriptionsRef.current.cleanupFunctions.push(unsubscribeCountUpdate);

    // Subscribe to common notification types
    const notificationTypes = ["defect-edit", "system", "message"];

    notificationTypes.forEach((type) => {
      const eventName = `notification-${type}`;
      console.log(
        `NotificationContext: Setting up subscription for ${eventName}`
      );

      const unsubscribe = subscribe(eventName, (notification: Notification) => {
        handleNotification(eventName, notification);
      });

      subscriptionsRef.current.cleanupFunctions.push(unsubscribe);
    });

    // Clean up all subscriptions when the component unmounts
    return () => {
      console.log("NotificationContext: Cleaning up event subscriptions");

      // Reset subscription state
      subscriptionsRef.current.isSetup = false;

      // Execute all cleanup functions
      subscriptionsRef.current.cleanupFunctions.forEach((cleanup) => cleanup());
      subscriptionsRef.current.cleanupFunctions = [];
    };
  }, [isConnected, socket]); // Removed subscribe and handleNotification to prevent re-runs

  // Create a stable context value that won't cause unnecessary re-renders
  const contextValue = {
    notifications,
    unreadCount,
    socket,
    isConnected,
    emit,
    subscribe,
    fetchNotifications,
    markAsRead,
    registerNotificationHandler,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
