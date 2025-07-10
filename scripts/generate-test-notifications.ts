import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// Notification types for testing
const NOTIFICATION_TYPES = ['system', 'message', 'defect-edit'];

// Sample notification templates for each type
const NOTIFICATION_TEMPLATES = {
  system: [
    { title: 'System Maintenance', message: 'Scheduled maintenance in 30 minutes. The system will be unavailable for approximately 15 minutes.' },
    { title: 'New Update Available', message: 'Version 2.1.0 has been released with new features and bug fixes.' },
    { title: 'Database Backup Complete', message: 'Daily database backup completed successfully.' },
    { title: 'Security Alert', message: 'Multiple failed login attempts detected from an unknown IP address.' },
  ],
  message: [
    { title: 'New Message from Admin', message: 'Please review the latest production specifications for Project X.' },
    { title: 'Team Meeting Reminder', message: 'Don\'t forget the team meeting at 2:00 PM today in Conference Room A.' },
    { title: 'Document Shared', message: 'Sarah shared a document with you: "Q3 Production Goals".' },
    { title: 'Feedback Request', message: 'Please provide your feedback on the new chart visualization by Friday.' },
  ],
  'defect-edit': [
    { title: 'Defect 12345 Updated', message: 'Status changed from "Open" to "In Progress".' },
    { title: 'New Defect Assigned', message: 'Defect #23456 has been assigned to your team for investigation.' },
    { title: 'Defect Resolution', message: 'Defect #34567 has been marked as "Resolved". Please verify and close.' },
    { title: 'Critical Defect Alert', message: 'High priority defect #45678 requires immediate attention.' },
  ]
};

// Link URLs for sample notifications
const LINK_URLS = [
  '/dashboard',
  '/defects',
  '/socket-demo',
  '/settings',
  '',  // some notifications might not have links
];

// Function to get random item from an array
const getRandomItem = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

// Try to get Socket.IO instance, but continue without it if not available
let io: any = null;
try {
  // Only try to import socket when running in dev server environment
  if (process.env.NODE_ENV === 'development') {
    const socketModule = require('../src/pages/api/socket.js');
    io = socketModule.getSafeIO();
    if (io) {
      console.log('Successfully connected to Socket.IO server');
    } else {
      console.warn('Socket.IO server available but not initialized yet');
    }
  }
} catch (error) {
  console.warn('Socket.IO server not available. Will create notifications without WebSocket events.');
  console.warn('This is normal when running the script outside the Next.js server context.');
}

// Add a command line argument to send to all users
// Process command line arguments
const args = process.argv.slice(2);
const sendToAll = args.includes('--all');

// Create test notification
async function createNotification(userId: number, type: string) {
  try {
    const template = getRandomItem(NOTIFICATION_TEMPLATES[type as keyof typeof NOTIFICATION_TEMPLATES]);
    const linkUrl = Math.random() > 0.3 ? getRandomItem(LINK_URLS) : undefined;  // 70% chance to have a link
    
    console.log(`Creating ${type} notification for user ${userId}: ${template.title}`);
    
    // Create the notification in the database
    const notification = await prisma.notification.create({
      data: {
        type,
        title: template.title,
        message: template.message,
        linkUrl,
        userId,
        sourceId: Math.random() > 0.5 ? Math.floor(Math.random() * 100000).toString() : undefined,
        sourceType: Math.random() > 0.5 ? 'defect' : undefined,
        metadata: Math.random() > 0.7 ? { priority: getRandomItem(['low', 'medium', 'high']) } : undefined
      }
    });
    
    // Emit WebSocket event if possible
    if (io) {
      try {
        // Emit to the specific user's room
        io.to(`user-${userId}`).emit(`notification-${type}`, {
          ...notification,
          userId: undefined // Don't send userId to client for security
        });
        
        // Also emit a general notification count update event
        io.to(`user-${userId}`).emit('notification-count-update', {
          type
        });
        
        console.log(`Emitted notification-${type} event to user-${userId}`);
      } catch (error) {
        console.error('Failed to emit WebSocket event:', error);
        console.log('Continuing without WebSocket event - notification was saved to database');
      }
    } else {
      console.log('Skipping WebSocket event emission (Socket.IO not available)');
      console.log('Notification was saved to database and will be visible on next page refresh');
    }
    
    return notification;
  } catch (error) {
    console.error(`Error creating notification:`, error);
    throw error;
  }
}

