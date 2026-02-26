import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET — List expenses with filters + categories
export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") || "list";

    // ── Fetch categories ──
    if (mode === "categories") {
      const { data, error } = await admin
        .from("expense_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw new Error(error.message);
      return NextResponse.json({ categories: data });
    }

    // ── Fetch summary (monthly aggregation) ──
    if (mode === "summary") {
      const monthStr = url.searchParams.get("month"); // YYYY-MM
      const propertyId = url.searchParams.get("propertyId");

      if (!monthStr) {
        return NextResponse.json({ error: "month is required (YYYY-MM)" }, { status: 400 });
      }

      const startDate = `${monthStr}-01`;
      const endDate = new Date(
        parseInt(monthStr.split("-")[0]),
        parseInt(monthStr.split("-")[1]),
        0
      ).toISOString().split("T")[0];

      let query = admin
        .from("expenses")
        .select("id, amount, category_id, property_id, expense_date, category:expense_categories(id, name, icon, color)")
        .gte("expense_date", startDate)
        .lte("expense_date", endDate)
        .neq("status", "cancelled")
        .order("expense_date", { ascending: false });

      if (propertyId && propertyId !== "all") {
        query = query.eq("property_id", propertyId);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      // Aggregate by category
      const byCategory: Record<string, { name: string; icon: string; color: string; total: number; count: number }> = {};
      let grandTotal = 0;

      data?.forEach((exp: any) => {
        const catId = exp.category_id;
        if (!byCategory[catId]) {
          byCategory[catId] = {
            name: exp.category?.name || "Unknown",
            icon: exp.category?.icon || "📋",
            color: exp.category?.color || "#6B7280",
            total: 0,
            count: 0,
          };
        }
        byCategory[catId].total += Number(exp.amount);
        byCategory[catId].count += 1;
        grandTotal += Number(exp.amount);
      });

      return NextResponse.json({
        month: monthStr,
        grandTotal,
        byCategory: Object.entries(byCategory).map(([id, val]) => ({ id, ...val })),
        transactionCount: data?.length || 0,
      });
    }

    // ── Fetch recurring templates ──
    if (mode === "recurring") {
      const { data, error } = await admin
        .from("expenses")
        .select("*, category:expense_categories(id, name, icon, color), property:properties(id, name)")
        .eq("is_recurring", true)
        .is("parent_expense_id", null)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return NextResponse.json({ recurring: data });
    }

    // ── Default: list expenses ──
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "30");
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const propertyId = url.searchParams.get("propertyId");
    const categoryId = url.searchParams.get("categoryId");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const search = url.searchParams.get("search");

    let query = admin
      .from("expenses")
      .select(
        "*, category:expense_categories(id, name, icon, color), property:properties(id, name)",
        { count: "exact" }
      )
      .neq("status", "cancelled")
      .order("expense_date", { ascending: false })
      .range(from, to);

    if (propertyId && propertyId !== "all") query = query.eq("property_id", propertyId);
    if (categoryId && categoryId !== "all") query = query.eq("category_id", categoryId);
    if (startDate) query = query.gte("expense_date", startDate);
    if (endDate) query = query.lte("expense_date", endDate);
    if (search) query = query.ilike("title", `%${search}%`);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ expenses: data, count: count ?? 0, page, limit });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — Create expense / generate recurring / upload receipt
