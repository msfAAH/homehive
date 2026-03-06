import type { NextFunction, Request, Response } from 'express';
import type { AuthRequest } from './auth.js';

/** Wraps an authenticated async route handler so rejected promises are forwarded to Express error middleware. */
export const wrap = (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: AuthRequest, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

/** Same as wrap() but for public (unauthenticated) routes. */
export const wrapPublic = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
