import { Request, Response } from 'express';
import { z } from 'zod';
import { MessageModel } from '../models/message.model';
import { UserModel } from '../models/user.model';
import { MessageService } from '../services/message.service';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { parseId } from '../utils/parseId';
import { sendSuccess } from '../utils/response';
import { pool } from '../config/db';
import { RowDataPacket } from 'mysql2/promise';

const listQuery = z.object({
  box: z.enum(['inbox', 'sent']).default('inbox'),
  unread: z.enum(['true', '1']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(15),
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const raw = Object.fromEntries(Object.entries(req.query).filter(([, v]) => v !== ''));
  const q = listQuery.safeParse(raw);
  if (!q.success) throw new ApiError(422, q.error.issues[0].message);
  sendSuccess(res, await MessageModel.list(req.user!.id, {
    box: q.data.box, unreadOnly: !!q.data.unread, page: q.data.page, limit: q.data.limit,
  }));
});

export const unreadCount = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, { unreadCount: await MessageModel.unreadCount(req.user!.id) });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const m = await MessageModel.findForParticipant(parseId(req.params.id), req.user!.id);
  if (!m) throw ApiError.notFound('Message not found.');
  sendSuccess(res, m.dto);
});

export const send = asyncHandler(async (req: Request, res: Response) => {
  const sender = (await UserModel.findById(req.user!.id))!;
  const { receiverId, toAll, subject, message } = req.body;
  let receiverIds: number[];

  if (sender.role === 'ADMIN') {
    if ((receiverId === undefined) === (toAll === undefined)) {
      throw new ApiError(422, 'Choose either a single recipient or send to all users.');
    }
    if (toAll) {
      const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM users WHERE role = 'USER' AND is_active = 1");
      receiverIds = rows.map(r => r.id);
      if (!receiverIds.length) throw ApiError.badRequest('There are no active users to message.');
    } else {
      const target = await UserModel.findById(receiverId);
      if (!target || target.role !== 'USER') throw ApiError.notFound('Recipient not found.');
      receiverIds = [target.id];
    }
  } else {
    // Customers can only write to the admin (support), never to each other.
    const adminId = await UserModel.getAdminId();
    if (!adminId) throw ApiError.badRequest('Messaging is currently unavailable.');
    receiverIds = [adminId];
  }

  const senderName = sender.role === 'ADMIN' ? 'Craftify' : `${sender.first_name} ${sender.last_name}`;
  const ids = await MessageService.send({ senderId: sender.id, senderName, receiverIds, subject, message });
  sendSuccess(res, { sent: ids.length, messageIds: ids }, 201);
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const m = await MessageModel.findForParticipant(id, req.user!.id);
  if (!m || m.raw.receiver_id !== req.user!.id) throw ApiError.notFound('Message not found.');
  await MessageModel.markRead(id, req.user!.id);
  sendSuccess(res, { isRead: true });
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  await MessageModel.markAllRead(req.user!.id);
  sendSuccess(res, { unreadCount: 0 });
});
