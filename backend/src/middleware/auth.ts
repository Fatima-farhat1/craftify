import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserModel } from '../models/user.model';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

/** Requires a valid JWT. Re-checks the DB so deactivated users lose access immediately. */
export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw ApiError.unauthorized();

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(header.slice(7), env.jwt.secret) as jwt.JwtPayload;
  } catch {
    throw ApiError.unauthorized('Session expired or invalid. Please log in again.');
  }

  const user = await UserModel.findById(Number(payload.id));
  if (!user) throw ApiError.unauthorized();
  if (!user.is_active) throw ApiError.forbidden('This account has been deactivated.');

  req.user = { id: user.id, email: user.email, role: user.role };
  next();
});

export const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') return next(ApiError.forbidden('Admin access only.'));
  next();
};

/** Attaches req.user when a valid token is present, but never rejects. For public routes with admin extras. */
export const optionalAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), env.jwt.secret) as jwt.JwtPayload;
      const user = await UserModel.findById(Number(payload.id));
      if (user?.is_active) req.user = { id: user.id, email: user.email, role: user.role };
    } catch { /* treat as anonymous */ }
  }
  next();
});

/** Shopping features (cart, favorites, checkout) are for buyers; the admin manages the platform instead. */
export const requireUser = (req: Request, _res: Response, next: NextFunction) => {
  if (req.user?.role !== 'USER') return next(ApiError.forbidden('This feature is for customer accounts only.'));
  next();
};
