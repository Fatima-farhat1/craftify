import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { cleanupUploads } from '../utils/files';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

export async function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  await cleanupUploads(req); // any failed request must not leave uploaded files behind

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, message: err.message, errors: err.details });
  }
  if (err?.name === 'MulterError') {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 5 MB or smaller.'
      : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE' ? 'Too many images (maximum 6) or unexpected file field.'
      : 'Upload failed.';
    return res.status(400).json({ success: false, message });
  }
  if (err?.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'This record already exists.' });
  }
  if (err?.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({
      success: false,
      message: 'This item is still in use (orders, auctions or products) and cannot be deleted. Disable it instead.',
    });
  }
  if (err?.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ success: false, message: 'A referenced record does not exist.' });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON body.' });
  }
  console.error(err);
  res.status(500).json({
    success: false,
    message: env.nodeEnv === 'production' ? 'Internal server error.' : String(err?.message || err),
  });
}
