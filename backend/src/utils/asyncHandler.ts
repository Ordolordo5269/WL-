import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wrapper para controladores async que maneja errores automáticamente
 * 
 * Permite escribir controladores async sin try-catch, ya que los errores
 * se capturan automáticamente y se pasan al errorHandler centralizado.
 * 
 * @example
 * // Antes:
 * export const getAllCountries: RequestHandler = async (req, res) => {
 *   try {
 *     const result = await getAllCountries();
 *     res.json(result);
 *   } catch (error) {
 *     console.error(error);
 *     res.status(500).json({ error: 'Failed' });
 *   }
 * };
 * 
 * // Después:
 * export const getAllCountries = asyncHandler(async (req, res) => {
 *   const result = await getAllCountries();
 *   res.json(result);
 *   // Los errores se manejan automáticamente
 * });
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};






























