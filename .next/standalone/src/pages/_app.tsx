import "@/styles/globals.css";
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import { Inter } from "next/font/google";
import Head from "next/head";
import { Toaster } from "@/components/ui/toaster";
import { useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { getSessionProviderConfig } from "@/lib/authConfig";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { IdleTimeoutProvider } from "@/contexts/IdleTimeoutContext";
import { IdleWarningModal } from "@/components/modals/IdleWarningModal";
import { Toaster as HotToaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

// Error fallback component
function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-6 max-w-sm w-full bg-white shadow-lg rounded-lg">
        <h2 className="text-xl font-bold text-red-600 mb-4">
          Something went wrong
        </h2>
        <p className="text-gray-700 mb-4">{error.message}</p>
        <button
          onClick={resetErrorBoundary}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  // Handle session errors
  useEffect(() => {
    const handleErrors = (event: ErrorEvent) => {
      console.error("Caught in global handler:", event.error);
    };

    window.addEventListener("error", handleErrors);
    return () => window.removeEventListener("error", handleErrors);
  }, []);

  // Debug session info
  useEffect(() => {
    console.log("[App] Session provided to SessionProvider:", session);
    console.log("[App] Cookies available:", document.cookie);
  }, [session]);

  return (
    <>
      <Head>
        <title>P-Chart System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/jae-logo.png" />
      </Head>
      <SessionProvider
        session={session}
        {...getSessionProviderConfig()}
        basePath="/api/auth"
        refetchOnWindowFocus={true}
        refetchInterval={5 * 60} // 5 minutes
      >
        <ThemeProvider>
          <IdleTimeoutProvider>
            <NotificationProvider>
              <ErrorBoundary
                FallbackComponent={ErrorFallback}
                onReset={() => {
                  // Reset app state here if needed
                }}
              >
                <main className={inter.className}>
                  <Component {...pageProps} />
                </main>
              </ErrorBoundary>
              <IdleWarningModal />
              <Toaster />
              <HotToaster
                position="top-right"
                toastOptions={{
                  // Default options for all toasts
                  duration: 4000,
                  style: {
                    maxWidth: "350px",
                    fontSize: "0.875rem",
                  },
                }}
                // Limit the number of toast notifications visible at once
                containerStyle={{
                  top: 40,
                  right: 20,
                  maxHeight: "calc(100vh - 100px)",
                  maxWidth: "100%",
                  overflow: "hidden",
                }}
                // Allow clicking through the toast container when no toasts are visible
                containerClassName="!pointer-events-none"
                gutter={8} // Space between toasts
              />
            </NotificationProvider>
          </IdleTimeoutProvider>
        </ThemeProvider>
      </SessionProvider>
    </>
  );
}
