import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, AlertTriangle } from "lucide-react";
import { useIdleTimeout } from "@/contexts/IdleTimeoutContext";

interface IdleWarningModalProps {
  isOpen?: boolean;
  onContinue?: () => void;
  onLogout?: () => void;
  timeRemaining?: number;
  className?: string;
}

/**
 * Modal component that warns users about impending session timeout
 *
 * Features:
 * - Countdown timer showing exact time until logout
 * - "Continue Session" button to reset the timer
 * - "Logout Now" button for immediate logout
 * - Non-blocking but attention-grabbing design
 * - Keyboard accessibility support
 */
export const IdleWarningModal: React.FC<IdleWarningModalProps> = ({
  isOpen: externalIsOpen,
  onContinue: externalOnContinue,
  onLogout: externalOnLogout,
  timeRemaining: externalTimeRemaining,
  className = "",
}) => {
  // Use context if no external props provided
  const idleTimeoutContext = useIdleTimeout();

  // Determine which props to use
  const isOpen = externalIsOpen ?? idleTimeoutContext?.showWarning ?? false;
  const timeRemaining =
    externalTimeRemaining ?? idleTimeoutContext?.timeRemaining ?? 0;
  const onContinue = externalOnContinue ?? idleTimeoutContext?.extendSession;
  const onLogout = externalOnLogout;

  // State for countdown display
  const [countdown, setCountdown] = useState<string>("");
  const [isUrgent, setIsUrgent] = useState(false);

  // Format time remaining as MM:SS
  const formatTime = useCallback((ms: number): string => {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }, []);

  // Update countdown display
  useEffect(() => {
    setCountdown(formatTime(timeRemaining));

    // Mark as urgent when less than 1 minute remaining
    setIsUrgent(timeRemaining < 60000); // 60 seconds
  }, [timeRemaining, formatTime]);

  // Handle continue session
  const handleContinue = useCallback(() => {
    console.log("[IdleWarningModal] User chose to continue session");
    if (onContinue) {
      onContinue();
    }
  }, [onContinue]);

  // Handle logout now
  const handleLogout = useCallback(async () => {
    console.log("[IdleWarningModal] User chose to logout immediately");

    try {
      if (onLogout) {
        onLogout();
      } else {
        // Default logout behavior - comprehensive cleanup
        const { UserSession } = await import("@/lib/clientAuth");
        if (UserSession?.clearSession) {
          UserSession.clearSession();
        }

        // Sign out without redirect first
        const { signOut } = await import("next-auth/react");
        await signOut({
          redirect: false,
        });

        // Force redirect to ensure clean state
        setTimeout(() => {
          window.location.href = "/auth/login?expired=true";
        }, 100);
      }
    } catch (error) {
      console.error("[IdleWarningModal] Error during logout:", error);
      // Fallback redirect
      window.location.href = "/auth/login?expired=true";
    }
  }, [onLogout]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        handleContinue();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleContinue]);

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleContinue()}>
      <DialogContent
        className={`sm:max-w-md ${className}`}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={handleContinue}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full ${
                isUrgent ? "bg-red-100" : "bg-yellow-100"
              }`}
            >
              {isUrgent ? (
                <AlertTriangle
                  className={`h-6 w-6 ${
                    isUrgent ? "text-red-600" : "text-yellow-600"
                  }`}
                />
              ) : (
                <Clock
                  className={`h-6 w-6 ${
                    isUrgent ? "text-red-600" : "text-yellow-600"
                  }`}
                />
              )}
            </div>
            <DialogTitle
              className={`text-lg font-semibold ${
                isUrgent ? "text-red-900" : "text-yellow-900"
              }`}
            >
              Session Timeout Warning
            </DialogTitle>
          </div>
        </DialogHeader>

        <DialogDescription className="text-center py-4">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your session will expire due to inactivity in:
            </p>

            <div
              className={`text-4xl font-mono font-bold ${
                isUrgent ? "text-red-600" : "text-yellow-600"
              }`}
            >
              {countdown}
            </div>

            <p className="text-sm text-muted-foreground">
              {isUrgent
                ? "Please choose an action immediately to avoid being logged out."
                : "Would you like to continue your session?"}
            </p>
          </div>
        </DialogDescription>

        <DialogFooter className="flex justify-center gap-3 sm:justify-center">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="min-w-[100px]"
          >
            Logout Now
          </Button>

          <Button
            onClick={handleContinue}
            className={`min-w-[120px] ${
              isUrgent
                ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                : "bg-primary hover:bg-primary/90"
            }`}
            autoFocus
          >
            Continue Session
          </Button>
        </DialogFooter>

        {/* Progress indicator */}
        <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
          <div
            className={`h-2 rounded-full transition-all duration-1000 ${
              isUrgent ? "bg-red-500" : "bg-yellow-500"
            }`}
            style={{
              width: `${Math.max(
                0,
                Math.min(100, (timeRemaining / (5 * 60 * 1000)) * 100)
              )}%`,
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IdleWarningModal;
