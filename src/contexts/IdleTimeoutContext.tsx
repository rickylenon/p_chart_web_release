import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { ActivityTracker } from "@/lib/activityTracker";
import { UserSession } from "@/lib/clientAuth";

// Configuration interface for idle timeout
export interface IdleTimeoutConfig {
  // Core timeout settings
  idleTimeout: number; // Idle timeout in milliseconds
  warningTime: number; // Warning time before logout
  checkInterval: number; // How often to check for idle state

  // Activity detection settings
  activityDebounce: number; // Debounce time for activity events
  activityEvents: string[]; // Events to consider as activity

  // User experience settings
  showWarningModal: boolean; // Show warning modal before logout
  showStatusIndicator: boolean; // Show session status indicator

  // Role-based settings
  roleTimeouts: Record<string, number>; // Different timeouts per role

  // Development settings
  enabled: boolean; // Enable/disable idle timeout
  debugMode: boolean; // Enable debug logging
}

// Context type definition
export interface IdleTimeoutContextType {
  config: IdleTimeoutConfig;
  isIdle: boolean;
  showWarning: boolean;
  timeRemaining: number;
  lastActivity: Date;
  resetTimer: () => void;
  extendSession: () => void;
  updateConfig: (config: Partial<IdleTimeoutConfig>) => void;
  isEnabled: boolean;
}

// Default configuration
const DEFAULT_CONFIG: IdleTimeoutConfig = {
  // Core timeout settings (30 minutes default, 5 minutes warning)
  idleTimeout:
    parseInt(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES || "30") * 60 * 1000,
  warningTime:
    parseInt(process.env.NEXT_PUBLIC_IDLE_WARNING_MINUTES || "5") * 60 * 1000,
  checkInterval:
    parseInt(process.env.NEXT_PUBLIC_IDLE_CHECK_INTERVAL_SECONDS || "60") *
    1000,

  // Activity detection settings
  activityDebounce: 1000, // 1 second
  activityEvents: [
    "mousemove",
    "mousedown",
    "click",
    "keydown",
    "keypress",
    "touchstart",
    "touchmove",
    "focus",
    "blur",
    "visibilitychange",
  ],

  // User experience settings
  showWarningModal: true,
  showStatusIndicator: false,

  // Role-based settings (Updated per client directive: 5 min viewer, 15 min encoder, 30 min admin)
  roleTimeouts: {
    admin:
      parseInt(process.env.NEXT_PUBLIC_IDLE_ADMIN_TIMEOUT_MINUTES || "30") *
      60 *
      1000,
    encoder:
      parseInt(process.env.NEXT_PUBLIC_IDLE_ENCODER_TIMEOUT_MINUTES || "15") *
      60 *
      1000,
    viewer:
      parseInt(process.env.NEXT_PUBLIC_IDLE_VIEWER_TIMEOUT_MINUTES || "5") *
      60 *
      1000,
    user:
      parseInt(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES || "30") *
      60 *
      1000,
  },

  // Development settings
  enabled:
    process.env.NEXT_PUBLIC_DISABLE_IDLE_TIMEOUT_DEV !== "true" ||
    process.env.NODE_ENV === "production",
  debugMode: process.env.NODE_ENV === "development",
};

// Create the context
const IdleTimeoutContext = createContext<IdleTimeoutContextType | undefined>(
  undefined
);

// Hook to use the idle timeout context
export const useIdleTimeout = (): IdleTimeoutContextType => {
  const context = useContext(IdleTimeoutContext);
  if (context === undefined) {
    throw new Error(
      "useIdleTimeout must be used within an IdleTimeoutProvider"
    );
  }
  return context;
};

// Provider component props
interface IdleTimeoutProviderProps {
  children: ReactNode;
  initialConfig?: Partial<IdleTimeoutConfig>;
}

