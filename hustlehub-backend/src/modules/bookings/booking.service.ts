import { bookingRepository, Booking } from './booking.repository';
import { gigRepository } from '../gigs/gig.repository';
import { userRepository } from '../auth/user.repository';
import { transactionRepository } from '../transactions/transaction.repository';
import { AppError } from '../../utils/AppError';
import { logEvent } from '../../utils/logger';


// Coordinates booking operations across the gig, user, booking and transaction repositories.
export const bookingService = {
  async createBooking(clientId: string, gigId: string): Promise<Booking> {
    // Resolve the gig first because its current owner, title and price determine the booking.
    const gig = await gigRepository.findById(gigId);
    if (!gig) {
      throw new AppError('Gig not found', 404, 'GIG_NOT_FOUND');
    }


    // Store display-name snapshots so historical bookings remain readable if profiles change.
    const client = await userRepository.findById(clientId);
    const clientName = client?.name || client?.email.split('@')[0] || 'Client';
    const freelancerName = gig.freelancerName || 'Freelancer';


    // Booking and transaction persistence are separate writes, not one atomic operation.
    // If transaction creation fails, the booking may remain and need reconciliation; consider
    // a MongoDB session transaction or an outbox workflow if atomicity becomes a requirement.
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


    // Emit an audit event after the booking record has been persisted.
    logEvent('booking.created', {
      bookingId: booking.id,
      gigId: gig.id,
      clientId,
      freelancerId: gig.freelancerId,
      amount: gig.price,
    });


    try {
      const transaction = await transactionRepository.create({
        bookingId: booking.id,
        clientId,
        freelancerId: gig.freelancerId,
        amount: gig.price,
      });
      logEvent('transaction.recorded', {
        transactionId: transaction.id,
        bookingId: booking.id,
        freelancerId: gig.freelancerId,
        amount: gig.price,
      });
    } catch (error) {
      logEvent('transaction.failed', {
        bookingId: booking.id,
        freelancerId: gig.freelancerId,
      }, 'error');
      throw error;
    }


    return booking;
  },


  // Returns bookings associated with the requesting client account.
  async listMyBookings(clientId: string): Promise<Booking[]> {
    return bookingRepository.findByClientId(clientId);
  },


  // Returns bookings for gigs owned by the requesting freelancer.
  async listReceivedBookings(freelancerId: string): Promise<Booking[]> {
    return bookingRepository.findByFreelancerId(freelancerId);
  },
};
