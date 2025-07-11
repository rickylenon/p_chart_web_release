import { NextApiRequest, NextApiResponse } from 'next';

export type NextApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse
) => Promise<void | NextApiResponse>;

export function apiAuthMiddleware(handler: NextApiHandler) {
  return async function (req: NextApiRequest, res: NextApiResponse) {
    console.log('API Middleware: Checking auth');
    
    try {
      // For development, we'll skip auth and assume the user is authenticated
      // In a real implementation, you would validate the auth token here
      console.log('API Middleware: Auth passed (dev mode)');
      
      // Call the original handler
      return handler(req, res);
    } catch (error) {
      console.error('API Auth middleware error:', error);
      return res.status(500).json({ error: 'Internal server error in auth middleware' });
    }
  };
} 