import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { NextApiRequest, NextApiResponse } from "next";
import { GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth/next";
import { getToken } from "next-auth/jwt";
import { getSession } from "next-auth/react";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 8 * 60 * 60, // 8 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false, // Allow cookies over HTTP for network IP access
        maxAge: 8 * 60 * 60, // 8 hours
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: "lax",
        path: "/",
        secure: false, // Allow cookies over HTTP for network IP access
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false, // Allow cookies over HTTP for network IP access
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: {
              username: credentials.username,
            },
          });

          if (!user || !user.password) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: String(user.id),
            username: user.username,
            name: user.name || user.username,
            email: user.email,
            role: user.role,
          };
        } catch (error) {
          console.error("Error during authentication:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && "username" in user && "role" in user) {
        token.sub = user.id; // Explicitly set the subject (user ID)
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
        console.log("[NextAuth] JWT created for user:", {
          id: user.id,
          username: user.username,
          role: user.role,
        });
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = String(token.sub || token.id);
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.role = token.role as string;
        (session.user as any).username = token.username;
        console.log("[NextAuth] Session created for user:", {
          id: token.sub || token.id,
          username: token.username,
          role: token.role,
        });
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      console.log("[NextAuth] Redirect called with:", { url, baseUrl });

      // Allows relative callback URLs
      if (url.startsWith("/")) {
        const redirectUrl = `${baseUrl}${url}`;
        console.log("[NextAuth] Redirecting to relative URL:", redirectUrl);
        return redirectUrl;
      }

      // Allows callback URLs on the same origin
      try {
        const urlOrigin = new URL(url).origin;
        const baseOrigin = new URL(baseUrl).origin;
        if (urlOrigin === baseOrigin) {
          console.log("[NextAuth] Redirecting to same origin URL:", url);
          return url;
        }
      } catch (e) {
        console.log("[NextAuth] Error parsing URLs, using baseUrl:", e);
      }

      console.log("[NextAuth] Redirecting to baseUrl:", baseUrl);
      return baseUrl;
    },
    async signIn({ user, account, profile, email, credentials }) {
      console.log("[NextAuth] Sign in attempt for user:", {
        id: user.id,
        username: (user as any).username,
        role: (user as any).role,
      });
      return true;
    },
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log("[NextAuth] User signed in:", {
        id: user.id,
        username: (user as any).username,
        isNewUser,
      });
    },
    async signOut({ token, session }) {
      console.log("[NextAuth] User signed out:", {
        id: token?.sub || session?.user?.id,
      });
    },
    async session({ session, token }) {
      console.log("[NextAuth] Session accessed for user:", {
        id: session?.user?.id,
        username: (session?.user as any)?.username,
      });
    },
  },
  debug: process.env.NEXTAUTH_DEBUG === "true",
};

// Constants
const LOCAL_AUTH_KEY = "p_chart_auth_user";

// Check if we're running in an Edge runtime
const isEdgeRuntime = () => {
  return (
    process.env.NEXT_RUNTIME === "edge" || process.env.VERCEL_REGION === "edge"
  );
};

/**
 * ==============================
 * SERVER-SIDE API AUTHENTICATION
 * ==============================
 *
 * These utilities are used for API routes
 */

// Simplified server-side authentication helper for API routes
export async function getServerAuth(req: NextApiRequest, res: NextApiResponse) {
  // Get session using the proper server-side method
  const session = await getServerSession(req, res, authOptions);

  // If no session, try token directly as fallback
  if (!session) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      console.log("[ServerAuth] Authentication failed for", req.url);
      return null;
    }

    // Convert token to session-like object
    return {
      user: {
        id: token.id as string,
        name: token.name as string,
        email: token.email as string,
        role: token.role as string,
      },
      expires: new Date((token.exp as number) * 1000).toISOString(),
    };
  }

  return session;
}

