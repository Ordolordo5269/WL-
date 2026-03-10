import { z } from 'zod';

export const updateProfileSchema = {
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
  }).refine(data => data.name !== undefined || data.email !== undefined, {
    message: 'At least one field (name or email) is required',
  }),
};

export const addFavoriteSchema = {
  body: z.object({
    countryIso3: z.string().length(3, 'ISO3 must be exactly 3 characters'),
  }),
};

export const removeFavoriteSchema = {
  params: z.object({
    countryIso3: z.string().length(3, 'ISO3 must be exactly 3 characters'),
  }),
};
