import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Menu, X, Bell } from "lucide-react";
import UserMenu from "./UserMenu";
import NavItem from "./NavItem";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { POSearchHandler } from "@/components/navigation/POSearchHandler";
import { useNotification } from "@/contexts/NotificationContext";
import { UserSession } from "@/lib/clientAuth";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

const Navigation = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Use the generalized notification context
  const { unreadCount } = useNotification();

  // Set mounted state after component mounts (prevents hydration mismatch)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [router.pathname]);

  // Close mobile menu when screen size changes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Get user data from NextAuth session or localStorage fallback
  const getUserData = () => {
    // First try NextAuth session
    if (session?.user?.name) {
      return {
        name: session.user.name,
        email: session.user.email || null,
        role: (session.user as any)?.role || "user",
      };
    }

    // Only access localStorage after component has mounted to prevent hydration mismatch
    if (mounted) {
      const localUser = UserSession.getSession();
      if (localUser) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            "[Navigation] Using localStorage session data for user:",
            localUser.name
          );
        }
        return {
          name: localUser.name || null,
          email: localUser.email || null,
          role: localUser.role || "user",
        };
      }
    }

    // Return default user if no session found
    return {
      name: null,
      email: null,
      role: "user",
    };
  };

  const user = getUserData();

  const isAdmin = user.role.toLowerCase() === "admin";
  const isEncoder = user.role.toLowerCase() === "encoder";

  // Get notification counts for specific types
  const defectEditRequestCount = unreadCount.byType["defect-edit"] || 0;
  const systemNotificationCount = unreadCount.byType["system"] || 0;
  const messageCount = unreadCount.byType["message"] || 0;
  const totalUnreadCount = unreadCount.total || 0;

  const isActive = (path: string) => {
    if (path === "/notifications") {
      return router.pathname === path;
    }
    return router.pathname === path || router.pathname.startsWith(`${path}/`);
  };

  const navItems = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Production Orders", href: "/production-orders" },
  ];

  // Items visible to both admins and encoders
  const sharedNavItems = [
    { title: "Edit Requests", href: "/operation-defects-edit-requests" },
  ];

  // Debug logging for session management
  if (process.env.NODE_ENV === "development") {
    console.log("[Navigation] User data:", {
      name: user.name,
      email: user.email,
      role: user.role,
      isAdmin,
      isEncoder,
      hasNextAuthSession: !!session?.user,
      hasLocalSession: mounted ? !!UserSession.getSession() : false,
      mounted,
    });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        {/* Desktop Navigation */}
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center">
            {/* Logo */}
            <Link
              href="/dashboard"
              className="mr-4 flex items-center space-x-2"
            >
              <span className="font-bold rounded px-4 py-1 border border-primary dark:border-white text-primary dark:text-white bg-background">
                P-Chart
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-3 xl:space-x-6">
              {navItems.map((item) => (
                <NavItem
                  key={item.href}
                  title={item.title}
                  href={item.href}
                  isActive={isActive(item.href)}
                />
              ))}
              {/* Only render role-based nav items after component has mounted to prevent hydration mismatch */}
              {mounted &&
                (isAdmin || isEncoder) &&
                sharedNavItems.map((item) => (
                  <NavItem
                    key={item.href}
                    title={item.title}
                    href={item.href}
                    isActive={isActive(item.href)}
                  />
                ))}
            </nav>
          </div>

          {/* Search and User Menu */}
          <div className="flex items-center justify-end space-x-3 md:space-x-4">
            {/* Search Bar */}
            <div className="relative w-full max-w-[260px] md:max-w-xs lg:max-w-sm hidden md:block">
              <POSearchHandler />
            </div>

            {/* Notifications Bell Icon with HoverCard */}
            <HoverCard openDelay={300} closeDelay={100}>
              <HoverCardTrigger asChild>
                <Link href="/notifications" className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`rounded-full h-9 w-9 ${
                      isActive("/notifications")
                        ? "bg-primary/10 text-primary"
                        : ""
                    }`}
                  >
                    <Bell className="h-5 w-5" />
                    {totalUnreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                        {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                      </span>
                    )}
                  </Button>
                </Link>
              </HoverCardTrigger>
              <HoverCardContent className="w-64 p-2" align="end">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Notifications</h4>
                  <div className="space-y-1">
                    {defectEditRequestCount > 0 && (
                      <div className="flex justify-between items-center text-xs py-1 px-2 rounded hover:bg-muted">
                        <span>Defect Edit Requests</span>
                        <span className="bg-red-100 text-red-800 rounded-full px-2 py-0.5">
                          {defectEditRequestCount}
                        </span>
                      </div>
                    )}
                    {systemNotificationCount > 0 && (
                      <div className="flex justify-between items-center text-xs py-1 px-2 rounded hover:bg-muted">
                        <span>System Notifications</span>
                        <span className="bg-blue-100 text-blue-800 rounded-full px-2 py-0.5">
                          {systemNotificationCount}
                        </span>
                      </div>
                    )}
                    {messageCount > 0 && (
                      <div className="flex justify-between items-center text-xs py-1 px-2 rounded hover:bg-muted">
                        <span>Messages</span>
                        <span className="bg-green-100 text-green-800 rounded-full px-2 py-0.5">
                          {messageCount}
                        </span>
                      </div>
                    )}
                    {totalUnreadCount === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-2">
                        No new notifications
                      </div>
                    )}
                  </div>
                  <hr className="my-1" />
                  <Link
                    href="/notifications"
                    className="text-xs text-primary hover:underline block text-center"
                  >
                    View all notifications
                  </Link>
                </div>
              </HoverCardContent>
            </HoverCard>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Menu */}
            <UserMenu user={user} notificationCount={totalUnreadCount} />

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t">
            <nav className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-md transition-colors text-sm font-medium ${
                    isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  {item.title}
                </Link>
              ))}

              {/* Shared items for admins and encoders - only render after mount */}
              {mounted &&
                (isAdmin || isEncoder) &&
                sharedNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 rounded-md transition-colors text-sm font-medium ${
                      isActive(item.href)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                    }`}
                  >
                    {item.title}
                  </Link>
                ))}

              {/* Mobile Notifications Link */}
              <Link
                href="/notifications"
                className={`px-4 py-2 rounded-md transition-colors text-sm font-medium flex items-center ${
                  isActive("/notifications")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                }`}
              >
                <Bell className="h-5 w-5 mr-2" />
                <span>Notifications</span>
                {totalUnreadCount > 0 && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                    {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                  </span>
                )}
              </Link>

              {/* Mobile Search */}
              <div className="mt-4 px-4 w-full">
                <POSearchHandler />
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navigation;
