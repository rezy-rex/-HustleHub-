// OWNER: Sixolile — REMOVE BEFORE COMMIT
import mongoose, { Schema } from 'mongoose';

export interface Gig {
  id: string;
  freelancerId: string;
  freelancerName?: string;
  category?: string;
  coverImage?: string;
  title: string;
  description: string;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface GigRepository {
  create(gig: Omit<Gig, 'id' | 'createdAt' | 'updatedAt'>): Promise<Gig>;
  findAll(): Promise<Gig[]>;
  findById(id: string): Promise<Gig | null>;
  findByFreelancerId(freelancerId: string): Promise<Gig[]>;
  update(
    id: string,
    updates: Partial<Pick<Gig, 'title' | 'description' | 'price' | 'category' | 'coverImage'>>
  ): Promise<Gig | null>;
  delete(id: string): Promise<boolean>;
}

interface IGigDocument {
  _id: mongoose.Types.ObjectId;
  freelancerId: string;
  freelancerName?: string;
  category?: string;
  coverImage?: string;
  title: string;
  description: string;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

const gigSchema = new Schema<IGigDocument>(
  {
    freelancerId: { type: String, required: true },
    freelancerName: { type: String, trim: true, default: '' },
    category: { type: String, trim: true, default: 'General' },
    coverImage: { type: String, trim: true, default: '' },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

const GigModel = mongoose.models.Gig || mongoose.model<IGigDocument>('Gig', gigSchema);

function toGig(doc: IGigDocument): Gig {
  return {
    id: doc._id.toString(),
    freelancerId: doc.freelancerId,
    freelancerName: doc.freelancerName || 'Verified Freelancer',
    category: doc.category || 'General',
    coverImage: doc.coverImage || '',
    title: doc.title,
    description: doc.description,
    price: doc.price,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export const gigRepository: GigRepository = {
  async create(gig: Omit<Gig, 'id' | 'createdAt' | 'updatedAt'>): Promise<Gig> {
    const doc = await GigModel.create(gig);
    return toGig(doc);
  },

  async findAll(): Promise<Gig[]> {
    const docs = await GigModel.find().exec();
    return docs.map(toGig);
  },

  async findById(id: string): Promise<Gig | null> {
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }
    const doc = await GigModel.findById(id).exec();
    return doc ? toGig(doc) : null;
  },

  async findByFreelancerId(freelancerId: string): Promise<Gig[]> {
    const docs = await GigModel.find({ freelancerId }).exec();
    return docs.map(toGig);
  },

  async update(
    id: string,
    updates: Partial<Pick<Gig, 'title' | 'description' | 'price' | 'category' | 'coverImage'>>
  ): Promise<Gig | null> {
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }
    const doc = await GigModel.findByIdAndUpdate(id, { $set: updates }, { new: true }).exec();
    return doc ? toGig(doc) : null;
  },

  async delete(id: string): Promise<boolean> {
    if (!mongoose.isValidObjectId(id)) {
      return false;
    }
    const result = await GigModel.findByIdAndDelete(id).exec();
    return result !== null;
  },
};
