import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, Users, Package, Building2,
  LogOut, ChevronDown, ClipboardList,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mainNav = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/" },
  { title: "Invoices", icon: FileText, href: "/invoices" },
  { title: "Customers", icon: Users, href: "/customers" },
  { title: "Items", icon: Package, href: "/items" },
  { title: "Sales Register", icon: ClipboardList, href: "/sales-register" },
];

const adminNav = [
  { title: "Companies", icon: Building2, href: "/companies" },
  { title: "Users", icon: Users, href: "/users" },
];

export function AppSidebar() {
  const { pathname } = useLocation();
  const { isAdmin, profile, signOut } = useAuth();
  const { companies, selectedCompany, setSelectedCompanyId } = useCompany();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border/60 bg-gradient-to-b from-[#111827] to-[#0f172a] p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-600/30">
            <FileText className="h-4 w-4 text-white" />
          </div>
          <span className="font-display text-lg tracking-tight text-sidebar-foreground">GST Ledger Hub</span>
        </div>

        {companies.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="mt-4 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/90 transition-all hover:bg-white/10">
                <span className="truncate">{selectedCompany?.name || "Select Company"}</span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 rounded-lg border-zinc-300 bg-white">
              {companies.map(c => (
                <DropdownMenuItem key={c.id} onClick={() => setSelectedCompanyId(c.id)}>
                  {c.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarHeader>

      <SidebarContent className="bg-gradient-to-b from-[#111827] via-[#0f172a] to-[#0b1220]">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 font-semibold uppercase tracking-wider text-sidebar-foreground/60">Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map(item => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    className="h-10 rounded-xl px-3 text-[14px] text-sidebar-foreground/90 data-[active=true]:bg-gradient-to-r data-[active=true]:from-blue-600/70 data-[active=true]:to-indigo-600/70 data-[active=true]:text-white data-[active=true]:shadow-md hover:bg-white/10"
                  >
                    <Link to={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 font-semibold uppercase tracking-wider text-sidebar-foreground/60">Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNav.map(item => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      className="h-10 rounded-xl px-3 text-[14px] text-sidebar-foreground/90 data-[active=true]:bg-gradient-to-r data-[active=true]:from-blue-600/70 data-[active=true]:to-indigo-600/70 data-[active=true]:text-white data-[active=true]:shadow-md hover:bg-white/10"
                    >
                      <Link to={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60 bg-[#0b1220] p-4">
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-2 py-2">
          <div className="truncate text-xs font-medium uppercase tracking-wide text-white/85">
            {profile?.full_name || profile?.email || "User"}
          </div>
          <button onClick={signOut} className="rounded-md p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
