import { createClient, createAdminClient } from "@/lib/supabase/server";

/** Get current authenticated user and verify they are staff or admin */
export async function getStaffUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  // Check admin_profiles for role
  const { data: profile } = await admin
    .from("admin_profiles")
    .select("*")
    .eq("id", user.id)
    .eq("is_active", true)
    .single();

  if (!profile) return null;

  // Also get staff_profiles if they are staff
  let staffProfile = null;
  if (profile.role === "staff") {
    const { data } = await admin
      .from("staff_profiles")
      .select("*, property:properties(*)")
      .eq("id", user.id)
      .eq("is_active", true)
      .single();
    staffProfile = data;
  }

  return {
    userId: user.id,
    email: user.email!,
    role: profile.role as "admin" | "super_admin" | "staff",
    fullName: profile.full_name || staffProfile?.full_name || user.email,
    staffProfile,
  };
}

/** Check if user is admin (admin or super_admin) */
export async function requireAdmin() {
  const user = await getStaffUser();
  if (!user || user.role === "staff") return null;
  return user;
}

/** Check if user is staff or admin */
export async function requireStaffOrAdmin() {
  const user = await getStaffUser();
  if (!user) return null;
  return user;
}
