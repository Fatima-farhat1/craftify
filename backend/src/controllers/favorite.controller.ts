import { Request, Response } from 'express';
import { FavoriteModel } from '../models/favorite.model';
import { ProductModel } from '../models/product.model';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { parseId } from '../utils/parseId';
import { sendSuccess } from '../utils/response';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const ids = await FavoriteModel.listProductIds(req.user!.id);
  sendSuccess(res, await ProductModel.findManyByIds(ids));
});

/** Lightweight: lets product cards show which hearts are filled. */
export const listIds = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await FavoriteModel.listProductIds(req.user!.id));
});

export const add = asyncHandler(async (req: Request, res: Response) => {
  const productId = parseId(req.params.productId, 'product id');
  const product = await ProductModel.findById(productId);
  if (!product || !product.isAvailable) throw ApiError.notFound('Product not found.');
  await FavoriteModel.add(req.user!.id, productId);
  sendSuccess(res, { favorited: true }, 201);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await FavoriteModel.remove(req.user!.id, parseId(req.params.productId, 'product id'));
  sendSuccess(res, { favorited: false });
});
