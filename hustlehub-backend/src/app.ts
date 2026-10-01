import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import { helmetSecurity } from './config/security';
import authRoutes from './modules/auth/auth.routes';
import gigRoutes from './modules/gigs/gig.routes';
import bookingRoutes from './modules/bookings/booking.routes';
import transactionRoutes from './modules/transactions/transaction.routes';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';

const app = express();

app.use(helmetSecurity);
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);
app.use(express.json());
app.use(mongoSanitize());
app.use(morgan('dev'));

app.use('/api/users', authRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/transactions', transactionRoutes);

// Order matters: 404 handler, then the error handler, always last.
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
