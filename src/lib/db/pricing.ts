import { differenceInDays, differenceInWeeks, differenceInMonths } from "date-fns";
import type { Rate, StayType, PriceCalculation } from "@/types";

/**
 * Calculate total price for a booking.
 * - daily: per night
 * - weekly: per 7-night block (partial weeks rounded up)
 * - monthly: per 30-day block (partial months rounded up)
 */
export function calculatePrice(
  rate: Rate,
  checkIn: Date,
  checkOut: Date,
  stayType: StayType
): PriceCalculation {
  const nights = differenceInDays(checkOut, checkIn);

  if (nights <= 0) {
    throw new Error("Check-out must be after check-in");
  }

  let units: number;
  switch (stayType) {
    case "daily":
      units = nights;
      break;
    case "weekly":
      units = Math.max(1, Math.ceil(nights / 7));
      break;
    case "monthly":
      // Use calendar months if possible, else ceil(days/30)
      const months = differenceInMonths(checkOut, checkIn);
      units = Math.max(1, months > 0 ? months : Math.ceil(nights / 30));
      break;
    default:
      throw new Error(`Invalid stay type: ${stayType}`);
  }

  // Validate minimum stay
  if (nights < rate.min_stay) {
    throw new Error(
      `Minimum stay for ${stayType} is ${rate.min_stay} nights`
    );
  }

  const basePrice = Number(rate.price) * units;
  const taxAmount = Math.round(basePrice * (Number(rate.tax_percentage) / 100));
  const serviceFee = Number(rate.service_fee);
  const discountAmount = 0; // Future: promo codes
  const totalAmount = basePrice + taxAmount + serviceFee - discountAmount;
  const depositAmount = Math.round(
    totalAmount * (Number(rate.deposit_percentage) / 100)
  );

  return {
    stayType,
    nights,
    units,
    basePrice,
    taxAmount,
    serviceFee,
    discountAmount,
    totalAmount,
    depositAmount,
    rate,
  };
}

/**
 * Determine the best stay type based on duration.
 */
export function suggestStayType(nights: number): StayType {
  if (nights >= 28) return "monthly";
  if (nights >= 7) return "weekly";
  return "daily";
}