export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const contentType = request.headers.get("content-type") || "";

    // ── Upload receipt (multipart) ──
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File;
      const expenseId = formData.get("expenseId") as string;

      if (!file || !expenseId) {
        return NextResponse.json({ error: "file and expenseId required" }, { status: 400 });
      }

      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `expenses/${expenseId}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await admin.storage
        .from("housekeeping-photos")
        .upload(fileName, file, { contentType: file.type, upsert: true });

      if (uploadErr) throw new Error(uploadErr.message);

      const { data: urlData } = admin.storage
        .from("housekeeping-photos")
        .getPublicUrl(fileName);

      // Update expense record with receipt URL
      const { error: updateErr } = await admin
        .from("expenses")
        .update({ receipt_url: urlData.publicUrl })
        .eq("id", expenseId);

      if (updateErr) throw new Error(updateErr.message);

      return NextResponse.json({ receiptUrl: urlData.publicUrl });
    }

    // ── JSON body actions ──
    const body = await request.json();
    const { action } = body;

    // ── Create new expense ──
    if (action === "create") {
      const {
        categoryId, propertyId, title, description, amount,
        expenseDate, paymentMethod, isRecurring, recurringInterval,
        recurringDay, recurringEndDate, notes,
      } = body;

      if (!categoryId || !title || !amount) {
        return NextResponse.json({ error: "categoryId, title, and amount are required" }, { status: 400 });
      }

      const expenseData: Record<string, unknown> = {
        category_id: categoryId,
        property_id: propertyId || null,
        title,
        description: description || null,
        amount: parseFloat(amount),
        expense_date: expenseDate || new Date().toISOString().split("T")[0],
        payment_method: paymentMethod || "cash",
        is_recurring: isRecurring || false,
        notes: notes || null,
      };

      if (isRecurring) {
        expenseData.recurring_interval = recurringInterval || "monthly";
        expenseData.recurring_day = recurringDay || new Date().getDate();
        expenseData.recurring_end_date = recurringEndDate || null;
      }

      const { data, error } = await admin
        .from("expenses")
        .insert(expenseData)
        .select("*, category:expense_categories(id, name, icon, color), property:properties(id, name)")
        .single();

      if (error) throw new Error(error.message);

      return NextResponse.json({ expense: data }, { status: 201 });
    }

    // ── Generate recurring entries for a month ──
    if (action === "generate_recurring") {
      const { month } = body; // YYYY-MM

      if (!month) {
        return NextResponse.json({ error: "month is required (YYYY-MM)" }, { status: 400 });
      }

      // Get all active recurring templates
      const { data: templates, error: tplErr } = await admin
        .from("expenses")
        .select("*")
        .eq("is_recurring", true)
        .is("parent_expense_id", null)
        .neq("status", "cancelled");

      if (tplErr) throw new Error(tplErr.message);

      const [yearStr, monthStr] = month.split("-");
      const year = parseInt(yearStr);
      const mon = parseInt(monthStr);
      const created: any[] = [];

      for (const tpl of templates || []) {
        // Check if already generated for this month
        const checkStart = `${month}-01`;
        const checkEnd = new Date(year, mon, 0).toISOString().split("T")[0];

        const { data: existing } = await admin
          .from("expenses")
          .select("id")
          .eq("parent_expense_id", tpl.id)
          .gte("expense_date", checkStart)
          .lte("expense_date", checkEnd)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Check recurring_end_date
        if (tpl.recurring_end_date && new Date(tpl.recurring_end_date) < new Date(checkStart)) continue;

        // Determine expense date
        const day = Math.min(tpl.recurring_day || 1, new Date(year, mon, 0).getDate());
        const expenseDate = `${month}-${String(day).padStart(2, "0")}`;

        const { data: newExp, error: insertErr } = await admin
          .from("expenses")
          .insert({
            category_id: tpl.category_id,
            property_id: tpl.property_id,
            title: tpl.title,
            description: tpl.description,
            amount: tpl.amount,
            expense_date: expenseDate,
            payment_method: tpl.payment_method,
            is_recurring: false,
            parent_expense_id: tpl.id,
            notes: `Auto-generated dari recurring: ${tpl.title}`,
          })
          .select("*, category:expense_categories(id, name, icon, color)")
          .single();

        if (insertErr) {
          console.error(`Failed to generate recurring for ${tpl.title}:`, insertErr.message);
          continue;
        }

        created.push(newExp);
      }

      return NextResponse.json({ generated: created, count: created.length });
    }

    // ── Update expense ──
    if (action === "update") {
      const { id, ...updates } = body;
      if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

      const updateData: Record<string, unknown> = {};
      if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
      if (updates.propertyId !== undefined) updateData.property_id = updates.propertyId || null;
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.amount !== undefined) updateData.amount = parseFloat(updates.amount);
      if (updates.expenseDate !== undefined) updateData.expense_date = updates.expenseDate;
      if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      const { data, error } = await admin
        .from("expenses")
        .update(updateData)
        .eq("id", id)
        .select("*, category:expense_categories(id, name, icon, color), property:properties(id, name)")
        .single();

      if (error) throw new Error(error.message);
      return NextResponse.json({ expense: data });
    }

    // ── Cancel expense (soft delete) ──
    if (action === "cancel") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

      const { error } = await admin
        .from("expenses")
        .update({ status: "cancelled" })
        .eq("id", id);

      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
