import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function handler(req: NextApiRequest, res: NextApiResponse, session: any) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { resourceType, resourceId } = req.query;
    const user = session?.user;

    console.log(`Lock status check for ${resourceType}:${resourceId} by user ${user?.name} (${user?.id})`);
    
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

    // Get the resource
    const resource = await prisma.productionOrder.findUnique({
      where: { poNumber: resourceId as string },
      select: { 
        id: true,
        editingUserId: true,
        editingUserName: true,
        lockedAt: true
      }
    });

    if (!resource) {
      return res.status(404).json({ 
        success: false, 
        error: 'Resource not found' 
      });
    }

    const userId = user ? parseInt(user.id) : null;
    const isLocked = resource.editingUserId !== null && resource.lockedAt !== null;
    const isOwner = isLocked && resource.editingUserId === userId;

    console.log(`Lock status for ${resourceType}:${resourceId}:`, {
      isLocked,
      isOwner,
      lockInfo: isLocked ? {
        userId: resource.editingUserId,
        userName: resource.editingUserName,
        lockedAt: resource.lockedAt
      } : null
    });

    return res.status(200).json({
      isLocked,
      isOwner,
      lockInfo: isLocked ? {
        userId: resource.editingUserId,
        userName: resource.editingUserName,
        lockedAt: resource.lockedAt
      } : null
    });
    
  } catch (error) {
    console.error('Error checking lock status:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to check lock status' 
    });
  }
}

export default withAuth(handler); 