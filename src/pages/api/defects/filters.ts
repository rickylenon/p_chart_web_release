import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/auth';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Redirect to the new API endpoint
  const redirectUrl = `/api/master-defects/filters`;
  
  console.log(`[API] Redirecting from /api/defects/filters to ${redirectUrl}`);
  
  // 307 Temporary Redirect maintains the HTTP method (GET, POST, etc.)
  res.redirect(307, redirectUrl);
};

export default withAuth(handler); 