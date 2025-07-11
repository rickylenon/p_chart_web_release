import { ReactNode } from 'react';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <main className="flex-1">
        <div className="container">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
} 