import { Request, Response } from 'express';
import { DashboardModel } from '../models/dashboard.model';
import { AuctionService } from '../services/auction.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const overview = asyncHandler(async (req: Request, res: Response) => {
  await AuctionService.finalizeDue(); // counts reflect auctions that just ended
  sendSuccess(res, await DashboardModel.adminOverview(req.user!.id));
});
