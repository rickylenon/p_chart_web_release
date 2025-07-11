import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Info, Book, Clock } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useSession } from "next-auth/react";

// Import package version
const packageInfo = require("../../../package.json");

// Idle timeout hook for footer display
const useIdleTimeoutDisplay = () => {
  const { data: session } = useSession();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    // Mark client as ready to prevent hydration issues
    setIsClientReady(true);
  }, []);

  useEffect(() => {
    if (!isClientReady || !session?.user) {
      setIsEnabled(false);
      return;
    }

    // Check if idle timeout is enabled (only on client side)
    const timeoutEnabled =
      process.env.NEXT_PUBLIC_DISABLE_IDLE_TIMEOUT_DEV !== "true" ||
      process.env.NODE_ENV === "production";

    if (!timeoutEnabled) {
      setIsEnabled(false);
      return;
    }

    setIsEnabled(true);

    // Get role-specific timeout
    const userRole = (session.user as any)?.role?.toLowerCase() || "user";
    let timeout = 30 * 60 * 1000; // Default 30 minutes

    switch (userRole) {
      case "admin":
        timeout =
          parseInt(process.env.NEXT_PUBLIC_IDLE_ADMIN_TIMEOUT_MINUTES || "30") *
          60 *
          1000;
        break;
      case "encoder":
        timeout =
          parseInt(
            process.env.NEXT_PUBLIC_IDLE_ENCODER_TIMEOUT_MINUTES || "15"
          ) *
          60 *
          1000;
        break;
      case "viewer":
        timeout =
          parseInt(process.env.NEXT_PUBLIC_IDLE_VIEWER_TIMEOUT_MINUTES || "5") *
          60 *
          1000;
        break;
      default:
        timeout =
          parseInt(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES || "30") *
          60 *
          1000;
    }

    // Calculate time remaining based on last activity
    const updateTimeRemaining = () => {
      try {
        const lastActivityStr = localStorage.getItem("p_chart_last_activity");
        if (lastActivityStr) {
          let lastActivity: Date | null = null;

          // Try parsing as new format (object with user isolation)
          try {
            const activityData = JSON.parse(lastActivityStr);
            if (activityData.userId && activityData.timestamp) {
              // Check if activity belongs to current user
              const currentUserId = (session.user as any)?.id;
              if (activityData.userId === currentUserId) {
                lastActivity = new Date(activityData.timestamp);
                console.log("[Footer] Using activity for current user:", {
                  userId: activityData.userId,
                  timestamp: lastActivity.toISOString(),
                });
              } else {
                console.log(
                  "[Footer] Activity belongs to different user, resetting"
                );
                localStorage.removeItem("p_chart_last_activity");
                setTimeRemaining(timeout);
                return;
              }
            }
          } catch (parseError) {
            // Might be old format (just timestamp string)
            const date = new Date(lastActivityStr);
            if (!isNaN(date.getTime())) {
              console.log("[Footer] Converting old format activity timestamp");
              lastActivity = date;
            }
          }

          if (lastActivity && !isNaN(lastActivity.getTime())) {
            const now = Date.now();
            const elapsed = now - lastActivity.getTime();
            const remaining = Math.max(0, timeout - elapsed);
            setTimeRemaining(remaining);
          } else {
            console.log("[Footer] Invalid activity timestamp, resetting");
            setTimeRemaining(timeout);
          }
        } else {
          // No last activity found, set current time and full timeout
          console.log("[Footer] No last activity found, initializing");
          setTimeRemaining(timeout);
        }
      } catch (error) {
        console.log("[Footer] Error calculating idle time:", error);
        setTimeRemaining(timeout);
      }
    };

    // Update immediately and then every 10 seconds
    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 10000);

    return () => clearInterval(interval);
  }, [session, isClientReady]);

  const formatTime = (ms: number): string => {
    if (ms <= 0) return "0:00";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return { timeRemaining, isEnabled: isEnabled && isClientReady, formatTime };
};

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [isClient, setIsClient] = useState(false);
  const { timeRemaining, isEnabled, formatTime } = useIdleTimeoutDisplay();

  useEffect(() => {
    setIsClient(true);
  }, []);

  console.log("Footer: Rendering with current year:", currentYear);

  return (
    <footer className="bg-background border-t border-border py-4 mt-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <div className="flex flex-col mb-4 md:mb-0">
            <p>
              <strong className="text-foreground">P-Chart System</strong> -
              Production Monitoring Web Application
            </p>
            <p>
              Developed by{" "}
              <a
                href="https://www.lechamp.com.sg/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:text-primary"
              >
                LE CHAMP (South East Asia) Pte Ltd
              </a>{" "}
              | For{" "}
              <a
                href="https://www.jae.com/en/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:text-primary"
              >
                JAE Philippines
              </a>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <Link
                href="/user-manual"
                className="flex items-center gap-1 hover:text-primary font-medium"
              >
                <Book className="h-4 w-4" />
                User Manual
              </Link>
              <Link
                href="/about"
                className="flex items-center gap-1 hover:text-primary font-medium"
              >
                <Info className="h-4 w-4" />
                About
              </Link>
              <div className="flex items-center ml-1">
                <ThemeToggle />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span>© {currentYear} All rights reserved.</span>
              {isEnabled && isClient && timeRemaining > 0 && (
                <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span title="Session timeout in">
                    {formatTime(timeRemaining)}
                  </span>
                </span>
              )}
              <span className="text-xs text-muted-foreground/70">
                Version: v{packageInfo.version}
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
