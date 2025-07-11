import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

async function handler(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const userId = session.user.id;
  
  // GET - Fetch user profile
  if (req.method === 'GET') {
    try {
      console.log(`Fetching enhanced user profile for user ID: ${userId}`);
      
      // Get additional user data from the database
      try {
        const userData = await prisma.user.findUnique({
          where: { 
            id: typeof userId === 'string' ? parseInt(userId, 10) : userId 
          },
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            role: true,
            department: true,
            isActive: true,
            lastLogin: true,
            // Don't include sensitive data like password
            // Include additional user statistics
            _count: {
              select: {
                operations: true, // Count operations performed by this user
              }
            }
          }
        });
        
        if (!userData) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        // Get recent activity (modified to match schema)
        // Note: Can't use both select and include, so using include with specific selection
        const recentActivity = await prisma.operation.findMany({
          where: {
            operatorId: typeof userId === 'string' ? parseInt(userId, 10) : userId 
          },
          orderBy: {
            encodedTime: 'desc'
          },
          take: 5,
          include: {
            productionOrder: {
              select: {
                poNumber: true,
                itemName: true
              }
            }
          }
        });
        
        // Return enhanced user profile
        return res.status(200).json({
          // Basic user info
          id: String(userData.id),
          username: userData.username || userData.name,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          department: userData.department,
          isActive: userData.isActive,
          lastLogin: userData.lastLogin,
          
          // Statistics
          stats: {
            operationsCount: userData._count.operations,
          },
          
          // Recent activity
          recentActivity: recentActivity.map(activity => ({
            id: activity.id,
            operation: activity.operation,
            poNumber: activity.productionOrder.poNumber,
            itemName: activity.productionOrder.itemName,
            startTime: activity.startTime,
            endTime: activity.endTime,
            timestamp: activity.encodedTime
          }))
        });
      } catch (dbError) {
        console.error('Database error when fetching user profile:', dbError);
        
        // Fallback to basic user info if database query fails
        return res.status(200).json({
          id: session.user.id,
          username: session.user.username || session.user.name,
          role: session.user.role,
          // Note that this is limited data due to database error
          isLimitedData: true
        });
      }
    } catch (error) {
      console.error('Error in /api/me GET:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }
  
  // PUT - Update user profile
  if (req.method === 'PUT') {
    try {
      console.log(`Updating profile for user ID: ${userId}`);
      
      const { name, email, password, department } = req.body;
      
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { 
          id: typeof userId === 'string' ? parseInt(userId, 10) : userId 
        }
      });
      
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Create update data object
      const updateData: any = {
        name: name || null,
        email: email || null,
        department: department || null,
      };
      
      // Only update password if provided
      if (password) {
        console.log('Updating password');
        updateData.password = await bcrypt.hash(password, 10);
      }
      
      // Update user in database
      const updatedUser = await prisma.user.update({
        where: { 
          id: typeof userId === 'string' ? parseInt(userId, 10) : userId 
        },
        data: updateData,
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          role: true,
          department: true,
          isActive: true,
          lastLogin: true,
          // Don't include password
          _count: {
            select: {
              operations: true,
            }
          }
        }
      });
      
      console.log(`User profile updated successfully: ${updatedUser.username}`);
      
      // Return updated user data
      return res.status(200).json({
        id: String(updatedUser.id),
        username: updatedUser.username || updatedUser.name,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        department: updatedUser.department,
        isActive: updatedUser.isActive,
        lastLogin: updatedUser.lastLogin,
        stats: {
          operationsCount: updatedUser._count.operations,
        },
        // No recent activity in the response since it's not updated
        recentActivity: []
      });
    } catch (error) {
      console.error('Error in /api/me PUT:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  }
  
  // Unsupported method
  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler); 