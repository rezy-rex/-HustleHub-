import { Request, Response, NextFunction } from 'express';
import { transactionService } from './transaction.service';


// HTTP adapter for transaction endpoints. Business calculations remain in the service layer.
export const transactionController = {
  async listMine(req: Request, res: Response, next: NextFunction) {
    try {
      // Authentication middleware guarantees req.user for this protected route.
      const result = await transactionService.listMyTransactions(req.user!.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      // Forward failures to the centralised Express error middleware.
      next(err);
    }
  },


  async taxSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await transactionService.getTaxSummary(req.user!.id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      // Forward failures to the centralised Express error middleware.
      next(err);
    }
  },
};
