/**
 * ActivityTracker - Utility for detecting and tracking user activity
 *
 * This class manages event listeners for various user interactions and provides
 * debounced activity detection to prevent excessive event firing.
 */

export interface ActivityTrackerOptions {
  debounceMs?: number; // Debounce time for activity events (default: 1000ms)
  activityEvents?: string[]; // Events to consider as activity
  onActivity?: () => void; // Callback when activity is detected
  enabled?: boolean; // Enable/disable activity tracking
}

export class ActivityTracker {
  private lastActivity: Date = new Date();
  private debounceTimer: NodeJS.Timeout | null = null;
  private readonly debounceMs: number;
  private readonly activityEvents: string[];
  private onActivityCallback: () => void;
  private enabled: boolean;
  private eventListenersAttached: boolean = false;

  // Default events to track for user activity
  private static readonly DEFAULT_ACTIVITY_EVENTS = [
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
  ];

  constructor(options: ActivityTrackerOptions = {}) {
    this.debounceMs = options.debounceMs ?? 1000;
    this.activityEvents =
      options.activityEvents ?? ActivityTracker.DEFAULT_ACTIVITY_EVENTS;
    this.onActivityCallback = options.onActivity ?? (() => {});
    this.enabled = options.enabled ?? true;

    console.log("[ActivityTracker] Initialized with options:", {
      debounceMs: this.debounceMs,
      eventsCount: this.activityEvents.length,
      enabled: this.enabled,
    });
  }

  /**
   * Handle activity events with debouncing
   */
  private handleActivity = (event?: Event) => {
    if (!this.enabled) return;

    // Clear existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new debounce timer
    this.debounceTimer = setTimeout(() => {
      const now = new Date();
      this.lastActivity = now;

      console.log("[ActivityTracker] Activity detected:", {
        eventType: event?.type || "manual",
        timestamp: now.toISOString(),
        timeSinceLastActivity: now.getTime() - this.lastActivity.getTime(),
      });

      // Call the activity callback
      this.onActivityCallback();
    }, this.debounceMs);
  };

  /**
   * Start tracking user activity
   */
  public start(): void {
    if (!this.enabled || this.eventListenersAttached) return;

    console.log("[ActivityTracker] Starting activity tracking...");

    // Add event listeners for all activity events
    this.activityEvents.forEach((eventType) => {
      if (eventType === "visibilitychange") {
        document.addEventListener(eventType, this.handleVisibilityChange, {
          passive: true,
        });
      } else {
        document.addEventListener(eventType, this.handleActivity, {
          passive: true,
        });
      }
    });

    this.eventListenersAttached = true;
    this.lastActivity = new Date(); // Reset activity timestamp

    console.log(
      "[ActivityTracker] Activity tracking started with events:",
      this.activityEvents
    );
  }

  /**
   * Stop tracking user activity
   */
  public stop(): void {
    if (!this.eventListenersAttached) return;

    console.log("[ActivityTracker] Stopping activity tracking...");

    // Remove all event listeners
    this.activityEvents.forEach((eventType) => {
      if (eventType === "visibilitychange") {
        document.removeEventListener(eventType, this.handleVisibilityChange);
      } else {
        document.removeEventListener(eventType, this.handleActivity);
      }
    });

    // Clear any pending debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.eventListenersAttached = false;
    console.log("[ActivityTracker] Activity tracking stopped");
  }

  /**
   * Handle page visibility changes
   */
  private handleVisibilityChange = () => {
    if (!this.enabled) return;

    if (document.hidden) {
      console.log("[ActivityTracker] Page became hidden");
      // Don't trigger activity when page becomes hidden
    } else {
      console.log("[ActivityTracker] Page became visible");
      // Trigger activity when page becomes visible again
      this.handleActivity();
    }
  };

  /**
   * Get time since last activity in milliseconds
   */
  public getIdleTime(): number {
    const idleTime = Date.now() - this.lastActivity.getTime();
    console.log("[ActivityTracker] Current idle time:", {
      idleTimeMs: idleTime,
      idleTimeMinutes: Math.floor(idleTime / 60000),
      lastActivity: this.lastActivity.toISOString(),
    });
    return idleTime;
  }

  /**
   * Check if user is currently idle based on timeout
   */
  public isIdle(timeoutMs: number): boolean {
    const idleTime = this.getIdleTime();
    const isIdle = idleTime > timeoutMs;

    console.log("[ActivityTracker] Idle check:", {
      idleTimeMs: idleTime,
      timeoutMs: timeoutMs,
      isIdle: isIdle,
      remainingMs: Math.max(0, timeoutMs - idleTime),
    });

    return isIdle;
  }

  /**
   * Get time remaining until timeout
   */
  public getTimeRemaining(timeoutMs: number): number {
    const idleTime = this.getIdleTime();
    return Math.max(0, timeoutMs - idleTime);
  }

  /**
   * Reset the activity timer manually
   */
  public resetActivity(): void {
    console.log("[ActivityTracker] Manually resetting activity timer");
    this.lastActivity = new Date();
    this.onActivityCallback();
  }

  /**
   * Get last activity timestamp
   */
  public getLastActivity(): Date {
    return new Date(this.lastActivity);
  }

  /**
   * Enable or disable activity tracking
   */
  public setEnabled(enabled: boolean): void {
    console.log("[ActivityTracker] Setting enabled:", enabled);
    this.enabled = enabled;

    if (!enabled && this.eventListenersAttached) {
      this.stop();
    } else if (enabled && !this.eventListenersAttached) {
      this.start();
    }
  }

  /**
   * Update activity callback
   */
  public setOnActivity(callback: () => void): void {
    console.log("[ActivityTracker] Updating activity callback");
    this.onActivityCallback = callback;
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    console.log("[ActivityTracker] Destroying activity tracker...");
    this.stop();
  }
}

/**
 * Create a new ActivityTracker instance with default options
 */
export const createActivityTracker = (
  options?: ActivityTrackerOptions
): ActivityTracker => {
  return new ActivityTracker(options);
};

/**
 * Singleton activity tracker for global use
 */
let globalActivityTracker: ActivityTracker | null = null;

export const getGlobalActivityTracker = (): ActivityTracker => {
  if (!globalActivityTracker) {
    globalActivityTracker = new ActivityTracker();
  }
  return globalActivityTracker;
};

export const destroyGlobalActivityTracker = (): void => {
  if (globalActivityTracker) {
    globalActivityTracker.destroy();
    globalActivityTracker = null;
  }
};
