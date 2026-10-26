import { Request, Response } from 'express';
import { z } from 'zod';
import { NotificationModel } from '../models/notification.model';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { parseId } from '../utils/parseId';
import { sendSuccess } from '../utils/response';

const listQuery = z.object({
  unread: z.enum(['true', '1']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const raw = Object.fromEntries(Object.entries(req.query).filter(([, v]) => v !== ''));
  const q = listQuery.safeParse(raw);
  if (!q.success) throw new ApiError(422, q.error.issues[0].message);
  sendSuccess(res, await NotificationModel.list(req.user!.id, { unreadOnly: !!q.data.unread, page: q.data.page, limit: q.data.limit }));
});

export const unreadCount = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, { unreadCount: await NotificationModel.unreadCount(req.user!.id) });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  if (!(await NotificationModel.markRead(parseId(req.params.id), req.user!.id))) throw ApiError.notFound('Notification not found.');
  sendSuccess(res, { isRead: true });
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  await NotificationModel.markAllRead(req.user!.id);
  sendSuccess(res, { unreadCount: 0 });
});
