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
    return NextResponse.json({ available: results });
  } catch (error: any) {
    console.error("Availability check error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
