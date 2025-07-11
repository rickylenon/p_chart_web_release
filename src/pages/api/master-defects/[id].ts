import { NextApiRequest, NextApiResponse } from 'next';
import { apiAuthMiddleware } from '@/middlewares/apiAuthMiddleware';
import prisma from '@/lib/prisma';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('MasterDefect [id] API called');
  
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'MasterDefect ID is required' });
  }
  
  const masterDefectId = parseInt(id, 10);
  
  if (isNaN(masterDefectId)) {
    return res.status(400).json({ error: 'Invalid master defect ID' });
  }
  
  console.log(`Processing request for master defect ID: ${masterDefectId}`);

  // GET - fetch a specific master defect
  if (req.method === 'GET') {
    try {
      const masterDefect = await prisma.masterDefect.findUnique({
        where: { id: masterDefectId }
      });
      
      if (!masterDefect) {
        return res.status(404).json({ error: 'Master defect not found' });
      }
      
      console.log(`Found master defect: ${masterDefect.name}`);
      return res.status(200).json(masterDefect);
    } catch (error) {
      console.error('Error fetching master defect:', error);
      return res.status(500).json({ error: 'Failed to fetch master defect' });
    }
  }
  
  // PATCH - update a specific master defect
  if (req.method === 'PATCH') {
    try {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      console.log('Updating master defect with data:', data);
      
      // Check if the master defect exists
      const existingMasterDefect = await prisma.masterDefect.findUnique({
        where: { id: masterDefectId }
      });
      
      if (!existingMasterDefect) {
        return res.status(404).json({ error: 'Master defect not found' });
      }
      
      // For deactivation, record who deactivated and when
      let updateData: any = { ...data };
      if (data.isActive === false && existingMasterDefect.isActive) {
        // Get a default user for now - in a real app, this would come from the session
        const defaultUser = await prisma.user.findFirst();
        if (!defaultUser) {
          return res.status(500).json({ error: 'No users found to record deactivation' });
        }
        
        updateData.deactivatedById = defaultUser.id;
        updateData.deactivatedAt = new Date();
        console.log(`Deactivating master defect with user ${defaultUser.username}`);
      }
      
      // For reactivation, clear deactivation info
      if (data.isActive === true && !existingMasterDefect.isActive) {
        updateData.deactivatedById = null;
        updateData.deactivatedAt = null;
        console.log('Reactivating master defect');
      }
      
      // Update the master defect
      const updatedMasterDefect = await prisma.masterDefect.update({
        where: { id: masterDefectId },
        data: updateData
      });
      
      console.log(`Updated master defect ${updatedMasterDefect.name}`);
      return res.status(200).json(updatedMasterDefect);
    } catch (error) {
      console.error('Error updating master defect:', error);
      return res.status(500).json({ 
        error: 'Failed to update master defect',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  // DELETE - soft delete a master defect by deactivating it
  if (req.method === 'DELETE') {
    try {
      // Check if the master defect exists
      const existingMasterDefect = await prisma.masterDefect.findUnique({
        where: { id: masterDefectId }
      });
      
      if (!existingMasterDefect) {
        return res.status(404).json({ error: 'Master defect not found' });
      }
      
      // Get a default user for recording deactivation
      const defaultUser = await prisma.user.findFirst();
      if (!defaultUser) {
        return res.status(500).json({ error: 'No users found to record deactivation' });
      }
      
      // Soft delete by deactivating
      const deactivatedMasterDefect = await prisma.masterDefect.update({
        where: { id: masterDefectId },
        data: {
          isActive: false,
          deactivatedById: defaultUser.id,
          deactivatedAt: new Date()
        }
      });
      
      console.log(`Deactivated master defect ${deactivatedMasterDefect.name}`);
      return res.status(200).json({ message: 'Master defect deactivated successfully' });
    } catch (error) {
      console.error('Error deactivating master defect:', error);
      return res.status(500).json({ 
        error: 'Failed to deactivate master defect',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

export default apiAuthMiddleware(handler); 