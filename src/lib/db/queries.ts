import { createAdminClient } from "@/lib/supabase/server";
import type {
  Booking,
  Guest,
  Payment,
  Property,
  Room,
  RoomType,
  Rate,
  AnalyticsData,
} from "@/types";

// ── Properties ──

export async function getProperties(): Promise<Property[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPropertyBySlug(slug: string): Promise<Property | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data;
}

// ── Room Types ──

export async function getRoomTypes(): Promise<RoomType[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("room_types")
    .select("*")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getRoomTypeBySlug(slug: string): Promise<RoomType | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("room_types")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data;
}

// ── Rates ──

export async function getRates(): Promise<Rate[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("rates").select("*");
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Get the effective rate using 3-tier pricing hierarchy:
 * 1. Room-level override (highest priority)
 * 2. Property-level rate
 * 3. Global rate (fallback)
 */
export async function getRateByTypeAndStay(
  roomTypeId: string,
  stayType: string,
  options?: { roomId?: string; propertyId?: string }
): Promise<Rate | null> {
  const supabase = createAdminClient();

  // 1. Check room-level override first
  if (options?.roomId) {
    const { data: override } = await supabase
      .from("room_rate_overrides")
      .select("*")
      .eq("room_id", options.roomId)
      .eq("stay_type", stayType)
      .eq("is_active", true)
      .maybeSingle();

    if (override) {
      // Return as a Rate-like object for compatibility
      return {
        id: override.id,
        room_type_id: roomTypeId,
        property_id: null,
        stay_type: override.stay_type,
        price: override.price,
        min_stay: 1,
        deposit_percentage: 0,
        tax_percentage: 0,
        service_fee: 0,
        is_active: true,
        valid_from: null,
        valid_until: null,
        created_at: override.created_at,
        updated_at: override.updated_at,
      } as Rate;
    }
  }

  // 2. Check property-level rate
  if (options?.propertyId) {
    const { data: propertyRate } = await supabase
      .from("rates")
      .select("*")
      .eq("room_type_id", roomTypeId)
      .eq("stay_type", stayType)
      .eq("property_id", options.propertyId)
      .eq("is_active", true)
      .maybeSingle();

    if (propertyRate) return propertyRate;
  }

  // 3. Fallback to global rate
  const { data, error } = await supabase
    .from("rates")
    .select("*")
    .eq("room_type_id", roomTypeId)
    .eq("stay_type", stayType)
    .is("property_id", null)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

// ── Rooms ──

export async function getRooms(filters?: {
  propertyId?: string;
  roomTypeId?: string;
  status?: string;
}): Promise<Room[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("rooms")
    .select(
      `*, room_type:room_types(id, name, slug), property:properties(id, name, slug)`
    )
    .eq("is_active", true)
    .order("room_number");

  if (filters?.propertyId) query = query.eq("property_id", filters.propertyId);
  if (filters?.roomTypeId) query = query.eq("room_type_id", filters.roomTypeId);
  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getRoomById(id: string): Promise<Room | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("rooms")
    .select(
      `*, room_type:room_types(*), property:properties(*)`
    )
    .eq("id", id)
    .single();
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data;
}

export async function updateRoomStatus(
  roomId: string,
  status: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("rooms")
    .update({ status })
    .eq("id", roomId);
  if (error) throw new Error(error.message);
}

// ── Guests ──

export async function findOrCreateGuest(guest: {
  full_name: string;
  email: string;
  phone: string;
  id_number?: string;
}): Promise<Guest> {
  const supabase = createAdminClient();

  // Try to find existing guest by email
  const { data: existing } = await supabase
    .from("guests")
    .select("*")
    .eq("email", guest.email)
    .single();

  if (existing) {
    // Update info if needed
    const { data, error } = await supabase
      .from("guests")
      .update({
        full_name: guest.full_name,
        phone: guest.phone,
        ...(guest.id_number ? { id_number: guest.id_number } : {}),
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabase
    .from("guests")
    .insert(guest)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ── Bookings ──

export async function createBooking(booking: {
  room_id: string;
  guest_id: string;
  property_id: string;
  check_in: string;
  check_out: string;
  stay_type: string;
  num_guests: number;
  special_requests?: string;
  base_price: number;
  tax_amount: number;
  service_fee: number;
  discount_amount: number;
  total_amount: number;
  deposit_amount: number;
  payment_method_type?: string;
}): Promise<Booking> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .insert(booking)
    .select(
      `*, guest:guests(*), room:rooms(*, room_type:room_types(*), property:properties(*))`
    )
    .single();
  if (error) throw new Error(`Failed to create booking: ${error.message}`);
  return data;
}

export async function getBookingById(id: string): Promise<Booking | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `*, guest:guests(*), room:rooms(*, room_type:room_types(*), property:properties(*)), payments(*)`
    )
    .eq("id", id)
    .single();
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data;
}

export async function getBookingByCode(code: string): Promise<Booking | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `*, guest:guests(*), room:rooms(*, room_type:room_types(*), property:properties(*)), payments(*)`
    )
    .eq("booking_code", code)
    .single();
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data;
}

export async function getBookings(filters?: {
  propertyId?: string;
  status?: string;
  paymentStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: Booking[]; count: number }> {
  const supabase = createAdminClient();
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("bookings")
    .select(
      `*, guest:guests(*), room:rooms(*, room_type:room_types(*), property:properties(*))`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters?.propertyId) query = query.eq("property_id", filters.propertyId);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.paymentStatus)
    query = query.eq("payment_status", filters.paymentStatus);
  if (filters?.search) {
    query = query.or(
      `booking_code.ilike.%${filters.search}%,guest.full_name.ilike.%${filters.search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data: data ?? [], count: count ?? 0 };
}

export async function updateBookingStatus(
  bookingId: string,
  status: string
): Promise<Booking> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateBookingPayment(
  bookingId: string,
  paidAmount: number,
  paymentStatus: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bookings")
    .update({ paid_amount: paidAmount, payment_status: paymentStatus })
    .eq("id", bookingId);
  if (error) throw new Error(error.message);
}

// ── Payments ──

export async function createPayment(payment: {
  booking_id: string;
  amount: number;
  method: string;
  external_id?: string;
  xendit_invoice_id?: string;
  xendit_invoice_url?: string;
}): Promise<Payment> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payments")
    .insert(payment)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updatePaymentStatus(
  paymentId: string,
  status: string,
  paidAt?: string
): Promise<Payment> {
  const supabase = createAdminClient();
  const updates: Record<string, unknown> = { status };
  if (paidAt) updates.paid_at = paidAt;

  const { data, error } = await supabase
    .from("payments")
    .update(updates)
    .eq("id", paymentId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getPaymentByXenditId(
  xenditInvoiceId: string
): Promise<Payment | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*, booking:bookings(*)")
    .eq("xendit_invoice_id", xenditInvoiceId)
    .single();
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data;
}

// ── Analytics ──

export async function getAnalyticsData(
  propertyId?: string
): Promise<AnalyticsData> {
  const supabase = createAdminClient();

  // Total revenue
  let revenueQuery = supabase
    .from("bookings")
    .select("total_amount, paid_amount, payment_status, property_id");
  if (propertyId) revenueQuery = revenueQuery.eq("property_id", propertyId);
  const { data: bookings } = await revenueQuery;

  const totalRevenue =
    bookings?.reduce((sum, b) => sum + (b.paid_amount || 0), 0) ?? 0;
  const pendingRevenue =
    bookings
      ?.filter((b) => b.payment_status !== "paid")
      .reduce((sum, b) => sum + ((b.total_amount || 0) - (b.paid_amount || 0)), 0) ?? 0;

  // Room occupancy
  const today = new Date().toISOString().split("T")[0];
  let occQuery = supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .lte("check_in", today)
    .gte("check_out", today)
    .in("status", ["confirmed", "checked_in"]);
  if (propertyId) occQuery = occQuery.eq("property_id", propertyId);
  const { count: occupiedRooms } = await occQuery;

  let totalRoomQuery = supabase
    .from("rooms")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  if (propertyId) totalRoomQuery = totalRoomQuery.eq("property_id", propertyId);
  const { count: totalRooms } = await totalRoomQuery;

  // Recent bookings count
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  let recentQuery = supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .gte("created_at", thirtyDaysAgo.toISOString());
  if (propertyId) recentQuery = recentQuery.eq("property_id", propertyId);
  const { count: recentBookings } = await recentQuery;

  // Payment method breakdown
  let payMethodQuery = supabase
    .from("payments")
    .select("method, amount")
    .eq("status", "paid");
  const { data: payments } = await payMethodQuery;

  const paymentBreakdown: Record<string, number> = {};
  payments?.forEach((p) => {
    paymentBreakdown[p.method] = (paymentBreakdown[p.method] || 0) + p.amount;
  });

  return {
    totalRevenue,
    pendingRevenue,
    occupiedRooms: occupiedRooms ?? 0,
    totalRooms: totalRooms ?? 0,
    occupancyRate:
      totalRooms ? Math.round(((occupiedRooms ?? 0) / totalRooms) * 100) : 0,
    recentBookings: recentBookings ?? 0,
    paymentBreakdown,
  };
}
