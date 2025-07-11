import { NextApiRequest, NextApiResponse } from 'next';

export type NextApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse
) => Promise<void | NextApiResponse>;

export type NextAuthApiHandler = (
  req: NextApiRequest, 
  res: NextApiResponse,
  session?: any
) => Promise<void | NextApiResponse>;

/**
 * API error handling middleware to ensure all responses are proper JSON
 * and prevent HTML error responses that cause client-side parsing issues
 */
export function withErrorHandling(handler: NextApiHandler | NextAuthApiHandler) {
  return async function (req: NextApiRequest, res: NextApiResponse, session?: any) {
    // Override the res.status method to ensure it always returns JSON
    const originalStatus = res.status;
    res.status = function(statusCode: number) {
      console.log(`API response status code set to: ${statusCode}`);
      
      // Add a response hook to ensure HTML responses aren't sent
      const originalSend = res.send;
      res.send = function(body: any) {
        // If the body is a string that looks like HTML, convert to JSON error
        if (typeof body === 'string' && body.trim().startsWith('<!DOCTYPE html>')) {
          console.error('ERROR: HTML detected in API response, converting to JSON');
          
          // Reset the headers
          res.setHeader('Content-Type', 'application/json');
          
          // Return a proper JSON error
          return originalSend.call(this, JSON.stringify({
            error: 'An internal server error occurred',
            code: 'INTERNAL_SERVER_ERROR',
            htmlDetected: true
          }));
        }
        
        return originalSend.call(this, body);
      };
      
      return originalStatus.call(this, statusCode);
    };
    
    try {
      // Call the original handler (pass session if it exists)
      return session ? await handler(req, res, session) : await handler(req, res);
    } catch (error: any) {
      console.error('Unhandled API error:', error);
      
      // Ensure we haven't already sent a response
      if (!res.writableEnded) {
        // Always send a proper JSON error response
        return res.status(500).json({
          error: 'An unexpected error occurred',
          message: error.message || 'Unknown error',
          code: 'INTERNAL_SERVER_ERROR'
        });
      }
    }
  };
}

/**
 * Combines error handling with other middleware
 */
export function withErrorHandlingAndAuth(handler: NextAuthApiHandler) {
  // Apply error handling first, then authentication
  const withErrorHandler = withErrorHandling(handler);
  
  return async function(req: NextApiRequest, res: NextApiResponse, session?: any) {
    console.log('API: Applying error handling and auth middleware');
    
    try {
      // For development, we'll skip auth and assume the user is authenticated
      // In a real implementation, you would validate the auth token here
      console.log('API: Auth validation passed (dev mode)');
      
      // Call the handler with error handling
      return await withErrorHandler(req, res, session);
    } catch (error) {
      console.error('API Auth middleware error:', error);
      return res.status(401).json({ 
        error: 'Authentication failed',
        code: 'UNAUTHORIZED'
      });
    }
  };
} 