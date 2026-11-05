import { transactionRepository, Transaction } from './transaction.repository';
import { buildTaxSummary, TaxSummary } from './tax.service';

export interface MyTransactionsResult {
  transactions: Transaction[];
  totalIncome: number;
}

export const transactionService = {
  async listMyTransactions(freelancerId: string): Promise<MyTransactionsResult> {
    const [transactions, totalIncome] = await Promise.all([
      transactionRepository.findByFreelancerId(freelancerId),
      transactionRepository.sumByFreelancerId(freelancerId),
    ]);

    return { transactions, totalIncome };
  },

  async getTaxSummary(freelancerId: string, now = new Date()): Promise<TaxSummary> {
    const transactions = await transactionRepository.findByFreelancerId(freelancerId);
    return buildTaxSummary(transactions, now);
  },
};
