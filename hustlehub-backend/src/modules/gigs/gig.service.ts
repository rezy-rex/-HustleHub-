import { gigRepository, Gig } from './gig.repository';
import { userRepository } from '../auth/user.repository';
import { CreateGigInput, UpdateGigInput } from './gig.schema';
import { AppError } from '../../utils/AppError';
import { logEvent } from '../../utils/logger';


// Encapsulates marketplace gig operations and enforces ownership at the service layer.
export const gigService = {
  async createGig(freelancerId: string, data: CreateGigInput): Promise<Gig> {
    // Resolve a display name when the request does not supply one; the authenticated
    // freelancer ID remains the authoritative ownership value stored with the gig.
    let freelancerName = data.freelancerName;
    if (!freelancerName) {
      const user = await userRepository.findById(freelancerId);
      freelancerName = user?.name || user?.email.split('@')[0] || 'Verified Freelancer';
    }
    const gig = await gigRepository.create({
      freelancerId,
      freelancerName,
      ...data,
    });
    logEvent('gig.created', { gigId: gig.id, userId: freelancerId, titleLength: gig.title.length });
    return gig;
  },


  // Supplies the public marketplace listing of gigs.
  async listGigs(): Promise<Gig[]> {
    return gigRepository.findAll();
  },


  // Loads one gig and converts a missing record into a consistent application error.
  async getGig(id: string): Promise<Gig> {
    const gig = await gigRepository.findById(id);
    if (!gig) {
      throw new AppError('Gig not found', 404, 'GIG_NOT_FOUND');
    }
    return gig;
  },


  // Limits the freelancer dashboard listing to gigs owned by the supplied account ID.
  async listMyGigs(freelancerId: string): Promise<Gig[]> {
    return gigRepository.findByFreelancerId(freelancerId);
  },


  async updateGig(id: string, freelancerId: string, updates: UpdateGigInput): Promise<Gig> {
    const gig = await gigRepository.findById(id);
    if (!gig) {
      throw new AppError('Gig not found', 404, 'GIG_NOT_FOUND');
    }
    // Resource-level authorisation: a valid login alone does not grant ownership.
    if (gig.freelancerId !== freelancerId) {
      logEvent('authz.denied', { reason: 'not_owner', gigId: gig.id }, 'warn');
      throw new AppError('You do not have permission to update this gig', 403, 'NOT_GIG_OWNER');
    }


    // Persist changes only after the gig has been found and ownership verified.
    const updated = await gigRepository.update(id, updates);
    if (!updated) {
      throw new AppError('Failed to update gig', 500, 'GIG_UPDATE_FAILED');
    }
    logEvent('gig.updated', { gigId: updated.id, userId: freelancerId });
    return updated;
  },


  async deleteGig(id: string, freelancerId: string): Promise<void> {
    const gig = await gigRepository.findById(id);
    if (!gig) {
      throw new AppError('Gig not found', 404, 'GIG_NOT_FOUND');
    }
    if (gig.freelancerId !== freelancerId) {
      logEvent('authz.denied', { reason: 'not_owner', gigId: gig.id }, 'warn');
      throw new AppError('You do not have permission to delete this gig', 403, 'NOT_GIG_OWNER');
    }


    // Delete only after the same ownership check used by the update operation.
    const deleted = await gigRepository.delete(id);
    if (!deleted) {
      throw new AppError('Failed to delete gig', 500, 'GIG_DELETE_FAILED');
    }
    logEvent('gig.deleted', { gigId: id, userId: freelancerId });
  },
};
