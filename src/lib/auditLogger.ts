import prisma from '@/lib/prisma';

export interface AuditLogData {
  tableName: string;
  recordId: string | number;
  action: 'create' | 'update' | 'delete';
  oldValues?: any;
  newValues?: any;
  userId: number;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Creates an audit log entry in the database
 * @param data Audit log data to record
 * @returns The created audit log entry
 */
export async function createAuditLog(data: AuditLogData) {
  console.log(`Creating audit log for ${data.tableName}:${data.recordId}, action: ${data.action}`);
  
  try {
    // Convert recordId to string if it's a number
    const recordId = String(data.recordId);
    
    // Convert objects to strings for storage
    const oldValues = data.oldValues ? JSON.stringify(data.oldValues) : null;
    const newValues = data.newValues ? JSON.stringify(data.newValues) : null;
    
    // Create the audit log entry
    const auditLog = await prisma.auditLog.create({
      data: {
        tableName: data.tableName,
        recordId,
        action: data.action,
        oldValues,
        newValues,
        userId: data.userId,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      }
    });
    
    console.log(`Audit log created with ID: ${auditLog.id}`);
    return auditLog;
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw the error - we don't want logging failures to break functionality
    return null;
  }
}

/**
 * Utility function to extract relevant client information from a request
 * @param req NextApiRequest object
 * @returns Object containing IP address and user agent
 */
export function getClientInfo(req: any) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
  const userAgent = req.headers['user-agent'] || null;
  
  return {
    ipAddress: typeof ipAddress === 'string' ? ipAddress.split(',')[0].trim() : null,
    userAgent
  };
} 