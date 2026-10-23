"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Landmark,
  Settings,
  Sparkles,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { AppRole } from "@/types/next-auth";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: AppRole[];
}

const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/investments", label: "Investments", icon: Landmark },
];

export function AppSidebar({ role, aiSuiteEnabled }: { role: AppRole; aiSuiteEnabled: boolean }) {
  const pathname = usePathname();

  const settingsNav: NavItem[] = [
    { href: "/settings", label: "Rates & Rules", icon: Settings, roles: ["ADMIN", "SUPER_ADMIN"] },
    { href: "/settings/users", label: "Users", icon: UserCog, roles: ["ADMIN", "SUPER_ADMIN"] },
    { href: "/settings/platform", label: "Platform", icon: ShieldCheck, roles: ["SUPER_ADMIN"] },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold">
            SD
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">Sirah Digital</span>
            <span className="text-xs text-sidebar-foreground/60">Commodity Trading Desk</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {PRIMARY_NAV.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.label}>
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {aiSuiteEnabled && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/assistant")} tooltip="AI Assistant">
                    <Link href="/assistant">
                      <Sparkles className="size-4" />
                      <span>AI Assistant</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(role === "ADMIN" || role === "SUPER_ADMIN") && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsNav
                  .filter((item) => !item.roles || item.roles.includes(role))
                  .map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.label}>
                        <Link href={item.href}>
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-1 text-xs text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden">
          © {new Date().getFullYear()} Sirah Digital
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
