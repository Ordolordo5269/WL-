import { Request, Response } from 'express';
import { coefToHex } from '../services/alignment.colors';
import { coefOnAxis, coefWeighted } from '../services/alignment.math';
import { ProjectionRequestBody } from '../types/alignment.types';

export function getColorForCoef(req: Request, res: Response) {
  const q = req.query.c as string | undefined;
  const c = q ? Number(q) : 0;
  if (!Number.isFinite(c)) return res.status(400).json({ error: 'Invalid coefficient' });
  const hex = coefToHex(c);
  return res.json({ coef: Math.max(-1, Math.min(1, c)), color: hex });
}

export function projectOnAxis(req: Request, res: Response) {
  const body = req.body as ProjectionRequestBody;
  if (!Array.isArray(body?.vec_x) || !Array.isArray(body?.vec_a) || !Array.isArray(body?.vec_b)) {
    return res.status(400).json({ error: 'vec_x, vec_a, vec_b arrays required' });
  }
  if (body.weights && !Array.isArray(body.weights)) {
    return res.status(400).json({ error: 'weights must be an array' });
  }
  if (body.weights) {
    if (body.weights.length !== body.vec_x.length) return res.status(400).json({ error: 'weights length mismatch' });
    const coef = coefWeighted(body.vec_x, body.vec_a, body.vec_b, body.weights);
    return res.json({ coef });
  }
  const coef = coefOnAxis(body.vec_x, body.vec_a, body.vec_b);
  return res.json({ coef });
}

