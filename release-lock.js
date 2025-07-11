// Release lock script for production order 444
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://root:rootroot@localhost:5432/pchart_web'
    }
  }
});

async function releaseLock() {
  try {
    console.log('Attempting to release lock for PO: 444');
    
    // Find the production order
    const order = await prisma.productionOrder.findUnique({
      where: { poNumber: '444' },
      select: { 
        id: true, 
        poNumber: true, 
        editingUserId: true, 
        editingUserName: true,
        lockedAt: true
      }
    });
    
    if (!order) {
      console.error('Production order not found');
      return;
    }
    
    console.log(`Found order: ${JSON.stringify(order)}`);
    
    // Release the lock
    const updatedOrder = await prisma.productionOrder.update({
      where: { poNumber: '444' },
      data: {
        editingUserId: null,
        editingUserName: null,
        lockedAt: null
      }
    });
    
    console.log(`Successfully released lock for PO: 444`);
    console.log('Updated order:', updatedOrder);
  } catch (error) {
    console.error('Error releasing lock:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
releaseLock(); 