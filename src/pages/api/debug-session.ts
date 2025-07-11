import { NextApiRequest, NextApiResponse } from 'next';
import { getServerAuth } from '@/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('[Debug-Session] Request received');
  console.log('[Debug-Session] Cookie header:', req.headers.cookie);
  
  // Get a list of all cookies
  const cookieList = req.headers.cookie
    ? req.headers.cookie
        .split(';')
        .map(cookie => cookie.trim())
        .map(cookie => {
          const [name, value] = cookie.split('=');
          return { 
            name, 
            value: name.includes('token') ? '[HIDDEN]' : value
          };
        })
    : [];
    
  console.log('[Debug-Session] Cookies:', cookieList);
  
  try {
    // Get the server session using our consolidated auth module
    const session = await getServerAuth(req, res);
    console.log('[Debug-Session] Session result:', session ? 'Found' : 'Not found');
    
    // Send back diagnostic information
    return res.status(200).json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      hasSession: !!session,
      user: session?.user || null,
      cookiesPresent: cookieList.map(c => c.name),
      nextAuthUrlSet: !!process.env.NEXTAUTH_URL,
      nextAuthUrl: process.env.NEXTAUTH_URL,
      baseUrl: `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`,
    });
  } catch (error) {
    console.error('[Debug-Session] Error fetching session:', error);
    return res.status(500).json({ 
      error: 'Error fetching session',
      message: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : null
    });
  }
} 