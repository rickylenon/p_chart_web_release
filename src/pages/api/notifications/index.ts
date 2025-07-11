import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getSafeIO } from "../socket";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Use custom header-based authentication instead of NextAuth
  const userIdHeader = req.headers["x-user-id"];
  const userRoleHeader = req.headers["x-user-role"];

  if (!userIdHeader) {
    console.log("Notifications API: Missing X-User-Id header");
    return res
      .status(401)
      .json({ error: "Unauthorized - Missing user identification" });
  }

  // Convert userId to number (Prisma expects int)
  const userId = parseInt(userIdHeader as string, 10);
  if (isNaN(userId)) {
    console.log("Notifications API: Invalid user ID format:", userIdHeader);
    return res.status(400).json({ error: "Invalid user ID format" });
  }

  console.log("Notifications API: Authenticated user:", {
    userId,
    role: userRoleHeader,
  });

  try {
    // Handle different request methods
    switch (req.method) {
      case "GET":
        return await getNotifications(req, res, userId);
      case "POST":
        return await createNotification(req, res, userId);
      case "PUT":
        return await markAsRead(req, res, userId);
      default:
        return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Error in notifications API:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Get notifications for the user with pagination and filtering
async function getNotifications(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: number
) {
  const {
    page = "1",
    limit = "10",
    type = "",
    isRead = "",
    count = "",
  } = req.query;

  // Parse pagination parameters
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  // Build filter conditions
  const where: any = { userId };

  if (type) {
    where.type = type;
  }

  if (isRead === "true") {
    where.isRead = true;
  } else if (isRead === "false") {
    where.isRead = false;
  }

  // If just counting, return the count
  if (count === "true") {
    const total = await prisma.notification.count({ where });
    const unread = await prisma.notification.count({
      where: {
        ...where,
        isRead: false,
      },
    });

    // Count by type if requested
    let byType = {};
    if (type === "") {
      // Get counts by notification type
      const typeCounts = await prisma.notification.groupBy({
        by: ["type"],
        where: {
          userId,
          isRead: false,
        },
        _count: {
          id: true,
        },
      });

      // Format the type counts as an object
      byType = typeCounts.reduce((acc, curr) => {
        acc[curr.type] = curr._count.id;
        return acc;
      }, {} as Record<string, number>);
    }

    return res.status(200).json({
      total,
      unread,
      byType,
    });
  }

  // Fetch notifications with pagination
  const notifications = await prisma.notification.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
    skip,
    take: limitNum,
  });

  // Get total count for pagination info
  const total = await prisma.notification.count({ where });

  return res.status(200).json({
    notifications,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
}

// Create a new notification and emit WebSocket event
async function createNotification(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: number
) {
  const {
    type,
    title,
    message,
    linkUrl,
    targetUserId,
    targetRole, // New parameter to target users by role
    sourceId,
    sourceType,
    metadata,
    emitEvent = true,
    emitToAll = false, // New parameter to broadcast to all users
  } = req.body;

  // Validate required fields
  if (!type || !title || !message) {
    return res
      .status(400)
      .json({ error: "Missing required fields: type, title, message" });
  }

  // Determine target user ID if provided
  let targetUserIdNum: number | undefined = undefined;
  if (targetUserId) {
    targetUserIdNum = parseInt(targetUserId, 10);
    if (isNaN(targetUserIdNum)) {
      return res.status(400).json({ error: "Invalid target user ID format" });
    }
  } else if (!targetRole && !emitToAll) {
    // If no targetUserId and no targetRole, use the current user
    targetUserIdNum = userId;
  }

  // Create the notification in the database
  const notification = await prisma.notification.create({
    data: {
      type,
      title,
      message,
      linkUrl,
      userId: targetUserIdNum || userId, // Fall back to current user if no target
      sourceId: sourceId?.toString(),
      sourceType,
      metadata,
    },
  });

  // Emit WebSocket event if requested
  if (emitEvent) {
    try {
      // Get the Socket.IO instance safely
      const io = getSafeIO();

      if (!io) {
        console.warn(
          "Socket.IO instance is not available, notification will be stored but not emitted"
        );
        return res.status(201).json({
          notification,
          warning:
            "Notification created but WebSocket event not emitted (Socket.IO not available)",
        });
      }

      // Prepare the notification data (exclude userId for security)
      const notificationData = {
        ...notification,
        userId: undefined,
      };

      if (emitToAll) {
        // Broadcast to all connected clients
        console.log(`Broadcasting ${type} notification to all users`);
        io.emit(`notification-${type}`, notificationData);
        io.emit("notification-count-update", { type });
      } else if (targetRole) {
        // Send to users with a specific role
        const roleRoom = `role-${targetRole.toLowerCase()}`;
        console.log(`Emitting ${type} notification to role: ${roleRoom}`);
        io.to(roleRoom).emit(`notification-${type}`, notificationData);
        io.to(roleRoom).emit("notification-count-update", { type });
      } else if (targetUserIdNum) {
        // Send to a specific user
        console.log(
          `Emitting ${type} notification to user: ${targetUserIdNum}`
        );
        io.to(`user-${targetUserIdNum}`).emit(
          `notification-${type}`,
          notificationData
        );
        io.to(`user-${targetUserIdNum}`).emit("notification-count-update", {
          type,
        });
      }
    } catch (error) {
      console.error("Failed to emit WebSocket event:", error);
      return res.status(201).json({
        notification,
        warning: "Notification created but WebSocket event failed to emit",
      });
    }
  }

  return res.status(201).json({ notification });
}

// Mark notifications as read
async function markAsRead(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: number
) {
  const { id, all, type } = req.body;

  // Different update strategies based on what's being marked as read
  if (id) {
    // Mark a single notification as read
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return res.status(200).json({ notification: updated });
  } else if (all) {
    // Mark all notifications as read
    const { count } = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return res.status(200).json({ markedAsRead: count });
  } else if (type) {
    // Mark all notifications of a specific type as read
    const { count } = await prisma.notification.updateMany({
      where: { userId, type, isRead: false },
      data: { isRead: true },
    });

    return res.status(200).json({ markedAsRead: count });
  } else {
    return res
      .status(400)
      .json({ error: "Missing parameter: id, all, or type is required" });
  }
}
