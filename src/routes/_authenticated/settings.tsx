import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SUPPORTED_LANGUAGES, applyLanguageDirection } from "@/i18n";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const year = new Date().getFullYear();

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const { data: goal } = useQuery({
    queryKey: ["goal", user.id, year],
    queryFn: async () => {
      const { data } = await supabase
        .from("annual_goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("year", year)
        .maybeSingle();
      return data;
    },
  });

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (profile) setName(profile.full_name ?? "");
  }, [profile]);
  useEffect(() => {
    if (goal) {
      setDesc(goal.description ?? "");
      setAmount(String(goal.target_amount ?? ""));
    }
  }, [goal]);

  async function saveProfile() {
    await supabase.from("profiles").update({ full_name: name }).eq("id", user.id);
    toast.success("✓");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  async function saveGoal() {
    const v = parseFloat(amount.replace(",", "."));
    await supabase.from("annual_goals").upsert({
      user_id: user.id,
      year,
      description: desc,
      target_amount: v || 0,
    });
    toast.success("✓");
    qc.invalidateQueries();
  }

  async function changeLang(code: string) {
    await i18n.changeLanguage(code);
    applyLanguageDirection(code);
    await supabase.from("profiles").update({ language: code as never }).eq("id", user.id);
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-display font-bold">{t("settings.title")}</h1>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">{t("settings.profile")}</h2>
        <div>
          <Label>{t("common.fullName")}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button onClick={saveProfile} variant="outline">{t("common.save")}</Button>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">{t("settings.languageSection")}</h2>
        <Select value={i18n.language} onValueChange={changeLang}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {SUPPORTED_LANGUAGES.map((l) => (
              <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">{t("settings.goalSection")} {year}</h2>
        <div>
          <Label>{t("onboarding.descriptionLabel")}</Label>
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
        </div>
        <div>
          <Label>{t("onboarding.amountLabel")}</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <Button onClick={saveGoal} style={{ background: "var(--gradient-brand)" }}>{t("common.save")}</Button>
      </Card>
    </div>
  );
}