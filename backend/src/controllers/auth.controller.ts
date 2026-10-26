import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const register = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await AuthService.register(req.body), 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await AuthService.login(req.body.email, req.body.password));
});

export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await AuthService.login(req.body.email, req.body.password, true));
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await AuthService.me(req.user!.id));
});
