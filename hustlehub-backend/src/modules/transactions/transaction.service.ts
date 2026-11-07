import { transactionRepository, Transaction } from './transaction.repository';
import { buildTaxSummary, TaxSummary } from './tax.service';


// Response contract for a freelancer transaction history and aggregate income.
export interface MyTransactionsResult {
  transactions: Transaction[];
  totalIncome: number;
}


export const transactionService = {
  // Fetch detailed history and aggregate income in parallel because neither query
  // depends on the result of the other.
  async listMyTransactions(freelancerId: string): Promise<MyTransactionsResult> {
    const [transactions, totalIncome] = await Promise.all([
      transactionRepository.findByFreelancerId(freelancerId),
      transactionRepository.sumByFreelancerId(freelancerId),
    ]);


    return { transactions, totalIncome };
  },


  // Delegate tax-year filtering and calculations to the dedicated tax service.
  async getTaxSummary(freelancerId: string, now = new Date()): Promise<TaxSummary> {
    const transactions = await transactionRepository.findByFreelancerId(freelancerId);
    return buildTaxSummary(transactions, now);
  },
};
