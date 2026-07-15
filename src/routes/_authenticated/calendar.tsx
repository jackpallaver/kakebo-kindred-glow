import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as ShadCalendar } from "@/components/ui/calendar";
import { InfoTooltip } from "@/components/info-tooltip";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

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

  async function add() {
    if (!title) return;
    const { error } = await supabase.from("calendar_events").insert({
      user_id: user.id,
      title,
      date,
      note: note || null,
    });
    if (error) return toast.error(error.message);
    toast.success("✓");
    setOpen(false);
    setTitle("");
    setNote("");
    qc.invalidateQueries({ queryKey: ["events"] });
  }

  async function del(id: string) {
    await supabase.from("calendar_events").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["events"] });
  }

  const daysWithEvents = (events ?? []).map((e) => new Date(e.date));

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            {t("calendar.title")}
            <InfoTooltip text={t("calendar.tooltip")} />
          </h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button style={{ background: "var(--gradient-brand)" }}>
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
                <Label>{t("common.note")}</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={add}>{t("common.save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
          <ShadCalendar
            mode="single"
            selected={selected}
            onSelect={setSelected}
            modifiers={{ hasEvent: daysWithEvents }}
            modifiersClassNames={{ hasEvent: "font-bold text-primary underline" }}
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