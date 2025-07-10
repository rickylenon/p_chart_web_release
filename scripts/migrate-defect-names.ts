import { PrismaClient } from '@prisma/client';

// Initialize Prisma Client
const prisma = new PrismaClient();

async function migrateDefectNames() {
  console.log('Starting migration of defect names...');
  
  try {
    // Get all operation defects
    const operationDefects = await prisma.operationDefect.findMany({
      where: {
        defectName: null,
        defectId: { not: null }
      },
      include: {
        defect: true
      }
    });
    
    console.log(`Found ${operationDefects.length} operation defects without defectName`);
    
    // Process in batches of 100
    const batchSize = 100;
    let updatedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < operationDefects.length; i += batchSize) {
      const batch = operationDefects.slice(i, i + batchSize);
      console.log(`Processing batch ${i / batchSize + 1} with ${batch.length} records`);
      
      // Use a transaction for each batch
      await prisma.$transaction(async (tx) => {
        for (const defect of batch) {
          try {
            if (!defect.defect) {
              console.log(`Skipping defect ID ${defect.defectId} - master defect not found`);
              errorCount++;
              continue;
            }
            
            // Update the operation defect with the defect name
            await tx.operationDefect.update({
              where: { id: defect.id },
              data: { defectName: defect.defect.name }
            });
            
            updatedCount++;
            
            // Log progress for every 100 updates
            if (updatedCount % 100 === 0) {
              console.log(`Updated ${updatedCount} records so far`);
            }
          } catch (error) {
            console.error(`Error updating defect ID ${defect.id}:`, error);
            errorCount++;
          }
        }
      });
    }
    
    console.log('\nMigration completed:');
    console.log(`- Total records processed: ${operationDefects.length}`);
    console.log(`- Successfully updated: ${updatedCount}`);
    console.log(`- Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateDefectNames()
  .then(() => console.log('Migration process completed'))
  .catch(error => console.error('Migration process failed:', error)); 