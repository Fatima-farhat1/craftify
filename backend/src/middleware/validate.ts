import { NextFunction, Request, Response } from 'express';
import { ZodTypeAny } from 'zod';
import { ApiError } from '../utils/ApiError';
import { cleanupUploads } from '../utils/files';

export const validate = (schema: ZodTypeAny) => async (req: Request, _res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    await cleanupUploads(req); // don't leave orphan files from a rejected request
    const errors = result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }));
    return next(new ApiError(422, errors[0]?.message || 'Validation failed.', errors));
  }
  req.body = result.data;
  next();
};
