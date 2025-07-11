import { useState, useEffect, useCallback, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { ActivityTracker } from "@/lib/activityTracker";
import { UserSession } from "@/lib/clientAuth";

// Hook options interface
export interface UseIdleTimeoutOptions {
  timeout?: number; // Idle timeout in milliseconds (default: 30 minutes)
  warningTime?: number; // Warning time before logout (default: 5 minutes)
  onIdle?: () => void; // Callback when user becomes idle
  onWarning?: () => void; // Callback when warning should be shown
  onActivity?: () => void; // Callback when user activity detected
  enabled?: boolean; // Enable/disable idle timeout
  checkInterval?: number; // How often to check for idle state (default: 1 minute)
}

// Hook return interface
export interface UseIdleTimeoutReturn {
  isIdle: boolean;
  timeRemaining: number;
  showWarning: boolean;
  resetTimer: () => void;
  extendSession: () => void;
  lastActivity: Date | null;
  isEnabled: boolean;
}

// Default configuration based on environment variables
const DEFAULT_TIMEOUT =
  parseInt(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES || "30") * 60 * 1000; // 30 minutes
const DEFAULT_WARNING_TIME =
  parseInt(process.env.NEXT_PUBLIC_IDLE_WARNING_MINUTES || "5") * 60 * 1000; // 5 minutes
const DEFAULT_CHECK_INTERVAL =
  parseInt(process.env.NEXT_PUBLIC_IDLE_CHECK_INTERVAL_SECONDS || "60") * 1000; // 1 minute

/**
 * Custom hook for managing idle timeout functionality
 *
 * This hook provides a complete idle timeout solution with activity tracking,
 * warnings, and automatic logout functionality.
 */
export const useIdleTimeout = (
  options: UseIdleTimeoutOptions = {}
): UseIdleTimeoutReturn => {
  const { data: session } = useSession();

  // Extract options with defaults
  const {
    timeout = DEFAULT_TIMEOUT,
    warningTime = DEFAULT_WARNING_TIME,
    onIdle,
    onWarning,
    onActivity,
    enabled = true,
    checkInterval = DEFAULT_CHECK_INTERVAL,
  } = options;

  // State management
  const [isIdle, setIsIdle] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeout);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);

  // Refs for stable references
  const activityTrackerRef = useRef<ActivityTracker | null>(null);
  const checkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onIdleRef = useRef(onIdle);
  const onWarningRef = useRef(onWarning);
  const onActivityRef = useRef(onActivity);

  // Update refs when callbacks change
  useEffect(() => {
    onIdleRef.current = onIdle;
    onWarningRef.current = onWarning;
    onActivityRef.current = onActivity;
  }, [onIdle, onWarning, onActivity]);

  // Determine if idle timeout should be enabled
  const isEnabled =
    enabled &&
    !!session?.user &&
    process.env.NEXT_PUBLIC_DISABLE_IDLE_TIMEOUT_DEV !== "true";

  // Get role-specific timeout
  const getRoleTimeout = useCallback(() => {
    const userRole = (session?.user as any)?.role?.toLowerCase() || "user";
    const adminTimeout =
      parseInt(process.env.NEXT_PUBLIC_IDLE_ADMIN_TIMEOUT_MINUTES || "60") *
      60 *
      1000;

    if (userRole === "admin") {
      return adminTimeout;
    }
    return timeout;
  }, [session?.user, timeout]);

  // Calculate warning and idle states
  const calculateState = useCallback(
    (timeRem: number) => {
      const shouldShowWarning = timeRem <= warningTime && timeRem > 0;
      const shouldBeIdle = timeRem <= 0;

      return {
        showWarning: shouldShowWarning,
        isIdle: shouldBeIdle,
        warningProgress: Math.max(0, (warningTime - timeRem) / warningTime),
      };
    },
    [warningTime]
  );

  // Handle user activity
  const handleActivity = useCallback(() => {
    if (!isEnabled) return;

    const now = new Date();
    setLastActivity(now);

    // Update UserSession if available
    if (UserSession?.updateLastActivity) {
      UserSession.updateLastActivity();
    }

    // Reset states if currently in warning or idle
    if (showWarning || isIdle) {
      setShowWarning(false);
      setIsIdle(false);
    }

    // Call activity callback
    if (onActivityRef.current) {
      onActivityRef.current();
    }

    console.log("[useIdleTimeout] Activity detected:", now.toISOString());
  }, [isEnabled, showWarning, isIdle]);

  // Reset timer manually
  const resetTimer = useCallback(() => {
    console.log("[useIdleTimeout] Timer reset manually");
    handleActivity();
  }, [handleActivity]);

  // Extend session
  const extendSession = useCallback(async () => {
    try {
      console.log("[useIdleTimeout] Extending session...");

      // Reset the activity timer
      resetTimer();

      // Try to refresh NextAuth session if available
      if (session) {
        // Session is already fresh, just update the activity timestamp
        UserSession.updateLastActivity();
      }

      console.log("[useIdleTimeout] Session extended successfully");
    } catch (error) {
      console.error("[useIdleTimeout] Failed to extend session:", error);

      // Clear session on failure
      if (UserSession?.clearSession) {
        UserSession.clearSession();
      }
    }
  }, [resetTimer, session]);

  // Handle idle timeout
  const handleIdleTimeout = useCallback(async () => {
    try {
      console.log("[useIdleTimeout] User has been idle - initiating logout");

      // Set idle state
      setIsIdle(true);

      // Call idle callback
      if (onIdleRef.current) {
        onIdleRef.current();
      }

      // Clear local session
      if (UserSession?.clearSession) {
        UserSession.clearSession();
      }

      // Sign out
      await signOut({
        redirect: true,
        callbackUrl: "/auth/login?expired=true",
      });
    } catch (error) {
      console.error("[useIdleTimeout] Error during idle logout:", error);
      // Fallback redirect
      window.location.href = "/auth/login?expired=true";
    }
  }, []);

  // Check idle status
  const checkIdleStatus = useCallback(() => {
    if (!isEnabled || !activityTrackerRef.current) return;

    const roleTimeout = getRoleTimeout();
    const currentTimeRemaining =
      activityTrackerRef.current.getTimeRemaining(roleTimeout);
    const state = calculateState(currentTimeRemaining);

    setTimeRemaining(currentTimeRemaining);

    // Handle warning state
    if (state.showWarning && !showWarning) {
      setShowWarning(true);
      if (onWarningRef.current) {
        onWarningRef.current();
      }
    } else if (!state.showWarning && showWarning) {
      setShowWarning(false);
    }

    // Handle idle state
    if (state.isIdle && !isIdle) {
      handleIdleTimeout();
    }

    console.log("[useIdleTimeout] Status check:", {
      timeRemaining: currentTimeRemaining,
      showWarning: state.showWarning,
      isIdle: state.isIdle,
      roleTimeout: roleTimeout,
    });
  }, [
    isEnabled,
    getRoleTimeout,
    calculateState,
    showWarning,
    isIdle,
    handleIdleTimeout,
  ]);

  // Initialize activity tracker
  useEffect(() => {
    if (!isEnabled) {
      // Clean up if disabled
      if (activityTrackerRef.current) {
        activityTrackerRef.current.destroy();
        activityTrackerRef.current = null;
      }
      return;
    }

    console.log("[useIdleTimeout] Initializing activity tracker...");

    // Create activity tracker
    const tracker = new ActivityTracker({
      debounceMs: 1000,
      onActivity: handleActivity,
      enabled: true,
    });

    tracker.start();
    activityTrackerRef.current = tracker;

    // Set initial last activity
    setLastActivity(tracker.getLastActivity());

    return () => {
      if (activityTrackerRef.current) {
        activityTrackerRef.current.destroy();
        activityTrackerRef.current = null;
      }
    };
  }, [isEnabled, handleActivity]);

  // Setup periodic checking
  useEffect(() => {
    if (!isEnabled) {
      // Clean up timer if disabled
      if (checkTimerRef.current) {
        clearInterval(checkTimerRef.current);
        checkTimerRef.current = null;
      }
      return;
    }

    // Start periodic checking
    const timer = setInterval(checkIdleStatus, checkInterval);
    checkTimerRef.current = timer;

    // Run initial check
    checkIdleStatus();

    return () => {
      if (checkTimerRef.current) {
        clearInterval(checkTimerRef.current);
        checkTimerRef.current = null;
      }
    };
  }, [isEnabled, checkInterval, checkIdleStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activityTrackerRef.current) {
        activityTrackerRef.current.destroy();
      }
      if (checkTimerRef.current) {
        clearInterval(checkTimerRef.current);
      }
    };
  }, []);

  return {
    isIdle,
    timeRemaining,
    showWarning,
    resetTimer,
    extendSession,
    lastActivity,
    isEnabled,
  };
};

export default useIdleTimeout;
