import { Request, Response, RequestHandler } from 'express';
import * as service from './service.js';

export const listEvents: RequestHandler = async (req: Request, res: Response) => {
  // Query already validated by validate middleware
  const filters = req.query as any;

  // Parse bounds from flat query params if present
  if (filters.north != null) {
    filters.bounds = {
      north: Number(filters.north),
      south: Number(filters.south),
      east: Number(filters.east),
      west: Number(filters.west),
    };
    delete filters.north;
    delete filters.south;
    delete filters.east;
    delete filters.west;
  }

  const events = await service.listEvents(filters);
  res.json({ data: events, count: events.length });
};

export const getEvent: RequestHandler = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const event = await service.getEvent(id);

  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  res.json({ data: event });
};

export const listAlerts: RequestHandler = async (req: Request, res: Response) => {
  const filters = req.query as any;
  const alerts = await service.listAlerts(filters);
  res.json({ data: alerts, count: alerts.length });
};

export const sourcesHealth: RequestHandler = async (_req: Request, res: Response) => {
  const sources = await service.getSourcesHealth();
  res.json({ data: sources });
};
