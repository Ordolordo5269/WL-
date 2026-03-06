import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../db/client';
import { env } from '../../config/env';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

interface TokenPayload {
  id: string;
  email: string;
}

function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign({ ...payload, type: 'refresh' }, env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export async function register(email: string, password: string, name?: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: 'User with this email already exists', status: 409 as const };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, passwordHash, name: name ?? null },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  const payload: TokenPayload = { id: user.id, email: user.email };

  return {
    token: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user,
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { error: 'Invalid email or password', status: 401 as const };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { error: 'Invalid email or password', status: 401 as const };
  }

  const payload: TokenPayload = { id: user.id, email: user.email };

  return {
    token: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: { id: user.id, email: user.email, name: user.name },
  };
}

export async function refresh(refreshToken: string) {
  try {
    const decoded = jwt.verify(refreshToken, env.JWT_SECRET) as TokenPayload & { type?: string };

    if (decoded.type !== 'refresh') {
      return { error: 'Invalid token type', status: 401 as const };
    }

    // Verify user still exists
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return { error: 'User not found', status: 401 as const };
    }

    const payload: TokenPayload = { id: user.id, email: user.email };

    return {
      token: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    };
  } catch {
    return { error: 'Invalid or expired refresh token', status: 401 as const };
  }
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, createdAt: true, updatedAt: true },
  });

  if (!user) {
    return { error: 'User not found', status: 404 as const };
  }

  return { user };
}
