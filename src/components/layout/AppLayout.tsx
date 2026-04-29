import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet, useLocation } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/invoices": "Invoices",
  "/invoices/new": "New Invoice",
  "/customers": "Customers",
  "/items": "Items",
  "/sales-register": "Sales Register",
  "/companies": "Companies",
  "/users": "Users",
};

function getTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith("/invoices/")) return pathname.endsWith("/edit") ? "Edit Invoice" : "Invoice";
  return "";
}

export function AppLayout() {
  const { pathname } = useLocation();
  const { selectedCompany } = useCompany();
  const title = getTitle(pathname);

  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full overflow-x-hidden bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-card/80 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/70 md:px-6">
            <SidebarTrigger />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold text-foreground sm:text-base">{title}</h2>
            </div>
            {selectedCompany && (
              <div className="hidden truncate text-xs text-muted-foreground sm:block">
                {selectedCompany.name}
              </div>
            )}
          </header>
          <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
