/**
 * Email reminders — pre-wired.
 *
 * Sending app emails requires a verified sender domain on the project.
 * Until one is configured this helper is a no-op, so the reminder pipeline
 * keeps working with push only. Once a domain is connected, scaffold the
 * app-email templates and replace the body of `sendReminderEmail` with a
 * call to `sendTemplateEmail('deadline-reminder', to, { templateData })`.
 */

export interface ReminderEmailInput {
  to: string;
  title: string;
  whenLabel: string;
  note?: string | null;
  language?: string;
}

export type ReminderEmailResult =
  | { sent: true }
  | { sent: false; reason: "email_not_configured" | "recipient_suppressed" | "error" };

function emailConfigured(): boolean {
  // Set once a verified sender domain exists for the project.
  return Boolean(process.env["REMINDER_EMAIL_ENABLED"]);
}

export async function sendReminderEmail(input: ReminderEmailInput): Promise<ReminderEmailResult> {
  if (!emailConfigured()) {
    console.log("[reminders] email skipped (no sender domain configured):", input.to);
    return { sent: false, reason: "email_not_configured" };
  }

  try {
    // Resolved at runtime only: the module exists once app-email templates
    // have been scaffolded against a verified sender domain.
    const modulePath = "@/lib/email-templates/send-email";
    const mod = (await import(/* @vite-ignore */ modulePath)) as {
      sendTemplateEmail: (
        name: string,
        to: string,
        opts: { templateData?: Record<string, unknown>; idempotencyKey?: string },
      ) => Promise<{ sent: boolean; reason?: string }>;
    };
    const { sendTemplateEmail } = mod;

    const result = await sendTemplateEmail("deadline-reminder", input.to, {
      templateData: {
        title: input.title,
        whenLabel: input.whenLabel,
        note: input.note ?? undefined,
        language: input.language ?? "it",
      },
      idempotencyKey: `reminder-${input.to}-${input.title}-${input.whenLabel}`,
    });

    if (result.sent) return { sent: true };
    return { sent: false, reason: "recipient_suppressed" };
  } catch (error) {
    console.error("[reminders] email send failed", error);
    return { sent: false, reason: "error" };
  }
}