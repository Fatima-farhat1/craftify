import { Request } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env';

export const toUrl = (filename: string) => `/uploads/${filename}`;

export function uploadedFiles(req: Request): Express.Multer.File[] {
  if (Array.isArray(req.files)) return req.files;
  return req.file ? [req.file] : [];
}

/** Deletes stored files (by filename or /uploads/... url). Never throws. */
export async function removeFiles(namesOrUrls: (string | null | undefined)[]): Promise<void> {
  await Promise.all(
    namesOrUrls.filter(Boolean).map(async n => {
      try { await fs.unlink(path.join(env.uploadDir, path.basename(n as string))); } catch { /* already gone */ }
    })
  );
}

export const cleanupUploads = (req: Request) => removeFiles(uploadedFiles(req).map(f => f.filename));
