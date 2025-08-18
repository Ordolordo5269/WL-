// Lightweight re-implementations using plain JS since numpy is not available.
export function coefOnAxis(vecX: number[], vecA: number[], vecB: number[]): number {
	const d = subtract(vecA, vecB);
	const mid = scale(add(vecA, vecB), 0.5);
	const num = dot(subtract(vecX, mid), d);
	const den = 0.5 * dot(d, d) + 1e-9;
	return clamp(num / den, -1, 1);
}

export function coefWeighted(
	vecX: number[],
	vecA: number[],
	vecB: number[],
	weights: number[]
): number {
	const d = multiply(subtract(vecA, vecB), weights);
	const mid = scale(multiply(add(vecA, vecB), weights), 0.5);
	const num = dot(subtract(multiply(vecX, weights), mid), d);
	const den = 0.5 * dot(d, d) + 1e-9;
	return clamp(num / den, -1, 1);
}

export function dot(a: number[], b: number[]): number {
	let s = 0;
	for (let i = 0; i < a.length; i++) s += a[i] * b[i];
	return s;
}

export function add(a: number[], b: number[]): number[] {
	return a.map((v, i) => v + b[i]);
}

export function subtract(a: number[] | number, b: number[] | number): number[] {
	if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => v - b[i]);
	throw new Error('subtract expects arrays of equal length');
}

export function scale(a: number[], s: number): number[] {
	return a.map((v) => v * s);
}

export function multiply(a: number[], b: number[]): number[] {
	return a.map((v, i) => v * b[i]);
}

export function clamp(x: number, lo: number, hi: number): number {
	return Math.max(lo, Math.min(hi, x));
}

