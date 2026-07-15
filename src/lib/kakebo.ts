import { supabase } from "@/integrations/supabase/client";

export interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  date: string;
  note: string | null;
}

export async function fetchMonthlyStats(userId: string, year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = new Date(year, month, 0).toISOString().slice(0, 10);
  const { data } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end);
  const txs = (data ?? []) as Transaction[];
  const income = txs.filter((t) => t.type === "income").reduce((a, b) => a + Number(b.amount), 0);
  const expenses = txs.filter((t) => t.type === "expense").reduce((a, b) => a + Number(b.amount), 0);
  const byCategory: Record<string, number> = {};
  txs
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] ?? 0) + Number(t.amount);
    });
  return { income, expenses, savings: income - expenses, byCategory, transactions: txs };
}

export async function fetchYearlySavings(userId: string, year: number) {
  const { data } = await supabase
    .from("transactions")
    .select("type, amount, date")
    .eq("user_id", userId)
    .gte("date", `${year}-01-01`)
    .lte("date", `${year}-12-31`);
  const perMonth: Array<{ month: number; savings: number }> = [];
  for (let m = 1; m <= 12; m++) perMonth.push({ month: m, savings: 0 });
  (data ?? []).forEach((t) => {
    const m = Number(t.date.slice(5, 7));
    const amt = Number(t.amount);
    perMonth[m - 1].savings += t.type === "income" ? amt : -amt;
  });
  return perMonth;
}