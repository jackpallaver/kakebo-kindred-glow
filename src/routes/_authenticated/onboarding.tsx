import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const { t } = useTranslation();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount.replace(",", "."));
    if (!description || !value || value <= 0) return;
    setSaving(true);
    const { error } = await supabase.from("annual_goals").upsert({
      user_id: user.id,
      year: new Date().getFullYear(),
      description,
      target_amount: value,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("🎯");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-full flex items-center justify-center p-6" style={{ background: "var(--gradient-soft)" }}>
      <Card className="w-full max-w-lg p-8 space-y-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="space-y-2">
          <div className="text-4xl">🎯</div>
          <h1 className="text-2xl font-display font-bold">{t("onboarding.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("onboarding.subtitle")}</p>
        </div>
        <form onSubmit={save} className="space-y-4">
          <div>
            <Label>{t("onboarding.descriptionLabel")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("onboarding.descriptionPlaceholder")}
              rows={3}
              required
            />
          </div>
          <div>
            <Label>{t("onboarding.amountLabel")}</Label>
            <Input
              type="number"
              step="0.01"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t("onboarding.amountPlaceholder")}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving} style={{ background: "var(--gradient-brand)" }}>
            {t("onboarding.save")}
          </Button>
        </form>
      </Card>
    </div>
  );
}