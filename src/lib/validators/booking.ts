import { z } from "zod";

export const bookingFormSchema = z.object({
  roomId: z.string().uuid("Invalid room"),
  propertyId: z.string().uuid("Invalid property").optional(),
  roomTypeId: z.string().uuid("Invalid room type").optional(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid check-in date"),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid check-out date"),
  stayType: z.enum(["daily", "weekly", "monthly"]).optional(),
  numGuests: z.number().int().min(1).max(10),
  specialRequests: z.string().max(500).optional(),
  paymentMethodType: z.enum(["online", "dp_online", "pay_at_property"]).optional(),
  guest: z.object({
    fullName: z.string().min(2, "Name is required").max(100),
    email: z.string().email("Invalid email"),
    phone: z
      .string()
      .min(8, "Phone number too short")
      .max(20)
      .regex(/^[+\d\s()-]+$/, "Invalid phone number"),
    idType: z.string().max(50).optional(),
    idNumber: z.string().max(50).optional(),
  }),
});

export const availabilityQuerySchema = z.object({
  propertyId: z.string().uuid().optional(),
  roomTypeId: z.string().uuid().optional(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  stayType: z.enum(["daily", "weekly", "monthly"]).optional(),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum([
    "pending",
    "confirmed",
    "checked_in",
    "checked_out",
    "cancelled",
    "no_show",
  ]),
  adminNotes: z.string().max(500).optional(),
  cancellationReason: z.string().max(500).optional(),
});

export const paymentUpdateSchema = z.object({
  bookingId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.enum(["qris", "credit_card", "bank_transfer", "cash"]),
});

export type BookingFormInput = z.infer<typeof bookingFormSchema>;
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
