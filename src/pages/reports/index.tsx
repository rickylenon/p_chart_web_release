import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Head from 'next/head';

export default function Reports() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Reports - P-Chart System</title>
      </Head>
      <DashboardLayout>
        <div className="py-6">
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
              <div className="mt-4">
                <p className="text-gray-600">View and generate reports here.</p>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
} 