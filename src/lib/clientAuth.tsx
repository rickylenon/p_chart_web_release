import { NextPage } from "next";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { getSessionUrl } from "@/lib/authConfig";

// Local storage key for user session data
const LOCAL_AUTH_KEY = "p_chart_auth_user";

// Helper function to normalize role
const normalizeRole = (role: string): string => {
  // Convert to lowercase first
  const lowercaseRole = role.toLowerCase();
  // Capitalize first letter
  const normalizedRole =
    lowercaseRole.charAt(0).toUpperCase() + lowercaseRole.slice(1);
  console.log(`[Client] Role normalization: ${role} -> ${normalizedRole}`);
  return normalizedRole;
};

/**
 * Utility functions to manage user session data in local storage
 */
export const UserSession = {
  /**
   * Store user session in local storage
   */
  storeSession: (userData: any) => {
    if (typeof window !== "undefined") {
      try {
        console.log("[Client] Storing user session - Original data:", userData);

        // Check if this is a different user logging in
        const existingSession = UserSession.getSession();
        const isUserChange =
          existingSession && existingSession.id !== userData.id;

        if (isUserChange) {
          console.log(
            "[Client] Different user logging in, clearing previous session data"
          );
          // Clear all session-related data for the previous user
          localStorage.removeItem(LOCAL_AUTH_KEY);
          localStorage.removeItem("p_chart_last_activity");
        }

        // Ensure we have at least the basic user properties and normalize role
        const normalizedRole = normalizeRole(userData.role || "User");
        console.log("[Client] Normalized role for storage:", normalizedRole);

        const safeUserData = {
          ...userData,
          id: userData.id,
          name: userData.name,
          role: normalizedRole,
          email: userData.email,
        };

        console.log("[Client] Final user data for storage:", safeUserData);
        localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(safeUserData));

        // Initialize last activity for idle timeout with user isolation
        const now = new Date();
        const activityData = {
          timestamp: now.toISOString(),
          userId: userData.id,
          userRole: normalizedRole,
          sessionStart: now.toISOString(),
        };
        localStorage.setItem(
          "p_chart_last_activity",
          JSON.stringify(activityData)
        );
        console.log(
          "[Client] Initialized last activity timestamp:",
          activityData
        );

        // Also set a cookie that the middleware can read
        try {
          // Set an expiration date for 1 day
          const expires = new Date();
          expires.setTime(expires.getTime() + 24 * 60 * 60 * 1000);

          // Create a simple cookie to signal authentication
          document.cookie = `${LOCAL_AUTH_KEY}=${JSON.stringify(
            safeUserData
          )}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
          console.log("[Client] Auth cookie set successfully");
        } catch (e) {
          console.error("[Client] Failed to set auth cookie:", e);
        }
      } catch (error) {
        console.error("[Client] Error storing user session:", error);
      }
    }
  },

  /**
   * Get user session from local storage
   */
  getSession: () => {
    if (typeof window !== "undefined") {
      try {
        console.log(
          "[Client] Attempting to retrieve user session from local storage"
        );
        const sessionData = localStorage.getItem(LOCAL_AUTH_KEY);
        if (sessionData) {
          const userData = JSON.parse(sessionData);
          // Normalize role when retrieving
          const originalRole = userData.role;
          userData.role = normalizeRole(userData.role || "User");
          console.log("[Client] Retrieved session data:", {
            id: userData.id,
            name: userData.name,
            originalRole,
            normalizedRole: userData.role,
          });
          return userData;
        } else {
          console.log("[Client] No user session found in local storage");
          return null;
        }
      } catch (error) {
        console.error("[Client] Error reading user session:", error);
        return null;
      }
    }
    return null;
  },

  /**
   * Clear user session from local storage
   */
  clearSession: () => {
    if (typeof window !== "undefined") {
      console.log("[Client] Clearing user session from local storage");

      // Clear all auth-related local storage items
      localStorage.removeItem(LOCAL_AUTH_KEY);
      localStorage.removeItem("p_chart_last_activity");
      localStorage.removeItem("productionOrdersUrl");
      localStorage.removeItem("lastUpdateType");

      console.log("[Client] Cleared idle timeout activity timestamp");

      // Clear authentication cookies comprehensively
      const cookiesToClear = [
        LOCAL_AUTH_KEY,
        "next-auth.session-token",
        "next-auth.callback-url",
        "next-auth.csrf-token",
        "__Secure-next-auth.session-token",
        "__Host-next-auth.csrf-token",
      ];

      cookiesToClear.forEach((cookieName) => {
        // Clear for different paths and domains
        document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax`;
        document.cookie = `${cookieName}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax`;
        if (window.location.hostname.includes(".")) {
          document.cookie = `${cookieName}=; path=/; domain=.${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax`;
        }
      });

      console.log("[Client] Session cleanup completed");
    }
  },

  /**
   * Get authorization headers for API requests
   */
  getAuthHeaders: () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    try {
      console.log("[Client] Building auth headers...");

      const userData = UserSession.getSession();
      if (userData?.id) {
        const normalizedRole = normalizeRole(userData.role || "User");
        console.log("[Client] Adding auth headers with user data:", {
          userId: userData.id,
          role: normalizedRole,
        });

        // Add user ID and role headers
        headers["X-User-Id"] = String(userData.id);
        headers["X-User-Role"] = normalizedRole;

        // Add a basic authorization header with the user ID as a token
        // This helps with some environments that might strip custom headers
        headers["Authorization"] = `Bearer ${userData.id}`;

        return headers;
      } else {
        console.warn("[Client] No user session found for auth headers");
      }
    } catch (error) {
      console.error("[Client] Error building auth headers:", error);
    }

    return headers;
  },

  /**
   * Fetch current user data - unified method that replaces the need
   * for separate /api/me and /api/auth/session calls
   */
  getCurrentUser: async (): Promise<any> => {
    // First try to get from local storage for instant access
    const localUser = UserSession.getSession();
    if (localUser) {
      // If we have local data and it's recent enough, use it
      return localUser;
    }

    // Otherwise fetch from server
    try {
      console.log("[Client] ====== GET CURRENT USER DEBUG =====");
      console.log("[Client] Fetching current user data from server");
      console.log("[Client] Document cookies:", document.cookie);

      // Use our utility to get the correct session URL
      const sessionUrl = getSessionUrl();
      console.log("[Client] Session URL:", sessionUrl);

      // Make the fetch with explicit credentials
      const res = await fetch(sessionUrl, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("[Client] Session response status:", res.status);
      console.log(
        "[Client] Session response headers:",
        Object.fromEntries([...res.headers.entries()])
      );

      const data = await res.json();
      console.log("[Client] Session response data:", data);
      console.log("[Client] Session has user data:", !!data?.user);
      console.log("[Client] ====== END GET CURRENT USER DEBUG =====");

      // If we have user data, store it locally for next time
      if (data?.user) {
        UserSession.storeSession(data.user);
        return data.user;
      }
      return null;
    } catch (error) {
      console.error("[Client] Error fetching current user:", error);
      console.error("[Client] Error details:", error);
      return null;
    }
  },

  /**
   * Check if user has a specific role
   */
  hasRole: (role: string): boolean => {
    const userData = UserSession.getSession();
    if (!userData?.role) {
      console.log("[Client] Role check failed - No user data or role found");
      return false;
    }

    const normalizedUserRole = normalizeRole(userData.role);
    const normalizedRequiredRole = normalizeRole(role);
    console.log("[Client] Role check:", {
      userRole: normalizedUserRole,
      requiredRole: normalizedRequiredRole,
      hasRole: normalizedUserRole === normalizedRequiredRole,
    });

    return normalizedUserRole === normalizedRequiredRole;
  },

  /**
   * Update last activity timestamp for idle timeout tracking
   */
  updateLastActivity: () => {
    if (typeof window !== "undefined") {
      const userData = UserSession.getSession();
      if (!userData?.id) {
        console.log("[Client] Cannot update activity - no valid session");
        return;
      }

      const now = new Date();
      const activityData = {
        timestamp: now.toISOString(),
        userId: userData.id,
        userRole: userData.role,
      };

      localStorage.setItem(
        "p_chart_last_activity",
        JSON.stringify(activityData)
      );
      console.log("[Client] Last activity updated:", {
        timestamp: now.toISOString(),
        userId: userData.id,
        userRole: userData.role,
      });
    }
  },

  /**
   * Get last activity timestamp
   */
  getLastActivity: (): Date | null => {
    if (typeof window !== "undefined") {
      try {
        const userData = UserSession.getSession();
        if (!userData?.id) {
          console.log("[Client] Cannot get activity - no valid session");
          return null;
        }

        const lastActivityStr = localStorage.getItem("p_chart_last_activity");
        if (lastActivityStr) {
          // Try parsing as new format (object with user isolation)
          try {
            const activityData = JSON.parse(lastActivityStr);
            if (activityData.userId && activityData.timestamp) {
              // Check if activity belongs to current user
              if (activityData.userId === userData.id) {
                const date = new Date(activityData.timestamp);
                console.log(
                  "[Client] Retrieved last activity for current user:",
                  {
                    timestamp: date.toISOString(),
                    userId: activityData.userId,
                    userRole: activityData.userRole,
                  }
                );
                return date;
              } else {
                console.log(
                  "[Client] Activity timestamp belongs to different user, clearing"
                );
                localStorage.removeItem("p_chart_last_activity");
                return null;
              }
            }
          } catch (parseError) {
            // Might be old format (just timestamp string), check if it's valid
            const date = new Date(lastActivityStr);
            if (!isNaN(date.getTime())) {
              console.log(
                "[Client] Found old format activity timestamp, converting"
              );
              // Convert to new format
              UserSession.updateLastActivity();
              return date;
            }
          }
        }
        console.log("[Client] No valid activity timestamp found");
        return null;
      } catch (error) {
        console.error("[Client] Error reading last activity:", error);
        return null;
      }
    }
    return null;
  },

  /**
   * Check if session is expired due to idle timeout
   */
  isSessionExpiredByIdle: (timeoutMs: number): boolean => {
    const lastActivity = UserSession.getLastActivity();
    if (!lastActivity) {
      console.log("[Client] No last activity found - considering expired");
      return true;
    }

    const idleTime = Date.now() - lastActivity.getTime();
    const isExpired = idleTime > timeoutMs;

    console.log("[Client] Idle timeout check:", {
      lastActivity: lastActivity.toISOString(),
      idleTimeMs: idleTime,
      timeoutMs: timeoutMs,
      isExpired: isExpired,
    });

    return isExpired;
  },

  /**
   * Get time remaining until idle timeout
   */
  getIdleTimeRemaining: (timeoutMs: number): number => {
    const lastActivity = UserSession.getLastActivity();
    if (!lastActivity) {
      console.log("[Client] No last activity found - no time remaining");
      return 0;
    }

    const idleTime = Date.now() - lastActivity.getTime();
    const remaining = Math.max(0, timeoutMs - idleTime);

    console.log("[Client] Idle time remaining:", {
      lastActivity: lastActivity.toISOString(),
      idleTimeMs: idleTime,
      timeoutMs: timeoutMs,
      remainingMs: remaining,
    });

    return remaining;
  },
};

