import { Router } from 'express';
import adminRoutes from './admin.routes';
import auctionRoutes from './auction.routes';
import authRoutes from './auth.routes';
import cartRoutes from './cart.routes';
import categoryRoutes from './category.routes';
import favoriteRoutes from './favorite.routes';
import messageRoutes from './message.routes';
import notificationRoutes from './notification.routes';
import orderRoutes from './order.routes';
import productRoutes from './product.routes';
import userRoutes from './user.routes';

const router = Router();
router.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/auctions', auctionRoutes);
router.use('/users', userRoutes);
router.use('/messages', messageRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);

export default router;
