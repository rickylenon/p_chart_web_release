import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/auth';

// This is an event emitter that will notify the server about cache invalidation
// In a real-world app, this would connect to Redis pub/sub or similar
const cacheEvents = new Map<string, Date>();

async function handler(req: NextApiRequest, res: NextApiResponse, session: any) {
  console.log('Cache invalidation API called');
  
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
  
  try {
    // Parse the request body
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { type, poNumber, operationId } = data;
    
    if (!type || !poNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get the user from the session
    const userId = session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - User not authenticated' });
    }
    
    // Generate a cache key based on the type and identifier
    let cacheKey = `${type}:${poNumber}`;
    if (operationId) {
      cacheKey += `:${operationId}`;
    }
    
    // Store the invalidation time for this cache key
    cacheEvents.set(cacheKey, new Date());
    console.log(`Cache invalidation request received for key: ${cacheKey}`);
    console.log(`Cache invalidation timestamp: ${cacheEvents.get(cacheKey)}`);
    console.log(`Active cache keys: ${Array.from(cacheEvents.keys()).join(", ")}`);
    
    return res.status(200).json({ 
      success: true, 
      message: `Cache invalidated for key: ${cacheKey}`,
      timestamp: cacheEvents.get(cacheKey)
    });
  } catch (error) {
    console.error('Error processing cache invalidation:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Export a function to check if a cache key has been invalidated
export function isCacheInvalidated(key: string, since: Date): boolean {
  const invalidationTime = cacheEvents.get(key);
  if (!invalidationTime) return false;
  
  return invalidationTime > since;
}

export default withAuth(handler); 