// Middleware for API routes
export function withAuth(handler: any) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      console.log("\n======= API AUTH MIDDLEWARE START =======");
      console.log(`[ServerAuth] Path: ${req.url}, Method: ${req.method}`);

      // Log all relevant information for debugging
      console.log("[ServerAuth] Request headers:", {
        cookie: req.headers.cookie ? "[exists]" : "[missing]",
        "x-user-id": req.headers["x-user-id"],
        "x-user-role": req.headers["x-user-role"],
        authorization: req.headers.authorization ? "[exists]" : "[missing]",
        "content-type": req.headers["content-type"],
      });

      console.log("[ServerAuth] Request cookies:", req.cookies);

      // Print cookie headers explicitly for debugging
      if (req.headers.cookie) {
        console.log("[ServerAuth] Full cookie content:", req.headers.cookie);
      }

      // First try to get the session from NextAuth
      console.log("[ServerAuth] Attempting to get NextAuth session...");
      const session = await getServerSession(req, res, authOptions);

      console.log(
        "[ServerAuth] Session result:",
        session ? "Found" : "Not found"
      );
      if (session) {
        console.log("[ServerAuth] Session user data:", {
          id: session.user?.id,
          name: session.user?.name,
          role: session.user?.role,
        });
      }

      // If session exists, use it
      if (session) {
        console.log(
          "[ServerAuth] API request authenticated via NextAuth session"
        );
        console.log("======= API AUTH MIDDLEWARE END =======\n");
        return handler(req, res, session);
      }

      // If no session, try token authentication directly
      console.log(
        "[ServerAuth] No session found, trying JWT token directly..."
      );
      const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
      });

      if (token) {
        console.log("[ServerAuth] JWT token found:", {
          id: token.id,
          name: token.name,
          role: token.role,
        });

        // Create a session from the token
        const tokenSession = {
          user: {
            id: token.id as string,
            name: token.name as string,
            email: token.email as string,
            role: token.role as string,
          },
          expires: new Date((token.exp as number) * 1000).toISOString(),
        };

        console.log("[ServerAuth] API request authenticated via JWT token");
        console.log("======= API AUTH MIDDLEWARE END =======\n");
        return handler(req, res, tokenSession);
      }

      // If no token, check for simplified auth headers
      console.log("[ServerAuth] No token found, checking headers...");
      const userId = req.headers["x-user-id"];
      const userRole = req.headers["x-user-role"];

      if (userId) {
        console.log(
          "[ServerAuth] API request authenticated via headers. User ID:",
          userId
        );

        // Create a simplified session object
        const simplifiedSession = {
          user: {
            id: userId as string,
            role: (userRole as string) || "user",
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        };

        // Skip account active check in development or Edge runtime
        if (!isEdgeRuntime() && process.env.NODE_ENV !== "development") {
          try {
            // Verify the user exists and is active if needed
            const user = await prisma.user.findUnique({
              where: { id: parseInt(userId as string, 10) },
              select: { isActive: true },
            });

            if (!user || !user.isActive) {
              console.log(
                `[ServerAuth] API request rejected: User ${userId} is inactive or not found`
              );
              console.log("======= API AUTH MIDDLEWARE END =======\n");
              return res.status(401).json({
                error: "Account deactivated or not found",
                code: "account_deactivated",
              });
            }
          } catch (dbError) {
            console.error(
              "[ServerAuth] Error checking user active status:",
              dbError
            );
            // Continue processing in case of database errors
          }
        } else {
          console.log("[ServerAuth] Skipping active check");
        }

        // Call the handler with the simplified session
        console.log("[ServerAuth] API request authenticated via headers");
        console.log("======= API AUTH MIDDLEWARE END =======\n");
        return handler(req, res, simplifiedSession);
      }

      // If all authentication methods fail, try to extract clientAuth cookie as last resort
      console.log("[ServerAuth] Checking for client auth cookie...");
      const clientAuthCookie = req.cookies[LOCAL_AUTH_KEY];

      if (clientAuthCookie) {
        try {
          console.log(
            "[ServerAuth] Found client auth cookie, attempting to parse..."
          );
          const userData = JSON.parse(clientAuthCookie);

          if (userData && userData.id) {
            console.log(
              "[ServerAuth] Successfully parsed client auth cookie:",
              {
                id: userData.id,
                role: userData.role,
              }
            );

            // Create a session from the cookie data
            const cookieSession = {
              user: {
                id: userData.id,
                name: userData.name || "User",
                email: userData.email || `user-${userData.id}@example.com`,
                role: userData.role || "user",
              },
              expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
            };

            console.log(
              "[ServerAuth] API request authenticated via client auth cookie"
            );
            console.log("======= API AUTH MIDDLEWARE END =======\n");
            return handler(req, res, cookieSession);
          }
        } catch (cookieError) {
          console.error(
            "[ServerAuth] Error parsing client auth cookie:",
            cookieError
          );
        }
      }

      // If no authentication method works, return unauthorized
      console.log(
        "[ServerAuth] API request rejected: No valid authentication found"
      );
      console.log("======= API AUTH MIDDLEWARE END =======\n");
      return res.status(401).json({ error: "Unauthorized" });
    } catch (error) {
      console.error("[ServerAuth] Error in auth middleware:", error);
      console.log("======= API AUTH MIDDLEWARE END =======\n");
      return res.status(500).json({ error: "Internal Server Error" });
    }
  };
}

/**
 * ==============================
 * SERVER-SIDE PAGE AUTHENTICATION
 * ==============================
 *
 * These utilities are used for getServerSideProps in pages
 */

/**
 * Checks authentication in getServerSideProps with fallback to custom auth cookie
 * @param context - GetServerSideProps context
 * @returns Object with authentication status, headers, and user data
 */
