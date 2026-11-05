import { Router } from 'express';
import { transactionController } from './transaction.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/requireRole.middleware';

const router = Router();

router.get('/mine', authMiddleware, requireRole('freelancer'), transactionController.listMine);
router.get('/tax-summary', authMiddleware, requireRole('freelancer'), transactionController.taxSummary);

export default router;
