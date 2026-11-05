
import { randomUUID } from 'crypto';
import { Request } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env';
import { supabase, SUPABASE_BUCKET } from '../config/supabase';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

export function uploadedFiles(req: Request): Express.Multer.File[] {
  if (Array.isArray(req.files)) return req.files;
  return req.file ? [req.file] : [];
}

// Upload an image to Supabase and return its public URL.
export async function uploadImage(
  file: Express.Multer.File,
  folder: 'products' | 'categories' | 'avatars'
): Promise<string> {
  const extension = EXTENSIONS[file.mimetype];

  if (!extension) {
    throw new Error('Unsupported image type.');
  }

  const filePath = `${folder}/${randomUUID()}${extension}`;

  const { error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from(SUPABASE_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

// Delete Supabase images or legacy local uploads.
export async function removeFiles(
  namesOrUrls: (string | null | undefined)[]
): Promise<void> {
  const baseUrl = supabase.storage
    .from(SUPABASE_BUCKET)
    .getPublicUrl('placeholder').data.publicUrl;

  const prefix = baseUrl.slice(0, -'placeholder'.length);

  await Promise.all(
    namesOrUrls.filter((value): value is string => !!value).map(async url => {
      if (url.startsWith(prefix)) {
        const filePath = url.slice(prefix.length);

        if (filePath && !filePath.includes('..')) {
          const { error } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .remove([filePath]);

          if (error) console.error('Supabase image deletion failed:', error);
        }
      } else if (url.startsWith('/uploads/')) {
        try {
          await fs.unlink(path.join(env.uploadDir, path.basename(url)));
        } catch {
          // Legacy file may already be gone.
        }
      }
    })
  );
}

// Clean up Supabase files after a failed database operation.
// Multer now stores files in memory.
// If validation fails, no files have been saved to Supabase yet.
export async function cleanupUploads(_req: Request): Promise<void> {
  return;
}