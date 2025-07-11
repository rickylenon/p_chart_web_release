const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrphanedLocks() {
  try {
    console.log('Checking for orphaned locks...');
    
    const lockedOrders = await prisma.productionOrder.findMany({
      where: { isLocked: true },
      select: { 
        poNumber: true, 
        isLocked: true, 
        editingUserId: true, 
        editingUserName: true, 
        lockedAt: true 
      }
    });
    
    console.log('Locked production orders:', JSON.stringify(lockedOrders, null, 2));
    
    let orphanedLocks = 0;
    for (const order of lockedOrders) {
      if (order.editingUserId) {
        const user = await prisma.user.findUnique({
          where: { id: order.editingUserId }
        });
        const exists = user ? 'YES' : 'NO';
        console.log(`Order ${order.poNumber} - User ${order.editingUserId} (${order.editingUserName}) exists: ${exists}`);
        
        if (!user) {
          orphanedLocks++;
        }
      }
    }
    
    console.log(`\nTotal locked orders: ${lockedOrders.length}`);
    console.log(`Orphaned locks: ${orphanedLocks}`);
    
    if (orphanedLocks > 0) {
      console.log('\nYou can fix orphaned locks with this query:');
      console.log(`
      // Run this in your database
      UPDATE "ProductionOrder" 
      SET "isLocked" = false, 
          "editingUserId" = NULL, 
          "editingUserName" = NULL, 
          "lockedAt" = NULL 
      WHERE "isLocked" = true 
      AND "editingUserId" NOT IN (SELECT id FROM "User");
      `);
    }
    
  } catch (error) {
    console.error('Error checking locks:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrphanedLocks(); 