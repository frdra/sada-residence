import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAnalyticsData } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") || "overview";
    const propertyId = url.searchParams.get("propertyId") || undefined;

    // ── Legacy overview mode (backward compat) ──
    if (mode === "overview") {
      const analytics = await getAnalyticsData(propertyId);
      return NextResponse.json(analytics);
    }

    // ── Monthly financial report ──
    if (mode === "monthly") {
      const month = url.searchParams.get("month"); // YYYY-MM
      if (!month) return NextResponse.json({ error: "month is required" }, { status: 400 });

      const [yearStr, monStr] = month.split("-");
      const year = parseInt(yearStr);
      const mon = parseInt(monStr);
      const startDate = `${month}-01`;
      const endDate = new Date(year, mon, 0).toISOString().split("T")[0];

      // ── INCOME: bookings paid in this month ──
      let incomeQuery = admin
        .from("payments")
        .select("amount, paid_at, booking:bookings(property_id)")
        .eq("status", "paid")
        .gte("paid_at", `${startDate}T00:00:00`)
        .lte("paid_at", `${endDate}T23:59:59`);

      const { data: payments } = await incomeQuery;

      let totalIncome = 0;
      const incomeByProperty: Record<string, number> = {};

      payments?.forEach((p: any) => {
        const amt = Number(p.amount);
        totalIncome += amt;
        const propId = p.booking?.property_id || "general";
        incomeByProperty[propId] = (incomeByProperty[propId] || 0) + amt;
      });

      // ── EXPENSES: expenses in this month ──
      let expQuery = admin
        .from("expenses")
        .select("amount, category_id, property_id, category:expense_categories(id, name, icon, color)")
        .gte("expense_date", startDate)
        .lte("expense_date", endDate)
        .neq("status", "cancelled");

      if (propertyId) {
        expQuery = expQuery.or(`property_id.eq.${propertyId},property_id.is.null`);
      }

      const { data: expenses } = await expQuery;

      let totalExpenses = 0;
      const expenseByCategory: Record<string, { name: string; icon: string; color: string; total: number; count: number }> = {};
      const expenseByProperty: Record<string, number> = {};

      expenses?.forEach((e: any) => {
        const amt = Number(e.amount);
        totalExpenses += amt;

        const catId = e.category_id;
        if (!expenseByCategory[catId]) {
          expenseByCategory[catId] = {
            name: e.category?.name || "Unknown",
            icon: e.category?.icon || "📋",
            color: e.category?.color || "#6B7280",
            total: 0,
            count: 0,
          };
        }
        expenseByCategory[catId].total += amt;
        expenseByCategory[catId].count += 1;

        const propId = e.property_id || "general";
        expenseByProperty[propId] = (expenseByProperty[propId] || 0) + amt;
      });

      const netProfit = totalIncome - totalExpenses;
      const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

      // ── BOOKINGS count for context ──
      let bookingCountQuery = admin
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .gte("created_at", `${startDate}T00:00:00`)
        .lte("created_at", `${endDate}T23:59:59`);

      if (propertyId) bookingCountQuery = bookingCountQuery.eq("property_id", propertyId);
      const { count: bookingCount } = await bookingCountQuery;

      return NextResponse.json({
        month,
        totalIncome,
        totalExpenses,
        netProfit,
        profitMargin: Math.round(profitMargin * 10) / 10,
        bookingCount: bookingCount || 0,
        incomeByProperty,
        expenseByCategory: Object.entries(expenseByCategory)
          .map(([id, v]) => ({ id, ...v }))
          .sort((a, b) => b.total - a.total),
        expenseByProperty,
      });
    }

    // ── Yearly financial report ──
    if (mode === "yearly") {
      const yearStr = url.searchParams.get("year");
      if (!yearStr) return NextResponse.json({ error: "year is required" }, { status: 400 });

      const year = parseInt(yearStr);
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      // Fetch all payments for the year
      const { data: payments } = await admin
        .from("payments")
        .select("amount, paid_at, booking:bookings(property_id)")
        .eq("status", "paid")
        .gte("paid_at", `${startDate}T00:00:00`)
        .lte("paid_at", `${endDate}T23:59:59`);

      // Fetch all expenses for the year
      let expQuery = admin
        .from("expenses")
        .select("amount, expense_date, category_id, property_id, category:expense_categories(id, name, icon, color)")
        .gte("expense_date", startDate)
        .lte("expense_date", endDate)
        .neq("status", "cancelled");

      if (propertyId) {
        expQuery = expQuery.or(`property_id.eq.${propertyId},property_id.is.null`);
      }

      const { data: expenses } = await expQuery;

      // Build monthly breakdown
      const months: {
        month: string;
        income: number;
        expenses: number;
        profit: number;
      }[] = [];

      let yearTotalIncome = 0;
      let yearTotalExpenses = 0;

      // Aggregate expense by category for year
      const yearExpenseByCategory: Record<string, { name: string; icon: string; color: string; total: number; count: number }> = {};

      for (let m = 1; m <= 12; m++) {
        const monthKey = `${year}-${String(m).padStart(2, "0")}`;
        const daysInMonth = new Date(year, m, 0).getDate();
        const mStart = `${monthKey}-01`;
        const mEnd = `${monthKey}-${String(daysInMonth).padStart(2, "0")}`;

        // Monthly income
        let mIncome = 0;
        payments?.forEach((p: any) => {
          if (p.paid_at) {
            const pDate = p.paid_at.split("T")[0];
            if (pDate >= mStart && pDate <= mEnd) {
              mIncome += Number(p.amount);
            }
          }
        });

        // Monthly expenses
        let mExpense = 0;
        expenses?.forEach((e: any) => {
          if (e.expense_date >= mStart && e.expense_date <= mEnd) {
            mExpense += Number(e.amount);
          }
        });

        months.push({
          month: monthKey,
          income: mIncome,
          expenses: mExpense,
          profit: mIncome - mExpense,
        });

        yearTotalIncome += mIncome;
        yearTotalExpenses += mExpense;
      }

      // Category breakdown for year
      expenses?.forEach((e: any) => {
        const catId = e.category_id;
        if (!yearExpenseByCategory[catId]) {
          yearExpenseByCategory[catId] = {
            name: e.category?.name || "Unknown",
            icon: e.category?.icon || "📋",
            color: e.category?.color || "#6B7280",
            total: 0,
            count: 0,
          };
        }
        yearExpenseByCategory[catId].total += Number(e.amount);
        yearExpenseByCategory[catId].count += 1;
      });

      const yearNetProfit = yearTotalIncome - yearTotalExpenses;
      const yearProfitMargin = yearTotalIncome > 0 ? (yearNetProfit / yearTotalIncome) * 100 : 0;

      return NextResponse.json({
        year,
        totalIncome: yearTotalIncome,
        totalExpenses: yearTotalExpenses,
        netProfit: yearNetProfit,
        profitMargin: Math.round(yearProfitMargin * 10) / 10,
        months,
        expenseByCategory: Object.entries(yearExpenseByCategory)
          .map(([id, v]) => ({ id, ...v }))
          .sort((a, b) => b.total - a.total),
      });
    }

    // ── Property breakdown ──
    if (mode === "property_breakdown") {
      const month = url.searchParams.get("month");
      if (!month) return NextResponse.json({ error: "month is required" }, { status: 400 });

      const [yearStr2, monStr2] = month.split("-");
      const year2 = parseInt(yearStr2);
      const mon2 = parseInt(monStr2);
      const startDate = `${month}-01`;
      const endDate = new Date(year2, mon2, 0).toISOString().split("T")[0];

      // Get properties
      const { data: properties } = await admin
        .from("properties")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order");

      // Get income per property
      const { data: payments } = await admin
        .from("payments")
        .select("amount, paid_at, booking:bookings(property_id)")
        .eq("status", "paid")
        .gte("paid_at", `${startDate}T00:00:00`)
        .lte("paid_at", `${endDate}T23:59:59`);

      // Get expenses per property
      const { data: expenses } = await admin
        .from("expenses")
        .select("amount, property_id")
        .gte("expense_date", startDate)
        .lte("expense_date", endDate)
        .neq("status", "cancelled");

      const breakdown = (properties || []).map((prop) => {
        let income = 0;
        payments?.forEach((p: any) => {
          if (p.booking?.property_id === prop.id) income += Number(p.amount);
        });

        let expense = 0;
        expenses?.forEach((e: any) => {
          if (e.property_id === prop.id) expense += Number(e.amount);
        });

        // Also add proportional share of general expenses
        const generalExpenses = expenses?.filter((e: any) => !e.property_id) || [];
        const generalTotal = generalExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
        const propCount = properties?.length || 1;
        const generalShare = generalTotal / propCount;

        return {
          propertyId: prop.id,
          propertyName: prop.name,
          income,
          directExpenses: expense,
          generalExpenseShare: Math.round(generalShare),
          totalExpenses: expense + Math.round(generalShare),
          profit: income - expense - Math.round(generalShare),
        };
      });

      return NextResponse.json({ month, breakdown });
    }

    return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
