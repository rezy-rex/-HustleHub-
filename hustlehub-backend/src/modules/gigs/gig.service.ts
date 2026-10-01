import { gigRepository, Gig } from './gig.repository';
import { userRepository } from '../auth/user.repository';
import { CreateGigInput, UpdateGigInput } from './gig.schema';
import { AppError } from '../../utils/AppError';

export const gigService = {
  async createGig(freelancerId: string, data: CreateGigInput): Promise<Gig> {
    let freelancerName = data.freelancerName;
    if (!freelancerName) {
      const user = await userRepository.findById(freelancerId);
      freelancerName = user?.name || user?.email.split('@')[0] || 'Verified Freelancer';
    }
    return gigRepository.create({
      freelancerId,
      freelancerName,
      ...data,
    });
  },

  async listGigs(): Promise<Gig[]> {
    return gigRepository.findAll();
  },

  async getGig(id: string): Promise<Gig> {
    const gig = await gigRepository.findById(id);
    if (!gig) {
      throw new AppError('Gig not found', 404, 'GIG_NOT_FOUND');
    }
    return gig;
  },

  async listMyGigs(freelancerId: string): Promise<Gig[]> {
    return gigRepository.findByFreelancerId(freelancerId);
  },

  async updateGig(id: string, freelancerId: string, updates: UpdateGigInput): Promise<Gig> {
    const gig = await gigRepository.findById(id);
    if (!gig) {
      throw new AppError('Gig not found', 404, 'GIG_NOT_FOUND');
    }
    if (gig.freelancerId !== freelancerId) {
      throw new AppError('You do not have permission to update this gig', 403, 'NOT_GIG_OWNER');
    }

    const updated = await gigRepository.update(id, updates);
    if (!updated) {
      throw new AppError('Failed to update gig', 500, 'GIG_UPDATE_FAILED');
    }
    return updated;
  },

  async deleteGig(id: string, freelancerId: string): Promise<void> {
    const gig = await gigRepository.findById(id);
    if (!gig) {
      throw new AppError('Gig not found', 404, 'GIG_NOT_FOUND');
    }
    if (gig.freelancerId !== freelancerId) {
      throw new AppError('You do not have permission to delete this gig', 403, 'NOT_GIG_OWNER');
    }

    const deleted = await gigRepository.delete(id);
    if (!deleted) {
      throw new AppError('Failed to delete gig', 500, 'GIG_DELETE_FAILED');
    }
  },
};
