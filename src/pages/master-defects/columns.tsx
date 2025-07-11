import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ColumnsPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/defects');
  }, [router]);
  
  return null;
} 