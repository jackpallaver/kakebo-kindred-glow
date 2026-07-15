import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Wallet,
  LineChart,
  Calendar,
  Lightbulb,
  Settings,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar({ isOperator }: { isOperator: boolean }) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isMobile, setOpenMobile } = useSidebar();
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const items = [
    { to: "/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") },
    { to: "/transactions", icon: Wallet, label: t("nav.transactions") },
    { to: "/forecast", icon: LineChart, label: t("nav.forecast") },
    { to: "/calendar", icon: Calendar, label: t("nav.calendar") },
    { to: "/tips", icon: Lightbulb, label: t("nav.tips") },
    { to: "/settings", icon: Settings, label: t("nav.settings") },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-3">
          <div
            className="size-8 rounded-lg flex items-center justify-center text-primary-foreground font-bold text-lg"
            style={{ background: "var(--gradient-brand)" }}
          >
            家
          </div>
          <div className="font-display font-semibold text-lg">Kakebo</div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("common.appName")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={pathname === item.to}>
                    <Link to={item.to} className="flex items-center gap-2" onClick={closeOnMobile}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isOperator && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("nav.operator")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/operator")}>
                    <Link to="/operator/users" className="flex items-center gap-2" onClick={closeOnMobile}>
                      <Users className="size-4" />
                      <span>{t("nav.operatorUsers")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}