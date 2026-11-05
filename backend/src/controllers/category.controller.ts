import { Request, Response } from 'express';
import { CategoryModel, toCategory } from '../models/category.model';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { removeFiles, uploadImage, uploadedFiles } from '../utils/files';
import { parseId } from '../utils/parseId';
import { sendSuccess } from '../utils/response';


const newImageUrl = async (req: Request): Promise<string | undefined> => {
  const file = uploadedFiles(req)[0];

  if (!file) return undefined;

  return uploadImage(file, 'categories');
};


export const list = asyncHandler(async (_req, res) => {
  sendSuccess(res, (await CategoryModel.list()).map(toCategory));
});

export const getOne = asyncHandler(async (req, res) => {
  const c = await CategoryModel.findById(parseId(req.params.id));
  if (!c) throw ApiError.notFound('Category not found.');
  sendSuccess(res, toCategory(c));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const image = await newImageUrl(req);

  try {
    const id = await CategoryModel.create({
      ...req.body,
      image
    });

    sendSuccess(res, toCategory((await CategoryModel.findById(id))!), 201);
  } catch (error) {
    if (image) await removeFiles([image]);
    throw error;
  }
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);

  const existing = await CategoryModel.findById(id);

  if (!existing) {
    throw ApiError.notFound('Category not found.');
  }

  const image = await newImageUrl(req);

  try {
    await CategoryModel.update(id, {
      ...req.body,
      image
    });
  } catch (error) {
    if (image) await removeFiles([image]);
    throw error;
  }

  if (image) {
    await removeFiles([existing.image]);
  }

  sendSuccess(res, toCategory((await CategoryModel.findById(id))!));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const existing = await CategoryModel.findById(id);
  if (!existing) throw ApiError.notFound('Category not found.');
  await CategoryModel.remove(id); // fails with 409 if products still use it
  await removeFiles([existing.image]);
  sendSuccess(res, { deleted: true });
});
