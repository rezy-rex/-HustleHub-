
import { Router } from 'express';
import { gigController } from './gig.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/requireRole.middleware';
import { validate } from '../../middleware/validate.middleware';
import { CreateGigSchema, UpdateGigSchema } from './gig.schema';

const router = Router();

router.post('/', authMiddleware, requireRole('freelancer'), validate(CreateGigSchema), gigController.create);
router.get('/', gigController.list);
router.get('/mine', authMiddleware, requireRole('freelancer'), gigController.listMine);
router.get('/:id', gigController.getById);
router.put('/:id', authMiddleware, requireRole('freelancer'), validate(UpdateGigSchema), gigController.update);
router.delete('/:id', authMiddleware, requireRole('freelancer'), gigController.delete);

export default router;
