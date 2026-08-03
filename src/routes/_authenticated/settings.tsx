import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SUPPORTED_LANGUAGES, applyLanguageDirection } from "@/i18n";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NotificationSettings } from "@/components/notification-settings";

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

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [challenge, setChallenge] = useState("");
  const [diary, setDiary] = useState("");
  const [diaryLocked, setDiaryLocked] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? "");
      const p = profile as { monthly_challenge_amount?: number; diary?: string | null };
      setChallenge(String(p.monthly_challenge_amount ?? 50));
      const d = p.diary ?? "";
      setDiary(d);
      setDiaryLocked(d.trim().length > 0);
    }
  }, [profile]);

  async function saveProfile() {
    const c = parseFloat(challenge.replace(",", "."));
    await supabase
      .from("profiles")
      .update({ full_name: name, monthly_challenge_amount: c > 0 ? c : 0 } as never)
      .eq("id", user.id);
    toast.success("✓");
    qc.invalidateQueries();
  }

  async function saveDiary() {
    if (diaryLocked) return;
    const text = diary.trim();
    if (!text) return;
    const { error } = await supabase
      .from("profiles")
      .update({ diary: text } as never)
      .eq("id", user.id);
    if (error) return toast.error(error.message);
    setDiaryLocked(true);
    toast.success("✓");
    qc.invalidateQueries();
  }

  async function addGoal() {
    const v = parseFloat(amount.replace(",", "."));
    if (!desc || !v || v <= 0) return;
    await supabase.from("annual_goals").insert({
      user_id: user.id,
      year,
      description: desc,
      target_amount: v,
    });
    setDesc("");
    setAmount("");
    toast.success("✓");
    qc.invalidateQueries();
  }

  async function deleteGoal(id: string) {
    await supabase.from("annual_goals").delete().eq("id", id);
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
        <div>
          <Label>{t("settings.monthlyChallenge")}</Label>
          <Input type="number" min="0" value={challenge} onChange={(e) => setChallenge(e.target.value)} />
          <p className="text-xs text-muted-foreground mt-1">{t("settings.monthlyChallengeHint")}</p>
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

      <NotificationSettings userId={user.id} userEmail={user.email ?? undefined} />

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">{t("settings.goalSection")} {year}</h2>
        {(goals ?? []).length > 0 && (
          <div className="space-y-2">
            {goals!.map((g) => (
              <div key={g.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{g.description}</div>
                  <div className="text-xs text-muted-foreground">€ {Number(g.target_amount).toFixed(2)}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteGoal(g.id)} aria-label="Delete">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2 border-t text-sm font-semibold">
              <span>{t("common.total")}</span>
              <span>€ {goalTotal.toFixed(2)}</span>
            </div>
          </div>
        )}
        <div className="space-y-3 pt-2 border-t">
          <div>
            <Label>{t("onboarding.descriptionLabel")}</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>{t("onboarding.amountLabel")}</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <Button onClick={addGoal} style={{ background: "var(--gradient-brand)" }}>
            <Plus className="size-4 mr-1" />
            {t("common.add")}
          </Button>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">{t("settings.diarySection")}</h2>
        <p className="text-xs text-muted-foreground">
          {diaryLocked ? t("settings.diarySaved") : t("settings.diaryHint")}
        </p>
        <Textarea
          value={diary}
          onChange={(e) => setDiary(e.target.value)}
          rows={6}
          placeholder={t("settings.diaryPlaceholder")}
          disabled={diaryLocked}
        />
        {!diaryLocked && (
          <Button onClick={saveDiary} disabled={!diary.trim()} variant="outline">
            {t("common.save")}
          </Button>
        )}
      </Card>
    </div>
  );
}