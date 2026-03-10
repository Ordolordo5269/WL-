import { prisma } from '../../db/client';

// ── Profile ──────────────────────────────────────────────────────────────────

export async function updateProfile(userId: string, data: { name?: string; email?: string }) {
  const updateData: { name?: string | null; email?: string } = {};

  if (data.name !== undefined) {
    updateData.name = data.name || null;
  }

  if (data.email !== undefined) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() }
    });

    if (existingUser && existingUser.id !== userId) {
      return { error: 'Email is already taken' as const };
    }

    updateData.email = data.email.toLowerCase();
  }

  if (Object.keys(updateData).length === 0) {
    return { error: 'No fields to update' as const };
  }

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

  return { user };
}

// ── Favorites ────────────────────────────────────────────────────────────────

export async function getFavorites(userId: string) {
  return prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
}

export async function addFavorite(userId: string, countryIso3: string) {
  const iso = countryIso3.toUpperCase();

  const existing = await prisma.favorite.findUnique({
    where: { userId_countryIso3: { userId, countryIso3: iso } }
  });

  if (existing) {
    return { error: 'Country is already in favorites' as const };
  }

  return prisma.favorite.create({
    data: { userId, countryIso3: iso }
  });
}

export async function removeFavorite(userId: string, countryIso3: string) {
  await prisma.favorite.deleteMany({
    where: { userId, countryIso3: countryIso3.toUpperCase() }
  });
}