// Main execution function
async function generateTestNotifications() {
  try {
    console.log('Starting test notification generation...');
    console.log(sendToAll ? 'Mode: Broadcasting to ALL users' : 'Mode: Random user targeting');
    
    // Get all users from the database
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
      },
    });
    
    if (users.length === 0) {
      console.log('No users found in the database. Please create some users first.');
      return;
    }
    
    console.log(`Found ${users.length} users for notification generation.`);
    
    // Create between 5-15 notifications
    const numNotifications = Math.floor(Math.random() * 11) + 5;
    console.log(`Will generate ${numNotifications} notifications...`);
    
    for (let i = 0; i < numNotifications; i++) {
      // Choose a random user (only used if not sending to all)
      const user = getRandomItem(users);
      
      // Choose a random notification type
      const notificationType = getRandomItem(NOTIFICATION_TYPES);
      
      // Choose a template
      const template = getRandomItem(NOTIFICATION_TEMPLATES[notificationType as keyof typeof NOTIFICATION_TEMPLATES]);
      const linkUrl = Math.random() > 0.3 ? getRandomItem(LINK_URLS) : undefined;
      
      if (sendToAll) {
        // Create notification via API for all users
        await createBroadcastNotification(notificationType, template.title, template.message, linkUrl);
      } else {
        // Create notification for specific user
        await createNotification(user.id, notificationType);
      }
      
      // Add a small delay to spread out the notifications
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`Successfully generated ${numNotifications} test notifications.`);
  } catch (error) {
    console.error('Error in generation script:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

// Function to create a notification broadcast to all users
async function createBroadcastNotification(type: string, title: string, message: string, linkUrl?: string) {
  try {
    console.log(`Creating ${type} broadcast notification: ${title}`);
    
    // Try API call first if socket is available
    if (io) {
      try {
        // Emit directly using socket.io
        const notificationData = {
          id: Date.now().toString(),
          type,
          title,
          message,
          linkUrl,
          createdAt: new Date().toISOString(),
          isRead: false,
          sourceId: Math.random() > 0.5 ? Math.floor(Math.random() * 100000).toString() : undefined,
          sourceType: Math.random() > 0.5 ? 'defect' : undefined,
          metadata: Math.random() > 0.7 ? { priority: getRandomItem(['low', 'medium', 'high']) } : undefined
        };
        
        // Broadcast to all connected clients
        io.emit(`notification-${type}`, notificationData);
        io.emit('notification-count-update', { type });
        
        console.log(`Broadcast ${type} notification via Socket.IO to all users`);
        
        // Still create in database for one user (first user found)
        await prisma.notification.create({
          data: {
            type,
            title,
            message,
            linkUrl,
            userId: 1, // Just save to first user for record keeping
            sourceId: notificationData.sourceId,
            sourceType: notificationData.sourceType,
            metadata: notificationData.metadata
          }
        });
        
        return;
      } catch (error) {
        console.error('Failed to emit Socket.IO broadcast, falling back to API:', error);
      }
    }
    
    // Fallback: use API to create notification with emitToAll flag
    const response = await fetch('http://localhost:3000/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        title,
        message,
        linkUrl,
        emitToAll: true,
        metadata: Math.random() > 0.7 ? { priority: getRandomItem(['low', 'medium', 'high']) } : undefined
      })
    });
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }
    
    console.log(`Created broadcast ${type} notification via API`);
  } catch (error) {
    console.error('Error creating broadcast notification:', error);
    
    // Last resort - create a notification in the database for a specific user
    try {
      await prisma.notification.create({
        data: {
          type,
          title,
          message,
          linkUrl,
          userId: 1, // Just use the first user since this is a fallback
          sourceId: Math.random() > 0.5 ? Math.floor(Math.random() * 100000).toString() : undefined,
          sourceType: Math.random() > 0.5 ? 'defect' : undefined,
          metadata: Math.random() > 0.7 ? { priority: getRandomItem(['low', 'medium', 'high']) } : undefined
        }
      });
      console.log(`Created fallback ${type} notification in database only`);
    } catch (dbError) {
      console.error('Failed to create fallback notification in database:', dbError);
    }
  }
}

// Run the script
generateTestNotifications(); 