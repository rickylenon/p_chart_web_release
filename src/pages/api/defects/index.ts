import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/auth';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Redirect to the new API endpoint with the same query parameters
  const queryString = Object.entries(req.query)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');
  
  const redirectUrl = `/api/master-defects${queryString ? `?${queryString}` : ''}`;
  
  console.log(`[API] Redirecting from /api/defects to ${redirectUrl}`);
  
  // 307 Temporary Redirect maintains the HTTP method (GET, POST, etc.)
  res.redirect(307, redirectUrl);
};

export default withAuth(handler); 