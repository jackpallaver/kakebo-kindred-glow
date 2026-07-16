import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Trash2, CalendarClock } from "lucide-react";
import { it as itLocale, enUS, fr as frLocale, ar as arLocale } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as ShadCalendar } from "@/components/ui/calendar";
import { InfoTooltip } from "@/components/info-tooltip";

export const Route = createFileRoute("/_authenticated/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  const { t, i18n } = useTranslation();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Date | undefined>(new Date());

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

  const daysWithEvents = (events ?? []).map((e) => new Date(e.date));

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          {t("calendar.title")}
          <InfoTooltip text={t("calendar.tooltip")} />
        </h1>
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