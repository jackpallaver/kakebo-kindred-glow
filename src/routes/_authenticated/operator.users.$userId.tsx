import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMonthlyStats } from "@/lib/kakebo";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CATEGORY_ICONS, type Category } from "@/lib/categories";

export const Route = createFileRoute("/_authenticated/operator/users/$userId")({
  component: OperatorUserDetail,
});

function OperatorUserDetail() {
  const { t, i18n } = useTranslation();
  const { userId } = Route.useParams();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

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

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/operator/users" className="text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-display font-bold">{profile?.full_name ?? "—"}</h1>
        <Badge variant="outline">{t("operator.readOnly")}</Badge>
      </div>

      {goal && (
        <Card className="p-6 space-y-3">
          <div className="text-sm text-muted-foreground">{t("operator.goal")}</div>
          <div className="font-medium">{goal.description}</div>
          <div className="text-lg font-display font-bold text-primary">
            € {Number(goal.target_amount).toFixed(2)}
          </div>
          <Progress
            value={goal ? Math.min(100, ((stats?.savings ?? 0) / Number(goal.target_amount)) * 100) : 0}
          />
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">{t("dashboard.monthlyIncome")}</div>
          <div className="text-xl font-display font-bold">€ {(stats?.income ?? 0).toFixed(2)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">{t("dashboard.monthlyExpenses")}</div>
          <div className="text-xl font-display font-bold">€ {(stats?.expenses ?? 0).toFixed(2)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">{t("operator.savingsThisMonth")}</div>
          <div className="text-xl font-display font-bold text-primary">
            € {(stats?.savings ?? 0).toFixed(2)}
          </div>
        </Card>
      </div>

      <Card className="divide-y">
        <div className="p-4 font-semibold">{t("operator.lastTransactions")}</div>
        {!stats?.transactions.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground">{t("transactions.empty")}</div>
        ) : (
          stats.transactions.slice(0, 15).map((tx) => {
            const Icon = CATEGORY_ICONS[tx.category as Category] ?? CATEGORY_ICONS.altro;
            return (
              <div key={tx.id} className="p-4 flex items-center gap-3">
                <div className="size-8 rounded-full bg-muted flex items-center justify-center">
                  <Icon className="size-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{t(`categories.${tx.category}`)}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(tx.date).toLocaleDateString(i18n.language)}
                  </div>
                </div>
                <div
                  className={`font-medium ${tx.type === "income" ? "text-success" : "text-destructive"}`}
                >
                  {tx.type === "income" ? "+" : "−"} € {Number(tx.amount).toFixed(2)}
                </div>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}