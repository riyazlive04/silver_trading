import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().email("Enter a valid email address."),
  role: z.enum(["ADMIN", "STAFF"]),
  password: z.string().min(8, "Password must be at least 8 characters."),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  role: z.enum(["ADMIN", "STAFF"]),
  isActive: z.boolean(),
  password: z.union([z.literal(""), z.string().min(8, "Password must be at least 8 characters.")]).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
