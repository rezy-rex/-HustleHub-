// OWNER: Odirile — REMOVE BEFORE COMMIT
import { Request, Response, NextFunction } from 'express';
import { bookingService } from './booking.service';

export const bookingController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const booking = await bookingService.createBooking(req.user!.id, req.body.gigId);
      res.status(201).json({ success: true, data: { booking } });
    } catch (err) {
      next(err);
    }
  },

  async listMine(req: Request, res: Response, next: NextFunction) {
    try {
      const bookings = await bookingService.listMyBookings(req.user!.id);
      res.status(200).json({ success: true, data: { bookings } });
    } catch (err) {
      next(err);
    }
  },

  async listReceived(req: Request, res: Response, next: NextFunction) {
    try {
      const bookings = await bookingService.listReceivedBookings(req.user!.id);
      res.status(200).json({ success: true, data: { bookings } });
    } catch (err) {
      next(err);
    }
  },
};
