import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('[PRISMA_DB] DB Health check requested');
    
    // Print all environment variables related to database (without actual values)
    console.log('[PRISMA_DB] Environment variable check:');
    console.log(`[PRISMA_DB] DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);
    console.log(`[PRISMA_DB] POSTGRES_PRISMA_URL exists: ${!!process.env.POSTGRES_PRISMA_URL}`);
    console.log(`[PRISMA_DB] POSTGRES_URL_NON_POOLING exists: ${!!process.env.POSTGRES_URL_NON_POOLING}`);
    
    // Simple query to check database connectivity
    console.log('[PRISMA_DB] Attempting DB connection test...');
    
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT 1 as health`;
    console.log('[PRISMA_DB] Database connection successful:', result);
    
    // Return success
    return res.status(200).json({
      status: 'ok',
      message: 'Database connection successful',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      databaseUrlStatus: !!process.env.DATABASE_URL ? 'set' : 'missing',
      postgresUrlStatus: !!process.env.POSTGRES_PRISMA_URL ? 'set' : 'missing'
    });
  } catch (error) {
    console.error('[PRISMA_DB] Database health check failed:', error);
    
    // Log error details without sensitive information
    if (error instanceof Error) {
      console.error('[PRISMA_DB] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    // Return error
    return res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      databaseUrlStatus: !!process.env.DATABASE_URL ? 'set' : 'missing',
      postgresUrlStatus: !!process.env.POSTGRES_PRISMA_URL ? 'set' : 'missing'
    });
  }
} 