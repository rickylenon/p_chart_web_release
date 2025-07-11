import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { io } from "socket.io-client";

export default function useSocket(url = "") {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const { data: session, status } = useSession();

  useEffect(() => {
    // Don't initialize socket if session is still loading or user is not authenticated
    if (status === "loading") {
      console.log("useSocket: Session still loading, waiting...");
      return;
    }

    if (status === "unauthenticated" || !session?.user?.id) {
      console.log(
        "useSocket: No authenticated user, skipping socket initialization"
      );
      setIsInitializing(false);
      return;
    }

    console.log(
      "useSocket: Initializing socket connection for authenticated user..."
    );

    let socketInstance = null;

    // First, initialize the socket server
    fetch("/api/socket")
      .then(() => {
        console.log(
          "useSocket: Socket server initialized, creating connection"
        );

        // Create socket connection
        socketInstance = io({
          path: "/api/socketio",
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        // Set up event listeners
        socketInstance.on("connect", () => {
          console.log(
            "useSocket: Socket connected successfully:",
            socketInstance.id
          );
          setIsConnected(true);
          setIsInitializing(false);
        });

        socketInstance.on("connect_error", (err) => {
          console.error("useSocket: Socket connection error:", err.message);
          setIsInitializing(false);
        });

        socketInstance.on("disconnect", () => {
          console.log("useSocket: Socket disconnected");
          setIsConnected(false);
        });

        // Store socket instance
        setSocket(socketInstance);
      })
      .catch((error) => {
        console.error("useSocket: Failed to initialize socket server:", error);
        setIsInitializing(false);
      });

    // Cleanup on unmount
    return () => {
      console.log("useSocket: Cleaning up socket connection");
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [session?.user?.id, status]); // Include status in dependencies

  // Function to subscribe to an event
  const subscribe = useCallback(
    (event, callback) => {
      if (!socket) {
        console.warn(
          `useSocket: Cannot subscribe to ${event}: socket not initialized`
        );
        return () => {};
      }

      console.log(`useSocket: Subscribing to ${event} event`);
      socket.on(event, (data) => {
        console.log(`useSocket: Received ${event} event:`, data);
        setLastMessage({ event, data });
        callback(data);
      });

      return () => {
        console.log(`useSocket: Unsubscribing from ${event} event`);
        socket.off(event);
      };
    },
    [socket]
  );

  // Function to emit an event
  const emit = useCallback(
    (event, data) => {
      if (!socket) {
        console.warn("useSocket: Cannot emit event: socket not initialized");
        return;
      }

      if (!isConnected) {
        console.warn("useSocket: Cannot emit event: socket not connected");
        return;
      }

      console.log(`useSocket: Emitting ${event} event:`, data);
      socket.emit(event, data);
    },
    [socket, isConnected]
  );

  return {
    socket,
    isConnected,
    isInitializing,
    lastMessage,
    subscribe,
    emit,
  };
}
