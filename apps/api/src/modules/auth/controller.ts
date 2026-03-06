import { Request, Response, RequestHandler } from 'express';
import * as service from './service.js';
import { loginSchema, registerSchema, refreshSchema } from './schemas.js';
import type { AuthRequest } from './middleware.js';

export const register: RequestHandler = async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    return;
  }

  const result = await service.register(parsed.data.email, parsed.data.password, parsed.data.name);

  if ('error' in result) {
    res.status(result.status ?? 500).json({ error: result.error });
    return;
  }

  res.status(201).json(result);
};

export const login: RequestHandler = async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    return;
  }

  const result = await service.login(parsed.data.email, parsed.data.password);

  if ('error' in result) {
    res.status(result.status ?? 500).json({ error: result.error });
    return;
  }

  res.json(result);
};

export const refresh: RequestHandler = async (req: Request, res: Response) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    return;
  }

  const result = await service.refresh(parsed.data.refreshToken);

  if ('error' in result) {
    res.status(result.status ?? 500).json({ error: result.error });
    return;
  }

  res.json(result);
};

export const getMe: RequestHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const result = await service.getMe(userId);

  if ('error' in result) {
    res.status(result.status ?? 500).json({ error: result.error });
    return;
  }

  res.json(result);
};
