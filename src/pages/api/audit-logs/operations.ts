import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function handler(req: NextApiRequest, res: NextApiResponse, session: any) {
  console.log('Operation Audit Logs API called');
  
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
  
  try {
    // Get the user role
    const userRole = session?.user?.role || '';
    const isAdmin = typeof userRole === 'string' && userRole.toLowerCase() === 'admin';
    
    console.log('Operation Audit Logs API - User role:', userRole, 'Is admin?', isAdmin);
    
    // Only admin users can access audit logs
    if (!isAdmin) {
      return res.status(403).json({ 
        error: 'Forbidden - Only admin users can access audit logs' 
      });
    }
    
    // Parse query parameters
    const { operationId, defectId, poNumber, type, limit = '50', page = '1' } = req.query;
    console.log('Operation Audit Logs API query params:', { operationId, defectId, poNumber, type, limit, page });
    
    if (!operationId && !poNumber && !defectId) {
      return res.status(400).json({ error: 'Either operationId, defectId or poNumber is required' });
    }
    
    // Build where clause for audit logs
    const where: any = {
      tableName: 'operations',
    };
    
    // If type is specified, filter by operation or defect logs
    if (type === 'defect') {
      where.tableName = 'operation_defects';
    }
    
    // Handle specific defect case
    if (defectId) {
      // If defectId is specified, directly filter by that defect ID
      where.recordId = String(defectId);
    } 
    // Handle operation case - direct ID or via operation lookup
    else if (operationId) {
      if (type === 'defect') {
        // We want all defect logs for this operation
        // Convert operationId to number for the query
        const opId = parseInt(String(operationId), 10);
        
        // Get all defects for this operation
        const defects = await prisma.operationDefect.findMany({
          where: { operationId: opId },
          select: { id: true }
        });
        
        // Get defect IDs
        const defectIds = defects.map(d => String(d.id));
        
        if (defectIds.length === 0) {
          // No defects found, return empty result
          return res.status(200).json({
            data: [],
            pagination: {
              total: 0,
              page: 1,
              limit: parseInt(limit as string, 10) || 50,
              pages: 0
            }
          });
        }
        
        // Where clause for all defects in this operation
        where.recordId = { in: defectIds };
        console.log(`Found ${defectIds.length} defects for operation ${operationId}`);
      } else {
        // Direct operation audit logs, just filter by ID
        where.recordId = String(operationId);
      }
    } 
    // Handle production order case
    else if (poNumber) {
      // First, find all operations associated with this PO number
      const productionOrder = await prisma.productionOrder.findUnique({
        where: { poNumber: String(poNumber) },
        select: { 
          id: true,
          operations: {
            select: { id: true }
          }
        }
      });
      
      if (!productionOrder) {
        return res.status(404).json({ error: 'Production order not found' });
      }
      
      // Get all operation IDs for this PO
      const operationIds = productionOrder.operations.map(op => String(op.id));
      
      if (operationIds.length === 0) {
        // No operations found, return empty result
        return res.status(200).json({
          data: [],
          pagination: {
            total: 0,
            page: 1,
            limit: parseInt(limit as string, 10) || 50,
            pages: 0
          }
        });
      }
      
      // Filter by the operation IDs
      where.recordId = { in: operationIds };
      
      // If type is defect, we need to get all operation defect IDs
      if (type === 'defect') {
        const operationDefects = await prisma.operationDefect.findMany({
          where: {
            operationId: { in: operationIds.map(id => parseInt(id, 10)) }
          },
          select: { id: true }
        });
        
        const defectIds = operationDefects.map(d => String(d.id));
        
        if (defectIds.length === 0) {
          // No defects found, return empty result
          return res.status(200).json({
            data: [],
            pagination: {
              total: 0,
              page: 1,
              limit: parseInt(limit as string, 10) || 50,
              pages: 0
            }
          });
        }
        
        where.recordId = { in: defectIds };
      }
    }
    
    console.log('Final where clause for audit logs:', where);
    
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
    
    console.log(`Returning ${formattedLogs.length} operation audit logs out of ${totalCount} total`);
    
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
    console.error('Error fetching operation audit logs:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch operation audit logs',
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

export default withAuth(handler); 