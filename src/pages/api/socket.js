import { Server } from 'socket.io';

// Store active connections
let ioInstance;

export default function SocketHandler(req, res) {
  // If socket server is already running, skip initialization
  if (res.socket.server.io) {
    console.log('Socket server already running');
    res.end();
    return;
  }

  console.log('Setting up Socket.IO server...');
  
  // Setup Socket.IO server with CORS settings
  const io = new Server(res.socket.server, {
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });
  
  // Store IO instance on the server object
  res.socket.server.io = io;
  
  // Store the instance for external usage
  ioInstance = io;

  // Listen for connections
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Join user-specific rooms for targeted notifications
    socket.on('join-user-room', (userId) => {
      if (userId) {
        console.log(`User ${userId} joined their personal room`);
        socket.join(`user-${userId}`);
      }
    });
    
    // Join role-specific rooms
    socket.on('join-role-room', (role) => {
      if (role) {
        const normalizedRole = role.toLowerCase();
        console.log(`User joined ${normalizedRole} room`);
        socket.join(`role-${normalizedRole}`);
      }
    });
    
    // Listen for defect edit request events
    socket.on('defect-edit-requested', (data) => {
      console.log('Defect edit requested:', data);
      
      // Notify all admins with the proper notification-defect-edit event
      // This format matches what the NotificationContext expects
      const notification = {
        id: data.requestId || Date.now().toString(),
        type: 'defect-edit',
        title: 'New Defect Edit Request',
        message: `A defect edit has been requested for ${data.defectCode || 'a defect'}`,
        isRead: false,
        createdAt: new Date().toISOString(),
        linkUrl: '/notifications',
        sourceId: data.defectId,
        sourceType: 'defect',
      };
      
      // Send to admin role room
      io.to('role-admin').emit('notification-defect-edit', notification);
      
      // Also send a count update
      io.to('role-admin').emit('notification-count-update', { type: 'defect-edit' });
      
      console.log('Emitted defect-edit notification to all admins');
    });
    
    // Listen for defect edit resolution events
    socket.on('defect-edit-resolved', (data) => {
      console.log('Defect edit resolved:', data);
      
      // Create a properly formatted notification
      const notification = {
        id: data.responseId || Date.now().toString(),
        type: 'defect-edit',
        title: 'Defect Edit Request Resolved',
        message: data.approved 
          ? `Your defect edit request was approved` 
          : `Your defect edit request was rejected`,
        isRead: false,
        createdAt: new Date().toISOString(),
        linkUrl: '/notifications',
        sourceId: data.defectId,
        sourceType: 'defect',
      };
      
      // Notify the specific user who requested the edit
      if (data.requestedById) {
        io.to(`user-${data.requestedById}`).emit('notification-defect-edit', notification);
        io.to(`user-${data.requestedById}`).emit('notification-count-update', { type: 'defect-edit' });
        console.log(`Emitted defect-edit resolution notification to user ${data.requestedById}`);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  console.log('Socket server initialized successfully');
  res.end();
}

// Export a function to get the IO instance from other files
export const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.IO has not been initialized. Call the socket API route first.');
  }
  return ioInstance;
};

// Create a safer version that doesn't throw errors
export const getSafeIO = () => {
  return ioInstance || null;
}; 