import { NextRequest, NextResponse } from "next/server";
import { availabilityQuerySchema } from "@/lib/validators/booking";
import { findAvailableRooms } from "@/lib/db/availability";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const parsed = availabilityQuerySchema.safeParse({
      checkIn: searchParams.get("checkIn"),
      checkOut: searchParams.get("checkOut"),
      propertyId: searchParams.get("propertyId") || undefined,
      roomTypeId: searchParams.get("roomTypeId") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const results = await findAvailableRooms(parsed.data);

    // If summary mode, return count per property
    const mode = searchParams.get("mode");
    if (mode === "summary") {
      const propertyMap: Record<
        string,
        { propertyId: string; propertyName: string; slug: string; available: number }
      > = {};

      for (const room of results) {
        const pid = room.property.id;
        if (!propertyMap[pid]) {
          propertyMap[pid] = {
            propertyId: pid,
            propertyName: room.property.name,
            slug: room.property.slug,
            available: 0,
          };
        }
        propertyMap[pid].available++;
      }

      return NextResponse.json({
        properties: Object.values(propertyMap),
        totalAvailable: results.length,
      });
    }

    return NextResponse.json({ available: results });
  } catch (error: any) {
    console.error("Availability check error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
