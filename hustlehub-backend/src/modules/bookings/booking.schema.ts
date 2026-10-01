
import { z } from 'zod';

export const CreateBookingSchema = z.object({
  gigId: z.string().min(1, 'gigId is required'),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
