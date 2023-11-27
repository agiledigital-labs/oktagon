import { z } from 'zod';

export const oktaAPIError = z.object({
  status: z.number(),
});

export type OktaAPIError = z.infer<typeof oktaAPIError>;
