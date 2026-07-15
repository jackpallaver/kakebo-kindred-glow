import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/tips")({
  component: TipsPage,
});

const STATIC_TIPS: Record<string, Array<{ title: string; body: string; category: string }>> = {
  it: [
    { title: "Fai la lista della spesa", body: "Preparare una lista prima di uscire riduce gli acquisti impulsivi del 30%.", category: "Spesa" },
    { title: "La regola del menù settimanale", body: "Pianifica i pasti della settimana per ridurre sprechi e spese.", category: "Alimentazione" },
    { title: "Fondo emergenze", body: "Metti da parte una piccola cifra ogni mese: bastano 20€ per iniziare.", category: "Risparmio" },
    { title: "Bollette a rate", body: "Se possibile, opta per la rateizzazione per evitare stress economici improvvisi.", category: "Bollette" },
    { title: "24 ore prima di comprare", body: "Aspetta un giorno prima di acquisti non essenziali: spesso il desiderio passa.", category: "Consapevolezza" },
  ],
  en: [
    { title: "Shopping list first", body: "Preparing a list before shopping cuts impulse buys by 30%.", category: "Shopping" },
    { title: "Weekly menu rule", body: "Plan meals for the week to reduce waste and spending.", category: "Food" },
    { title: "Emergency fund", body: "Set aside a small amount each month: even €20 is a start.", category: "Savings" },
    { title: "Split bills", body: "Where possible, spread big bills to avoid sudden stress.", category: "Bills" },
    { title: "24-hour rule", body: "Wait 24 hours before non-essential purchases; the urge often fades.", category: "Awareness" },
  ],
  fr: [
    { title: "Liste de courses", body: "Une liste avant les courses réduit les achats impulsifs de 30%.", category: "Courses" },
    { title: "Menu hebdomadaire", body: "Planifiez les repas de la semaine pour réduire gaspillage et dépenses.", category: "Alimentation" },
    { title: "Fonds d'urgence", body: "Mettez de côté un peu chaque mois: 20€ suffisent pour commencer.", category: "Épargne" },
    { title: "Étalez les factures", body: "Si possible, étalez les grosses factures pour éviter le stress soudain.", category: "Factures" },
    { title: "Règle des 24h", body: "Attendez 24h avant un achat non essentiel: l'envie passe souvent.", category: "Conscience" },
  ],
  ar: [
    { title: "قائمة تسوق أولاً", body: "إعداد قائمة قبل التسوق يقلل الشراء الاندفاعي بنسبة 30٪.", category: "تسوق" },
    { title: "قاعدة القائمة الأسبوعية", body: "خطط لوجبات الأسبوع لتقليل الهدر والمصاريف.", category: "طعام" },
    { title: "صندوق طوارئ", body: "خصص مبلغاً صغيراً شهرياً: 20€ بداية جيدة.", category: "توفير" },
    { title: "قسّم الفواتير", body: "قسّم الفواتير الكبيرة عندما يكون ذلك ممكناً لتجنب الضغط.", category: "فواتير" },
    { title: "قاعدة الـ24 ساعة", body: "انتظر 24 ساعة قبل شراء غير ضروري: غالباً ما تزول الرغبة.", category: "وعي" },
  ],
};

export const Route = createFileRoute("/_authenticated/tips")({
  component: TipsPage,
});

function TipsPage() {
  const { t, i18n } = useTranslation();

  const { data: tips } = useQuery({
    queryKey: ["tips", i18n.language],
    queryFn: async () => {
      const { data } = await supabase.from("tips").select("*").eq("language", i18n.language as never);
      const remote = (data ?? []).map((r) => ({ title: r.title, body: r.body, category: r.category }));
      return remote.length > 0 ? remote : STATIC_TIPS[i18n.language] ?? STATIC_TIPS.it;
    },
  });

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">{t("tips.title")}</h1>
        <p className="text-muted-foreground">{t("tips.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(tips ?? []).map((tip, i) => (
          <Card key={i} className="p-6 space-y-3 hover:shadow-md transition-shadow">
            <div className="size-10 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-brand)" }}>
              <Lightbulb className="size-5 text-primary-foreground" />
            </div>
            <div className="text-xs text-primary font-medium uppercase tracking-wide">{tip.category}</div>
            <h3 className="font-display font-semibold">{tip.title}</h3>
            <p className="text-sm text-muted-foreground">{tip.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}