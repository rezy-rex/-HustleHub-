import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  // Admin cannot be self-assigned at registration — prevents a client from
  // granting themselves elevated privileges. Admin accounts are seeded/
  // promoted separately (Part 2).
  role: z.enum(['client', 'freelancer']).default('client'),
});

export const LoginSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
