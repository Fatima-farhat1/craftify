import { Request, Response } from 'express';
import { z } from 'zod';
import { CategoryModel } from '../models/category.model';
import { ProductModel } from '../models/product.model';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { cleanupUploads, removeFiles, toUrl, uploadedFiles } from '../utils/files';
import { parseId } from '../utils/parseId';
import { sendSuccess } from '../utils/response';

const flag = z.enum(['true', '1']).optional();
const listQuery = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.coerce.number().int().positive().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  featured: flag,
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(12),
  includeUnavailable: flag,
});

const isAdmin = (req: Request) => req.user?.role === 'ADMIN';
const imageUrls = (req: Request) => uploadedFiles(req).map(f => toUrl(f.filename));

async function assertCategory(categoryId: number) {
  if (!(await CategoryModel.findById(categoryId))) throw ApiError.badRequest('Selected category does not exist.');
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  // Angular may send empty params (?search=&category=): treat them as "not set".
  const raw = Object.fromEntries(Object.entries(req.query).filter(([, v]) => v !== ''));
  const parsed = listQuery.safeParse(raw);
  if (!parsed.success) throw new ApiError(422, parsed.error.issues[0].message);
  const q = parsed.data;
  if (q.minPrice !== undefined && q.maxPrice !== undefined && q.minPrice > q.maxPrice) {
    throw new ApiError(422, 'Minimum price cannot be greater than maximum price.');
  }
  sendSuccess(res, await ProductModel.list({
    search: q.search, categoryId: q.category, minPrice: q.minPrice, maxPrice: q.maxPrice,
    featured: !!q.featured, sort: q.sort, page: q.page, limit: q.limit,
    includeUnavailable: !!q.includeUnavailable && isAdmin(req), // only the admin can see disabled products
  }));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const product = await ProductModel.findById(parseId(req.params.id));
  if (!product || (!product.isAvailable && !isAdmin(req))) throw ApiError.notFound('Product not found.');
  sendSuccess(res, product);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  await assertCategory(req.body.categoryId);
  const id = await ProductModel.create(req.body, imageUrls(req));
  sendSuccess(res, await ProductModel.findById(id), 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!(await ProductModel.findById(id))) throw ApiError.notFound('Product not found.');
  if (req.body.categoryId !== undefined) await assertCategory(req.body.categoryId);
  await ProductModel.update(id, req.body, imageUrls(req));
  sendSuccess(res, await ProductModel.findById(id));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const urls = await ProductModel.remove(parseId(req.params.id)); // 409 if referenced by orders/auctions
  if (!urls) throw ApiError.notFound('Product not found.');
  await removeFiles(urls);
  sendSuccess(res, { deleted: true });
});

export const removeImage = asyncHandler(async (req: Request, res: Response) => {
  const productId = parseId(req.params.id);
  const url = await ProductModel.removeImage(productId, parseId(req.params.imageId, 'image id'));
  if (!url) throw ApiError.notFound('Image not found.');
  await removeFiles([url]);
  sendSuccess(res, await ProductModel.findById(productId));
});

export const setPrimaryImage = asyncHandler(async (req: Request, res: Response) => {
  const productId = parseId(req.params.id);
  if (!(await ProductModel.setPrimaryImage(productId, parseId(req.params.imageId, 'image id')))) {
    throw ApiError.notFound('Image not found.');
  }
  sendSuccess(res, await ProductModel.findById(productId));
});
