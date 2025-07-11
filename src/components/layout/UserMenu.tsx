import { signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  User,
  Settings,
  LogOut,
  Shield,
  Bell,
  ClipboardCheck,
  Info,
  Book,
  DollarSign,
} from "lucide-react";
import api from "@/lib/axios"; // Import the configured axios instance

interface UserMenuProps {
  user: {
    name: string | null;
    email: string | null;
    role: string;
  };
  notificationCount?: number;
}

// Add interface for the API response
interface PendingRequestsCountResponse {
  count: number;
}

function toTitleCase(str: string | null): string {
  if (!str) return "User";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function UserMenu({
  user,
  notificationCount = 0,
}: UserMenuProps) {
  const [mounted, setMounted] = useState(false);

  // Set mounted state after component mounts (prevents hydration mismatch)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug logging for user menu
  if (process.env.NODE_ENV === "development") {
    console.log("[UserMenu] Received user data:", {
      name: user.name,
      email: user.email,
      role: user.role,
      displayName: toTitleCase(user.name),
      mounted,
    });
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  const displayName = toTitleCase(user.name);
  const isAdmin = user.role.toLowerCase() === "admin";
  const isEncoder = user.role.toLowerCase() === "encoder";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-9 rounded-full flex items-center gap-2 px-2"
        >
          <span className="text-sm font-medium hidden md:inline-flex">
            {displayName}
          </span>
          <div className="flex items-center gap-1">
            <Avatar className="h-7 w-7 transition-all border-2 border-primary/10 bg-primary/5">
              <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/5 text-primary font-medium text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            <div className="flex items-center gap-1 text-xs text-primary/80">
              <Shield className="h-3 w-3" />
              <span className="capitalize">{user.role}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/profile"
            className="cursor-pointer flex items-center gap-2"
          >
            <User className="h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href="/notifications"
            className="cursor-pointer flex items-center gap-2"
          >
            <Bell className="h-4 w-4" />
            Notifications
            {mounted && (isAdmin || isEncoder) && notificationCount > 0 && (
              <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs font-medium text-red-600">
                {notificationCount}
              </span>
            )}
          </Link>
        </DropdownMenuItem>

        {/* Link to Operation Defects Edit Requests for admins and encoders */}
        {mounted && (isAdmin || isEncoder) && (
          <DropdownMenuItem asChild>
            <Link
              href="/operation-defects-edit-requests"
              className="cursor-pointer flex items-center gap-2"
            >
              <ClipboardCheck className="h-4 w-4" />
              Edit Requests
            </Link>
          </DropdownMenuItem>
        )}

        {/* Admin-specific menu items - Defect Edit Requests moved to Notifications */}
        {mounted && isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Admin Actions
            </DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link
                href="/settings"
                className="cursor-pointer flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/master-defects"
                className="cursor-pointer flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Master Defects
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/standard-costs"
                className="cursor-pointer flex items-center gap-2"
              >
                <DollarSign className="h-4 w-4" />
                Standard Costs
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/admin/users"
                className="cursor-pointer flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                User Management
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/user-manual"
            className="cursor-pointer flex items-center gap-2"
          >
            <Book className="h-4 w-4" />
            User Manual
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/about"
            className="cursor-pointer flex items-center gap-2"
          >
            <Info className="h-4 w-4" />
            About
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive"
          onSelect={async () => {
            console.log("=== LOGOUT PROCESS STARTING ===");

            // Store the current URL to redirect back after login
            const { pathname, search } = window.location;
            const currentPath = `${pathname}${search}`;
            console.log("Current path for redirect:", currentPath);

            try {
              // 1. Clear local storage user session FIRST
              console.log("Step 1: Clearing local storage...");
              const { UserSession } = await import("@/lib/clientAuth");
              UserSession.clearSession();

              // 2. Clear all other local storage items that might contain auth data
              console.log("Step 2: Clearing additional storage...");
              localStorage.removeItem("p_chart_last_activity");
              localStorage.removeItem("productionOrdersUrl");
              localStorage.removeItem("lastUpdateType");

              // 3. Clear all authentication cookies manually
              console.log("Step 3: Clearing cookies...");
              const cookiesToClear = [
                "next-auth.session-token",
                "next-auth.callback-url",
                "next-auth.csrf-token",
                "__Secure-next-auth.session-token",
                "__Host-next-auth.csrf-token",
                "p_chart_auth_user",
              ];

              cookiesToClear.forEach((cookieName) => {
                // Clear for different paths and domains
                document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax`;
                document.cookie = `${cookieName}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax`;
                document.cookie = `${cookieName}=; path=/; domain=.${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax`;
              });

              console.log("Step 4: Signing out with NextAuth...");
              // 4. Sign out with NextAuth - don't redirect immediately
              await signOut({
                redirect: false,
              });

              console.log("Step 5: Final cleanup and redirect...");
              // 5. Small delay to ensure cleanup completes
              setTimeout(() => {
                // Force redirect to login page
                window.location.href = `/auth/login?callbackUrl=${encodeURIComponent(
                  currentPath
                )}`;
              }, 100);
            } catch (error) {
              console.error("Error during logout:", error);
              // Fallback: force redirect even if some cleanup fails
              window.location.href = `/auth/login?callbackUrl=${encodeURIComponent(
                currentPath
              )}`;
            }

            console.log("=== LOGOUT PROCESS COMPLETED ===");
          }}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
