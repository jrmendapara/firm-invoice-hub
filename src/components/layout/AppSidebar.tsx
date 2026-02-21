import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, Users, Package, Building2,
  Settings, LogOut, ChevronDown, ClipboardList,
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
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <FileText className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <span className="font-display text-lg text-sidebar-foreground">GST Invoice</span>
        </div>
        {companies.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="mt-3 flex w-full items-center justify-between rounded-md border border-sidebar-border bg-sidebar-accent px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/80">
                <span className="truncate">{selectedCompany?.name || "Select Company"}</span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {companies.map(c => (
                <DropdownMenuItem key={c.id} onClick={() => setSelectedCompanyId(c.id)}>
                  {c.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map(item => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
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
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNav.map(item => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname === item.href}>
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
      <SidebarFooter className="p-4">
        <div className="flex items-center justify-between">
          <div className="truncate text-sm text-sidebar-foreground">
            {profile?.full_name || profile?.email || "User"}
          </div>
          <button onClick={signOut} className="rounded-md p-1.5 text-sidebar-foreground hover:bg-sidebar-accent">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
