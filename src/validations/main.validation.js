import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(120).trim(),
  sku: z.string().trim().toUpperCase().optional(),
  price: z.number().min(0, "Price must be non-negative"),
  mrp: z.number().min(0).optional(),
  stock: z.number().min(0).optional(),
  unit: z.string().trim().optional(),
  description: z.string().max(2000).trim().optional(),
  images: z.array(z.string().url()).optional(),
  category: z.string().trim().optional(),
  tags: z.array(z.string().trim().toLowerCase()).optional(),
  isActive: z.boolean().optional(),
  unitsPerCaret: z.number().min(1).optional(),
});

export const orderItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  name: z.string().trim().optional(),
  price: z.number().min(0).optional(),
  qty: z.number().min(1, "Quantity must be at least 1"),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
  note: z.string().max(1000).trim().optional(),
  kitchenNotes: z.string().max(1000).trim().optional(),
  deliveryAddress: z.string().max(1000).trim().optional(),
  paymentMethod: z.string().trim().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["PLACED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
});

export const addPaymentEntrySchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  amount: z.number().min(1, "Amount must be strictly positive"),
  note: z.string().trim().optional(),
  date: z.string().datetime().optional(),
});
