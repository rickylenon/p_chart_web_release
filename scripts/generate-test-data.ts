import { PrismaClient } from '@prisma/client';
import { addDays, addHours, subDays } from 'date-fns';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Standard password for all users
const STANDARD_PASSWORD = 'P@ssw0rd!123';

// Configuration
const NUM_PRODUCTION_ORDERS = 20;
const DATE_RANGE_DAYS = 30; // Generate data over the last 30 days
const DEFECT_RATES = {
  low: { min: 1, max: 5 },
  medium: { min: 6, max: 15 },
  high: { min: 16, max: 30 }
};
// Ensure every operation has at least some defects
const MIN_DEFECTS_PER_OPERATION = 1;
const MAX_DEFECT_TYPES_PER_OPERATION = 4;

// Helper functions
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDate(startDate: Date, endDate: Date): Date {
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  return new Date(startTime + Math.random() * (endTime - startTime));
}

// Function to update user passwords
async function updateUserPasswords() {
  console.log('Ensuring all users have the standard password...');
  
  try {
    // Get all users
    const users = await prisma.user.findMany();
    
    if (users.length === 0) {
      console.log('No users found. Please run seed script first.');
      return;
    }
    
    // Hash the standard password once
    const hashedPassword = await bcrypt.hash(STANDARD_PASSWORD, 10);
    
    // Update each user with the standard password
    for (const user of users) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });
      console.log(`Updated password for user: ${user.username} (${user.role})`);
    }
    
    console.log(`All ${users.length} users updated with standard password`);
  } catch (error) {
    console.error('Error updating user passwords:', error);
  }
}

// Function to determine shift based on operation and time
function determineShift(operationCode: string, endTime: Date): string {
  const hour = endTime.getHours();
  const minute = endTime.getMinutes();
  
  // For OP10, OP15, OP30 use 8AM-8PM for day shift
  if (['OP10', 'OP15', 'OP30'].includes(operationCode)) {
    return (hour >= 8 && (hour < 20 || (hour === 20 && minute === 0))) ? 'DAY' : 'NIGHT';
  }
  
  // For other operations use 8:01AM-7:59PM for day shift
  return ((hour === 8 && minute > 0) || (hour > 8 && hour < 19) || (hour === 19 && minute < 59)) ? 'DAY' : 'NIGHT';
}

// Sample data for realism
const items = [
  'Precision Bearing',
  'Control Valve',
  'Circuit Board A23',
  'Power Transistor',
  'Hydraulic Pump',
  'Sensor Assembly',
  'Motor Housing',
  'Cooling Fan',
  'Drive Shaft',
  'Filter Element'
];

const lineNumbers = ['LINE-01', 'LINE-02', 'LINE-03', 'LINE-04', 'LINE-05', 'LINE-06', 'LINE-07', 'LINE-08', 'LINE-09', 'LINE-10'];

const defectCategories = ['DIMENSION', 'APPEARANCE', 'FUNCTIONALITY', 'MATERIAL'];
const machines = ['CNC-01', 'DRILL-02', 'LATHE-03', 'MILL-04', 'PRESS-05', 'ASSEMBLY-01', 'TEST-STATION-02'];

// Map of defects by operation
const defectsByOperation: Record<string, string[]> = {
  'OP10': ['Scratch', 'Dent', 'Wrong Dimension', 'Material Defect'],
  'OP15': ['Incomplete Cut', 'Broken Edge', 'Misalignment', 'Tool Mark'],
  'OP20': ['Burr', 'Surface Roughness', 'Thread Damage', 'Discoloration'],
  'OP30': ['Assembly Gap', 'Missing Component', 'Loose Connection', 'Wrong Part'],
  'OP40': ['Failed Test', 'Electrical Short', 'Leakage', 'Performance Issue']
};

