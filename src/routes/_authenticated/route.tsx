import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { QuickAddDialog } from "@/components/quick-add-dialog";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hideQuickAdd = pathname === "/settings" || pathname === "/forecast";

  const { data: roles } = useQuery({
    queryKey: ["roles", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      return data?.map((r) => r.role) ?? [];
    },
  });
  const isOperator = roles?.includes("operator") ?? false;

  const { data: goal } = useQuery({
    queryKey: ["goal", user.id, new Date().getFullYear()],
    queryFn: async () => {
      const { data } = await supabase
        .from("annual_goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("year", new Date().getFullYear())
        .maybeSingle();
      return data;
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("👋");
    navigate({ to: "/auth", replace: true });
  }

  // If not onboarded, redirect
  if (goal === null && window.location.pathname !== "/onboarding") {
    // no redirect here - handled by dashboard
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar isOperator={isOperator} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b flex items-center justify-between px-4 bg-card/50 backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="size-10 border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 rounded-md [&_svg]:size-5" />
              <Link to="/dashboard" className="font-display font-semibold">
                Kakebo
              </Link>
            </div>
            <div className="flex items-center gap-2">
              {!hideQuickAdd && (
                <div className="hidden md:block">
                  <QuickAddDialog userId={user.id} />
                </div>
              )}
              <LanguageSwitcher userId={user.id} />
              <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
                <LogOut className="size-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
          {!hideQuickAdd && (
            <div className="md:hidden fixed bottom-4 right-4 z-40">
              <QuickAddDialog userId={user.id} />
            </div>
          )}
        </div>
      </div>
    </SidebarProvider>
  );
}