export async function checkServerSideAuth(context: GetServerSidePropsContext) {
  console.log(
    "[ServerAuth] Checking authentication for path:",
    context.resolvedUrl
  );

  // Try NextAuth session first
  const session = await getSession(context);
  console.log("[ServerAuth] Session result:", session ? "Found" : "Not found");

  // Prepare response
  const result = {
    isAuthenticated: !!session,
    user: session?.user,
    headers: {
      "Content-Type": "application/json",
      Cookie: context.req.headers.cookie || "",
    } as Record<string, string>,
    fallbackUsed: false,
  };

  // If no session, try fallback cookie auth
  if (!session) {
    const cookies = context.req.cookies;
    const authCookie = cookies[LOCAL_AUTH_KEY];

    console.log(
      "[ServerAuth] Checking fallback cookie:",
      authCookie ? "Found" : "Not found"
    );

    if (authCookie) {
      try {
        // Try to parse JSON user data from cookie
        let userData;
        try {
          userData = JSON.parse(authCookie);
          console.log(
            "[ServerAuth] Successfully parsed JSON user data from cookie"
          );
        } catch (e) {
          console.warn(
            "[ServerAuth] Could not parse JSON from cookie, value:",
            authCookie
          );

          // If the cookie is just '1' (old format), use default admin
          if (authCookie === "1") {
            userData = { id: "1", role: "admin" };
          } else {
            // Try to extract parts from the cookie that might be malformed JSON
            try {
              // Try to find an id in the string
              const idMatch = authCookie.match(/"id"\s*:\s*"([^"]+)"/);
              const roleMatch = authCookie.match(/"role"\s*:\s*"([^"]+)"/);
              const nameMatch = authCookie.match(/"name"\s*:\s*"([^"]+)"/);

              userData = {
                id: idMatch ? idMatch[1] : "1",
                role: roleMatch ? roleMatch[1] : "user",
                name: nameMatch ? nameMatch[1] : "Anonymous",
              };

              console.log(
                "[ServerAuth] Extracted partial user data from malformed cookie:",
                userData
              );
            } catch (extractError) {
              // Default to admin if everything else fails
              userData = { id: "1", role: "admin" };
              console.warn(
                "[ServerAuth] Using default admin as fallback after extraction failure"
              );
            }
          }
        }

        // Mark as authenticated via fallback
        result.isAuthenticated = true;
        result.user = userData;
        result.fallbackUsed = true;

        // Add auth headers for API requests
        result.headers["X-User-Id"] = userData.id || "1";
        result.headers["X-User-Role"] = userData.role?.toLowerCase() || "admin";

        console.log("[ServerAuth] Using fallback auth with user:", userData);
      } catch (e) {
        console.error("[ServerAuth] Error processing fallback auth:", e);
      }
    }
  }

  return result;
}

/**
 * Helper that implements common auth redirect logic for getServerSideProps
 * @param context - GetServerSideProps context
 * @returns Redirect object if not authenticated, null otherwise
 */
export async function getAuthRedirect(context: GetServerSidePropsContext) {
  const auth = await checkServerSideAuth(context);

  if (!auth.isAuthenticated) {
    // Store the current URL as callback for after login
    const callbackUrl = context.resolvedUrl;
    const loginUrl = `/auth/login${
      callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""
    }`;

    console.log("[ServerAuth] Not authenticated, redirecting to:", loginUrl);

    return {
      redirect: {
        destination: loginUrl,
        permanent: false,
      },
    };
  }

  return null;
}

/**
 * Helper to get an authenticated fetch function for server-side data fetching
 * @param context - GetServerSideProps context
 * @returns A configured fetch function with proper authentication
 */
export async function getAuthenticatedFetch(
  context: GetServerSidePropsContext
) {
  const auth = await checkServerSideAuth(context);

  // Return a pre-configured fetch function
  return async (url: string, options: RequestInit = {}) => {
    const baseUrl =
      process.env.NEXTAUTH_URL || `https://${context.req.headers.host}`;
    const fullUrl = url.startsWith("http")
      ? url
      : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;

    // Merge headers
    const fetchOptions: RequestInit = {
      ...options,
      headers: {
        ...auth.headers,
        ...(options.headers || {}),
      },
    };

    console.log(`[ServerAuth] Fetching ${fullUrl}`);
    return fetch(fullUrl, fetchOptions);
  };
}

/**
 * Wrapper for getServerSideProps that handles auth and provides useful context
 * @param handler - Your getServerSideProps logic
 * @returns Enhanced getServerSideProps function
 */
export function withServerSideAuth(
  handler: (
    context: GetServerSidePropsContext,
    auth: {
      user: any;
      isAuthenticated: boolean;
      fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
    }
  ) => Promise<any>
) {
  return async (context: GetServerSidePropsContext) => {
    // Check for redirect
    const redirect = await getAuthRedirect(context);
    if (redirect) return redirect;

    // Set up auth
    const auth = await checkServerSideAuth(context);
    const fetchWithAuth = await getAuthenticatedFetch(context);

    // Call the handler with enhanced context
    return handler(context, {
      user: auth.user,
      isAuthenticated: true,
      fetchWithAuth,
    });
  };
}
