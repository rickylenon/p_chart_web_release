import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { withAuth } from '@/lib/clientAuth';

const DefectEditRequestsRedirect = () => {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the new operation defects edit requests page
    console.log('Redirecting from old defect-edit-requests path to new operation-defects-edit-requests path');
    router.replace('/operation-defects-edit-requests');
  }, [router]);
  
  return null; // No UI is needed as we're redirecting
};

export default withAuth(DefectEditRequestsRedirect); 