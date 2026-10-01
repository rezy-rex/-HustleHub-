import { bookingRepository, Booking } from './booking.repository';
import { gigRepository } from '../gigs/gig.repository';
import { userRepository } from '../auth/user.repository';
import { transactionRepository } from '../transactions/transaction.repository';
import { AppError } from '../../utils/AppError';

export const bookingService = {
  async createBooking(clientId: string, gigId: string): Promise<Booking> {
    const gig = await gigRepository.findById(gigId);
    if (!gig) {
      throw new AppError('Gig not found', 404, 'GIG_NOT_FOUND');
    }

    const client = await userRepository.findById(clientId);
    const clientName = client?.name || client?.email.split('@')[0] || 'Client';
    const freelancerName = gig.freelancerName || 'Freelancer';

    // Note: this is two sequential writes, not a single atomic transaction — acceptable simplification for this scope, worth one line in the README, not something to silently leave unexplained.
    const booking = await bookingRepository.create({
      gigId: gig.id,
      gigSnapshot: {
        title: gig.title,
        price: gig.price,
      },
      clientId,
      clientName,
      freelancerId: gig.freelancerId,
      freelancerName,
      status: 'confirmed',
    });

    await transactionRepository.create({
      bookingId: booking.id,
      clientId,
      freelancerId: gig.freelancerId,
      amount: gig.price,
    });

    return booking;
  },

  async listMyBookings(clientId: string): Promise<Booking[]> {
    return bookingRepository.findByClientId(clientId);
  },

  async listReceivedBookings(freelancerId: string): Promise<Booking[]> {
    return bookingRepository.findByFreelancerId(freelancerId);
  },
};
//Update from part1
