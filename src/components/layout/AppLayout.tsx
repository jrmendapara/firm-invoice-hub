import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-zinc-200 px-3 py-2">
            <SidebarTrigger />
          </div>
          <div className="max-w-full p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
