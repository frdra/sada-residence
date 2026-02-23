import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const bookingId = formData.get("bookingId") as string;
    const guestId = formData.get("guestId") as string;
    const idType = formData.get("idType") as string;
    const idNumber = formData.get("idNumber") as string;
    const idPhoto = formData.get("idPhoto") as File | null;

    if (!bookingId || !guestId) {
      return NextResponse.json(
        { error: "Missing bookingId or guestId" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    let idPhotoUrl: string | null = null;

    // Upload ID photo to Supabase Storage
    if (idPhoto && idPhoto.size > 0) {
      const ext = idPhoto.name.split(".").pop() || "jpg";
      const fileName = `${guestId}/${Date.now()}.${ext}`;
      const buffer = Buffer.from(await idPhoto.arrayBuffer());

      const { error: uploadError } = await admin.storage
        .from("guest-id-photos")
        .upload(fileName, buffer, {
          contentType: idPhoto.type,
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return NextResponse.json(
          { error: "Gagal upload foto ID: " + uploadError.message },
          { status: 500 }
        );
      }

      // Get signed URL (valid for 1 year)
      const { data: signedData } = await admin.storage
        .from("guest-id-photos")
        .createSignedUrl(fileName, 365 * 24 * 60 * 60);

      idPhotoUrl = signedData?.signedUrl || null;
    }

    // Update guest with ID info
    const guestUpdate: Record<string, unknown> = {};
    if (idType) guestUpdate.id_type = idType;
    if (idNumber) guestUpdate.id_number = idNumber;
    if (idPhotoUrl) guestUpdate.id_photo_url = idPhotoUrl;

    if (Object.keys(guestUpdate).length > 0) {
      const { error: guestError } = await admin
        .from("guests")
        .update(guestUpdate)
        .eq("id", guestId);

      if (guestError) {
        return NextResponse.json(
          { error: "Gagal update data tamu: " + guestError.message },
          { status: 500 }
        );
      }
    }

    // Update booking status to checked_in
    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .update({
        status: "checked_in",
        checked_in_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .select()
      .single();

    if (bookingError) {
      return NextResponse.json(
        { error: "Gagal update booking: " + bookingError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ booking, idPhotoUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET: Retrieve guest ID photo
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const guestId = request.nextUrl.searchParams.get("guestId");
    if (!guestId)
      return NextResponse.json(
        { error: "Missing guestId" },
        { status: 400 }
      );

    const admin = createAdminClient();
    const { data: guest, error } = await admin
      .from("guests")
      .select("id, full_name, email, phone, id_type, id_number, id_photo_url")
      .eq("id", guestId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ guest });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
