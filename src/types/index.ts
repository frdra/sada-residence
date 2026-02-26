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

export type PaymentMethodType = "online" | "dp_online" | "pay_at_property";

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
  property_id: string | null;
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
  property?: Property;
}

export interface RoomRateOverride {
  id: string;
  room_id: string;
  stay_type: StayType;
  price: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  room?: Room;
}

export interface Guest {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  id_type: string | null;
  id_number: string | null;
  id_photo_url: string | null;
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
  payment_method_type: PaymentMethodType;
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
  units: number;
  basePrice: number;
  tax: number;
  serviceFee: number;
  discount: number;
  total: number;
  deposit: number;
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
  pendingRevenue: number;
  occupiedRooms: number;
  totalRooms: number;
  occupancyRate: number;
  recentBookings: number;
  paymentBreakdown: Record<string, number>;
}

// ── Housekeeping Types ──

export type TaskType = "checkout_clean" | "occupied_clean" | "deep_clean" | "inspection";

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "needs_review"
  | "approved"
  | "rejected";

export type PhotoType = "before" | "after" | "issue";

export type IssueType =
  | "electrical"
  | "plumbing"
  | "furniture"
  | "appliance"
  | "structural"
  | "other";

export type IssueSeverity = "low" | "medium" | "high" | "critical";

export type IssueStatus =
  | "reported"
  | "acknowledged"
  | "in_progress"
  | "resolved"
  | "closed";

export type LaundryStatus =
  | "pending"
  | "picked_up"
  | "washing"
  | "done"
  | "delivered";

export interface StaffProfile {
  id: string;
  full_name: string;
  phone: string | null;
  employee_id: string | null;
  assigned_property_id: string | null;
  shift: "pagi" | "sore";
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joins
  property?: Property;
}

export interface CleaningChecklistItem {
  id: string;
  category: "kamar_tidur" | "kamar_mandi" | "area_umum" | "perlengkapan";
  item_name: string;
  description: string | null;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface HousekeepingTask {
  id: string;
  room_id: string;
  property_id: string;
  assigned_to: string | null;
  task_date: string;
  task_type: TaskType;
  status: TaskStatus;
  started_at: string | null;
  completed_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  checklist_score: number | null;
  time_score: number | null;
  photo_score: number | null;
  admin_rating: number | null;
  total_score: number | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  room?: Room;
  property?: Property;
  staff?: StaffProfile;
  photos?: TaskPhoto[];
  checklist?: TaskChecklist[];
}

export interface TaskPhoto {
  id: string;
  task_id: string;
  photo_url: string;
  photo_type: PhotoType;
  caption: string | null;
  uploaded_at: string;
}

export interface TaskChecklist {
  id: string;
  task_id: string;
  checklist_item_id: string;
  is_completed: boolean;
  completed_at: string | null;
  notes: string | null;
  // Joins
  checklist_item?: CleaningChecklistItem;
}

export interface RoomIssue {
  id: string;
  room_id: string;
  property_id: string;
  reported_by: string | null;
  issue_type: IssueType;
  severity: IssueSeverity;
  title: string;
  description: string | null;
  status: IssueStatus;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  room?: Room;
  property?: Property;
  reporter?: StaffProfile;
  photos?: IssuePhoto[];
}

export interface IssuePhoto {
  id: string;
  issue_id: string;
  photo_url: string;
  caption: string | null;
  uploaded_at: string;
}

// ── Expense Types ──

export type ExpensePaymentMethod = "cash" | "transfer" | "qris";
export type ExpenseStatus = "recorded" | "verified" | "cancelled";
export type RecurringInterval = "weekly" | "monthly" | "quarterly" | "yearly";

export interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Expense {
  id: string;
  category_id: string;
  property_id: string | null;
  title: string;
  description: string | null;
  amount: number;
  expense_date: string;
  payment_method: ExpensePaymentMethod;
  receipt_url: string | null;
  is_recurring: boolean;
  recurring_interval: RecurringInterval | null;
  recurring_day: number | null;
  recurring_end_date: string | null;
  parent_expense_id: string | null;
  recorded_by: string | null;
  status: ExpenseStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  category?: ExpenseCategory;
  property?: Property;
}

export interface LaundryItem {
  name: string;
  quantity: number;
}

export interface LaundryRequest {
  id: string;
  room_id: string;
  property_id: string;
  booking_id: string | null;
  requested_by: string | null;
  request_type: "regular" | "express";
  items: LaundryItem[];
  total_items: number;
  status: LaundryStatus;
  notes: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  room?: Room;
  property?: Property;
  staff?: StaffProfile;
}
