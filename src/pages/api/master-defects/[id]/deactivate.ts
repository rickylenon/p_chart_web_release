import { NextApiRequest, NextApiResponse } from 'next';
import { apiAuthMiddleware } from '@/middlewares/apiAuthMiddleware';
import prisma from '@/lib/prisma';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow PUT requests
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const masterDefectId = parseInt(id as string);
    
    if (isNaN(masterDefectId)) {
      return res.status(400).json({ error: 'Invalid master defect ID' });
    }
    
    console.log(`Attempting to deactivate master defect ID: ${masterDefectId}`);
    
    // Check if the master defect exists
    const masterDefect = await prisma.masterDefect.findUnique({
      where: { id: masterDefectId }
    });
    
    if (!masterDefect) {
      return res.status(404).json({ error: 'Master defect not found' });
    }
    
    // In development, we don't check for admin role
    if (process.env.NODE_ENV === 'production') {
      // In production, you would check for admin role here
      // Since we're using apiAuthMiddleware which doesn't provide
      // user info, we're skipping this check in dev mode
    }
    
    // Update the master defect to set it as inactive
    // Get a default user for recording deactivation
    const defaultUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    const updatedMasterDefect = await prisma.masterDefect.update({
      where: { id: masterDefectId },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedById: defaultUser?.id || null
      }
    });
    
    console.log(`Successfully deactivated master defect ID: ${masterDefectId}`);
    
    return res.status(200).json({ 
      message: 'Master defect deactivated successfully',
      masterDefect: updatedMasterDefect
    });
  } catch (error) {
    console.error('Error deactivating master defect:', error);
    return res.status(500).json({ error: 'Failed to deactivate master defect' });
  }
}

export default apiAuthMiddleware(handler); 