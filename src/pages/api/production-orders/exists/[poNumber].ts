import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow HEAD requests (lightweight check)
  if (req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { poNumber } = req.query;
  
  if (!poNumber || typeof poNumber !== 'string') {
    return res.status(400).json({ error: 'Invalid PO number' });
  }

  try {
    console.log(`[API] Checking if PO exists: ${poNumber}`);
    
    // Just check if the PO exists without fetching all data
    const poExists = await prisma.productionOrder.findUnique({
      where: { poNumber },
      select: { id: true } // Only select ID to minimize data transfer
    });

    if (!poExists) {
      console.log(`[API] PO not found: ${poNumber}`);
      return res.status(404).end();
    }

    // PO exists
    console.log(`[API] PO exists: ${poNumber}`);
    return res.status(200).end();
  } catch (error) {
    console.error('[API] Error checking PO existence:', error);
    return res.status(500).end();
  }
}

export default withAuth(handler); 