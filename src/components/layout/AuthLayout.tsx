import { ReactNode } from 'react';
import Footer from '@/components/layout/Footer';
import { Toaster } from '@/components/ui/toaster';

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col">
      <main className="flex-grow">
        {children}
      </main>
      {/* <Footer /> */}
      <Toaster />
    </div>
  );
};

export default AuthLayout; 