import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import Image from 'next/image';
import { Eye, EyeOff, User } from 'lucide-react';
import Head from 'next/head';
import AuthLayout from '@/components/layout/AuthLayout';
import Link from 'next/link';
import { useTheme } from '@/components/providers/theme-provider';
import { ThemeToggle } from '@/components/ui/theme-toggle';

// Import package version for consistency
const packageInfo = require("../../../package.json");

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState(false);
  const { callbackUrl, error: errorParam, expired } = router.query;
  const { theme } = useTheme();
  
  console.log('Login: Current theme is', theme);

  // Handle error parameter from URL
  useEffect(() => {
    if (errorParam) {
      if (errorParam === 'AccountDeactivated') {
        setError('Your account has been deactivated. Please contact an administrator for assistance.');
      }
    }
    
    // Check for expired session parameter
    if (expired === 'true') {
      setError('Your session has expired. Please login again.');
      console.log('[Login] Session expired, redirected from:', callbackUrl);
    }
  }, [errorParam, expired, callbackUrl]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;

    try {
      // Log the callback URL for debugging
      console.log('[Login] Attempt with callbackUrl:', callbackUrl);
      
      // Determine the redirect URL - using home instead of dashboard
      const redirectDestination = callbackUrl
        ? (typeof callbackUrl === 'string' ? callbackUrl : callbackUrl[0])
        : '/dashboard';
        
      console.log('[Login] Redirect destination:', redirectDestination);
      
      const result = await signIn('credentials', {
        username: username,
        password: formData.get('password'),
        redirect: false,
        // Pass the callbackUrl to NextAuth
        callbackUrl: redirectDestination,
      });

      console.log('[Login] SignIn result:', JSON.stringify({
        ok: result?.ok,
        error: result?.error,
        url: result?.url,
        status: result?.status
      }));

      if (result?.error) {
        console.error('[Login] Error:', result.error);
        // Check if the error message contains information about inactive account
        if (result.error.toLowerCase().includes('inactive')) {
          setError('This account has been deactivated. Please contact an administrator.');
        } else {
          setError('Invalid credentials');
        }
      } else {
        // On successful login, fetch the session data
        console.log('[Login] Successful, fetching session data');
        try {
          console.log('[Login] ===== SESSION DEBUG START =====');
          console.log('[Login] Browser cookies:', document.cookie);
          console.log('[Login] Current origin:', window.location.origin);
          console.log('[Login] Next-Auth path:', '/api/auth/session');
          console.log('[Login] Headers:', {
            cookie: document.cookie,
            'content-type': 'application/json'
          });
          const sessionResponse = await fetch('/api/auth/session', {
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include' // Important! Make sure cookies are sent
          });
          console.log('[Login] Session response status:', sessionResponse.status);
          console.log('[Login] Session response headers:', Object.fromEntries([...sessionResponse.headers.entries()]));
          
          const sessionData = await sessionResponse.json();
          console.log('[Login] Session data received:', JSON.stringify(sessionData));
          console.log('[Login] Session data type:', typeof sessionData);
          console.log('[Login] Session data has user:', !!sessionData?.user);
          console.log('[Login] ===== SESSION DEBUG END =====');
          
          // Import UserSession from clientAuth
          const { UserSession } = await import('@/lib/clientAuth');
          
          // Store user data in local storage for simplified auth
          if (sessionData?.user) {
            console.log('[Login] Storing user session data in local storage', sessionData.user);
            UserSession.storeSession(sessionData.user);
          } else {
            console.error('[Login] No user data in session response');
            setError('Error retrieving user session');
            return;
          }
          
          // Wait a moment to ensure session is properly saved
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('[Login] Cookies after session storage:', document.cookie);
          
          // Redirect to the designated URL
          console.log('[Login] Redirecting to:', redirectDestination);
          
          // Force a hard reload to make sure all cookies are used
          if (redirectDestination.startsWith('/')) {
            window.location.href = window.location.origin + redirectDestination;
          } else {
            window.location.href = redirectDestination;
          }
        } catch (sessionError) {
          console.error('[Login] Error fetching session:', sessionError);
          setError('Error retrieving user session');
        }
      }
    } catch (error) {
      console.error('[Login] Error during login process:', error);
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Head>
        <title>Login - P-Chart System</title>
      </Head>
      <div className="flex min-h-[calc(100vh-2rem)] items-center justify-center px-4 dark:bg-black dark:border-white">
        <Card className="w-full max-w-[440px] mx-auto bg-primary/5">
          <CardContent className="space-y-6 p-8">
            <div className="space-y-2">
              <div className="flex items-center justify-center">
                <div className="relative w-[180px] h-[120px]">
                  <Image
                    src={theme === 'dark' ? "/jae-logo-white.png" : "/jae-logo.png"}
                    alt="JAE Logo"
                    fill
                    sizes="180px"
                    priority
                    className="object-contain"
                  />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-center text-foreground dark:text-white">P-CHART SYSTEM</h1>
              <p className="text-muted-foreground text-center">Welcome back! Please login to your account.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Username</label>
                <div className="relative">
                  <Input
                    name="username"
                    type="text"
                    required
                    placeholder="Enter your username"
                    disabled={isLoading}
                    className="pl-8 h-9"
                  />
                  <User className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••"
                    disabled={isLoading}
                    className="pl-8 pr-8 h-9"
                  />
                  <Icons.lock className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className={`text-sm ${error.includes('deactivated') || error.includes('expired') ? 'bg-amber-100 p-3 rounded border border-amber-300' : ''} text-destructive text-center font-medium`}>
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded text-sm font-medium"
              >
                {isLoading && (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isLoading ? 'SIGNING IN...' : 'LOGIN'}
              </Button>
            </form>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Version v{packageInfo.version}</span>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                {/* <Link href="/about" className="text-foreground hover:text-primary hover:underline">About</Link> */}
              </div>
            </div>
            
            <div className="pt-4 mt-4 border-t border-border text-xs text-muted-foreground text-center">
              <p>P-Chart System - Production Monitoring Web Application</p>
              <p>Developed by <a href="https://www.lechamp.com.sg/" target="_blank" rel="noopener noreferrer" className="hover:text-primary">LE CHAMP (South East Asia) Pte Ltd</a> | For <a href="https://www.jae.com/en/" target="_blank" rel="noopener noreferrer" className="hover:text-primary">JAE Philippines</a></p>
              <p className="mt-1">© {new Date().getFullYear()} All rights reserved.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthLayout>
  );
} 