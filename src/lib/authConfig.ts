/**
 * Auth configuration utility for NextAuth
 * This file provides a consistent way to get auth-related URLs and configuration
 */

/**
 * Get the base URL for the application, handling both client and server environments
 */
export function getBaseUrl(): string {
  // If VERCEL_URL is set, we're in a Vercel production environment
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Check for next public deployment URL
  if (process.env.NEXT_PUBLIC_DEPLOYMENT_URL) {
    return process.env.NEXT_PUBLIC_DEPLOYMENT_URL;
  }
  
  // Check for explicitly set NEXTAUTH_URL
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  
  // In the browser, use the current URL
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    return `${url.protocol}//${url.host}`;
  }
  
  // Default fallback for server environment
  return 'http://localhost:3000';
}

/**
 * Get the auth API URL
 */
export function getAuthUrl(path: string = ''): string {
  const baseUrl = getBaseUrl();
  const authPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}/api/auth${authPath}`;
}

/**
 * Get session URL
 */
export function getSessionUrl(): string {
  return getAuthUrl('/session');
}

/**
 * Get configuration for NextAuth SessionProvider
 */
export function getSessionProviderConfig() {
  return {
    refetchInterval: 30 * 60, // 30 minutes
    refetchOnWindowFocus: true,
    refetchWhenOffline: false as const,
    // Add additional debug options
    debug: process.env.NEXTAUTH_DEBUG === 'true',
  };
} 