import express from 'express';
import morgan from 'morgan';
import authRoutes from './modules/auth/auth.routes';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';

const app = express();

app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);

// Order matters: 404 handler, then the error handler, always last.
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;