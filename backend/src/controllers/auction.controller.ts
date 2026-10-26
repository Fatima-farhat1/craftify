import { Request, Response } from 'express';
import { z } from 'zod';
import { AuctionModel, ViewerContext } from '../models/auction.model';
import { ProductModel } from '../models/product.model';
import { AuctionService } from '../services/auction.service';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { parseId } from '../utils/parseId';
import { sendSuccess } from '../utils/response';

const ctxOf = (req: Request): ViewerContext => ({ viewerId: req.user?.id ?? 0, isAdmin: req.user?.role === 'ADMIN' });

const listQuery = z.object({
  status: z.enum(['active', 'upcoming', 'ended', 'cancelled', 'all']).default('active'),
  search: z.string().trim().max(100).optional(),
  category: z.coerce.number().int().positive().optional(),
  sort: z.enum(['ending_soon', 'starting_soon', 'recently_ended', 'newest', 'price_asc', 'price_desc']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

async function detail(id: number, ctx: ViewerContext) {
  const auction = await AuctionModel.findById(id, ctx);
  if (!auction) throw ApiError.notFound('Auction not found.');
  const product = await ProductModel.findById(auction.productId);
  return { ...auction, images: product?.images ?? [] };
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const raw = Object.fromEntries(Object.entries(req.query).filter(([, v]) => v !== ''));
  const parsed = listQuery.safeParse(raw);
  if (!parsed.success) throw new ApiError(422, parsed.error.issues[0].message);
  const ctx = ctxOf(req);
  if (parsed.data.status === 'cancelled' && !ctx.isAdmin) throw ApiError.forbidden();
  sendSuccess(res, await AuctionModel.list({ ...parsed.data, categoryId: parsed.data.category, ctx }));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  await AuctionService.finalizeIfDue(id); // if its time just ran out, close it before showing it
  sendSuccess(res, await detail(id, ctxOf(req)));
});

export const listBids = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!(await AuctionModel.findById(id, ctxOf(req)))) throw ApiError.notFound('Auction not found.');
  sendSuccess(res, await AuctionModel.listBids(id, ctxOf(req)));
});

export const placeBid = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  await AuctionService.finalizeIfDue(id); // an expired auction must be closed, not bid on
  const bidId = await AuctionService.placeBid(id, req.user!.id, req.body.amount);
  sendSuccess(res, { bidId, auction: await AuctionModel.findById(id, ctxOf(req)) }, 201);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const id = await AuctionService.create(req.body);
  sendSuccess(res, await detail(id, ctxOf(req)), 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  await AuctionService.update(id, req.body);
  sendSuccess(res, await detail(id, ctxOf(req)));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await AuctionService.remove(parseId(req.params.id));
  sendSuccess(res, { deleted: true });
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  await AuctionService.cancel(id);
  sendSuccess(res, await detail(id, ctxOf(req)));
});

export const endNow = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  await AuctionService.endNow(id);
  sendSuccess(res, await detail(id, ctxOf(req)));
});

export const myBids = asyncHandler(async (req: Request, res: Response) => {
  await AuctionService.finalizeDue(); // so "won/lost" is up to date on the dashboard
  sendSuccess(res, await AuctionModel.listForBidder(req.user!.id));
});

export const myWon = asyncHandler(async (req: Request, res: Response) => {
  await AuctionService.finalizeDue();
  sendSuccess(res, await AuctionModel.listWonBy(req.user!.id));
});
