import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchMonthlyStats } from "@/lib/kakebo";
import { CATEGORIES } from "@/lib/categories";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/info-tooltip";

export const Route = createFileRoute("/_authenticated/forecast")({
  component: ForecastPage,
});

function ForecastPage() {
  const { t } = useTranslation();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: forecast } = useQuery({
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

  const { data: actual } = useQuery({
    queryKey: ["stats", user.id, year, month],
    queryFn: () => fetchMonthlyStats(user.id, year, month),
  });

  const [income, setIncome] = useState("");
  const [expenses, setExpenses] = useState<Record<string, string>>({});

  useEffect(() => {
    if (forecast) {
      setIncome(String(forecast.expected_income ?? ""));
      const e = (forecast.expected_expenses ?? {}) as Record<string, number>;
      setExpenses(Object.fromEntries(Object.entries(e).map(([k, v]) => [k, String(v)])));
    }
  }, [forecast]);

  async function save() {
    const parsed: Record<string, number> = {};
    for (const [k, v] of Object.entries(expenses)) {
      const n = parseFloat(v.replace(",", "."));
      if (n > 0) parsed[k] = n;
    }
    const { error } = await supabase.from("monthly_forecasts").upsert(
      {
        user_id: user.id,
        year,
        month,
        expected_income: parseFloat(income.replace(",", ".")) || 0,
        expected_expenses: parsed,
      },
      { onConflict: "user_id,year,month" },
    );
    if (error) return toast.error(error.message);
    toast.success("✓");
    qc.invalidateQueries({ queryKey: ["forecast"] });
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          {t("forecast.title")}
          <InfoTooltip text={t("forecast.tooltip")} />
        </h1>
        <p className="text-muted-foreground">{t("forecast.subtitle")}</p>
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <Label>{t("forecast.expectedIncome")} (€)</Label>
          <Input
            type="number"
            step="0.01"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t("forecast.vs")}: € {(actual?.income ?? 0).toFixed(2)}
          </p>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">{t("forecast.expectedExpenses")}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CATEGORIES.map((c) => (
            <div key={c}>
              <Label className="text-sm">{t(`categories.${c}`)}</Label>
              <Input
                type="number"
                step="0.01"
                value={expenses[c] ?? ""}
                onChange={(e) => setExpenses((s) => ({ ...s, [c]: e.target.value }))}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("forecast.vs")}: € {(actual?.byCategory?.[c] ?? 0).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Button onClick={save} className="w-full sm:w-auto" style={{ background: "var(--gradient-brand)" }}>
        {t("common.save")}
      </Button>
    </div>
  );
}