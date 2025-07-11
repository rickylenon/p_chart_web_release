import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function handler(req: NextApiRequest, res: NextApiResponse, session: any) {
  console.log('Audit Logs API called');
  
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
  
  try {
    // Get the user role
    const userRole = session?.user?.role || '';
    const isAdmin = typeof userRole === 'string' && userRole.toLowerCase() === 'admin';
    
    console.log('Audit Logs API - User role:', userRole, 'Is admin?', isAdmin);
    
    // Only admin users can access audit logs
    if (!isAdmin) {
      return res.status(403).json({ 
        error: 'Forbidden - Only admin users can access audit logs' 
      });
    }
    
    // Parse query parameters
    const { tableName, recordId, limit = '50', page = '1' } = req.query;
    console.log('Audit Logs API query params:', { tableName, recordId, limit, page });
    
    // Build where clause
    const where: any = {};
    if (tableName && typeof tableName === 'string') {
      where.tableName = tableName;
    }
    if (recordId && typeof recordId === 'string') {
      where.recordId = recordId;
    }
    
    // Convert limit and page to numbers
    const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100); // Max 100 records per page
    const pageNum = parseInt(page as string, 10) || 1;
    const skip = (pageNum - 1) * limitNum;
    
    // Get total count for pagination
    const totalCount = await prisma.auditLog.count({ where });
    
    // Fetch audit logs with pagination
    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: {
        timestamp: 'desc'
      },
      include: {
        user: {
          select: {
            name: true,
            username: true
          }
        }
      },
      skip,
      take: limitNum
    });
    
    // Format logs for response
    const formattedLogs = auditLogs.map(log => ({
      id: log.id,
      tableName: log.tableName,
      recordId: log.recordId,
      action: log.action,
      oldValues: log.oldValues ? JSON.parse(log.oldValues) : null,
      newValues: log.newValues ? JSON.parse(log.newValues) : null,
      user: log.user.name || log.user.username,
      timestamp: log.timestamp,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent
    }));
    
    console.log(`Returning ${formattedLogs.length} audit logs out of ${totalCount} total`);
    
    return res.status(200).json({
      data: formattedLogs,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch audit logs',
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

export default withAuth(handler); 