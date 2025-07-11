import { NextApiRequest, NextApiResponse } from 'next';
import { apiAuthMiddleware } from '@/middlewares/apiAuthMiddleware';
import prisma from '@/lib/prisma';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Create production order API called');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Parse request body
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    console.log('Creating production order with data:', data);
    
    const { poNumber, lotNumber, poQuantity, itemName } = data;
    
    // Validate required fields
    if (!poNumber) {
      return res.status(400).json({ error: 'PO Number is required' });
    }
    
    if (!poQuantity || isNaN(parseInt(poQuantity))) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }
    
    // Check if production order already exists
    const existingOrder = await prisma.productionOrder.findUnique({
      where: { poNumber }
    });
    
    if (existingOrder) {
      return res.status(409).json({ error: 'Production order with this PO Number already exists' });
    }
    
    try {
      // Start a transaction to create the production order and its operations
      const result = await prisma.$transaction(async (tx) => {
        // Create the production order
        const productionOrder = await tx.productionOrder.create({
          data: {
            poNumber,
            lotNumber: lotNumber || null,
            poQuantity: parseInt(poQuantity),
            itemName: itemName || null,
            status: 'CREATED',
            currentOperation: null,
          }
        });
        
        console.log(`Created production order: ${productionOrder.id}`);
        
        // Get all operation steps
        const operationSteps = await tx.operationStep.findMany({
          orderBy: { stepOrder: 'asc' }
        });
        
        console.log(`Found ${operationSteps.length} operation steps`);
        
        if (operationSteps.length === 0) {
          console.error('No operation steps found in the database');
          throw new Error('No operation steps found. Please seed the database with operation steps.');
        }
        
        // We'll need a default operator and encoder
        // In a real app, this would be the current user
        const defaultUser = await tx.user.findFirst();
        
        if (!defaultUser) {
          console.error('No users found in the database');
          throw new Error('No users found in the system. Please seed the database with at least one user.');
        }
        
        console.log(`Using default user ID: ${defaultUser.id} for operations`);
        
        // Create operations for each step
        console.log(`Creating ${operationSteps.length} operations`);
        
        for (const step of operationSteps) {
          console.log(`Creating operation for step: ${step.operationNumber} (Step Order: ${step.stepOrder})`);
          try {
            // Only set input quantity from PO for first operation (OP10)
            // Other operations will get their input from the previous operation when it completes
            const isFirstOperation = step.stepOrder === Math.min(...operationSteps.map(s => s.stepOrder));
            const inputQty = isFirstOperation ? parseInt(poQuantity) : 0;
            
            const createdOperation = await tx.operation.create({
              data: {
                productionOrderId: productionOrder.id,
                operation: step.operationNumber,
                operatorId: defaultUser.id,
                inputQuantity: inputQty,
                encodedById: defaultUser.id,
                rf: 1 // Default RF value is 1
              }
            });
            console.log(`Created operation ${step.operationNumber} for PO: ${poNumber} (Operation ID: ${createdOperation.id}, Input Qty: ${inputQty})`);
          } catch (opError) {
            console.error(`Error creating operation for ${step.operationNumber}:`, opError);
            throw opError;
          }
        }
        
        // Return the created production order with its operations
        const completeOrder = await tx.productionOrder.findUnique({
          where: { id: productionOrder.id },
          include: {
            operations: {
              include: {
                operationDefects: true
              }
            }
          }
        });
        
        console.log(`Found ${completeOrder?.operations?.length || 0} operations for created order`);
        return completeOrder;
      });
      
      console.log(`Production order transaction completed successfully: ${result?.id}`);
      return res.status(201).json(result);
    } catch (txError: any) {
      console.error('Transaction error creating production order:', txError);
      throw new Error(`Transaction failed: ${txError.message}`);
    }
  } catch (error) {
    console.error('Error creating production order:', error);
    return res.status(500).json({ 
      error: 'Failed to create production order',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default apiAuthMiddleware(handler); 