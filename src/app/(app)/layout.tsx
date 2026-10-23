import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getFeatureFlags } from "@/lib/settings";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { AppTopbar } from "@/components/shell/app-topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const flags = await getFeatureFlags();

  return (
    <SidebarProvider>
      <AppSidebar role={session.user.role} aiSuiteEnabled={flags.aiSuiteEnabled} />
      <div className="flex min-h-screen w-full flex-col">
        <AppTopbar name={session.user.name ?? session.user.email ?? "User"} role={session.user.role} />
        <main className="flex-1 bg-muted/30 p-4 md:p-6">{children}</main>
      </div>
    </SidebarProvider>
  );
}