/**
 * Higher-order component to wrap pages that require authentication
 * Will redirect to login page if user is not authenticated
 * Optionally ensures the user has the required role
 */
export function withAuth<P extends object>(
  Component: NextPage<P>,
  requiredRole?: string
) {
  const AuthComponent = (props: P) => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const loading = status === "loading";
    const isAuthenticated = !!session?.user;
    const userRole = normalizeRole((session?.user as any)?.role || "User");

    useEffect(() => {
      console.log("[Client] Auth HOC state:", {
        loading,
        isAuthenticated,
        userRole,
        requiredRole,
        status,
      });

      // If authentication is still loading, do nothing
      if (loading) return;

      // If user is authenticated, store session in local storage
      if (isAuthenticated && session?.user) {
        console.log("[Client] Storing authenticated session:", session.user);
        UserSession.storeSession(session.user);
      }

      // If user is not authenticated, redirect to login
      if (!isAuthenticated) {
        const currentUrl = window.location.href;
        console.log("[Client] Redirecting to login:", {
          currentUrl,
          callbackUrl: `/auth/login?callbackUrl=${encodeURIComponent(
            currentUrl
          )}`,
        });
        router.push(
          `/auth/login?callbackUrl=${encodeURIComponent(currentUrl)}`
        );
        return;
      }

      // If a role is required and user doesn't have it, redirect to dashboard
      if (
        requiredRole &&
        normalizeRole(userRole) !== normalizeRole(requiredRole)
      ) {
        console.log("[Client] Insufficient role:", {
          required: normalizeRole(requiredRole),
          current: normalizeRole(userRole),
        });
        router.push("/dashboard");
      }
    }, [loading, isAuthenticated, userRole, router, session]);

    // Show nothing while checking authentication
    if (
      loading ||
      !isAuthenticated ||
      (requiredRole && normalizeRole(userRole) !== normalizeRole(requiredRole))
    ) {
      console.log("[Client] Showing loading state:", {
        loading,
        isAuthenticated,
        roleCheck: requiredRole
          ? normalizeRole(userRole) === normalizeRole(requiredRole)
          : true,
      });
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      );
    }

    console.log("[Client] Rendering protected component");
    return <Component {...props} />;
  };

  // Preserve the original display name for debugging
  AuthComponent.displayName = `withAuth(${
    Component.displayName || Component.name || "Component"
  })`;

  return AuthComponent as NextPage<P>;
}

