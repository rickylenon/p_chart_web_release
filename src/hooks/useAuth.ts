import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import { useState, useEffect, useCallback } from "react";
import { UserSession } from "@/lib/clientAuth";
import { useToast } from "@/components/ui/use-toast";

interface UseAuthOptions {
  redirectTo?: string;
  requiredRoles?: string[];
}

export function useAuth(options: UseAuthOptions = {}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [verificationComplete, setVerificationComplete] =
    useState<boolean>(false);

  const { redirectTo = "/auth/login", requiredRoles = [] } = options;

  useEffect(() => {
    console.log(
      "Auth effect running, status:",
      status,
      "verified:",
      verificationComplete
    );

    // If still loading session or we've already verified access, do nothing
    if (status === "loading" || verificationComplete) return;

    // Check if we have a NextAuth session first
    const isAuthenticated = !!session?.user;

    if (isAuthenticated) {
      console.log("Found NextAuth session, storing to localStorage");

      // Store user session data in local storage for easier API access
      UserSession.storeSession(session.user);

      // Check role requirements if needed
      if (requiredRoles.length > 0) {
        const userRole = ((session?.user as any)?.role || "").toLowerCase();
        const hasRequiredRole = requiredRoles.some(
          (role) => role.toLowerCase() === userRole
        );

        if (!hasRequiredRole) {
          console.log(`Required role not found. User role: ${userRole}`);
          setIsAuthorized(false);
          setIsLoading(false);
          setAuthError("You do not have permission to access this page");
          setVerificationComplete(true);
          router.push("/dashboard");
          return;
        }
      }

      // NextAuth session is valid, consider authenticated
      setIsAuthorized(true);
      setIsLoading(false);
      setAuthError(null);
      setVerificationComplete(true);
      return;
    }

    // Only fall back to localStorage if NextAuth session is explicitly not available
    // and status is not loading (to avoid interfering with login process)
    const localStorageUser = UserSession.getSession();

    if (localStorageUser) {
      console.log("Found valid localStorage session, using as fallback");

      // Check role requirements if needed
      if (requiredRoles.length > 0) {
        const userRole = (localStorageUser.role || "").toLowerCase();
        const hasRequiredRole = requiredRoles.some(
          (role) => role.toLowerCase() === userRole
        );

        if (!hasRequiredRole) {
          console.log(`Required role not found. Local user role: ${userRole}`);
          setIsAuthorized(false);
          setIsLoading(false);
          setAuthError("You do not have permission to access this page");
          setVerificationComplete(true);
          router.push("/dashboard");
          return;
        }
      }

      // Local storage user is valid, consider authenticated
      setIsAuthorized(true);
      setIsLoading(false);
      setAuthError(null);
      setVerificationComplete(true);
      return;
    }

    // No valid session found, redirect to login
    console.log("No valid session found, redirecting to login");
    router.push(
      `${redirectTo}?callbackUrl=${encodeURIComponent(window.location.href)}`
    );
  }, [
    status,
    session,
    router,
    redirectTo,
    requiredRoles,
    verificationComplete,
  ]);

  // Get authorization headers for fetch requests
  const getAuthHeaders = useCallback((): Record<string, string> => {
    // Use the simplified headers from UserSession utility
    return UserSession.getAuthHeaders();
  }, []);

  // Get the current user data
  const getCurrentUser = useCallback(async () => {
    return UserSession.getCurrentUser();
  }, []);

  // Check if user has a specific role
  const hasRole = useCallback((role: string): boolean => {
    return UserSession.hasRole(role);
  }, []);

  // Handle expired session
  const handleExpiredSession = useCallback(() => {
    console.log("Handling expired session");
    // Clear the session storage
    UserSession.clearSession();
    // Sign out from NextAuth
    signOut({ redirect: false });
    // Redirect to login
    const currentUrl = window.location.href;
    router.push(
      `${redirectTo}?callbackUrl=${encodeURIComponent(currentUrl)}&expired=true`
    );
  }, [redirectTo, router]);

  // Check response for session expiration and other errors
  const checkResponseAuth = useCallback(
    (response: Response) => {
      // Handle various error statuses
      switch (response.status) {
        case 401: // Unauthorized - session expired
          console.log(
            "Detected 401 unauthorized response - session likely expired"
          );
          handleExpiredSession();
          return false;

        case 403: // Forbidden - permission issue
          console.log("Detected 403 forbidden response - permission denied");
          toast({
            title: "Permission Denied",
            description: "You don't have permission to access this resource",
            variant: "destructive",
          });
          return false;

        case 429: // Too Many Requests - rate limited
          console.log("Detected 429 response - rate limited");
          toast({
            title: "Rate Limited",
            description: "Too many requests. Please try again later.",
            variant: "destructive",
          });
          return false;

        case 500: // Server error
        case 502: // Bad Gateway
        case 503: // Service Unavailable
        case 504: // Gateway Timeout
          console.log(`Detected server error (${response.status})`);
          toast({
            title: "Server Error",
            description:
              "The server encountered an error. Please try again later.",
            variant: "destructive",
          });
          return false;
      }

      // For successful responses or other non-critical error codes
      return true;
    },
    [handleExpiredSession, toast]
  );

  return {
    session,
    status,
    isAuthorized,
    isLoading,
    authError,
    getAuthHeaders,
    getCurrentUser,
    hasRole,
    handleExpiredSession,
    checkResponseAuth,
  };
}
