import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { callbackUrl } = router.query;

  useEffect(() => {
    if (status === 'authenticated') {
      // If callback URL is provided and is internal, use it; otherwise go to dashboard
      if (callbackUrl && typeof callbackUrl === 'string' && !callbackUrl.startsWith('http')) {
        console.log('Root: Redirecting authenticated user to callback URL:', callbackUrl);
        router.push(callbackUrl);
      } else {
        console.log('Root: Redirecting authenticated user to dashboard');
        router.push('/dashboard');
      }
    } else if (status === 'unauthenticated') {
      // If there's a callback URL, add it to the login redirect
      if (callbackUrl) {
        console.log('Root: Redirecting unauthenticated user to login with callback:', callbackUrl);
        router.push(`/auth/login?callbackUrl=${encodeURIComponent(
          typeof callbackUrl === 'string' ? callbackUrl : callbackUrl[0]
        )}`);
      } else {
        console.log('Root: Redirecting unauthenticated user to login');
        router.push('/auth/login');
      }
    }
  }, [status, router, callbackUrl]);

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <>
        <Head>
          <title>Loading - P-Chart System</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  // This is just a fallback, the useEffect should redirect before this renders
  return (
    <>
      <Head>
        <title>P-Chart System</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">P-Chart System</h1>
          <p className="mt-2 text-gray-600">Redirecting...</p>
        </div>
      </div>
    </>
  );
} 