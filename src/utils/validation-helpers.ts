import { FastifyRequest } from 'fastify';
import { z } from 'zod';

export const messageSchema = z.object({
  text: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message too long (max 1000 characters)')
    .trim()
});

export const companyUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  sector: z
    .string()
    .max(50, 'Sector must be less than 50 characters')
    .optional(),
  targetRaise: z
    .preprocess(
      (val) => (val === '' ? undefined : Number(val)),
      z.number().positive('Target raise must be a positive number').optional()
    ),
  revenue: z
    .preprocess(
      (val) => (val === '' ? undefined : Number(val)),
      z.number().nonnegative('Revenue must be 0 or more').optional()
    ),
});

export const userRegistrationSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  email: z
    .string()
    .email('Invalid email address format')
    .max(100, 'Email must be less than 100 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(64, 'Password must be less than 64 characters')
});

export const userLoginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address format')
    .max(100, 'Email must be less than 100 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(64, 'Password must be less than 64 characters')
});

export function validateRequestBody<T>(
  request: FastifyRequest,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(request.body);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errorMessage = result.error.errors
    .map(err => `${err.path.join('.')}: ${err.message}`)
    .join(', ');
    
  return { success: false, error: errorMessage };
}
