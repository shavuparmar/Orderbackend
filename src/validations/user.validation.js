import { z } from "zod";

export const createUserSchema = z.object({
  customerName: z.string().min(1, "Customer name is required").trim(),
  firstName: z.string().min(1, "First name is required").trim(),
  email: z.string().email("Invalid email").trim().toLowerCase(),
  customerNumber: z.string().min(1, "Customer number is required").trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "USER", "STAFF"]).optional(),
});

export const loginUserSchema = z.object({
  emailOrNumber: z.string().min(1, "Email or Customer number is required").trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const updateProfileSchema = z.object({
  customerName: z.string().min(1).trim().optional(),
  firstName: z.string().min(1).trim().optional(),
  email: z.string().email().trim().toLowerCase().optional(),
  customerNumber: z.string().min(1).trim().optional(),
  note: z.string().optional(),
});

export const passwordResetSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  note: z.string().optional(),
});
