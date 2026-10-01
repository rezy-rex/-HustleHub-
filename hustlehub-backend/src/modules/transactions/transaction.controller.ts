
import { Request, Response, NextFunction } from 'express';
import { transactionService } from './transaction.service';

export const transactionController = {
  async listMine(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await transactionService.listMyTransactions(req.user!.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
};
