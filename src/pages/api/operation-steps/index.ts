import { NextApiRequest, NextApiResponse } from 'next';
import { apiAuthMiddleware } from '@/middlewares/apiAuthMiddleware';
import prisma from '@/lib/prisma';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Operation steps API called');
  
  if (req.method === 'GET') {
    try {
      // Fetch operation steps from the database
      const operationSteps = await prisma.operationStep.findMany({
        orderBy: {
          stepOrder: 'asc'
        }
      });
      
      // Format the data for the frontend
      const formattedSteps = operationSteps.map(step => ({
        code: step.operationNumber,
        name: step.label,
        sequence: step.stepOrder
      }));
      
      console.log(`Returning ${formattedSteps.length} operation steps`);
      return res.status(200).json(formattedSteps);
    } catch (error) {
      console.error('Error fetching operation steps:', error);
      return res.status(500).json({ error: 'Failed to fetch operation steps' });
    }
  }
  
  // Method not supported
  return res.status(405).json({ error: 'Method not allowed' });
}

export default apiAuthMiddleware(handler); 