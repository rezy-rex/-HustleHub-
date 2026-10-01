// OWNER: Odirile — REMOVE BEFORE COMMIT
import { transactionRepository, Transaction } from './transaction.repository';

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
};
