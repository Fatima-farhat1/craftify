export type Role = 'ADMIN' | 'USER';

export interface ApiResponse<T> { success: boolean; data: T; }

export interface Page<T> { items: T[]; total: number; page: number; limit: number; totalPages: number; }

export interface User {
  id: number; firstName: string; lastName: string; email: string; phone: string | null;
  profileImage: string | null; address: string | null; role: Role; isActive: boolean; createdAt: string;
}
export interface AuthResponse { token: string; user: User; }
export interface RegisterPayload {
  firstName: string; lastName: string; email: string; password: string; confirmPassword: string;
}

export interface Category {
  id: number; name: string; description: string | null; image: string | null; productCount?: number; createdAt: string;
}

export interface ProductImage { id: number; url: string; isPrimary: boolean; }
export interface Product {
  id: number; categoryId: number; categoryName: string; name: string; description: string | null;
  price: number; image: string | null; stockQuantity: number; isAvailable: boolean; isFeatured: boolean;
  auctionId: number | null; hasAuction: boolean; createdAt: string; updatedAt: string; images?: ProductImage[];
}
export interface ProductQuery {
  search?: string; category?: number; minPrice?: number; maxPrice?: number; featured?: boolean;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'name'; page?: number; limit?: number;
}

/** Public views get a masked `name`; the admin gets the full record. */
export interface Person { id?: number; name?: string; firstName?: string; lastName?: string; email?: string; }

export type AuctionStatus = 'UPCOMING' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
export interface Auction {
  id: number; productId: number; productName: string; productImage: string | null; categoryName: string;
  startingPrice: number; currentBid: number | null; currentPrice: number; minNextBid: number; bidCount: number;
  startTime: string; endTime: string; status: AuctionStatus; serverTime: string;
  myHighestBid: number | null; isLeading: boolean; isWinner: boolean;
  winningBid: number | null; createdAt: string;
  highestBidder?: Person | null; winner?: Person | null;
  productDescription?: string | null; images?: ProductImage[];
}
export interface AuctionQuery {
  status?: 'active' | 'upcoming' | 'ended' | 'cancelled' | 'all'; search?: string; category?: number;
  sort?: string; page?: number; limit?: number;
}

export interface CartItem {
  productId: number; name: string; categoryName: string; image: string | null; unitPrice: number;
  quantity: number; lineTotal: number; stockQuantity: number; issue: string | null;
}
export interface Cart { items: CartItem[]; itemCount: number; subtotal: number; total: number; canCheckout: boolean; }

export interface Bid { id: number; amount: number; createdAt: string; isMine: boolean; bidder: Person; }

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export interface OrderItem {
  id: number; productId: number; name: string; image: string | null; quantity: number; unitPrice: number; totalPrice: number;
}
export interface Order {
  customer?: { firstName: string; lastName: string; email: string };
  id: number; orderNumber: string; userId: number; auctionId: number | null; totalAmount: number;
  status: OrderStatus; paymentStatus: 'PENDING' | 'PAID'; shippingAddress: string;
  createdAt: string; updatedAt: string; items: OrderItem[];
}

export interface UserOverview {
  totalPurchases: number; totalSpent: number; activeBids: number; leadingBids: number; auctionsWon: number;
  favorites: number; cartItems: number; unreadMessages: number; unreadNotifications: number; recentOrders: Order[];
}
export type Standing = 'WINNING' | 'OUTBID' | 'WON' | 'LOST' | 'CANCELLED';
export interface MyBid {
  auctionId: number; productId: number; productName: string; productImage: string | null; status: AuctionStatus;
  standing: Standing; myHighestBid: number; myBidCount: number; lastBidAt: string; currentBid: number;
  startTime: string; endTime: string;
}
export interface WonAuction {
  auctionId: number; productId: number; productName: string; productImage: string | null; winningBid: number; endedAt: string;
  order: { id: number; status: OrderStatus; paymentStatus: 'PENDING' | 'PAID'; hasShippingAddress: boolean } | null;
}
export interface Message {
  id: number; subject: string; preview?: string; message?: string; isRead: boolean; createdAt: string;
  sender: { id: number; name: string; fromAdmin: boolean }; receiver: { id: number; name: string; isAdmin: boolean };
}
export interface MessagePage extends Page<Message> { unreadCount: number; }
export interface Notification {
  id: number; type: string; title: string; body: string | null; relatedType: string | null; relatedId: number | null;
  isRead: boolean; createdAt: string;
}
export interface NotificationPage extends Page<Notification> { unreadCount: number; }
export interface AdminUser extends User { orderCount: number; bidCount: number; }
export interface UserDetail extends User { stats: { orders: number; totalSpent: number; auctionsBidOn: number; auctionsWon: number }; }
export interface AdminOverview {
  totalUsers: number; totalProducts: number; outOfStockProducts: number; totalOrders: number;
  ordersByStatus: { [status: string]: number }; totalSales: number; pendingPayments: number;
  auctions: { active: number; upcoming: number; completed: number; cancelled: number };
  unreadMessages: number; recentOrders: Order[]; recentUsers: User[]; recentAuctions: Auction[];
}
export interface ProfilePayload {
  firstName: string; lastName: string; email: string; phone?: string; address?: string; currentPassword?: string;
}
