// OWNER: Odirile — REMOVE BEFORE COMMIT
import { Router } from 'express';
import { bookingController } from './booking.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/requireRole.middleware';
import { bookingRateLimiter } from '../../middleware/rateLimiter.middleware';
import { validate } from '../../middleware/validate.middleware';
import { CreateBookingSchema } from './booking.schema';

const router = Router();

router.post('/', authMiddleware, requireRole('client'), bookingRateLimiter, validate(CreateBookingSchema), bookingController.create);
router.get('/mine', authMiddleware, requireRole('client'), bookingController.listMine);
router.get('/received', authMiddleware, requireRole('freelancer'), bookingController.listReceived);

export default router;
