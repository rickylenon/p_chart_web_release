import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

async function handler(req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    console.log('API: MasterDefects export auth session validated, user:', session?.user?.name);
  
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    console.log('Exporting master defects to Excel');
    
    // Get all master defects from the database
    const masterDefects = await prisma.masterDefect.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });
    
    console.log(`Found ${masterDefects.length} master defects to export`);
    
    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Master Defects');
    
    // Add header row with styling
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Operation', key: 'applicableOperation', width: 15 },
      { header: 'Machine', key: 'machine', width: 15 },
      { header: 'Reworkable', key: 'reworkable', width: 12 },
      { header: 'Status', key: 'isActive', width: 10 },
    ];
    
    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF9CA3AF' }  // Gray background
    };
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // Add the data rows
    masterDefects.forEach(defect => {
      worksheet.addRow({
        name: defect.name,
        description: defect.description,
        category: defect.category,
        applicableOperation: defect.applicableOperation,
        machine: defect.machine,
        reworkable: defect.reworkable ? 'Yes' : 'No',
        isActive: defect.isActive ? 'Active' : 'Inactive'
      });
    });
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = column.width || 20;
    });
    
    // Apply styling to all data cells
    for (let i = 2; i <= masterDefects.length + 1; i++) {
      const row = worksheet.getRow(i);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      
      // Apply different background color to alternate rows
      if (i % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' } // Light gray for even rows
        };
      }
    }
    
    console.log('Excel file generated, preparing for download');
    
    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=master-defects.xlsx');
    
    // Write to buffer and send response
    const buffer = await workbook.xlsx.writeBuffer();
    console.log('Excel file written to buffer, sending to client');
    res.send(buffer);
    
  } catch (error) {
    console.error('Error exporting master defects to Excel:', error);
    res.status(500).json({ error: 'Failed to export master defects' });
  }
}

export default withAuth(handler); 