import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { Trash2, CalendarClock, Plus, Bell } from "lucide-react";
import { it as itLocale, enUS, fr as frLocale, ar as arLocale } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as ShadCalendar } from "@/components/ui/calendar";
import { InfoTooltip } from "@/components/info-tooltip";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  const { t, i18n } = useTranslation();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reminderAt, setReminderAt] = useState("");
  const [note, setNote] = useState("");
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied",
  );

  const locale =
    i18n.language === "it" ? itLocale
    : i18n.language === "fr" ? frLocale
    : i18n.language === "ar" ? arLocale
    : enUS;

  const { data: events } = useQuery({
    queryKey: ["events", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: true });
      return data ?? [];
    },
  });

  async function del(id: string) {
    await supabase.from("calendar_events").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["events"] });
  }

  async function addEvent() {
    if (!title.trim() || !date) return;
    const { error } = await supabase.from("calendar_events").insert({
      user_id: user.id,
      title: title.trim(),
      date,
      reminder_at: reminderAt ? new Date(reminderAt).toISOString() : null,
      note: note || null,
    });
    if (error) return toast.error(error.message);
    toast.success("✓");
    setOpen(false);
    setTitle(""); setNote(""); setReminderAt("");
    qc.invalidateQueries({ queryKey: ["events"] });
  }

  async function enableNotifications() {
    if (typeof Notification === "undefined") {
      toast.error(t("calendar.notificationsBlocked"));
      return;
    }
    const p = await Notification.requestPermission();
    setNotifPerm(p);
    if (p === "granted") toast.success(t("calendar.notificationsOn"));
    else toast.error(t("calendar.notificationsBlocked"));
  }

  // Schedule in-page notifications for upcoming reminders while page is open
  const timers = useRef<number[]>([]);
  useEffect(() => {
    timers.current.forEach((id) => clearTimeout(id));
    timers.current = [];
    if (notifPerm !== "granted" || !events) return;
    const now = Date.now();
    const shownKey = "kakebo_notif_shown";
    const shown = new Set<string>(JSON.parse(sessionStorage.getItem(shownKey) ?? "[]"));
    events.forEach((e) => {
      const when = e.reminder_at ? new Date(e.reminder_at).getTime() : new Date(e.date + "T09:00").getTime();
      const delay = when - now;
      if (shown.has(e.id)) return;
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
        const id = window.setTimeout(() => {
          try {
            new Notification(t("calendar.notifTitle"), { body: e.title });
          } catch { /* ignore */ }
          shown.add(e.id);
          sessionStorage.setItem(shownKey, JSON.stringify([...shown]));
        }, delay);
        timers.current.push(id);
      } else if (delay <= 0 && delay > -6 * 60 * 60 * 1000) {
        try {
          new Notification(t("calendar.notifTitle"), { body: e.title });
        } catch { /* ignore */ }
        shown.add(e.id);
        sessionStorage.setItem(shownKey, JSON.stringify([...shown]));
      }
    });
    return () => { timers.current.forEach((id) => clearTimeout(id)); };
  }, [events, notifPerm, t]);

  const daysWithEvents = (events ?? []).map((e) => new Date(e.date));

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          {t("calendar.title")}
          <InfoTooltip text={t("calendar.tooltip")} />
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={enableNotifications}
            disabled={notifPerm === "granted"}
          >
            <Bell className="size-4 mr-2" />
            {notifPerm === "granted" ? t("calendar.notificationsOn") : t("calendar.enableNotifications")}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" style={{ background: "var(--gradient-brand)" }}>
                <Plus className="size-4 mr-2" />
                {t("calendar.add")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("calendar.add")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>{t("calendar.titleLabel")}</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                  <Label>{t("common.date")}</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <Label>{t("calendar.reminderLabel")}</Label>
                  <Input type="datetime-local" value={reminderAt} onChange={(e) => setReminderAt(e.target.value)} />
                </div>
                <div>
                  <Label>{t("common.note")}</Label>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
                <Button onClick={addEvent}>{t("common.save")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
          <ShadCalendar
            mode="single"
            selected={selected}
            onSelect={setSelected}
            locale={locale}
            modifiers={{ hasEvent: daysWithEvents }}
            modifiersClassNames={{
              hasEvent:
                "[&>button]:rounded-full [&>button]:border-2 [&>button]:border-[#9a3412] [&>button]:text-[#9a3412] [&>button]:font-bold",
            }}
            className="pointer-events-auto"
          />
        </Card>

        <Card className="p-6 space-y-3">
          <h3 className="font-semibold">{t("calendar.upcoming")}</h3>
          {!events?.length ? (
            <p className="text-sm text-muted-foreground">{t("calendar.empty")}</p>
          ) : (
            <div className="space-y-2">
              {events.map((e) => (
                <div key={e.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <CalendarClock className="size-4 text-primary" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{e.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(e.date).toLocaleDateString(i18n.language)}
                      {e.note ? ` · ${e.note}` : ""}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => del(e.id)} aria-label="Delete">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}