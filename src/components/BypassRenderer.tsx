'use client';

import { useState, useEffect } from 'react';

// This component forces client-side rendering only, completely bypassing hydration
export function BypassRenderer({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Skip loading entirely and just render the content immediately
  // This will cause hydration warnings but avoids the loading spinner
  return <>{children}</>;
} 