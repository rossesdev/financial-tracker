import { z } from 'zod';

export const MovementSchema = z.object({
  description: z.string().min(1, 'Description is required').max(200, 'Description is too long'),
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .int('Amount must be a whole number')
    .positive('Amount must be greater than zero'),
  typeOfMovement: z.enum(['1', '2'], {
    errorMap: () => ({ message: 'Select income or expense' }),
  }),
  category: z.string().min(1, 'Category is required'),
  date: z.date({ required_error: 'Date is required' }),
  entity: z.string().optional(),
});

export type MovementFormValues = z.infer<typeof MovementSchema>;
