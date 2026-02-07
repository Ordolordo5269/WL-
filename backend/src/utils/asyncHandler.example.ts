/**
 * EJEMPLO DE IMPLEMENTACIÓN: Wrapper asyncHandler
 * 
 * Este wrapper permite que los controladores async
 * manejen errores automáticamente sin try-catch.
 * 
 * USO:
 * import { asyncHandler } from '../utils/asyncHandler';
 * 
 * export const getAllCountries = asyncHandler(async (req, res) => {
 *   const result = await getAllCountries();
 *   res.json(result);
 *   // Los errores se pasan automáticamente al errorHandler
 * });
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wrapper para controladores async que maneja errores automáticamente
 * 
 * @param fn - Función del controlador async
 * @returns RequestHandler que captura errores y los pasa al errorHandler
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Ejemplo de uso en un controlador:
 * 
 * // ANTES (con try-catch manual):
 * export const getAllCountriesController: RequestHandler = async (req, res) => {
 *   try {
 *     const result = await getAllCountries();
 *     res.json(result);
 *   } catch (error) {
 *     console.error(error);
 *     res.status(500).json({ error: 'Failed to fetch countries' });
 *   }
 * };
 * 
 * // DESPUÉS (con asyncHandler):
 * export const getAllCountriesController = asyncHandler(async (req, res) => {
 *   const result = await getAllCountries();
 *   res.json(result);
 *   // Los errores se manejan automáticamente por el errorHandler centralizado
 * });
 */






























