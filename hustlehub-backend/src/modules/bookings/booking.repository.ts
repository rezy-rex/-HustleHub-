// OWNER: Sixolile — REMOVE BEFORE COMMIT
import mongoose, { Schema } from 'mongoose';

export interface Booking {
  id: string;
  gigId: string;
  gigSnapshot: { title: string; price: number };
  clientId: string;
  clientName?: string;
  freelancerId: string;
  freelancerName?: string;
  status: 'confirmed';
  createdAt: string;
}

export interface BookingRepository {
  create(booking: Omit<Booking, 'id' | 'createdAt'>): Promise<Booking>;
  findByClientId(clientId: string): Promise<Booking[]>;
  findByFreelancerId(freelancerId: string): Promise<Booking[]>;
}

interface IBookingDocument {
  _id: mongoose.Types.ObjectId;
  gigId: string;
  gigSnapshot: {
    title: string;
    price: number;
  };
  clientId: string;
  clientName?: string;
  freelancerId: string;
  freelancerName?: string;
  status: 'confirmed';
  createdAt: Date;
}

const bookingSchema = new Schema<IBookingDocument>(
  {
    gigId: { type: String, required: true },
    gigSnapshot: {
      title: { type: String, required: true },
      price: { type: Number, required: true },
    },
    clientId: { type: String, required: true },
    clientName: { type: String, trim: true, default: '' },
    freelancerId: { type: String, required: true },
    freelancerName: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['confirmed'], default: 'confirmed', required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const BookingModel = mongoose.models.Booking || mongoose.model<IBookingDocument>('Booking', bookingSchema);

function toBooking(doc: IBookingDocument): Booking {
  return {
    id: doc._id.toString(),
    gigId: doc.gigId,
    gigSnapshot: {
      title: doc.gigSnapshot.title,
      price: doc.gigSnapshot.price,
    },
    clientId: doc.clientId,
    clientName: doc.clientName || 'Client',
    freelancerId: doc.freelancerId,
    freelancerName: doc.freelancerName || 'Freelancer',
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
  };
}

export const bookingRepository: BookingRepository = {
  async create(booking: Omit<Booking, 'id' | 'createdAt'>): Promise<Booking> {
    const doc = await BookingModel.create(booking);
    return toBooking(doc);
  },

  async findByClientId(clientId: string): Promise<Booking[]> {
    const docs = await BookingModel.find({ clientId }).exec();
    return docs.map(toBooking);
  },

  async findByFreelancerId(freelancerId: string): Promise<Booking[]> {
    const docs = await BookingModel.find({ freelancerId }).exec();
    return docs.map(toBooking);
  },
};
