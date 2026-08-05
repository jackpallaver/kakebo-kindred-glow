import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronLeft, ChevronRight, CalendarDays, BookOpen, Download } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { fetchMonthlyStats, fetchYearlySavings } from "@/lib/kakebo";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CATEGORY_ICONS, type Category } from "@/lib/categories";

export const Route = createFileRoute("/_authenticated/operator/users/$userId")({
  component: OperatorUserDetail,
});

const euro = (n: number) => `€ ${Number(n).toFixed(2)}`;

function OperatorUserDetail() {
  const { t, i18n } = useTranslation();
  const { userId } = Route.useParams();
  const now = new Date();
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const year = cursor.getFullYear();
  const month = cursor.getMonth() + 1;

  const { data: profile } = useQuery({
    queryKey: ["op-profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      return data;
    },
  });

  const { data: goal } = useQuery({
    queryKey: ["op-goal", userId, year],
    queryFn: async () => {
      const { data } = await supabase
        .from("annual_goals")
        .select("*")
        .eq("user_id", userId)
        .eq("year", year)
        .maybeSingle();
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["op-stats", userId, year, month],
    queryFn: () => fetchMonthlyStats(userId, year, month),
  });

  const { data: yearly } = useQuery({
    queryKey: ["op-yearly", userId, year],
    queryFn: () => fetchYearlySavings(userId, year),
  });

  const { data: forecasts } = useQuery({
    queryKey: ["op-forecasts", userId, year],
    queryFn: async () => {
      const { data } = await supabase
        .from("monthly_forecasts")
        .select("*")
        .eq("user_id", userId)
        .eq("year", year)
        .order("month", { ascending: false });
      return data ?? [];
    },
  });

  const { data: events } = useQuery({
    queryKey: ["op-events", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: true });
      return data ?? [];
    },
  });

  const monthLabel = cursor.toLocaleDateString(i18n.language, { month: "long", year: "numeric" });
  const catData = Object.entries(stats?.byCategory ?? {})
    .map(([name, value]) => ({ name: t(`categories.${name}`, { defaultValue: name }), value }))
    .sort((a, b) => b.value - a.value);
  const savingsData = (yearly ?? []).map((m) => ({
    name: new Date(year, m.month - 1, 1).toLocaleDateString(i18n.language, { month: "short" }),
    savings: m.savings,
  }));
  const balance = (stats?.income ?? 0) - (stats?.expenses ?? 0);

  function exportCsv() {
    const rows = [...(stats?.transactions ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    const header = ["data", "tipo", "categoria", "importo", "nota"];
    const body = rows.map((r) =>
      [r.date, r.type, r.category, Number(r.amount).toFixed(2), (r.note ?? "").replace(/"/g, '""')]
        .map((v) => `"${v}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...body].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kakebo-${(profile?.full_name ?? "utente").replace(/\s+/g, "-").toLowerCase()}-${year}-${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/operator/users" className="text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-display font-bold">{profile?.full_name ?? "—"}</h1>
        <Badge variant="outline">{t("operator.readOnly")}</Badge>
        <Button variant="outline" size="sm" className="ms-auto" onClick={exportCsv}>
          <Download className="size-4 me-2" />
          {t("transactions.exportCsv")}
        </Button>
      </div>

      {/* month navigation */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="prev"
          onClick={() => setCursor(new Date(year, month - 2, 1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="font-display font-semibold capitalize">{monthLabel}</div>
        <Button
          variant="outline"
          size="icon"
          aria-label="next"
          onClick={() => setCursor(new Date(year, month, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">{t("dashboard.monthlyIncome")}</div>
          <div className="text-lg font-display font-bold text-success">{euro(stats?.income ?? 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">{t("dashboard.monthlyExpenses")}</div>
          <div className="text-lg font-display font-bold text-destructive">
            {euro(stats?.expenses ?? 0)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">{t("operator.monthBalance")}</div>
          <div
            className={`text-lg font-display font-bold ${balance >= 0 ? "text-success" : "text-destructive"}`}
          >
            {euro(balance)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">{t("operator.savingsThisMonth")}</div>
          <div className="text-lg font-display font-bold text-primary">{euro(stats?.savings ?? 0)}</div>
        </Card>
      </div>

      {goal && (
        <Card className="p-6 space-y-3">
          <div className="text-sm text-muted-foreground">{t("operator.goal")}</div>
          <div className="font-medium">{goal.description}</div>
          <div className="text-lg font-display font-bold text-primary">
            {euro(Number(goal.target_amount))}
          </div>
          <Progress
            value={Math.min(
              100,
              Math.max(
                0,
                ((yearly ?? []).reduce((a, b) => a + b.savings, 0) / Number(goal.target_amount)) * 100,
              ),
            )}
          />
        </Card>
      )}

      <Card className="p-4 space-y-3">
        <div className="font-semibold">{t("operator.expensesByCategory")}</div>
        {!catData.length ? (
          <div className="p-6 text-center text-sm text-muted-foreground">{t("operator.noData")}</div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catData} layout="vertical" margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => euro(v)} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {catData.map((_, i) => (
                    <Cell key={i} fill="var(--color-primary)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <div className="font-semibold">
          {t("operator.yearSavings")} {year}
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={savingsData} margin={{ left: 4, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={48} />
              <Tooltip formatter={(v: number) => euro(v)} />
              <Line
                type="monotone"
                dataKey="savings"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="divide-y">
        <div className="p-4 font-semibold">
          {t("operator.allTransactions")} — <span className="capitalize">{monthLabel}</span>
        </div>
        {!stats?.transactions.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground">{t("transactions.empty")}</div>
        ) : (
          [...stats.transactions]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((tx) => {
              const Icon = CATEGORY_ICONS[tx.category as Category] ?? CATEGORY_ICONS.altro;
              return (
                <div key={tx.id} className="p-4 flex items-center gap-3">
                  <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Icon className="size-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {t(`categories.${tx.category}`, { defaultValue: tx.category })}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {new Date(tx.date).toLocaleDateString(i18n.language)}
                      {tx.note ? ` · ${tx.note}` : ""}
                    </div>
                  </div>
                  <div
                    className={`font-medium shrink-0 ${tx.type === "income" ? "text-success" : "text-destructive"}`}
                  >
                    {tx.type === "income" ? "+" : "−"} {euro(Number(tx.amount))}
                  </div>
                </div>
              );
            })
        )}
      </Card>

      <Card className="divide-y">
        <div className="p-4 font-semibold">
          {t("operator.forecasts")} {year}
        </div>
        {!forecasts?.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground">{t("operator.noData")}</div>
        ) : (
          forecasts.map((f) => {
            const exp = Object.values((f.expected_expenses ?? {}) as Record<string, number>).reduce(
              (a, b) => a + Number(b ?? 0),
              0,
            );
            return (
              <div key={f.id} className="p-4 flex items-center justify-between gap-3">
                <div className="capitalize font-medium">
                  {new Date(year, f.month - 1, 1).toLocaleDateString(i18n.language, { month: "long" })}
                </div>
                <div className="text-sm text-right">
                  <div className="text-success">+ {euro(Number(f.expected_income))}</div>
                  <div className="text-destructive">− {euro(exp)}</div>
                </div>
              </div>
            );
          })
        )}
      </Card>

      <Card className="divide-y">
        <div className="p-4 font-semibold flex items-center gap-2">
          <CalendarDays className="size-4 text-primary" />
          {t("operator.deadlines")}
        </div>
        {!events?.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground">{t("operator.noData")}</div>
        ) : (
          events.map((e) => (
            <div key={e.id} className="p-4 flex items-center gap-3">
              <span className="size-2 rounded-full bg-[#9a3412] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{e.title}</div>
                {e.note && <div className="text-xs text-muted-foreground truncate">{e.note}</div>}
              </div>
              <div className="text-xs text-muted-foreground shrink-0">
                {new Date(e.date).toLocaleDateString(i18n.language)}
              </div>
            </div>
          ))
        )}
      </Card>

      <Card className="p-6 space-y-2">
        <div className="font-semibold flex items-center gap-2">
          <BookOpen className="size-4 text-primary" />
          {t("operator.diary")}
        </div>
        {profile?.diary ? (
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{profile.diary}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{t("operator.noDiary")}</p>
        )}
      </Card>
    </div>
  );
}
