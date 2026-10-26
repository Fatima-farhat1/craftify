import { randomUUID } from 'crypto';
import fs from 'fs';
import multer from 'multer';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

fs.mkdirSync(env.uploadDir, { recursive: true });

// Extension comes from the verified MIME type, never from the client's filename.
const ALLOWED: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, env.uploadDir),
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${ALLOWED[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, cb) =>
    ALLOWED[file.mimetype] ? cb(null, true) : cb(ApiError.badRequest('Only JPG, PNG or WEBP images are allowed.')),
});
