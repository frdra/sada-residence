import { NextResponse } from "next/server";
import { getProperties } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const properties = await getProperties();
    return NextResponse.json({ properties });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
