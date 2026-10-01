// OWNER: Odirile — REMOVE BEFORE COMMIT
import { Request, Response, NextFunction } from 'express';
import { gigService } from './gig.service';

export const gigController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const gig = await gigService.createGig(req.user!.id, req.body);
      res.status(201).json({ success: true, data: { gig } });
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const gigs = await gigService.listGigs();
      res.status(200).json({ success: true, data: { gigs } });
    } catch (err) {
      next(err);
    }
  },

  async listMine(req: Request, res: Response, next: NextFunction) {
    try {
      const gigs = await gigService.listMyGigs(req.user!.id);
      res.status(200).json({ success: true, data: { gigs } });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const gig = await gigService.getGig(req.params.id);
      res.status(200).json({ success: true, data: { gig } });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const gig = await gigService.updateGig(req.params.id, req.user!.id, req.body);
      res.status(200).json({ success: true, data: { gig } });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await gigService.deleteGig(req.params.id, req.user!.id);
      res.status(200).json({ success: true, data: { message: 'Gig deleted successfully' } });
    } catch (err) {
      next(err);
    }
  },
};
