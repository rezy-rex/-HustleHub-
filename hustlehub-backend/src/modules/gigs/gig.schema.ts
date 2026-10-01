
import { z } from 'zod';

export const CreateGigSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  price: z.number().positive('Price must be a positive number'),
  category: z.string().optional(),
  coverImage: z.string().optional(),
  freelancerName: z.string().optional(),
});

export const UpdateGigSchema = z
  .object({
    title: z.string().min(1, 'Title cannot be empty').optional(),
    description: z.string().min(1, 'Description cannot be empty').optional(),
    price: z.number().positive('Price must be a positive number').optional(),
    category: z.string().optional(),
    coverImage: z.string().optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.price !== undefined ||
      data.category !== undefined ||
      data.coverImage !== undefined,
    { message: 'At least one field must be provided for update' }
  );

export type CreateGigInput = z.infer<typeof CreateGigSchema>;
export type UpdateGigInput = z.infer<typeof UpdateGigSchema>;
