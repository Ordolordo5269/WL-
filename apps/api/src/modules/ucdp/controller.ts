import { Request, Response, RequestHandler } from 'express';
import * as service from './service.js';
import type {
  UcdpEventFilters,
  UcdpConflictFilters,
  UcdpBattleDeathsFilters,
  UcdpNonStateFilters,
  UcdpOneSidedFilters,
  UcdpSyncBody,
} from './types.js';

export const listEvents: RequestHandler = async (req: Request, res: Response) => {
  try {
    const filters = req.query as unknown as UcdpEventFilters;
    const data = await service.listEvents(filters);
    res.json({ data, count: data.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
};

export const getEventsGeoJson: RequestHandler = async (req: Request, res: Response) => {
  try {
    const filters = req.query as unknown as UcdpEventFilters;
    const data = await service.getEventsGeoJson(filters);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
};

export const getEventById: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const { getGedEventById } = await import('./repo.js');
    const event = await getGedEventById(Number(id));

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    res.json({ data: event });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
};

export const listConflicts: RequestHandler = async (req: Request, res: Response) => {
  try {
    const filters = req.query as unknown as UcdpConflictFilters;
    const data = await service.listConflicts(filters);
    res.json({ data, count: data.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
};

export const getActiveConflicts: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { year } = req.query as { year?: string };
    const data = await service.getActiveConflicts(year ? Number(year) : undefined);
    res.json({ data, count: data.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
};

export const getConflictDetail: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { conflictId } = req.params as { conflictId: string };
    const data = await service.getConflictDetail(conflictId);

    if (!data) {
      res.status(404).json({ error: 'Conflict not found' });
      return;
    }

    res.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
};

export const listBattleDeaths: RequestHandler = async (req: Request, res: Response) => {
  try {
    const filters = req.query as unknown as UcdpBattleDeathsFilters;
    const data = await service.listBattleDeaths(filters);
    res.json({ data, count: data.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
};

export const listNonState: RequestHandler = async (req: Request, res: Response) => {
  try {
    const filters = req.query as unknown as UcdpNonStateFilters;
    const data = await service.listNonState(filters);
    res.json({ data, count: data.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
};

export const listOneSided: RequestHandler = async (req: Request, res: Response) => {
  try {
    const filters = req.query as unknown as UcdpOneSidedFilters;
    const data = await service.listOneSided(filters);
    res.json({ data, count: data.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
};

export const getStats: RequestHandler = async (_req: Request, res: Response) => {
  try {
    const data = await service.getStats();
    res.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
};

export const getSyncStatus: RequestHandler = async (_req: Request, res: Response) => {
  try {
    const data = await service.getSyncStatus();
    res.json({ data, count: data.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
};

export const triggerSync: RequestHandler = async (req: Request, res: Response) => {
  try {
    const body = req.body as UcdpSyncBody;
    const sync = await import('./sync.js');
    const version = body.version;

    let result;
    switch (body.dataset) {
      case 'gedevents':
        result = await sync.syncGedEvents(version);
        break;
      case 'conflicts':
        result = await sync.syncConflicts(version);
        break;
      case 'battledeaths':
        result = await sync.syncBattleDeaths(version);
        break;
      case 'nonstate':
        result = await sync.syncNonState(version);
        break;
      case 'onesided':
        result = await sync.syncOneSided(version);
        break;
      case 'candidate':
        result = await sync.syncCandidateEvents();
        break;
      case 'all':
        result = await sync.syncAll(version);
        break;
      default:
        res.status(400).json({ error: `Unknown dataset: ${body.dataset}` });
        return;
    }

    res.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
};
