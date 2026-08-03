import { createFileRoute } from "@tanstack/react-router";
import { sendWebPush } from "@/lib/web-push.server";
import { sendReminderEmail } from "@/lib/notify-email.server";

const WINDOW_BEFORE_MS = 30 * 60 * 1000; // catch-up window for missed runs
const WINDOW_AFTER_MS = 5 * 60 * 1000; // scheduler interval

const TEXT: Record<string, { title: string; at: string }> = {
  it: { title: "Promemoria Kakebo", at: "Scadenza" },
  en: { title: "Kakebo reminder", at: "Due" },
  fr: { title: "Rappel Kakebo", at: "Échéance" },
  ar: { title: "تذكير كاكيبو", at: "الموعد" },
};

function reminderTime(event: { date: string; reminder_at: string | null }): number {
  return event.reminder_at
    ? new Date(event.reminder_at).getTime()
    : new Date(`${event.date}T09:00:00`).getTime();
}

export const Route = createFileRoute("/api/public/hooks/send-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        if (!apikey || apikey !== process.env["SUPABASE_ANON_KEY"]) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = Date.now();
        const todayIso = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        const { data: events, error } = await supabaseAdmin
          .from("calendar_events")
          .select("id, user_id, title, date, reminder_at, note")
          .gte("date", todayIso);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const due = (events ?? []).filter((e) => {
          const t = reminderTime(e);
          return t <= now + WINDOW_AFTER_MS && t >= now - WINDOW_BEFORE_MS;
        });
        if (due.length === 0) {
          return new Response(JSON.stringify({ ok: true, due: 0 }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        const userIds = [...new Set(due.map((e) => e.user_id))];
        const [{ data: settings }, { data: subs }, { data: sent }] = await Promise.all([
          supabaseAdmin.from("notification_settings").select("*").in("user_id", userIds),
          supabaseAdmin.from("push_subscriptions").select("*").in("user_id", userIds),
          supabaseAdmin
            .from("notification_deliveries")
            .select("event_id, channel")
            .in(
              "event_id",
              due.map((e) => e.id),
            ),
        ]);

        const alreadySent = new Set((sent ?? []).map((d) => `${d.event_id}:${d.channel}`));
        let pushCount = 0;
        let emailCount = 0;

        for (const event of due) {
          const pref = (settings ?? []).find((s) => s.user_id === event.user_id);
          if (!pref) continue;

          const lead = (pref.lead_minutes ?? 0) * 60 * 1000;
          const when = reminderTime(event) - lead;
          if (when > now + WINDOW_AFTER_MS || when < now - WINDOW_BEFORE_MS) continue;

          const userSubs = (subs ?? []).filter((s) => s.user_id === event.user_id);
          const lang = userSubs[0]?.language ?? "it";
          const copy = TEXT[lang] ?? TEXT["it"]!;
          const whenLabel = new Date(reminderTime(event)).toLocaleString(lang);

          if (pref.push_enabled && userSubs.length && !alreadySent.has(`${event.id}:push`)) {
            let delivered = false;
            for (const sub of userSubs) {
              try {
                const res = await sendWebPush(sub, {
                  title: copy.title,
                  body: `${event.title} — ${copy.at}: ${whenLabel}`,
                  url: "/calendar",
                  tag: `event-${event.id}`,
                });
                if (res.ok) delivered = true;
                if (res.expired) {
                  await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
                }
              } catch (err) {
                console.error("[reminders] push failed", err);
              }
            }
            if (delivered) {
              pushCount++;
              await supabaseAdmin
                .from("notification_deliveries")
                .insert({ user_id: event.user_id, event_id: event.id, channel: "push" });
            }
          }

          if (pref.email_enabled && pref.email_address && !alreadySent.has(`${event.id}:email`)) {
            const result = await sendReminderEmail({
              to: pref.email_address,
              title: event.title,
              whenLabel,
              note: event.note,
              language: lang,
            });
            if (result.sent) {
              emailCount++;
              await supabaseAdmin
                .from("notification_deliveries")
                .insert({ user_id: event.user_id, event_id: event.id, channel: "email" });
            }
          }
        }

        return new Response(
          JSON.stringify({ ok: true, due: due.length, push: pushCount, email: emailCount }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});