import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface LockRequest {
  resourceType: string;
  resourceId: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse, session: any) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the request body
    const data: LockRequest = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { resourceType, resourceId } = data;
    const user = session?.user;

    console.log(`Lock release requested for ${resourceType}:${resourceId} by user ${user?.name} (${user?.id})`);
    
    // Validate request
    if (!resourceType || !resourceId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Resource type and ID are required' 
      });
    }

    if (!user || !user.id) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not authenticated' 
      });
    }

    // Currently only support production orders
    if (resourceType !== 'productionOrder') {
      return res.status(400).json({ 
        success: false, 
        error: 'Unsupported resource type' 
      });
    }

    const userId = parseInt(user.id);
    
    // Use transaction for atomic check and release
    const result = await prisma.$transaction(async (tx) => {
      // Find the resource
      const resource = await tx.productionOrder.findUnique({
        where: { poNumber: resourceId },
        select: { 
          id: true,
          editingUserId: true,
          editingUserName: true
        }
      });

      if (!resource) {
        return { 
          success: false, 
          error: 'Resource not found',
          statusCode: 404 
        };
      }

      // Check if user owns the lock (or if no lock exists)
      if (resource.editingUserId !== null && resource.editingUserId !== userId) {
        console.log(`User ${user.name} (${userId}) does not own the lock for ${resourceType}:${resourceId}`);
        
        return { 
          success: false, 
          error: 'You do not own this lock',
          statusCode: 403
        };
      }

      // Release the lock
      await tx.productionOrder.update({
        where: { id: resource.id },
        data: {
          editingUserId: null,
          editingUserName: null,
          lockedAt: null
        }
      });

      console.log(`Lock released for ${resourceType}:${resourceId} by user ${user.name} (${user.id})`);
      
      return { 
        success: true,
        statusCode: 200
      };
    });

    // Return the appropriate response based on the transaction result
    const { statusCode, ...responseData } = result;
    return res.status(statusCode || 200).json(responseData);
    
  } catch (error) {
    console.error('Error releasing lock:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to release lock' 
    });
  }
}

export default withAuth(handler); 