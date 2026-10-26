import { Request, Response } from 'express';
import { z } from 'zod';
import { AuctionModel } from '../models/auction.model';
import { DashboardModel } from '../models/dashboard.model';
import { OrderModel } from '../models/order.model';
import { UserModel, toPublicUser } from '../models/user.model';
import { UserService } from '../services/user.service';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { removeFiles, toUrl, uploadedFiles } from '../utils/files';
import { parseId } from '../utils/parseId';
import { sendSuccess } from '../utils/response';

// ---------- the logged-in user ----------
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, toPublicUser((await UserModel.findById(req.user!.id))!));
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await UserService.updateProfile(req.user!.id, req.body));
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  await UserService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  sendSuccess(res, { changed: true });
});

export const uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
  const file = uploadedFiles(req)[0];
  if (!file) throw ApiError.badRequest('Please choose an image to upload.');
  const user = (await UserModel.findById(req.user!.id))!;
  await UserModel.setProfileImage(user.id, toUrl(file.filename));
  await removeFiles([user.profile_image]);
  sendSuccess(res, toPublicUser((await UserModel.findById(user.id))!));
});

export const removeAvatar = asyncHandler(async (req: Request, res: Response) => {
  const user = (await UserModel.findById(req.user!.id))!;
  await UserModel.setProfileImage(user.id, null);
  await removeFiles([user.profile_image]);
  sendSuccess(res, toPublicUser((await UserModel.findById(user.id))!));
});

export const myOverview = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await DashboardModel.userOverview(req.user!.id));
});

// ---------- admin: user management ----------
const listQuery = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(15),
});

async function customerOr404(id: number) {
  const u = await UserModel.findById(id);
  if (!u || u.role !== 'USER') throw ApiError.notFound('User not found.');
  return u;
}

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const raw = Object.fromEntries(Object.entries(req.query).filter(([, v]) => v !== ''));
  const q = listQuery.safeParse(raw);
  if (!q.success) throw new ApiError(422, q.error.issues[0].message);
  sendSuccess(res, await UserModel.listCustomers({
    search: q.data.search, page: q.data.page, limit: q.data.limit,
    isActive: q.data.status === undefined ? undefined : q.data.status === 'active',
  }));
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await customerOr404(parseId(req.params.id));
  sendSuccess(res, { ...toPublicUser(user), stats: await UserModel.stats(user.id) });
});

export const setUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = await customerOr404(parseId(req.params.id)); // the admin account can never be deactivated here
  await UserModel.setActive(user.id, req.body.isActive);
  sendSuccess(res, toPublicUser((await UserModel.findById(user.id))!));
});

export const getUserOrders = asyncHandler(async (req: Request, res: Response) => {
  const user = await customerOr404(parseId(req.params.id));
  const page = Math.max(1, Number(req.query.page) || 1);
  sendSuccess(res, await OrderModel.list({ userId: user.id, page, limit: 20 }));
});

export const getUserAuctions = asyncHandler(async (req: Request, res: Response) => {
  const user = await customerOr404(parseId(req.params.id));
  sendSuccess(res, await AuctionModel.listForBidder(user.id));
});
