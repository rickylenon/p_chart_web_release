import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Security check
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Check for seed key
    const seedKey = req.headers.authorization?.replace('Bearer ', '');
    
    // Verify permissions
    const isAuthorized = seedKey && seedKey === process.env.SEED_KEY;
    
    if (!isAuthorized) {
      console.log('Unauthorized seed attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Database is already seeded during build, just return counts
    const userCount = await prisma.user.count();
    const stepCount = await prisma.operationStep.count();
    const defectCount = await prisma.masterDefect.count();
    
    return res.status(200).json({
      success: true,
      message: 'Database was already seeded during build',
      data: {
        userCount,
        stepCount,
        defectCount
      }
    });
  } catch (error) {
    console.error('Error checking database:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to check database', 
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
} 