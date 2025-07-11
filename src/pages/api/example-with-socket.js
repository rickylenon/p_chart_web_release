import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { emitToAll } from '../../lib/socket';

export default async function handler(req, res) {
  // Get the user's session for authentication
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Extract data from request body
    const { action, data } = req.body;
    
    if (!action || !data) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log(`Processing ${action} with data:`, data);
    
    // Simulate some server-side processing
    const result = {
      id: Math.floor(Math.random() * 1000),
      action,
      data,
      processedAt: new Date().toISOString(),
      processedBy: session.user.email,
    };
    
    // Emit event to all connected clients
    emitToAll('data-updated', {
      type: action,
      item: result,
      user: session.user.email,
    });
    
    console.log('Emitted data-updated event to all clients');
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Action processed successfully',
      result,
    });
  } catch (error) {
    console.error('Error processing action:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 