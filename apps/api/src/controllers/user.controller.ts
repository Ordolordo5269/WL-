import { Request, Response, RequestHandler } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../db/client';

interface UpdateProfileBody {
  name?: string;
  email?: string;
}

export const updateProfile: RequestHandler = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, email }: UpdateProfileBody = req.body;

    // Build update data
    const updateData: { name?: string | null; email?: string } = {};

    if (name !== undefined) {
      updateData.name = name || null;
    }

    if (email !== undefined) {
      // Check if email is already taken by another user
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ error: 'Email is already taken' });
      }

      updateData.email = email.toLowerCase();
    }

    // If no fields to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ user });
  } catch (error) {
    console.error('UpdateProfile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

