import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET — Fetch all rates (global + property-level) and room overrides
export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const url = new URL(request.url);
    const propertyId = url.searchParams.get("propertyId");
    const mode = url.searchParams.get("mode") || "rates"; // rates | overrides | all

    if (mode === "overrides" || mode === "all") {
      // Get room-level overrides
      let overrideQuery = admin
        .from("room_rate_overrides")
        .select("*, room:rooms(id, room_number, property_id, status, property:properties(id, name))")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (propertyId) {
        // Filter by property via room join
        overrideQuery = overrideQuery.eq("room.property_id", propertyId);
      }

      const { data: overrides, error: overrideErr } = await overrideQuery;
      if (overrideErr) throw new Error(overrideErr.message);

      if (mode === "overrides") {
        return NextResponse.json({ overrides });
      }

      // mode === "all" — also fetch rates
      const { data: rates, error: rateErr } = await admin
        .from("rates")
        .select("*, room_type:room_types(id, name), property:properties(id, name)")
        .eq("is_active", true)
        .order("stay_type");

      if (rateErr) throw new Error(rateErr.message);

      // Also get rooms for the pricing overview
      let roomQuery = admin
        .from("rooms")
        .select("id, room_number, floor, status, property_id, room_type_id, property:properties(id, name)")
        .eq("is_active", true)
        .order("room_number");

      if (propertyId) roomQuery = roomQuery.eq("property_id", propertyId);

      const { data: rooms } = await roomQuery;

      return NextResponse.json({ rates, overrides, rooms });
    }

    // Default: fetch rates only
    let rateQuery = admin
      .from("rates")
      .select("*, room_type:room_types(id, name), property:properties(id, name)")
      .eq("is_active", true)
      .order("stay_type");

    if (propertyId) {
      // Get property-specific + global rates
      rateQuery = admin
        .from("rates")
        .select("*, room_type:room_types(id, name), property:properties(id, name)")
        .eq("is_active", true)
        .or(`property_id.eq.${propertyId},property_id.is.null`)
        .order("stay_type");
    }

    const { data: rates, error } = await rateQuery;
    if (error) throw new Error(error.message);

    return NextResponse.json({ rates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — Create or update rates / overrides / bulk operations
export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const body = await request.json();
    const { action } = body;

    // ── Action: upsert a global or property-level rate ──
    if (action === "upsert_rate") {
      const { roomTypeId, stayType, propertyId, price, depositPercentage, taxPercentage, serviceFee } = body;

      if (!roomTypeId || !stayType || price === undefined) {
        return NextResponse.json({ error: "roomTypeId, stayType, and price are required" }, { status: 400 });
      }

      // Check if rate already exists
      let existingQuery = admin
        .from("rates")
        .select("id")
        .eq("room_type_id", roomTypeId)
        .eq("stay_type", stayType);

      if (propertyId) {
        existingQuery = existingQuery.eq("property_id", propertyId);
      } else {
        existingQuery = existingQuery.is("property_id", null);
      }

      const { data: existing } = await existingQuery.maybeSingle();

      const rateData: Record<string, unknown> = {
        room_type_id: roomTypeId,
        stay_type: stayType,
        property_id: propertyId || null,
        price: parseFloat(price),
        is_active: true,
      };

      if (depositPercentage !== undefined) rateData.deposit_percentage = parseFloat(depositPercentage);
      if (taxPercentage !== undefined) rateData.tax_percentage = parseFloat(taxPercentage);
      if (serviceFee !== undefined) rateData.service_fee = parseFloat(serviceFee);

      let data;
      if (existing) {
        const { data: updated, error } = await admin
          .from("rates")
          .update(rateData)
          .eq("id", existing.id)
          .select("*, room_type:room_types(id, name), property:properties(id, name)")
          .single();
        if (error) throw new Error(error.message);
        data = updated;
      } else {
        const { data: created, error } = await admin
          .from("rates")
          .insert(rateData)
          .select("*, room_type:room_types(id, name), property:properties(id, name)")
          .single();
        if (error) throw new Error(error.message);
        data = created;
      }

      return NextResponse.json({ rate: data });
    }

    // ── Action: bulk set property rates (all stay types for a building) ──
    if (action === "bulk_property_rates") {
      const { propertyId, roomTypeId, rates: ratesList } = body;
      // ratesList: [{ stayType, price }]

      if (!propertyId || !roomTypeId || !ratesList?.length) {
        return NextResponse.json({ error: "propertyId, roomTypeId, and rates are required" }, { status: 400 });
      }

      const results = [];
      for (const r of ratesList) {
        // Check existing
        const { data: existing } = await admin
          .from("rates")
          .select("id")
          .eq("room_type_id", roomTypeId)
          .eq("stay_type", r.stayType)
          .eq("property_id", propertyId)
          .maybeSingle();

        const rateData = {
          room_type_id: roomTypeId,
          stay_type: r.stayType,
          property_id: propertyId,
          price: parseFloat(r.price),
          is_active: true,
        };

        if (existing) {
          const { data, error } = await admin
            .from("rates")
            .update({ price: parseFloat(r.price) })
            .eq("id", existing.id)
            .select()
            .single();
          if (error) throw new Error(error.message);
          results.push(data);
        } else {
          const { data, error } = await admin
            .from("rates")
            .insert(rateData)
            .select()
            .single();
          if (error) throw new Error(error.message);
          results.push(data);
        }
      }

      return NextResponse.json({ rates: results, count: results.length });
    }

    // ── Action: set room-level override ──
    if (action === "set_room_override") {
      const { roomId, stayType, price, notes } = body;

      if (!roomId || !stayType || price === undefined) {
        return NextResponse.json({ error: "roomId, stayType, and price are required" }, { status: 400 });
      }

      const { data, error } = await admin
        .from("room_rate_overrides")
        .upsert(
          {
            room_id: roomId,
            stay_type: stayType,
            price: parseFloat(price),
            is_active: true,
            notes: notes || null,
          },
          { onConflict: "room_id,stay_type" }
        )
        .select("*, room:rooms(id, room_number, property:properties(id, name))")
        .single();

      if (error) throw new Error(error.message);

      return NextResponse.json({ override: data });
    }

    // ── Action: bulk set overrides for empty rooms in a property ──
    if (action === "bulk_empty_rooms") {
      const { propertyId, stayType, price, notes } = body;

      if (!propertyId || !stayType || price === undefined) {
        return NextResponse.json({ error: "propertyId, stayType, and price are required" }, { status: 400 });
      }

      // Get all available (empty) rooms in this property
      const { data: emptyRooms, error: roomErr } = await admin
        .from("rooms")
        .select("id, room_number")
        .eq("property_id", propertyId)
        .eq("is_active", true)
        .eq("status", "available");

      if (roomErr) throw new Error(roomErr.message);

      if (!emptyRooms?.length) {
        return NextResponse.json({ message: "Tidak ada kamar kosong di properti ini", count: 0 });
      }

      const overrides = emptyRooms.map((room) => ({
        room_id: room.id,
        stay_type: stayType,
        price: parseFloat(price),
        is_active: true,
        notes: notes || `Bulk set untuk kamar kosong ${new Date().toLocaleDateString("id-ID")}`,
      }));

      const { data, error } = await admin
        .from("room_rate_overrides")
        .upsert(overrides, { onConflict: "room_id,stay_type" })
        .select("*, room:rooms(id, room_number)");

      if (error) throw new Error(error.message);

      return NextResponse.json({
        overrides: data,
        count: data?.length || 0,
        roomNumbers: emptyRooms.map((r) => r.room_number),
      });
    }

    // ── Action: delete room override ──
    if (action === "delete_override") {
      const { overrideId } = body;
      if (!overrideId) {
        return NextResponse.json({ error: "overrideId is required" }, { status: 400 });
      }

      const { error } = await admin
        .from("room_rate_overrides")
        .delete()
        .eq("id", overrideId);

      if (error) throw new Error(error.message);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
