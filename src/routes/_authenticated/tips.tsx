import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Lightbulb, LifeBuoy, BookOpen, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

const EMERGENCY_CONTENT: Record<string, { title: string; sections: Array<{ h: string; b: string }> }> = {
  it: {
    title: "Gestire le emergenze",
    sections: [
      { h: "Emergenze immediate", b: "112 (numero unico), 118 (emergenza sanitaria), 1522 (violenza di genere), Telefono Amico 02 2327 2327." },
      { h: "Servizi territoriali", b: "Rivolgiti al tuo Comune (Servizi Sociali), al Consultorio ASL, ai CAF/Patronati per bonus, ISEE, sostegni al reddito." },
      { h: "Debiti e sovraindebitamento", b: "Contatta un OCC (Organismo di Composizione della Crisi) presso l'Ordine dei Commercialisti o il Comune, oppure associazioni come Adiconsum o Movimento Consumatori. Non firmare mai riconoscimenti di debito senza consulenza." },
      { h: "Se non arrivi a fine mese", b: "Caritas diocesana, Empori solidali, Banco Alimentare, Sportelli anti-usura (fondazioni regionali)." },
      { h: "Cooperativa Progetto 92", b: "Contatta il tuo operatore di riferimento: è il primo aiuto per orientarti tra i servizi." },
    ],
  },
  en: {
    title: "Handling emergencies",
    sections: [
      { h: "Immediate help", b: "112 (Europe emergency), 118 (medical), 1522 (gender-based violence)." },
      { h: "Local services", b: "Contact your City's social services, the local health authority, or a tax/benefits help desk (CAF)." },
      { h: "Debt help", b: "Reach an over-indebtedness body (OCC) or a consumer association. Never sign debt acknowledgments without advice." },
      { h: "Food & essentials", b: "Caritas, solidarity shops, food banks." },
      { h: "Cooperativa Progetto 92", b: "Talk to your reference operator first." },
    ],
  },
  fr: {
    title: "Gérer les urgences",
    sections: [
      { h: "Aide immédiate", b: "112 (urgence européenne), 118 (médicale), 1522 (violences de genre)." },
      { h: "Services locaux", b: "Contactez les services sociaux de votre commune, le centre de santé local ou un CAF." },
      { h: "Endettement", b: "Adressez-vous à un organisme de médiation du surendettement ou à une association de consommateurs." },
      { h: "Aide alimentaire", b: "Caritas, épiceries solidaires, banques alimentaires." },
      { h: "Coopérative Progetto 92", b: "Parlez d'abord à votre opérateur référent." },
    ],
  },
  ar: {
    title: "التعامل مع الطوارئ",
    sections: [
      { h: "طوارئ فورية", b: "112 (رقم الطوارئ الأوروبي), 118 (طوارئ صحية), 1522 (العنف القائم على النوع)." },
      { h: "الخدمات المحلية", b: "اتصل بالخدمات الاجتماعية في بلديتك أو مركز الصحة المحلي أو مركز CAF للدعم." },
      { h: "الديون", b: "توجه إلى هيئة معالجة الإفراط في الاستدانة (OCC) أو جمعية للمستهلكين. لا توقع أي اعتراف بالدين دون استشارة." },
      { h: "الغذاء والأساسيات", b: "كاريتاس، المتاجر التضامنية، بنوك الطعام." },
      { h: "تعاونية Progetto 92", b: "تحدث أولاً مع المشغّل المرجعي." },
    ],
  },
};

const DEEP_DIVE_URL = "https://www.museodelrisparmio.it/";

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
  const [emergOpen, setEmergOpen] = useState(false);
  const em = EMERGENCY_CONTENT[i18n.language] ?? EMERGENCY_CONTENT.it;

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          type="button"
          onClick={() => setEmergOpen(true)}
          className="h-auto justify-start p-4 text-left"
          style={{ background: "var(--gradient-brand)" }}
        >
          <LifeBuoy className="size-5 mr-3 shrink-0" />
          <span className="font-semibold">{em.title}</span>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-auto justify-start p-4 text-left"
        >
          <a href={DEEP_DIVE_URL} target="_blank" rel="noopener noreferrer">
            <BookOpen className="size-5 mr-3 shrink-0" />
            <span className="font-semibold flex-1">
              {i18n.language === "it" ? "Spiegazioni approfondite"
                : i18n.language === "fr" ? "Explications approfondies"
                : i18n.language === "ar" ? "شروحات معمّقة"
                : "In-depth explanations"}
            </span>
            <ExternalLink className="size-4 opacity-60" />
          </a>
        </Button>
      </div>

      <Dialog open={emergOpen} onOpenChange={setEmergOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LifeBuoy className="size-5 text-primary" />
              {em.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {em.sections.map((s) => (
              <div key={s.h}>
                <h4 className="font-semibold text-sm">{s.h}</h4>
                <p className="text-sm text-muted-foreground">{s.b}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

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