import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Copy, Mail, Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function InviteManager({ operatorId }: { operatorId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [role, setRole] = useState<"user" | "operator">("user");

  const signUpLink =
    typeof window !== "undefined" ? `${window.location.origin}/auth` : "";

  const { data: invites } = useQuery({
    queryKey: ["invitations", operatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("invitations").insert({
        email: email.trim().toLowerCase(),
        role,
        note: note.trim() || null,
        invited_by: operatorId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setEmail("");
      setNote("");
      toast.success(t("operator.inviteCreated"));
      qc.invalidateQueries({ queryKey: ["invitations", operatorId] });
    },
    onError: (e: { code?: string; message: string }) => {
      toast.error(e.code === "23505" ? t("operator.inviteExists") : e.message);
    },
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invitations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("operator.inviteRevoked"));
      qc.invalidateQueries({ queryKey: ["invitations", operatorId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function mailtoHref(to: string) {
    const subject = encodeURIComponent(t("operator.inviteMailSubject"));
    const body = encodeURIComponent(t("operator.inviteMailBody", { link: signUpLink }));
    return `mailto:${to}?subject=${subject}&body=${body}`;
  }

  return (
    <div className="space-y-4">
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="size-5 text-primary" />
          <h2 className="font-semibold">{t("operator.inviteTitle")}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{t("operator.inviteHint")}</p>

        <form
          className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return;
            create.mutate();
          }}
        >
          <div>
            <Label>{t("operator.inviteEmail")}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@email.it"
              required
            />
          </div>
          <div>
            <Label>{t("operator.inviteRole")}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "user" | "operator")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">{t("operator.roleUser")}</SelectItem>
                <SelectItem value="operator">{t("operator.roleOperator")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={create.isPending}>
            {t("operator.inviteSend")}
          </Button>
        </form>
        <div>
          <Label>{t("operator.inviteNote")}</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </Card>

      <Card className="divide-y">
        <div className="p-4 font-semibold">{t("operator.invites")}</div>
        {!invites?.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {t("operator.inviteEmpty")}
          </div>
        ) : (
          invites.map((inv) => (
            <div key={inv.id} className="p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[12rem]">
                <div className="font-medium break-all">{inv.email}</div>
                <div className="text-xs text-muted-foreground">
                  {inv.role === "operator" ? t("operator.roleOperator") : t("operator.roleUser")}
                  {inv.note ? ` · ${inv.note}` : ""}
                </div>
              </div>
              <Badge variant={inv.status === "accepted" ? "default" : "outline"}>
                {inv.status === "accepted"
                  ? t("operator.inviteAccepted")
                  : t("operator.invitePending")}
              </Badge>
              {inv.status === "pending" && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("operator.inviteCopy")}
                    onClick={() => {
                      navigator.clipboard.writeText(signUpLink);
                      toast.success(t("operator.inviteCopied"));
                    }}
                  >
                    <Copy className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" asChild aria-label={t("operator.inviteMail")}>
                    <a href={mailtoHref(inv.email)}>
                      <Mail className="size-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("operator.inviteRevoke")}
                    onClick={() => revoke.mutate(inv.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </Card>
    </div>
  );
}