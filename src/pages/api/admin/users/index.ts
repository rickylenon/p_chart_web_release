import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

async function handler(req: NextApiRequest, res: NextApiResponse, session: any) {
  console.log('Admin Users API called');

  // Get the user role
  const userRole = session?.user?.role || '';
  const isAdmin = typeof userRole === 'string' && userRole.toLowerCase() === 'admin';
  console.log('User role:', userRole, 'Is admin?', isAdmin);
  
  // Only admins can access user management
  if (!isAdmin) {
    console.log('Non-admin user tried to access user management');
    return res.status(403).json({ error: 'Only admin users can manage users' });
  }

  // GET - List all users with filtering, pagination, and sorting
  if (req.method === 'GET') {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string || '';
      const sortField = req.query.sortField as string || 'username';
      const sortDirection = req.query.sortDirection as string || 'asc';
      const skip = (page - 1) * limit;
      
      console.log(`Query params: page=${page}, limit=${limit}, search=${search}, sortField=${sortField}, sortDirection=${sortDirection}`);

      // Build where clause for search
      let where = {};
      
      if (search) {
        where = {
          OR: [
            { username: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
            { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
            { email: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
            { role: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
            { department: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
          ],
        };
      }

      // Get total count for pagination
      const total = await prisma.user.count({ where });
      console.log(`Total matching users: ${total}`);

      // Determine sort order
      const orderBy: any = {};
      orderBy[sortField] = sortDirection.toLowerCase();

      // Fetch users with pagination, sorting, and search
      const users = await prisma.user.findMany({
        where,
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
          // Exclude sensitive data like password
        },
        orderBy,
        skip,
        take: limit,
      });

      console.log(`Fetched ${users.length} users for page ${page}`);
      
      return res.status(200).json({
        users,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  // POST - Create a new user
  if (req.method === 'POST') {
    try {
      const { username, password, name, email, role, department, isActive } = req.body;

      // Check if username already exists
      const existingUser = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          name: name || null,
          email: email || null,
          role,
          department: department || null,
          isActive: isActive ?? true,
        },
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

      console.log(`Created new user: ${username}`);
      return res.status(201).json(user);
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Failed to create user' });
    }
  }

  // Unsupported method
  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler); 