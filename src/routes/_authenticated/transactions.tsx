import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Trash2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_ICONS, categoryLabel, type Category } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/info-tooltip";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/transactions")({
  component: TransactionsPage,
});

function TransactionsPage() {
  const { t, i18n } = useTranslation();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  const { data: transactions } = useQuery({
    queryKey: ["transactions", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  async function del(id: string) {
    if (!confirm(t("transactions.deleteConfirm"))) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("✓");
    qc.invalidateQueries();
  }

  function exportCsv() {
    const rows = transactions ?? [];
    const header = ["date", "type", "category", "amount", "note"];
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(",")].concat(
      rows.map((r) =>
        [r.date, r.type, r.category, Number(r.amount).toFixed(2), r.note ?? ""]
          .map(escape)
          .join(","),
      ),
    );
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kakebo-movimenti-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          {t("transactions.title")}
          <InfoTooltip text={t("transactions.tooltip")} />
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={exportCsv}
          disabled={!transactions?.length}
        >
          <Download className="size-4 mr-2" />
          {t("transactions.exportCsv")}
        </Button>
      </div>

      {!transactions?.length ? (
        <Card className="p-12 text-center text-muted-foreground">{t("transactions.empty")}</Card>
      ) : (
        <Card className="divide-y">
          {transactions.map((tx) => {
            const Icon = CATEGORY_ICONS[tx.category as Category] ?? CATEGORY_ICONS.altro;
            return (
              <div key={tx.id} className="p-4 flex items-center gap-4">
                <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                  <Icon className="size-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{categoryLabel(t, tx.category)}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(tx.date).toLocaleDateString(i18n.language)}
                    {tx.note ? ` · ${tx.note}` : ""}
                  </div>
                </div>
                <div
                  className={`font-display font-bold text-lg ${
                    tx.type === "income" ? "text-success" : "text-destructive"
                  }`}
                >
                  {tx.type === "income" ? "+" : "−"} € {Number(tx.amount).toFixed(2)}
                </div>
                <Button variant="ghost" size="icon" onClick={() => del(tx.id)} aria-label="Delete">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}