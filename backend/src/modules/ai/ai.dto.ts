import { z } from 'zod';

export const aiChatSchema = z.object({
  message: z.string().trim().min(2).max(600),
  intent: z.string().trim().max(80).optional(),
});

