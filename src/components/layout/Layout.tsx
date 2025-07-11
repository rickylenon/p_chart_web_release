import { ReactNode } from 'react';
import Navigation from './Navigation';
import Footer from './Footer';
import { Toaster } from '@/components/ui/toaster';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Navigation />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex-grow">
        {children}
      </main>
      <Footer />
      <Toaster />
    </div>
  );
};

export default Layout; 