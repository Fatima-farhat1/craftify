import { Request, Response } from 'express';
import { CartModel } from '../models/cart.model';
import { ProductModel } from '../models/product.model';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { parseId } from '../utils/parseId';
import { sendSuccess } from '../utils/response';

async function requireBuyable(productId: number, quantity: number) {
  const p = await ProductModel.findById(productId);
  if (!p || !p.isAvailable) throw ApiError.notFound('Product not found.');
  if (p.stockQuantity === 0) throw ApiError.conflict('This product is out of stock.');
  if (quantity > p.stockQuantity) throw ApiError.conflict(`Only ${p.stockQuantity} available in stock.`);
}

export const get = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await CartModel.get(req.user!.id));
});

export const addItem = asyncHandler(async (req: Request, res: Response) => {
  const { productId, quantity } = req.body;
  const userId = req.user!.id;
  const newQuantity = (await CartModel.getQuantity(userId, productId)) + quantity;
  await requireBuyable(productId, newQuantity);
  await CartModel.setQuantity(userId, productId, newQuantity);
  sendSuccess(res, await CartModel.get(userId), 201);
});

export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  const productId = parseId(req.params.productId, 'product id');
  const userId = req.user!.id;
  if ((await CartModel.getQuantity(userId, productId)) === 0) throw ApiError.notFound('Item is not in your cart.');
  await requireBuyable(productId, req.body.quantity);
  await CartModel.setQuantity(userId, productId, req.body.quantity);
  sendSuccess(res, await CartModel.get(userId));
});

export const removeItem = asyncHandler(async (req: Request, res: Response) => {
  await CartModel.remove(req.user!.id, parseId(req.params.productId, 'product id'));
  sendSuccess(res, await CartModel.get(req.user!.id));
});

export const clear = asyncHandler(async (req: Request, res: Response) => {
  await CartModel.clear(req.user!.id);
  sendSuccess(res, await CartModel.get(req.user!.id));
});
