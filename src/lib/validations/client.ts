import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  phone: z
    .string()
    .trim()
    .min(10, "Enter a valid phone number.")
    .max(15, "Enter a valid phone number."),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email address.")]).optional(),
  address: z.string().trim().max(500).optional(),
  panNumber: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type ClientInput = z.infer<typeof clientSchema>;
