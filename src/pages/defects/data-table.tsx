import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function DataTablePage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/defects');
  }, [router]);
  
  return null;
} 