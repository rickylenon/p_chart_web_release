import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

async function handler(req: NextApiRequest, res: NextApiResponse, session: any) {
  console.log('Admin User API called for specific user');

  // Get the user role
  const userRole = session?.user?.role || '';
  const isAdmin = typeof userRole === 'string' && userRole.toLowerCase() === 'admin';
  console.log('User role:', userRole, 'Is admin?', isAdmin);
  
  // Only admins can access user management
  if (!isAdmin) {
    console.log('Non-admin user tried to access user management');
    return res.status(403).json({ error: 'Only admin users can manage users' });
  }

  // Get the user ID from the URL
  const { id } = req.query;
  const userId = parseInt(id as string, 10);

  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  console.log(`Processing request for user ID: ${userId}`);

  // GET - Get a specific user
  if (req.method === 'GET') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLogin: true,
          department: true,
          // Exclude password
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      console.log(`Fetched user: ${user.username}`);
      return res.status(200).json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      return res.status(500).json({ error: 'Failed to fetch user' });
    }
  }

  // PUT - Update a user
  if (req.method === 'PUT') {
    try {
      const { username, password, name, email, role, department, isActive } = req.body;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Only update password if provided
      const updateData: any = {
        name: name || null,
        email: email || null,
        role,
        department: department || null,
        isActive: isActive ?? existingUser.isActive,
      };

      // If password is provided, hash it
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      // Update user
      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLogin: true,
          department: true,
          // Exclude password
        },
      });

      console.log(`Updated user: ${user.username}`);
      return res.status(200).json(user);
    } catch (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ error: 'Failed to update user' });
    }
  }

  // DELETE - Deactivate a user (not actually deleting)
  if (req.method === 'DELETE') {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Deactivate user instead of deleting
      const user = await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLogin: true,
          department: true,
          // Exclude password
        },
      });

      console.log(`Deactivated user: ${user.username}`);
      return res.status(200).json(user);
    } catch (error) {
      console.error('Error deactivating user:', error);
      return res.status(500).json({ error: 'Failed to deactivate user' });
    }
  }

  // Unsupported method
  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler); 