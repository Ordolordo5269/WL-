import type { Request, Response, NextFunction } from 'express';
import * as service from './service';
import type { ConflictStatus } from '@prisma/client';

export async function listConflicts(req: Request, res: Response, next: NextFunction) {
  try {
    const status = req.query.status as ConflictStatus | undefined;
    const conflicts = await service.listConflicts(status);
    res.json(conflicts);
  } catch (err) {
    next(err);
  }
}

export async function getConflict(req: Request, res: Response, next: NextFunction) {
  try {
    const conflict = await service.getConflict(req.params.id);
    if (!conflict) {
      res.status(404).json({ error: 'Conflict not found' });
      return;
    }
    res.json(conflict);
  } catch (err) {
    next(err);
  }
}

export async function getConflictFactions(req: Request, res: Response, next: NextFunction) {
  try {
    const factions = await service.getConflictFactions(req.params.id);
    res.json(factions);
  } catch (err) {
    next(err);
  }
}

export async function getConflictSupportLinks(req: Request, res: Response, next: NextFunction) {
  try {
    const links = await service.getConflictSupportLinks(req.params.id);
    res.json(links);
  } catch (err) {
    next(err);
  }
}

export async function listFactions(_req: Request, res: Response, next: NextFunction) {
  try {
    const factions = await service.listFactions();
    res.json(factions);
  } catch (err) {
    next(err);
  }
}

export async function getFactionConflicts(req: Request, res: Response, next: NextFunction) {
  try {
    const conflicts = await service.getFactionConflicts(req.params.id);
    res.json(conflicts);
  } catch (err) {
    next(err);
  }
}

export async function getFactionProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await service.getFactionProfile(req.params.id);
    if (!profile.faction) {
      res.status(404).json({ error: 'Faction not found' });
      return;
    }
    res.json(profile);
  } catch (err) {
    next(err);
  }
}