// Provider component
export const IdleTimeoutProvider: React.FC<IdleTimeoutProviderProps> = ({
  children,
  initialConfig = {},
}) => {
  const { data: session } = useSession();
  const [config, setConfig] = useState<IdleTimeoutConfig>(() => ({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  }));

  const [isIdle, setIsIdle] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [lastActivity, setLastActivity] = useState(new Date());
  const [activityTracker, setActivityTracker] =
    useState<ActivityTracker | null>(null);
  const [checkTimer, setCheckTimer] = useState<NodeJS.Timeout | null>(null);

  // Determine if idle timeout should be enabled
  const isEnabled = config.enabled && !!session?.user;

  // Get role-specific timeout
  const getRoleTimeout = useCallback(() => {
    const userRole = (session?.user as any)?.role?.toLowerCase() || "user";
    return config.roleTimeouts[userRole] || config.idleTimeout;
  }, [session?.user, config.roleTimeouts, config.idleTimeout]);

  // Get appropriate warning time based on role timeout
  const getRoleWarningTime = useCallback(() => {
    const roleTimeout = getRoleTimeout();
    const userRole = (session?.user as any)?.role?.toLowerCase() || "user";

    // Calculate proportional warning time, but with smart minimums
    if (userRole === "viewer") {
      // For 5-minute timeout, warn at 2 minutes remaining
      return Math.min(2 * 60 * 1000, roleTimeout * 0.4);
    } else if (userRole === "encoder") {
      // For 15-minute timeout, warn at 5 minutes remaining
      return Math.min(5 * 60 * 1000, roleTimeout * 0.33);
    } else {
      // For admin/default, use standard 5-minute warning
      return Math.min(config.warningTime, roleTimeout * 0.25);
    }
  }, [getRoleTimeout, session?.user, config.warningTime]);

  // Calculate warning state
  const calculateWarningState = useCallback(
    (timeRem: number) => {
      const warningTime = getRoleWarningTime();
      return {
        showWarning: timeRem <= warningTime && timeRem > 0,
        isIdle: timeRem <= 0,
        warningProgress: Math.max(0, (warningTime - timeRem) / warningTime),
      };
    },
    [getRoleWarningTime]
  );

  // Handle activity detection
  const handleActivity = useCallback(() => {
    if (!isEnabled) return;

    const now = new Date();
    setLastActivity(now);

    // Update UserSession last activity if available
    if (UserSession?.updateLastActivity) {
      UserSession.updateLastActivity();
    }

    if (config.debugMode) {
      console.log("[IdleTimeout] Activity detected:", now.toISOString());
    }

    // Reset warning and idle states if currently active
    if (showWarning || isIdle) {
      setShowWarning(false);
      setIsIdle(false);
    }
  }, [isEnabled, config.debugMode, showWarning, isIdle]);

  // Reset timer function
  const resetTimer = useCallback(() => {
    if (config.debugMode) {
      console.log("[IdleTimeout] Timer reset manually");
    }
    handleActivity();
  }, [handleActivity, config.debugMode]);

  // Extend session function
  const extendSession = useCallback(async () => {
    try {
      if (config.debugMode) {
        console.log("[IdleTimeout] Extending session...");
      }

      // Reset the activity timer
      resetTimer();

      // Try to refresh NextAuth session if available
      if (session) {
        // Session is already fresh, just update the activity timestamp
        UserSession.updateLastActivity();
      }

      console.log("[IdleTimeout] Session extended successfully");
    } catch (error) {
      console.error("[IdleTimeout] Failed to extend session:", error);

      // If session extension fails, we might need to logout
      // This will be handled by the auth system
      const { UserSession } = await import("@/lib/clientAuth");
      if (UserSession?.clearSession) {
        UserSession.clearSession();
      }
    }
  }, [resetTimer, session, config.debugMode]);

  // Update configuration
  const updateConfig = useCallback(
    (newConfig: Partial<IdleTimeoutConfig>) => {
      if (config.debugMode) {
        console.log("[IdleTimeout] Updating configuration:", newConfig);
      }
      setConfig((prev) => ({ ...prev, ...newConfig }));
    },
    [config.debugMode]
  );

  // Handle logout due to idle timeout
  const handleIdleLogout = useCallback(async () => {
    try {
      console.log("[IdleTimeout] User idle timeout - logging out");

      // Clear local session data comprehensively
      const { UserSession } = await import("@/lib/clientAuth");
      if (UserSession?.clearSession) {
        UserSession.clearSession();
      }

      // Sign out from NextAuth without redirect
      const { signOut } = await import("next-auth/react");
      await signOut({
        redirect: false,
      });

      // Force redirect to ensure clean state
      setTimeout(() => {
        window.location.href = "/auth/login?expired=true";
      }, 100);
    } catch (error) {
      console.error("[IdleTimeout] Error during idle logout:", error);
      // Fallback: redirect to login page
      window.location.href = "/auth/login?expired=true";
    }
  }, []);

  // Check idle status periodically
  const checkIdleStatus = useCallback(() => {
    if (!isEnabled || !activityTracker) return;

    const roleTimeout = getRoleTimeout();
    const currentTimeRemaining = activityTracker.getTimeRemaining(roleTimeout);
    const warningState = calculateWarningState(currentTimeRemaining);

    setTimeRemaining(currentTimeRemaining);
    setShowWarning(warningState.showWarning);

    if (warningState.isIdle && !isIdle) {
      setIsIdle(true);
      handleIdleLogout();
    }

    if (config.debugMode) {
      console.log("[IdleTimeout] Status check:", {
        timeRemaining: currentTimeRemaining,
        showWarning: warningState.showWarning,
        isIdle: warningState.isIdle,
        roleTimeout: roleTimeout,
        warningTime: getRoleWarningTime(),
        userRole: (session?.user as any)?.role?.toLowerCase() || "user",
      });
    }
  }, [
    isEnabled,
    activityTracker,
    getRoleTimeout,
    calculateWarningState,
    isIdle,
    handleIdleLogout,
    config.debugMode,
    session?.user,
  ]);

  // Initialize activity on session start
  useEffect(() => {
    if (isEnabled && session?.user) {
      // Ensure we have proper initial activity timestamp
      const lastActivityStr = localStorage.getItem("p_chart_last_activity");
      const currentUserId = (session.user as any)?.id;

      if (!lastActivityStr) {
        console.log(
          "[IdleTimeout] No initial activity found, setting current time"
        );
        UserSession.updateLastActivity();
        setLastActivity(new Date());
      } else {
        try {
          // Try parsing as new format (object with user isolation)
          const activityData = JSON.parse(lastActivityStr);
          if (activityData.userId && activityData.timestamp) {
            // Check if activity belongs to current user
            if (activityData.userId === currentUserId) {
              const lastActivityDate = new Date(activityData.timestamp);
              if (isNaN(lastActivityDate.getTime())) {
                console.log(
                  "[IdleTimeout] Invalid activity timestamp for current user, resetting"
                );
                UserSession.updateLastActivity();
                setLastActivity(new Date());
              } else {
                console.log(
                  "[IdleTimeout] Using existing activity for current user:",
                  {
                    userId: activityData.userId,
                    timestamp: lastActivityDate.toISOString(),
                  }
                );
                setLastActivity(lastActivityDate);
              }
            } else {
              console.log(
                "[IdleTimeout] Activity belongs to different user, resetting for new user"
              );
              localStorage.removeItem("p_chart_last_activity");
              UserSession.updateLastActivity();
              setLastActivity(new Date());
            }
          } else {
            console.log(
              "[IdleTimeout] Invalid activity data format, resetting"
            );
            UserSession.updateLastActivity();
            setLastActivity(new Date());
          }
        } catch (error) {
          // Might be old format, try parsing as date string
          try {
            const lastActivityDate = new Date(lastActivityStr);
            if (isNaN(lastActivityDate.getTime())) {
              console.log(
                "[IdleTimeout] Invalid old format timestamp, resetting"
              );
              UserSession.updateLastActivity();
              setLastActivity(new Date());
            } else {
              console.log(
                "[IdleTimeout] Converting old format timestamp to new format"
              );
              setLastActivity(lastActivityDate);
              UserSession.updateLastActivity(); // This will convert to new format
            }
          } catch (parseError) {
            console.log(
              "[IdleTimeout] Error parsing activity timestamp, resetting"
            );
            UserSession.updateLastActivity();
            setLastActivity(new Date());
          }
        }
      }
    }
  }, [isEnabled, session?.user?.id]); // Include user ID to detect user changes

  // Initialize activity tracker
  useEffect(() => {
    if (!isEnabled) {
      if (activityTracker) {
        activityTracker.destroy();
        setActivityTracker(null);
      }
      return;
    }

    // Only create tracker if we don't have one or if it's been destroyed
    if (!activityTracker) {
      if (config.debugMode) {
        console.log("[IdleTimeout] Initializing activity tracker...");
      }

      const tracker = new ActivityTracker({
        debounceMs: config.activityDebounce,
        activityEvents: config.activityEvents,
        onActivity: handleActivity,
        enabled: true,
      });

      tracker.start();
      setActivityTracker(tracker);
    }

    return () => {
      // Only cleanup when component unmounts, not on every dependency change
    };
  }, [isEnabled]); // Only depend on isEnabled to prevent unnecessary recreations

  // Update activity tracker when handleActivity changes
  useEffect(() => {
    if (activityTracker && handleActivity) {
      activityTracker.setOnActivity(handleActivity);
    }
  }, [activityTracker, handleActivity]);

  // Setup periodic idle checking
  useEffect(() => {
    if (!isEnabled) {
      if (checkTimer) {
        clearInterval(checkTimer);
        setCheckTimer(null);
      }
      return;
    }

    const timer = setInterval(checkIdleStatus, config.checkInterval);
    setCheckTimer(timer);

    // Run initial check
    checkIdleStatus();

    return () => {
      clearInterval(timer);
    };
  }, [isEnabled, config.checkInterval, checkIdleStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activityTracker) {
        activityTracker.destroy();
      }
      if (checkTimer) {
        clearInterval(checkTimer);
      }
    };
  }, []);

  // Context value
  const contextValue: IdleTimeoutContextType = {
    config,
    isIdle,
    showWarning,
    timeRemaining,
    lastActivity,
    resetTimer,
    extendSession,
    updateConfig,
    isEnabled,
  };

  if (config.debugMode) {
    console.log("[IdleTimeout] Provider render:", {
      isEnabled,
      isIdle,
      showWarning,
      timeRemaining,
      hasSession: !!session,
    });
  }

  return (
    <IdleTimeoutContext.Provider value={contextValue}>
      {children}
    </IdleTimeoutContext.Provider>
  );
};

export default IdleTimeoutProvider;
