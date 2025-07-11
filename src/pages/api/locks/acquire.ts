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

    console.log(`Lock acquisition requested for ${resourceType}:${resourceId} by user ${user?.name} (${user?.id})`);
    
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

    // Use transaction to ensure atomicity of the lock check and acquisition
    const result = await prisma.$transaction(async (tx) => {
      // Check if the resource exists
      const resource = await tx.productionOrder.findUnique({
        where: { poNumber: resourceId },
        select: { 
          id: true,
          editingUserId: true,
          editingUserName: true,
          lockedAt: true 
        }
      });

      if (!resource) {
        return { 
          success: false, 
          error: 'Resource not found',
          statusCode: 404 
        };
      }

      const userId = parseInt(user.id);
      
      // Check if already locked by someone else
      if (
        resource.editingUserId !== null && 
        resource.editingUserId !== userId && 
        resource.lockedAt
      ) {
        console.log(`Resource is locked by user ${resource.editingUserName} (${resource.editingUserId})`);
        
        return { 
          success: false, 
          isOwner: false,
          statusCode: 423,
          lockInfo: {
            userId: resource.editingUserId,
            userName: resource.editingUserName,
            lockedAt: resource.lockedAt
          }
        };
      }

      // Check if already locked by current user
      if (resource.editingUserId === userId) {
        console.log(`User already owns the lock for ${resourceType}:${resourceId}`);
        
        return { 
          success: true, 
          isOwner: true,
          statusCode: 200,
          lockInfo: {
            userId: resource.editingUserId,
            userName: resource.editingUserName,
            lockedAt: resource.lockedAt
          }
        };
      }

      // Acquire the lock
      const updatedResource = await tx.productionOrder.update({
        where: { id: resource.id },
        data: {
          editingUserId: userId,
          editingUserName: user.name || user.username,
          lockedAt: new Date()
        },
        select: {
          editingUserId: true,
          editingUserName: true,
          lockedAt: true
        }
      });

      console.log(`Lock acquired for ${resourceType}:${resourceId} by user ${user.name} (${user.id})`);
      
      return { 
        success: true, 
        isOwner: true,
        statusCode: 200,
        lockInfo: {
          userId: updatedResource.editingUserId,
          userName: updatedResource.editingUserName,
          lockedAt: updatedResource.lockedAt
        }
      };
    });

    // Return the appropriate response based on the transaction result
    const { statusCode, ...responseData } = result;
    return res.status(statusCode || 200).json(responseData);
    
  } catch (error) {
    console.error('Error acquiring lock:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to acquire lock' 
    });
  }
}

export default withAuth(handler); 