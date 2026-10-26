import { Request, Response } from 'express';
import { z } from 'zod';
import { OrderModel } from '../models/order.model';
import { UserModel } from '../models/user.model';
import { OrderService } from '../services/order.service';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { parseId } from '../utils/parseId';
import { sendSuccess } from '../utils/response';

const listQuery = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
  userId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const checkout = asyncHandler(async (req: Request, res: Response) => {
  const user = (await UserModel.findById(req.user!.id))!;
  const address = req.body.shippingAddress ?? user.address;
  if (!address || address.trim().length < 5) {
    throw new ApiError(422, 'Please enter a shipping address.');
  }
  const orderId = await OrderService.checkout(user.id, address.trim());
  sendSuccess(res, await OrderModel.findById(orderId), 201);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const raw = Object.fromEntries(Object.entries(req.query).filter(([, v]) => v !== ''));
  const parsed = listQuery.safeParse(raw);
  if (!parsed.success) throw new ApiError(422, parsed.error.issues[0].message);
  const isAdmin = req.user!.role === 'ADMIN';
  sendSuccess(res, await OrderModel.list({
    ...parsed.data,
    userId: isAdmin ? parsed.data.userId : req.user!.id, // users only ever see their own orders
  }));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const order = await OrderModel.findById(parseId(req.params.id));
  // 404 (not 403) for someone else's order, so ids can't be probed.
  if (!order || (req.user!.role !== 'ADMIN' && order.userId !== req.user!.id)) throw ApiError.notFound('Order not found.');
  sendSuccess(res, order);
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  await OrderService.updateStatus(id, req.user!, req.body);
  sendSuccess(res, await OrderModel.findById(id));
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  await OrderService.updateStatus(id, req.user!, { status: 'CANCELLED' });
  sendSuccess(res, await OrderModel.findById(id));
});

export const updateShipping = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!(await OrderModel.updateShippingAddress(id, req.user!.id, req.body.shippingAddress))) {
    throw ApiError.notFound('Order not found, or it can no longer be edited.');
  }
  sendSuccess(res, await OrderModel.findById(id));
});
