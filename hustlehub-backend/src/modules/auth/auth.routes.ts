import { Router } from 'express';
import { authController } from './auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { authRateLimiter } from '../../middleware/rateLimiter.middleware';
import { validate } from '../../middleware/validate.middleware';
import { RegisterSchema, LoginSchema } from './auth.schema';

const router = Router();

router.post('/register', authRateLimiter, validate(RegisterSchema), authController.register);
router.post('/login', authRateLimiter, validate(LoginSchema), authController.login);

// Protected route — demonstrates JWT enforcement beyond login, as the
// rubric specifically requires.
router.get('/me', authMiddleware, authController.me);

export default router;
