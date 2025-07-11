import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const handler = async (req: NextApiRequest, res: NextApiResponse, session: any) => {
  console.log('API: MasterDefects filters auth session validated, user:', session?.user?.name);
  
  try {
    console.log('[PRISMA_DB] MasterDefects Filters API called');
    
    if (req.method === 'GET') {
      try {
        console.log('[PRISMA_DB] Fetching unique filter options for master defects');
        
        // Get all unique categories
        const categoriesResult = await prisma.masterDefect.findMany({
          select: {
            category: true
          },
          where: {
            category: {
              not: null
            }
          },
          distinct: ['category']
        });
        
        // Get all unique operations
        const operationsResult = await prisma.masterDefect.findMany({
          select: {
            applicableOperation: true
          },
          where: {
            applicableOperation: {
              not: null
            }
          },
          distinct: ['applicableOperation']
        });
        
        // Extract and sort the values
        const categories = categoriesResult
          .map(item => item.category as string)
          .filter(Boolean)
          .sort();
        
        const operations = operationsResult
          .map(item => item.applicableOperation as string)
          .filter(Boolean)
          .sort();
        
        console.log(`[PRISMA_DB] Found ${categories.length} unique categories and ${operations.length} unique operations`);
        
        return res.status(200).json({
          categories,
          operations
        });
      } catch (error) {
        console.error('[PRISMA_DB] Error fetching filter options:', error);
        console.error('[PRISMA_DB] MasterDefect filters error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        return res.status(500).json({ error: 'Failed to fetch filter options' });
      }
    }
    
    // Method not supported
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API auth error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAuth(handler); 