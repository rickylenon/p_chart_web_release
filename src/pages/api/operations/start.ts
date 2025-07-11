import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createAuditLog, getClientInfo } from '@/lib/auditLogger';

async function handler(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { poNumber, operationCode } = req.body;
    console.log(`Starting operation for PO: ${poNumber}, Operation: ${operationCode}`);
    
    if (!poNumber || !operationCode) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Get the user role
    const userRole = session?.user?.role || '';
    const isAdmin = typeof userRole === 'string' && userRole.toLowerCase() === 'admin';
    console.log('User role:', userRole, 'Is admin?', isAdmin);
    
    // Get the production order
    const productionOrder = await prisma.productionOrder.findUnique({
      where: { poNumber },
      include: {
        operations: {
          include: {
            operationDefects: true
          }
        }
      }
    });
    
    if (!productionOrder) {
      return res.status(404).json({ error: 'Production order not found' });
    }

    // Check if the production order is completed and user is not admin
    if (productionOrder.status === 'COMPLETED' && !isAdmin) {
      console.log('Non-admin user tried to edit a completed production order');
      return res.status(403).json({ 
        error: 'Only admin users can edit completed production orders' 
      });
    }
    
    // Find the operation to start
    const operation = productionOrder.operations.find(
      op => op.operation.toLowerCase() === operationCode.toLowerCase()
    );
    
    if (!operation) {
      return res.status(404).json({ error: 'Operation not found' });
    }
    
    // Check if operation is already started
    if (operation.startTime) {
      return res.status(400).json({ error: 'Operation has already been started' });
    }
    
    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get the current user id (or default if not available)
      const operatorId = session?.user?.id ? parseInt(session.user.id) : await getDefaultUserId(tx);
      
      // Get the original operation for audit logging
      const originalOperation = { ...operation };
      
      // Start the operation and update the production order
      const updatedOperation = await tx.operation.update({
        where: { id: operation.id },
        data: {
          startTime: new Date(),
          operatorId
        }
      });
      
      // Update the production order's current operation
      const updatedOrder = await tx.productionOrder.update({
        where: { id: productionOrder.id },
        data: {
          currentOperation: operationCode,
          currentOperationStartTime: new Date(),
          currentOperationEndTime: null,
          status: 'IN_PROGRESS'
        },
        include: {
          operations: {
            include: {
              operationDefects: true
            }
          }
        }
      });
      
      // Create audit log for the operation update
      await createAuditLog({
        tableName: 'operations',
        recordId: operation.id,
        action: 'update',
        oldValues: originalOperation,
        newValues: updatedOperation,
        userId: operatorId,
        ...getClientInfo(req)
      });
      
      return updatedOrder;
    });
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error starting operation:', error);
    return res.status(500).json({ 
      error: 'An error occurred while starting the operation'
    });
  }
}

// Helper function to get a default user id if not available in the session
async function getDefaultUserId(prismaClient: any): Promise<number> {
  const defaultUser = await prismaClient.user.findFirst();
  if (!defaultUser) {
    throw new Error('No users found in the system');
  }
  return defaultUser.id;
}

export default withAuth(handler); 