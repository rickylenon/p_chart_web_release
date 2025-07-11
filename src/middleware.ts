import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// This middleware runs for all requests
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname.startsWith('/auth/');
  
  console.log(`[Middleware] Checking: ${pathname}, isAuthPage: ${isAuthPage}`);
  
  // Log cookies for debugging (without exposing sensitive values)
  console.log(`[Middleware] Cookie check:`, 
    Array.from(request.cookies.getAll())
      .map(c => `${c.name}: ${c.name.includes('token') ? '[HIDDEN]' : c.value}`)
      .join(', ')
  );
  
  // Skip middleware for specific paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // Static files
  ) {
    console.log(`[Middleware] Skipping for: ${pathname}`);
    return NextResponse.next();
  }
  
  // Check for session token
  try {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    console.log(`[Middleware] Token for ${pathname}: ${token ? 'Found' : 'Not found'}`);
    if (token) {
      console.log(`[Middleware] Token details: id=${token.id}, name=${token.name}, role=${token.role}`);
    }
    
    // If on login page and already authenticated, redirect to dashboard
    if (isAuthPage && token) {
      console.log(`[Middleware] Authenticated user on auth page, redirecting to dashboard`);
      const response = NextResponse.redirect(new URL('/dashboard', request.url));
      console.log(`[Middleware] Redirect response status: ${response.status}`);
      return response;
    }
    
    // User is authenticated for protected routes, let them through
    if (token) {
      console.log(`[Middleware] Authenticated access granted to ${pathname} for ${token.name || 'unknown user'}`);
      return NextResponse.next();
    }
    
    // IMPORTANT CHANGE: Check if we have a user in localStorage via a cookie
    // We'll set a cookie with the same name as the localStorage key to check from the middleware
    const localAuthCookie = request.cookies.get('p_chart_auth_user');
    if (localAuthCookie) {
      console.log(`[Middleware] Found local auth cookie, allowing access`);
      return NextResponse.next();
    }
    
    // Allow access to auth pages even without a token
    if (isAuthPage) {
      console.log(`[Middleware] Allowing access to auth page without token: ${pathname}`);
      return NextResponse.next();
    }
    
    // User is not authenticated, redirect to login with callback URL
    console.log(`[Middleware] Unauthenticated access to ${pathname}, redirecting to login`);
    
    // Create the callbackUrl including the original path and query
    const { pathname: path, search } = request.nextUrl;
    const callbackUrl = `${path}${search}`;
    
    // Create a new URL for the redirect
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('callbackUrl', callbackUrl);
    
    console.log(`[Middleware] Redirecting to: ${url.toString()}`);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error(`[Middleware] Error in middleware:`, error);
    // In case of error, let the request continue
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // Protected paths
    "/dashboard/:path*",
    "/production-orders/:path*",
    "/reports/:path*",
    "/defects/:path*",
    "/settings/:path*",
    "/admin/:path*",
    
    // Catch all other pages except API routes, static files, etc.
    "/((?!api|_next/static|_next/image|favicon.ico|jae-logo.png|.*\\.svg|auth/).*)",
  ],
};
