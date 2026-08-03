import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, BellOff, Mail } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  disablePush,
  enablePush,
  getExistingSubscription,
  isIos,
  isPushSupported,
  isStandalone,
  sendTestNotification,
} from "@/lib/push";

interface Props {
  userId: string;
  userEmail?: string | undefined;
}

export function NotificationSettings({ userId, userEmail }: Props) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState("");

  const { data: settings } = useQuery({
    queryKey: ["notification-settings", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    setEmail(settings?.email_address ?? userEmail ?? "");
  }, [settings, userEmail]);

  useEffect(() => {
    getExistingSubscription().then((s) => setSubscribed(Boolean(s)));
  }, []);

  const supported = isPushSupported();
  const showIosHint = isIos() && !isStandalone();

  async function save(patch: Record<string, unknown>) {
    const { error } = await supabase
      .from("notification_settings")
      .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
    if (error) {
      toast.error(error.message);
      return false;
    }
    qc.invalidateQueries({ queryKey: ["notification-settings", userId] });
    return true;
  }

  async function togglePush(next: boolean) {
    if (!supported) return toast.error(t("notifications.unsupported"));
    setBusy(true);
    try {
      if (next) {
        await enablePush(userId, i18n.language);
        setSubscribed(true);
        await save({ push_enabled: true });
        toast.success(t("notifications.enabled"));
      } else {
        await disablePush(userId);
        setSubscribed(false);
        await save({ push_enabled: false });
        toast.success(t("notifications.disabled"));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "error";
      toast.error(message === "denied" ? t("notifications.denied") : t("notifications.unsupported"));
    } finally {
      setBusy(false);
    }
  }

  async function toggleEmail(next: boolean) {
    const ok = await save({
      email_enabled: next,
      email_address: email.trim() || userEmail || null,
    });
    if (ok) toast.success("✓");
  }

  async function test() {
    const ok = await sendTestNotification(t("notifications.title"), t("notifications.testSent"));
    if (ok) toast.success(t("notifications.testSent"));
    else toast.error(t("notifications.denied"));
  }

  const pushOn = (settings?.push_enabled ?? false) && subscribed;

  return (
    <Card className="p-6 space-y-5">
      <div>
        <h2 className="font-semibold flex items-center gap-2">
          {pushOn ? <Bell className="size-4 text-primary" /> : <BellOff className="size-4" />}
          {t("notifications.title")}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">{t("notifications.subtitle")}</p>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Label className="text-sm">{t("notifications.push")}</Label>
          <p className="text-xs text-muted-foreground mt-1">{t("notifications.pushHint")}</p>
          {showIosHint && (
            <p className="text-xs text-[#9a3412] mt-1">{t("notifications.iosHint")}</p>
          )}
          {!supported && (
            <p className="text-xs text-destructive mt-1">{t("notifications.unsupported")}</p>
          )}
        </div>
        <Switch
          checked={pushOn}
          disabled={busy || !supported}
          onCheckedChange={togglePush}
          aria-label={t("notifications.push")}
        />
      </div>

      {pushOn && (
        <Button variant="outline" size="sm" onClick={test}>
          {t("notifications.test")}
        </Button>
      )}

      <div className="space-y-2 pt-4 border-t">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Label className="text-sm flex items-center gap-2">
              <Mail className="size-4" />
              {t("notifications.email")}
            </Label>
            <p className="text-xs text-muted-foreground mt-1">{t("notifications.emailHint")}</p>
          </div>
          <Switch
            checked={settings?.email_enabled ?? false}
            onCheckedChange={toggleEmail}
            aria-label={t("notifications.email")}
          />
        </div>
        {(settings?.email_enabled ?? false) && (
          <div className="pt-2">
            <Label className="text-xs">{t("notifications.emailAddress")}</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@email.it"
              />
              <Button
                variant="outline"
                onClick={async () => {
                  if (await save({ email_address: email.trim() || null })) toast.success("✓");
                }}
              >
                {t("common.save")}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 border-t">
        <Label className="text-sm">{t("notifications.lead")}</Label>
        <Select
          value={String(settings?.lead_minutes ?? 60)}
          onValueChange={async (v) => {
            if (await save({ lead_minutes: Number(v) })) toast.success("✓");
          }}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">{t("notifications.leadNow")}</SelectItem>
            <SelectItem value="15">{t("notifications.lead15")}</SelectItem>
            <SelectItem value="60">{t("notifications.lead60")}</SelectItem>
            <SelectItem value="180">{t("notifications.lead180")}</SelectItem>
            <SelectItem value="1440">{t("notifications.lead1440")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}