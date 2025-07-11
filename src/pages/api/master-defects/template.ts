import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/auth';
import ExcelJS from 'exceljs';

async function handler(req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    console.log('API: MasterDefects template download auth session validated, user:', session?.user?.name);
  
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    console.log('Generating master defects import template');
    
    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Master Defects Template');
    
    // Add header row with styling
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Operation', key: 'operation', width: 15 },
      { header: 'Machine', key: 'machine', width: 15 },
      { header: 'Reworkable', key: 'reworkable', width: 12 },
      { header: 'Status', key: 'status', width: 10 },
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
    
    // Add sample data rows
    const sampleData = [
      {
        name: 'Missing Pin',
        description: 'Pin is missing from connector',
        category: 'Connector',
        operation: 'OP20',
        machine: 'Machine 1',
        reworkable: 'Yes',
        status: 'Active'
      },
      {
        name: 'Broken Housing',
        description: 'Housing has visible cracks or damage',
        category: 'Housing',
        operation: 'OP30',
        machine: 'Machine 2',
        reworkable: 'No',
        status: 'Active'
      }
    ];
    
    // Add sample data
    sampleData.forEach(item => {
      worksheet.addRow(item);
    });
    
    // Add help text at the bottom
    worksheet.addRow({});
    worksheet.addRow({name: 'Instructions:'});
    worksheet.addRow({name: '- Name and Category are required fields'});
    worksheet.addRow({name: '- Reworkable should be "Yes" or "No"'});
    worksheet.addRow({name: '- Status should be "Active" or "Inactive"'});
    worksheet.addRow({name: '- Operation should be the operation code (e.g., OP10, OP20)'});
    
    // Style help text
    for (let i = worksheet.rowCount - 5; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      row.getCell(1).font = { 
        italic: true,
        color: { argb: '00555555' }
      };
    }
    
    // Format cells
    for (let i = 2; i <= sampleData.length + 1; i++) {
      const row = worksheet.getRow(i);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    }
    
    console.log('Template file generated, preparing for download');
    
    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=master-defects-template.xlsx');
    
    // Write to buffer and send response
    const buffer = await workbook.xlsx.writeBuffer();
    console.log('Template file written to buffer, sending to client');
    res.send(buffer);
    
  } catch (error) {
    console.error('Error generating template file:', error);
    res.status(500).json({ error: 'Failed to generate template file' });
  }
}

export default withAuth(handler); 