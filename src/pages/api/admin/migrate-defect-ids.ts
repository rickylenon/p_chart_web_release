import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/auth';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Interface for operation defects with defect name
interface OperationDefectWithName {
  id: number;
  operationId: number;
  defectName?: string;  // This property might exist in older data
  operation: {
    id: number;
  };
}

async function handler(req: NextApiRequest, res: NextApiResponse, session: any) {
  // Verify admin role
  if (session?.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  console.log('Running defect ID migration...');

  try {
    // Find operation defects with null defectId using raw SQL
    const nullDefectCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM operation_defects 
      WHERE defect_id = 0 OR defect_id IS NULL
    `;

    console.log('Query result:', nullDefectCount);

    // Extract the count from the result with proper type handling
    const nullDefectIdCount = Array.isArray(nullDefectCount) && nullDefectCount.length > 0 && 
      typeof nullDefectCount[0] === 'object' && nullDefectCount[0] !== null && 'count' in nullDefectCount[0]
        ? Number(nullDefectCount[0].count)
        : 0;
    
    console.log(`Found ${nullDefectIdCount} operation defects with null or zero defectId`);
    
    if (nullDefectIdCount === 0) {
      return res.status(200).json({ message: 'No defects with invalid IDs found.' });
    }

    // Get defects that need to be updated (using raw query to bypass Prisma model constraints)
    const defectsToUpdate = await prisma.$queryRaw<OperationDefectWithName[]>`
      SELECT od.id, od.operation_id as "operationId", d.name as "defectName", 
             jsonb_build_object('id', o.id) as operation
      FROM operation_defects od
      JOIN operations o ON od.operation_id = o.id
      LEFT JOIN defects d ON d.name = od.defect_category
      WHERE od.defect_id = 0 OR od.defect_id IS NULL
    `;

    console.log(`Found ${defectsToUpdate.length} defects with invalid IDs to update`);

    // Process each defect
    let updatedCount = 0;
    const failed: any[] = [];

    for (const opDefect of defectsToUpdate) {
      try {
        // Skip if no defect name
        if (!opDefect.defectName) {
          failed.push({
            id: opDefect.id,
            reason: 'No defect name available'
          });
          console.log(`Failed to update defect ID for operation defect ${opDefect.id}: No defect name available`);
          continue;
        }
        
        // Find matching defect by name
        const matchingDefect = await prisma.masterDefect.findFirst({
          where: {
            name: opDefect.defectName
          }
        });

        if (matchingDefect) {
          // Update the operation defect
          await prisma.$executeRaw`
            UPDATE operation_defects
            SET defect_id = ${matchingDefect.id}
            WHERE id = ${opDefect.id}
          `;
          updatedCount++;
          console.log(`Updated defect ID for operation defect ${opDefect.id} to defect ID ${matchingDefect.id}`);
        } else {
          failed.push({
            id: opDefect.id,
            defectName: opDefect.defectName,
            reason: 'No matching defect found'
          });
          console.log(`Failed to update defect ID for operation defect ${opDefect.id}: No matching defect found for ${opDefect.defectName}`);
        }
      } catch (error) {
        console.error(`Error updating defect ID for operation defect ${opDefect.id}:`, error);
        failed.push({
          id: opDefect.id,
          defectName: opDefect.defectName,
          reason: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return res.status(200).json({
      message: `Migration completed. Updated ${updatedCount} defect(s).`,
      failedCount: failed.length,
      failed: failed.length > 0 ? failed : undefined
    });
  } catch (error) {
    console.error('Error in defect ID migration:', error);
    return res.status(500).json({
      error: 'Failed to migrate defect IDs',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

export default withAuth(handler); 