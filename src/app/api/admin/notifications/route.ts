import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET — List notifications for admin
export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") || "list";
    const limit = parseInt(url.searchParams.get("limit") || "30");

    if (mode === "unread_count") {
      const { count, error } = await admin
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("target_role", "admin")
        .eq("is_read", false);

      if (error) throw new Error(error.message);
      return NextResponse.json({ count: count || 0 });
    }

    // Default: list recent notifications
    const { data, error } = await admin
      .from("notifications")
      .select("*")
      .eq("target_role", "admin")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    return NextResponse.json({ notifications: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — Mark notifications as read
export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const body = await request.json();
    const { action } = body;

    if (action === "mark_read") {
      const { id } = body; // single notification
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

      const { error } = await admin
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true });
    }

    if (action === "mark_all_read") {
      const { error } = await admin
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("target_role", "admin")
        .eq("is_read", false);

      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
