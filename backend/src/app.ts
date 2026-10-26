import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import routes from './routes';
import './types';

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.corsOrigin.split(','), credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use('/uploads', express.static(env.uploadDir, { maxAge: '7d', index: false }));
app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
