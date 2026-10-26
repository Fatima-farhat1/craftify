# Craftify — Angular 9 frontend

Pinned to **Angular 9.0.0 / CLI 9.0.0 / TypeScript 3.7**. Use Node **13.11** (via nvm) for this app.
(The backend runs on Node 24 in a separate terminal.)

```bash
nvm use 13.11.0
npm install
npm start            # http://localhost:4200
```
API base URL: `src/environments/environment.ts` (`apiUrl`, `serverUrl`). The backend must allow `http://localhost:4200` in `CORS_ORIGIN`.
