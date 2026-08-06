import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown, PiggyBank, Target, LineChart as LineChartIcon, CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMonthlyStats, fetchYearlySavings } from "@/lib/kakebo";
import { CATEGORY_COLORS, type Category } from "@/lib/categories";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { t, i18n } = useTranslation();
  const { user } = Route.useRouteContext();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const { data: goals } = useQuery({
    queryKey: ["goals", user.id, year],
    queryFn: async () => {
      const { data } = await supabase
        .from("annual_goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("year", year)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });
  const goalTotal = (goals ?? []).reduce((a, g) => a + Number(g.target_amount), 0);
  const hasGoal = (goals?.length ?? 0) > 0;

  const { data: stats } = useQuery({
    queryKey: ["stats", user.id, year, month],
    queryFn: () => fetchMonthlyStats(user.id, year, month),
  });

  const [catOffset, setCatOffset] = useState(0);
  const catDate = new Date(year, month - 1 + catOffset, 1);
  const catYear = catDate.getFullYear();
  const catMonth = catDate.getMonth() + 1;
  const catLabel = catDate.toLocaleDateString(i18n.language, { month: "long", year: "numeric" });

  const { data: catStats } = useQuery({
    queryKey: ["stats", user.id, catYear, catMonth],
    queryFn: () => fetchMonthlyStats(user.id, catYear, catMonth),
  });

  const { data: yearly } = useQuery({
    queryKey: ["yearly", user.id, year],
    queryFn: () => fetchYearlySavings(user.id, year),
  });

  const { data: forecastCurrent } = useQuery({
    queryKey: ["forecast", user.id, year, month],
    queryFn: async () => {
      const { data } = await supabase
        .from("monthly_forecasts")
        .select("*")
        .eq("user_id", user.id)
        .eq("year", year)
        .eq("month", month)
        .maybeSingle();
      return data;
    },
  });

  const { data: upcomingEvents } = useQuery({
    queryKey: ["events-upcoming", user.id],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(5);
      return data ?? [];
    },
  });

  const yearSavings = (yearly ?? []).reduce((a, b) => a + Math.max(b.savings, 0), 0);
  const goalProgress = goalTotal > 0 ? Math.min(100, (yearSavings / goalTotal) * 100) : 0;

  const pieData = Object.entries(catStats?.byCategory ?? {}).map(([cat, val]) => ({
    name: t(`categories.${cat}`),
    value: val,
    color: CATEGORY_COLORS[cat as Category] ?? "gray",
  }));

  const barData = (yearly ?? []).map((m) => ({
    month: new Date(year, m.month - 1, 1).toLocaleDateString(undefined, { month: "short" }),
    savings: Math.max(m.savings, 0),
  }));

  const challenge = Number((profile as { monthly_challenge_amount?: number } | null)?.monthly_challenge_amount ?? 50);
  const challengeProgress = Math.min(100, ((stats?.savings ?? 0) / challenge) * 100);

  const forecastIncome = Number(forecastCurrent?.expected_income ?? 0);
  const forecastExpenses = forecastCurrent?.expected_expenses
    ? Object.values(forecastCurrent.expected_expenses as Record<string, number>).reduce(
        (a, b) => a + (Number(b) || 0),
        0,
      )
    : 0;

  const compareData = [
    {
      key: "income",
      name: t("common.income"),
      planned: forecastIncome,
      actual: stats?.income ?? 0,
    },
    {
      key: "expenses",
      name: t("common.expense"),
      planned: forecastExpenses,
      actual: stats?.expenses ?? 0,
    },
    {
      key: "savings",
      name: t("dashboard.monthlySavings"),
      planned: forecastIncome - forecastExpenses,
      actual: stats?.savings ?? 0,
    },
  ];

  return (
    <div className="p-4 md:p-6 pb-32 md:pb-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">
          {t("dashboard.greeting", { name: profile?.full_name ?? "" })}
        </h1>
        <p className="text-muted-foreground">{t("dashboard.title")}</p>
      </div>

      {!hasGoal && (
        <Card className="p-6 flex items-center justify-between" style={{ background: "var(--gradient-soft)" }}>
          <div>
            <p className="font-medium">{t("dashboard.noGoal")}</p>
          </div>
          <Button asChild style={{ background: "var(--gradient-brand)" }}>
            <Link to="/onboarding">{t("dashboard.setGoal")}</Link>
          </Button>
        </Card>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <TrendingUp className="size-4 text-success" />
            {t("dashboard.monthlyIncome")}
          </div>
          <div className="text-2xl font-display font-bold">€ {(stats?.income ?? 0).toFixed(2)}</div>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <TrendingDown className="size-4 text-destructive" />
            {t("dashboard.monthlyExpenses")}
          </div>
          <div className="text-2xl font-display font-bold">€ {(stats?.expenses ?? 0).toFixed(2)}</div>
        </Card>
        <Card className="p-4 space-y-1" style={{ background: "var(--gradient-brand)", color: "white" }}>
          <div className="flex items-center gap-2 text-sm opacity-90">
            <PiggyBank className="size-4" />
            {t("dashboard.monthlySavings")}
          </div>
          <div className="text-2xl font-display font-bold">€ {(stats?.savings ?? 0).toFixed(2)}</div>
        </Card>
      </div>

      {/* Challenge + Goal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              🎯 {t("dashboard.monthlyChallenge")}
            </h3>
            <span className="text-sm text-muted-foreground">{challengeProgress.toFixed(0)}%</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("dashboard.challengeCopy", { amount: challenge })}
          </p>
          <Progress value={challengeProgress} />
        </Card>

        {hasGoal && (
          <Card className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Target className="size-4" />
                {t("dashboard.goalProgress")}
              </h3>
              <span className="text-sm text-muted-foreground">{goalProgress.toFixed(0)}%</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {goals!.map((g) => (
                <li key={g.id} className="flex justify-between gap-2">
                  <span className="truncate">{g.description}</span>
                  <span className="shrink-0">€ {Number(g.target_amount).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <Progress value={goalProgress} />
            <p className="text-xs text-muted-foreground">
              € {yearSavings.toFixed(2)} / € {goalTotal.toFixed(2)}
            </p>
          </Card>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="font-semibold">{t("dashboard.spendingByCategory")}</h3>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="prev" onClick={() => setCatOffset((o) => o - 1)}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-sm font-medium capitalize min-w-28 text-center">{catLabel}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="next"
                disabled={catOffset >= 0}
                onClick={() => setCatOffset((o) => Math.min(0, o + 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">{t("dashboard.noData")}</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `€ ${v.toFixed(2)}`} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">{t("dashboard.savingsTrend")}</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => `€ ${v.toFixed(2)}`} />
                <Bar dataKey="savings" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Forecast + Calendar summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <LineChartIcon className="size-4 text-primary" />
              {t("dashboard.forecastSection")}
            </h3>
            <Button asChild variant="ghost" size="sm">
              <Link to="/forecast">{t("dashboard.viewAll")}</Link>
            </Button>
          </div>
          {forecastCurrent ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("dashboard.forecastVsReal")}</p>
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={compareData} margin={{ left: 4, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(v: number) => `€ ${Number(v).toFixed(2)}`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="planned" name={t("dashboard.planned")} fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" name={t("dashboard.actual")} fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {compareData.map((row) => {
                  const diff = row.actual - row.planned;
                  const good = row.key === "expenses" ? diff <= 0 : diff >= 0;
                  return (
                    <div key={row.key} className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/40 text-sm">
                      <span className="text-muted-foreground">{row.name}</span>
                      <span className="shrink-0">
                        € {row.planned.toFixed(2)} → <strong>€ {row.actual.toFixed(2)}</strong>{" "}
                        <span className={good ? "text-success" : "text-destructive"}>
                          ({diff >= 0 ? "+" : "−"} € {Math.abs(diff).toFixed(2)})
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t("dashboard.noForecast")}
            </p>
          )}
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <CalendarClock className="size-4 text-primary" />
              {t("dashboard.calendarSection")}
            </h3>
            <Button asChild variant="ghost" size="sm">
              <Link to="/calendar">{t("dashboard.viewAll")}</Link>
            </Button>
          </div>
          {!upcomingEvents?.length ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t("dashboard.noUpcoming")}
            </p>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((e) => (
                <div key={e.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/40">
                  <span className="w-2 h-2 rounded-full bg-[#9a3412] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{e.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(e.date).toLocaleDateString(i18n.language)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}