/**
 * Higher-order component specifically for admin-only pages
 */
export function withAdminAuth<P extends object>(Component: NextPage<P>) {
  return withAuth(Component, "Admin");
}

/**
 * Global fetch wrapper that automatically includes auth headers
 */
export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  console.log("[Client] Making authenticated fetch request to:", url);

  // Get authentication headers
  const authHeaders = UserSession.getAuthHeaders();
  console.log("[Client] Using auth headers:", authHeaders);

  // Merge with existing headers
  const headers = {
    ...authHeaders,
    ...(options.headers || {}),
  };

  // Make the fetch request with credentials and auth headers
  console.log("[Client] Final fetch configuration:", {
    url,
    method: options.method || "GET",
    headers: JSON.stringify(headers),
    credentials: "include",
  });

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include", // Always include credentials
    });

    console.log("[Client] Fetch response status:", response.status);

    // Handle various error status codes
    switch (response.status) {
      // Authentication errors
      case 401: // Unauthorized
        console.error("[Client] Session expired (401 Unauthorized)");
        // Clear invalid session data
        UserSession.clearSession();
        // Redirect to login with callback URL
        const currentUrl = window.location.href;
        window.location.href = `/auth/login?callbackUrl=${encodeURIComponent(
          currentUrl
        )}&expired=true`;
        // Return a special response that callers can check
        return new Response(JSON.stringify({ error: "Session expired" }), {
          status: 401,
        });

      case 403: // Forbidden
        console.error("[Client] Permission denied (403 Forbidden)");
        // Create a custom response with error message
        return new Response(
          JSON.stringify({
            error: "You do not have permission to access this resource",
            status: "permission_denied",
          }),
          { status: 403 }
        );

      case 429: // Too Many Requests
        console.error("[Client] Rate limited (429 Too Many Requests)");
        // Add exponential backoff logic to prevent immediate retries
        const retryAfter = response.headers.get("Retry-After") || "5";
        console.log(`[Client] Should retry after ${retryAfter} seconds`);
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please try again later.",
            retryAfter,
          }),
          { status: 429 }
        );

      case 500: // Internal Server Error
      case 502: // Bad Gateway
      case 503: // Service Unavailable
      case 504: // Gateway Timeout
        console.error(`[Client] Server error (${response.status})`);
        // Return error response with useful message
        return new Response(
          JSON.stringify({
            error: "The server encountered an error. Please try again later.",
            status: "server_error",
            code: response.status,
          }),
          { status: response.status }
        );
    }

    return response;
  } catch (error) {
    console.error("[Client] Fetch error:", error);
    // Handle network errors (failed to fetch)
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.error("[Client] Network error - unable to reach server");
      // Create a custom response to prevent infinite retries
      return new Response(
        JSON.stringify({
          error: "Network error. Please check your connection.",
          status: "network_error",
        }),
        { status: 0 }
      );
    }
    throw error;
  }
};
