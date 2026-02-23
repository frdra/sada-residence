import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/occupancy
 * Returns occupancy data for dashboard:
 * - Overall occupancy rate for a given period
 * - Per-property occupancy
 * - Daily occupancy trend for charting
 *
 * Query params:
 *   period: "7d" | "30d" | "90d" | "365d" (default: "30d")
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const period = request.nextUrl.searchParams.get("period") || "30d";

    // Calculate date range
    const now = new Date();
    const days = period === "7d" ? 7 : period === "90d" ? 90 : period === "365d" ? 365 : 30;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = now.toISOString().split("T")[0];

    // 1. Get all properties with room counts
    const { data: properties } = await admin
      .from("properties")
      .select("id, name, slug, total_rooms")
      .eq("is_active", true)
      .order("sort_order");

    // 2. Get all active rooms grouped by property
    const { data: rooms } = await admin
      .from("rooms")
      .select("id, property_id")
      .eq("is_active", true);

    const roomsByProperty: Record<string, string[]> = {};
    const allRoomIds = new Set<string>();
    rooms?.forEach((r) => {
      if (!roomsByProperty[r.property_id]) roomsByProperty[r.property_id] = [];
      roomsByProperty[r.property_id].push(r.id);
      allRoomIds.add(r.id);
    });
    const totalRooms = allRoomIds.size;

    // 3. Get all bookings that overlap with the date range
    const { data: bookings } = await admin
      .from("bookings")
      .select("room_id, property_id, check_in, check_out, status")
      .in("status", ["confirmed", "checked_in", "checked_out"])
      .lt("check_in", endStr)
      .gt("check_out", startStr);

    // 4. Calculate daily occupancy for the chart
    const dailyData: { date: string; occupied: number; rate: number }[] = [];
    const propertyDailyOccupied: Record<string, Record<string, number>> = {};

    // Init property tracking
    properties?.forEach((p) => {
      propertyDailyOccupied[p.id] = {};
    });

    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const occupiedRoomIds = new Set<string>();
      const occupiedByProperty: Record<string, Set<string>> = {};

      bookings?.forEach((b) => {
        if (b.check_in <= dateStr && b.check_out > dateStr) {
          occupiedRoomIds.add(b.room_id);
          if (!occupiedByProperty[b.property_id])
            occupiedByProperty[b.property_id] = new Set();
          occupiedByProperty[b.property_id].add(b.room_id);
        }
      });

      const occupied = occupiedRoomIds.size;
      dailyData.push({
        date: dateStr,
        occupied,
        rate: totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0,
      });

      // Track per property
      properties?.forEach((p) => {
        const propOccupied = occupiedByProperty[p.id]?.size || 0;
        propertyDailyOccupied[p.id][dateStr] = propOccupied;
      });
    }

    // 5. Calculate average occupancy for the period
    const avgOccupied =
      dailyData.length > 0
        ? dailyData.reduce((sum, d) => sum + d.occupied, 0) / dailyData.length
        : 0;
    const avgRate =
      totalRooms > 0 ? Math.round((avgOccupied / totalRooms) * 100) : 0;

    // 6. Per-property occupancy summary
    const propertyStats = (properties || []).map((p) => {
      const propRoomCount = roomsByProperty[p.id]?.length || 0;
      const propDaily = propertyDailyOccupied[p.id] || {};
      const propDayValues = Object.values(propDaily);
      const propAvgOccupied =
        propDayValues.length > 0
          ? propDayValues.reduce((sum, v) => sum + v, 0) / propDayValues.length
          : 0;
      const propRate =
        propRoomCount > 0
          ? Math.round((propAvgOccupied / propRoomCount) * 100)
          : 0;

      return {
        propertyId: p.id,
        propertyName: p.name,
        slug: p.slug,
        totalRooms: propRoomCount,
        avgOccupied: Math.round(propAvgOccupied),
        occupancyRate: propRate,
      };
    });

    // 7. Simplify daily data for chart (aggregate to fewer points for long periods)
    let chartData = dailyData;
    if (days > 90) {
      // Weekly aggregation for 365d
      const weekly: typeof dailyData = [];
      for (let i = 0; i < dailyData.length; i += 7) {
        const chunk = dailyData.slice(i, i + 7);
        const avgOcc = Math.round(
          chunk.reduce((s, d) => s + d.occupied, 0) / chunk.length
        );
        const avgR = Math.round(
          chunk.reduce((s, d) => s + d.rate, 0) / chunk.length
        );
        weekly.push({ date: chunk[0].date, occupied: avgOcc, rate: avgR });
      }
      chartData = weekly;
    }

    // 8. Today's snapshot
    const todayStr = now.toISOString().split("T")[0];
    const todayOccupied = new Set<string>();
    bookings?.forEach((b) => {
      if (b.check_in <= todayStr && b.check_out > todayStr) {
        todayOccupied.add(b.room_id);
      }
    });

    return NextResponse.json({
      period,
      days,
      totalRooms,
      today: {
        occupied: todayOccupied.size,
        available: totalRooms - todayOccupied.size,
        rate: totalRooms > 0 ? Math.round((todayOccupied.size / totalRooms) * 100) : 0,
      },
      average: {
        occupied: Math.round(avgOccupied),
        rate: avgRate,
      },
      properties: propertyStats,
      chart: chartData,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
