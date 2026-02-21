// ============================================
// Sada Residence — Type Definitions
// ============================================

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show";

export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";

export type PaymentMethod = "qris" | "credit_card" | "bank_transfer" | "cash";

export type StayType = "daily" | "weekly" | "monthly";

export type BlockReason =
  | "maintenance"
  | "renovation"
  | "reserved"
  | "owner_use"
  | "other";

// ── Database row types ──

export interface Property {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  city: string;
  province: string;
  image_url: string | null;
  total_rooms: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RoomType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  max_guests: number;
  bed_type: string;
  room_size_sqm: number | null;
  amenities: string[];
  images: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  property_id: string;
  room_type_id: string;
  room_number: string;
  floor: number;
  status: "available" | "occupied" | "maintenance" | "blocked";
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joins
  property?: Property;
  room_type?: RoomType;
}

export interface Rate {
  id: string;
  room_type_id: string;
  stay_type: StayType;
  price: number;
  min_stay: number;
  deposit_percentage: number;
  tax_percentage: number;
  service_fee: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  room_type?: RoomType;
}

export interface Guest {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  id_type: string | null;
  id_number: string | null;
  address: string | null;
  city: string | null;
  country: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  booking_code: string;
  guest_id: string;
  room_id: string;
  property_id: string;
  check_in: string;
  check_out: string;
  stay_type: StayType;
  num_guests: number;
  status: BookingStatus;
  base_price: number;
  tax_amount: number;
  service_fee: number;
  discount_amount: number;
  total_amount: number;
  deposit_amount: number;
  payment_status: PaymentStatus;
  paid_amount: number;
  special_requests: string | null;
  admin_notes: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  guest?: Guest;
  room?: Room;
  property?: Property;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  booking_id: string;
  external_id: string | null;
  xendit_invoice_id: string | null;
  xendit_payment_id: string | null;
  amount: number;
  payment_method: PaymentMethod | null;
  payment_channel: string | null;
  status: "pending" | "paid" | "expired" | "failed" | "refunded";
  paid_at: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joins
  booking?: Booking;
}

export interface AvailabilityBlock {
  id: string;
  room_id: string;
  start_date: string;
  end_date: string;
  reason: BlockReason;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AdminProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "super_admin" | "staff";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── API / Form types ──

export interface BookingFormData {
  propertyId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  stayType: StayType;
  numGuests: number;
  specialRequests?: string;
  guest: {
    fullName: string;
    email: string;
    phone: string;
    idType?: string;
    idNumber?: string;
  };
}

export interface PriceCalculation {
  stayType: StayType;
  nights: number;
  units: number; // nights for daily, weeks for weekly, months for monthly
  basePrice: number;
  taxAmount: number;
  serviceFee: number;
  discountAmount: number;
  totalAmount: number;
  depositAmount: number;
  rate: Rate;
}

export interface AvailabilityResult {
  roomId: string;
  roomNumber: string;
  roomType: RoomType;
  property: Property;
  isAvailable: boolean;
}

export interface AnalyticsData {
  totalRevenue: number;
  totalBookings: number;
  occupancyRate: number;
  averageDailyRate: number;
  revenueByProperty: { property: string; revenue: number }[];
  revenueByMethod: { method: string; count: number; amount: number }[];
  bookingsByStatus: { status: string; count: number }[];
  paymentsByStatus: { status: string; count: number; amount: number }[];
  monthlyRevenue: { month: string; revenue: number; bookings: number }[];
}
