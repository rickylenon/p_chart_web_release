import { NextApiRequest, NextApiResponse } from 'next';
import { apiAuthMiddleware } from '@/middlewares/apiAuthMiddleware';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  // Redirect to the new API endpoint
  const redirectUrl = `/api/master-defects/${id}/deactivate`;
  
  console.log(`[API] Redirecting from /api/defects/${id}/deactivate to ${redirectUrl}`);
  
  // 307 Temporary Redirect maintains the HTTP method (GET, POST, etc.)
  res.redirect(307, redirectUrl);
}

export default apiAuthMiddleware(handler); 