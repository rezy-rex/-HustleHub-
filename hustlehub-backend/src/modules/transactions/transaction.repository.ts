// OWNER: Sixolile — REMOVE BEFORE COMMIT
import mongoose, { Schema } from 'mongoose';

export interface Transaction {
  id: string;
  bookingId: string;
  clientId: string;
  freelancerId: string;
  amount: number;
  createdAt: string;
}

export interface TransactionRepository {
  create(tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction>;
  findByFreelancerId(freelancerId: string): Promise<Transaction[]>;
  sumByFreelancerId(freelancerId: string): Promise<number>;
}

interface ITransactionDocument {
  _id: mongoose.Types.ObjectId;
  bookingId: string;
  clientId: string;
  freelancerId: string;
  amount: number;
  createdAt: Date;
}

const transactionSchema = new Schema<ITransactionDocument>(
  {
    bookingId: { type: String, required: true },
    clientId: { type: String, required: true },
    freelancerId: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const TransactionModel =
  mongoose.models.Transaction || mongoose.model<ITransactionDocument>('Transaction', transactionSchema);

function toTransaction(doc: ITransactionDocument): Transaction {
  return {
    id: doc._id.toString(),
    bookingId: doc.bookingId,
    clientId: doc.clientId,
    freelancerId: doc.freelancerId,
    amount: doc.amount,
    createdAt: doc.createdAt.toISOString(),
  };
}

export const transactionRepository: TransactionRepository = {
  async create(tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const doc = await TransactionModel.create(tx);
    return toTransaction(doc);
  },

  async findByFreelancerId(freelancerId: string): Promise<Transaction[]> {
    const docs = await TransactionModel.find({ freelancerId }).exec();
    return docs.map(toTransaction);
  },

  async sumByFreelancerId(freelancerId: string): Promise<number> {
    const result = await TransactionModel.aggregate<{ _id: null; total: number }>([
      { $match: { freelancerId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).exec();

    return result.length > 0 ? result[0].total : 0;
  },
};
