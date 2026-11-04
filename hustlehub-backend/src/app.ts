import express from 'express';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import { env } from './config/env';
import { helmetSecurity } from './config/security';
import { requestLogger } from './middleware/requestLogger.middleware';
import authRoutes from './modules/auth/auth.routes';
import gigRoutes from './modules/gigs/gig.routes';
import bookingRoutes from './modules/bookings/booking.routes';
import transactionRoutes from './modules/transactions/transaction.routes';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';

const app = express();

if (env.TRUST_PROXY > 0) {
  app.set('trust proxy', env.TRUST_PROXY);
}

app.use(requestLogger);
app.use(helmetSecurity);
app.use(
  cors({
    origin: env.CORS_ORIGINS,
    credentials: true,
  })
);
app.use(express.json());
app.use(mongoSanitize());

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

app.use('/api/users', authRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/transactions', transactionRoutes);

// Order matters: 404 handler, then the error handler, always last..
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
