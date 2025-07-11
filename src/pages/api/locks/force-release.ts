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

    console.log(`Force lock release requested for ${resourceType}:${resourceId} by user ${user?.name} (${user?.id})`);
    
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

    // Check if user is admin
    const userRole = session?.user?.role || '';
    const isAdmin = typeof userRole === 'string' && userRole.toLowerCase() === 'admin';
    
    if (!isAdmin) {
      console.log(`Non-admin user ${user.name} (${user.id}) attempted to force release a lock`);
      return res.status(403).json({ 
        success: false, 
        error: 'Admin permissions required' 
      });
    }

    // Currently only support production orders
    if (resourceType !== 'productionOrder') {
      return res.status(400).json({ 
        success: false, 
        error: 'Unsupported resource type' 
      });
    }

    // Use transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Find the resource
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

      // Check if the lock exists
      if (resource.editingUserId === null) {
        console.log(`No lock exists for ${resourceType}:${resourceId}`);
        
        return { 
          success: true,
          message: 'No lock existed to release',
          statusCode: 200
        };
      }

      // Store the previous lock info for logging
      const previousLockInfo = {
        userId: resource.editingUserId,
        userName: resource.editingUserName
      };

      // Force release the lock
      await tx.productionOrder.update({
        where: { id: resource.id },
        data: {
          editingUserId: null,
          editingUserName: null,
          lockedAt: null
        }
      });

      console.log(`Admin ${user.name} (${user.id}) force released lock for ${resourceType}:${resourceId} from user ${previousLockInfo.userName} (${previousLockInfo.userId})`);
      
      // Create audit log entry for admin force-releasing a lock
      await tx.auditLog.create({
        data: {
          tableName: 'ProductionOrder',
          recordId: resource.id.toString(),
          action: 'ForceReleaseLock',
          userId: parseInt(user.id),
          oldValues: JSON.stringify({
            editingUserId: previousLockInfo.userId,
            editingUserName: previousLockInfo.userName,
            lockedAt: resource.lockedAt
          }),
          newValues: JSON.stringify({
            editingUserId: null,
            editingUserName: null,
            lockedAt: null
          })
        }
      });
      
      return { 
        success: true,
        message: `Lock force-released from user ${previousLockInfo.userName}`,
        statusCode: 200
      };
    });

    // Return the appropriate response based on the transaction result
    const { statusCode, ...responseData } = result;
    return res.status(statusCode || 200).json(responseData);
    
  } catch (error) {
    console.error('Error force-releasing lock:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to force-release lock' 
    });
  }
}

export default withAuth(handler); 