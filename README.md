# Craftify — handmade marketplace & auction platform

```
craftify/
├── backend/    Node 24 + Express + TypeScript + MySQL 8
└── frontend/   Angular 9.0.0 (Material 9, TypeScript 3.7)
```

## 1. Database
```bash
mysql -u root -p < backend/database/schema.sql
```

## 2. Backend  (Node 24.11.1)
```bash
cd backend
cp .env.example .env        # set DB_PASSWORD, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npm run seed:admin          # creates the ONE admin account
npm run dev                 # http://localhost:3000/api
```

## 3. Frontend  (Node 13.11.0 — use nvm, separate terminal)
```bash
cd frontend
nvm use 13.11.0
npm install
npm start                   # http://localhost:4200
```
Admin panel: http://localhost:4200/admin/login (use the ADMIN_EMAIL / ADMIN_PASSWORD from `.env`).
API URL is set in `frontend/src/environments/environment.ts`.

## What is included
**Backend:** JWT auth + roles, single-admin guarantee (enforced by the database), products/categories with image
upload, favorites, cart, checkout & orders (transactional stock), auctions with row-locked bidding and a scheduler that
ends auctions / picks winners / creates orders / sends messages and notifications, messaging, notifications,
user & admin dashboards, user management.

**Frontend:** home, products (search/filter/sort/pagination via URL), product details, categories, auctions list,
auction details (live countdown, polling, bidding), cart, checkout, login/register, customer dashboard (overview,
profile, orders, bids, won auctions, favorites, messages, notifications), admin panel (dashboard, products, categories,
orders, auctions, users, messages).

## Notes
- Payment is a placeholder (orders are `PENDING`/`PAID`); add Stripe later in the checkout step.
- JWTs are stateless (7 days). Deactivating a user cuts access immediately because every request re-checks the DB.
- Set `CORS_ORIGIN` in `backend/.env` to your frontend URL in production, and change `environment.prod.ts`.