async function main() {
  console.log('Starting test data generation...');
  
  try {
    // First, update all user passwords
    await updateUserPasswords();
    
    // Get operation steps
    const operationSteps = await prisma.operationStep.findMany({
      orderBy: { stepOrder: 'asc' }
    });
    
    if (operationSteps.length === 0) {
      throw new Error('No operation steps found. Run prisma seed first.');
    }
    
    console.log(`Found ${operationSteps.length} operation steps`);
    
    // Get defects
    const masterDefects = await prisma.masterDefect.findMany();
    
    if (masterDefects.length === 0) {
      throw new Error('No master defects found. Run prisma seed first.');
    }
    
    console.log(`Found ${masterDefects.length} master defects`);
    
    // Get users for operations
    const users = await prisma.user.findMany();
    
    if (users.length === 0) {
      throw new Error('No users found. Run prisma seed first.');
    }
    
    console.log(`Found ${users.length} users`);
    
    // Create production orders
    const today = new Date();
    const startDate = subDays(today, DATE_RANGE_DAYS);
    
    for (let i = 0; i < NUM_PRODUCTION_ORDERS; i++) {
      // Generate a random date within the range
      const createdDate = getRandomDate(startDate, today);
      
      // Create a unique PO number with date component
      const poNumber = `PO-${createdDate.getFullYear()}${(createdDate.getMonth() + 1).toString().padStart(2, '0')}${createdDate.getDate().toString().padStart(2, '0')}-${(i + 1).toString().padStart(3, '0')}`;
      
      // Generate lot number
      const lotNumber = `LOT-${getRandomInt(1000, 9999)}`;
      
      // Select random item and quantity
      const itemName = getRandomElement(items);
      const poQuantity = getRandomInt(100, 1000);
      
      console.log(`Creating PO: ${poNumber}, Item: ${itemName}, Quantity: ${poQuantity}`);
      
      try {
        // Create production order
        const productionOrder = await prisma.productionOrder.create({
          data: {
            poNumber,
            lotNumber,
            poQuantity,
            itemName,
            status: 'COMPLETED', // We'll set all to completed since we're creating historical data
            createdAt: createdDate,
            updatedAt: createdDate,
          }
        });
        
        console.log(`Created production order ID: ${productionOrder.id}`);
        
        let currentDate = createdDate;
        let remainingQuantity = poQuantity;
        let currentOperation: string | null = null;
        
        // Create operations with sequential dates
        for (const step of operationSteps) {
          const user = getRandomElement(users);
          currentOperation = step.operationNumber;
          
          // Set random defect rate for this operation
          const defectRate = getRandomElement(Object.values(DEFECT_RATES));
          const totalDefectPercent = getRandomInt(defectRate.min, defectRate.max) / 100;
          
          // Calculate defect quantity
          const totalDefectsForOperation = Math.floor(remainingQuantity * totalDefectPercent);
          const outputQuantity = remainingQuantity - totalDefectsForOperation;
          
          // Update remaining quantity for next operation
          remainingQuantity = outputQuantity;
          
          // Start date/time for this operation
          const startTime = currentDate;
          
          // End date is 1-4 hours later for this operation
          const endTime = addHours(startTime, getRandomInt(1, 4));
          
          // Next operation starts 0-2 days later
          currentDate = addDays(endTime, getRandomInt(0, 2));
          
          console.log(`Creating operation ${step.operationNumber} with input: ${remainingQuantity + totalDefectsForOperation}, output: ${outputQuantity}, defects: ${totalDefectsForOperation}`);
          
          // Create operation
          const operation = await prisma.operation.create({
            data: {
              productionOrderId: productionOrder.id,
              operation: step.operationNumber,
              operatorId: user.id,
              encodedById: user.id,
              startTime,
              endTime,
              inputQuantity: remainingQuantity + totalDefectsForOperation,
              outputQuantity,
              productionHours: getRandomInt(1, 4),
              rf: 1,
              lineNo: getRandomElement(lineNumbers),
              shift: determineShift(step.operationNumber, endTime)
            }
          });
          
          console.log(`Created operation ID: ${operation.id}`);
          
          // Calculate defect quantity - ensure minimum defects
          // Even if the random defect rate resulted in 0 defects, we'll add some
          let adjustedDefectsForOperation = totalDefectsForOperation;
          if (adjustedDefectsForOperation < MIN_DEFECTS_PER_OPERATION) {
            // Add at least a small number of defects
            adjustedDefectsForOperation = getRandomInt(MIN_DEFECTS_PER_OPERATION, Math.max(MIN_DEFECTS_PER_OPERATION, Math.floor(remainingQuantity * 0.03)));
            console.log(`Adjusting defects to minimum: ${adjustedDefectsForOperation}`);
          }
          
          // Get applicable defects for this operation
          const applicableDefects = masterDefects.filter(
            (d) => d.applicableOperation === step.operationNumber || d.applicableOperation === null
          );
          
          if (applicableDefects.length > 0) {
            // Randomly distribute defects - more random number of defect types
            const numDefectTypes = getRandomInt(1, Math.min(MAX_DEFECT_TYPES_PER_OPERATION, applicableDefects.length));
            const selectedDefects: typeof applicableDefects = [];
            
            // Select random defects
            for (let j = 0; j < numDefectTypes; j++) {
              let defect;
              do {
                defect = getRandomElement(applicableDefects);
              } while (selectedDefects.includes(defect));
              
              selectedDefects.push(defect);
            }
            
            // Calculate quantities for each defect
            let remainingDefects = adjustedDefectsForOperation;
            
            for (let j = 0; j < selectedDefects.length; j++) {
              const defect = selectedDefects[j];
              let defectQty;
              
              if (j === selectedDefects.length - 1) {
                // Last defect gets all remaining defects
                defectQty = remainingDefects;
              } else {
                // More random distribution of defects
                const maxForDefect = Math.max(1, remainingDefects - (selectedDefects.length - j - 1));
                defectQty = getRandomInt(1, maxForDefect);
              }
              
              remainingDefects -= defectQty;
              
              // Determine rework vs. nogood ratio based on defect.reworkable
              let reworkQty = 0;
              let nogoodQty = defectQty;
              
              if (defect.reworkable) {
                // Random percentage of defects can be reworked
                const reworkPercent = getRandomInt(0, 100) / 100;
                reworkQty = Math.floor(defectQty * reworkPercent);
                nogoodQty = defectQty - reworkQty;
              }
              
              console.log(`Creating defect: ${defect.name}, Qty: ${defectQty}, Rework: ${reworkQty}, NoGood: ${nogoodQty}`);
              
              // Create operation defect
              await prisma.operationDefect.create({
                data: {
                  operationId: operation.id,
                  defectId: defect.id,
                  defectCategory: defect.category || 'UNKNOWN',
                  defectMachine: getRandomElement(machines),
                  defectReworkable: defect.reworkable || false,
                  quantity: defectQty,
                  quantityRework: reworkQty,
                  quantityNogood: nogoodQty,
                  recordedById: user.id,
                  recordedAt: endTime,
                }
              });
            }
          }
        }
        
        // Update production order with final status and operation
        await prisma.productionOrder.update({
          where: { id: productionOrder.id },
          data: {
            status: 'COMPLETED',
            currentOperation: operationSteps[operationSteps.length - 1].operationNumber,
            currentOperationStartTime: addDays(createdDate, operationSteps.length - 1),
            currentOperationEndTime: addDays(createdDate, operationSteps.length),
            updatedAt: addDays(createdDate, operationSteps.length),
          }
        });
        
        console.log(`Completed production order: ${poNumber}`);
      } catch (error) {
        console.error(`Error processing production order ${poNumber}:`, error);
      }
    }
    
    console.log('Test data generation completed successfully!');
  } catch (error) {
    console.error('Error generating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}); 