import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Users, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InviteManager } from "@/components/invite-manager";

export const Route = createFileRoute("/_authenticated/operator/users")({
  component: OperatorUsersPage,
});

function OperatorUsersPage() {
  const { t } = useTranslation();
  const { user } = Route.useRouteContext();

  const { data: assignments } = useQuery({
    queryKey: ["assignments", user.id],
    queryFn: async () => {
      const { data: as } = await supabase
        .from("operator_assignments")
        .select("user_id")
        .eq("operator_id", user.id);
      if (!as?.length) return [];
      const ids = as.map((a) => a.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, language")
        .in("id", ids);
      return profiles ?? [];
    },
  });

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Users className="size-6 text-primary" />
        <h1 className="text-2xl font-display font-bold">{t("operator.title")}</h1>
        <Badge variant="outline">{t("operator.readOnly")}</Badge>
      </div>

      {!assignments?.length ? (
        <Card className="p-12 text-center text-muted-foreground">{t("operator.empty")}</Card>
      ) : (
        <Card className="divide-y">
          {assignments.map((u) => (
            <Link
              key={u.id}
              to="/operator/users/$userId"
              params={{ userId: u.id }}
              className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors"
            >
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                {(u.full_name ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-medium">{u.full_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground uppercase">{u.language}</div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </Card>
      )}

      <InviteManager operatorId={user.id} />
    </div>
  );
}