import { useRouter } from 'next/router';
import Link from 'next/link';
import AuthLayout from '@/components/layout/AuthLayout';
import Head from 'next/head';

export default function ErrorPage() {
  const router = useRouter();
  const { error } = router.query;

  const getErrorMessage = (error: string | string[] | undefined) => {
    switch (error) {
      case 'CredentialsSignin':
        return 'Invalid username or password';
      case 'SessionRequired':
        return 'Please sign in to access this page';
      case 'AccessDenied':
        return 'You do not have permission to access this page';
      default:
        return 'An error occurred during authentication';
    }
  };

  return (
    <AuthLayout>
      <Head>
        <title>Error - P-Chart System</title>
      </Head>
      <div className="flex items-center justify-center min-h-[80vh] bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Authentication Error
            </h2>
            <div className="mt-2 text-center text-sm text-gray-600">
              {getErrorMessage(error)}
            </div>
          </div>
          <div className="mt-4 text-center">
            <Link
              href="/auth/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Return to login
            </Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
} 