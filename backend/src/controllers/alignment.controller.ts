import { Request, Response } from 'express';
import { coefToHexRdBu } from '../services/alignment.colors';
import { coefOnAxis, coefWeighted } from '../services/alignment.math';
import { ProjectionRequestBody } from '../types/alignment.types';
import { generateDataset, generateOverlay } from '../services/alignment.dataset';

export function getColorForCoef(req: Request, res: Response) {
  const q = req.query.c as string | undefined;
  const minQ = req.query.min as string | undefined;
  const maxQ = req.query.max as string | undefined;
  const c = q ? Number(q) : 0;
  const min = minQ !== undefined ? Number(minQ) : -1;
  const max = maxQ !== undefined ? Number(maxQ) : 1;
  if (!Number.isFinite(c) || !Number.isFinite(min) || !Number.isFinite(max)) {
    return res.status(400).json({ error: 'Invalid numeric parameters' });
  }
  const hex = coefToHexRdBu(c, min, max);
  return res.json({ coef: c, min, max, color: hex });
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

export function projectAndColor(req: Request, res: Response) {
  const body = req.body as ProjectionRequestBody & { min?: number; max?: number };
  if (!Array.isArray(body?.vec_x) || !Array.isArray(body?.vec_a) || !Array.isArray(body?.vec_b)) {
    return res.status(400).json({ error: 'vec_x, vec_a, vec_b arrays required' });
  }
  const min = Number.isFinite(body?.min as number) ? (body.min as number) : -1;
  const max = Number.isFinite(body?.max as number) ? (body.max as number) : 1;
  const coef = body.weights
    ? coefWeighted(body.vec_x, body.vec_a, body.vec_b, body.weights!)
    : coefOnAxis(body.vec_x, body.vec_a, body.vec_b);
  const color = coefToHexRdBu(coef, min, max);
  return res.json({ coef, min, max, color });
}

export function batchColors(req: Request, res: Response) {
  const { coefs, min, max } = req.body as { coefs: number[]; min?: number; max?: number };
  if (!Array.isArray(coefs)) return res.status(400).json({ error: 'coefs array required' });
  const lo = Number.isFinite(min as number) ? (min as number) : -1;
  const hi = Number.isFinite(max as number) ? (max as number) : 1;
  const colors = coefs.map((c) => coefToHexRdBu(Number(c), lo, hi));
  return res.json({ min: lo, max: hi, colors });
}

export function getDataset(req: Request, res: Response) {
  const data = generateDataset();
  return res.json(data);
}

export function getOverlay(req: Request, res: Response) {
  const minQ = req.query.min as string | undefined;
  const maxQ = req.query.max as string | undefined;
  const min = minQ !== undefined ? Number(minQ) : -1;
  const max = maxQ !== undefined ? Number(maxQ) : 1;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return res.status(400).json({ error: 'Invalid min/max' });
  const overlay = generateOverlay(min, max);
  return res.json(overlay);
}

