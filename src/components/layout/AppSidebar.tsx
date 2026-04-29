import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, Users, Package, Building2,
  LogOut, ChevronDown, ClipboardList, ShieldCheck, UserCog, Check,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type NavItem = {
  title: string;
  icon: LucideIcon;
  href: string;
  /** Extra path prefixes that should also mark this item active. */
  matchPrefixes?: string[];
};

type NavSection = {
  label: string;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { title: "Dashboard", icon: LayoutDashboard, href: "/" },
      { title: "Invoices", icon: FileText, href: "/invoices", matchPrefixes: ["/invoices"] },
      { title: "Sales Register", icon: ClipboardList, href: "/sales-register" },
    ],
  },
  {
    label: "Records",
    items: [
      { title: "Customers", icon: Users, href: "/customers" },
      { title: "Items", icon: Package, href: "/items" },
    ],
  },
  {
    label: "Administration",
    requireAdmin: true,
    items: [
      { title: "Companies", icon: Building2, href: "/companies" },
      { title: "Users", icon: UserCog, href: "/users" },
    ],
  },
];

function isItemActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/") return pathname === "/";
  if (pathname === item.href) return true;
  const prefixes = item.matchPrefixes ?? [item.href];
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function AppSidebar() {
  const { pathname } = useLocation();
  const { isAdmin, isSuperAdmin, profile, roles, signOut } = useAuth();
  const { companies, selectedCompany, setSelectedCompanyId } = useCompany();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const visibleSections = NAV_SECTIONS.filter((s) => {
    if (s.requireSuperAdmin && !isSuperAdmin) return false;
    if (s.requireAdmin && !isAdmin) return false;
    return true;
  });

  const roleLabel = isSuperAdmin ? "Super Admin" : isAdmin ? "Admin" : roles.length ? "User" : "Member";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/60 bg-gradient-to-b from-[#111827] to-[#0f172a] p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-600/30">
            <FileText className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span className="font-display text-lg tracking-tight text-sidebar-foreground">GST Ledger Hub</span>
          )}
        </div>

        {!collapsed && companies.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="mt-4 flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-sm text-white/90 transition-all hover:bg-white/10">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium uppercase tracking-wider text-white/50">Active Company</p>
                  <p className="truncate text-sm text-white">{selectedCompany?.name || "Select Company"}</p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 rounded-lg border-border bg-popover">
              {companies.map(c => (
                <DropdownMenuItem key={c.id} onClick={() => setSelectedCompanyId(c.id)} className="flex items-center justify-between gap-2">
                  <span className="truncate">{c.name}</span>
                  {selectedCompany?.id === c.id && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarHeader>

      <SidebarContent className="bg-gradient-to-b from-[#111827] via-[#0f172a] to-[#0b1220]">
        {visibleSections.map((section) => (
          <SidebarGroup key={section.label}>
            {!collapsed && (
              <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/55">
                {section.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const active = isItemActive(pathname, item);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className={cn(
                          "relative h-10 rounded-xl px-3 text-[14px] text-sidebar-foreground/85 transition-colors hover:bg-white/10 hover:text-white",
                          "data-[active=true]:bg-gradient-to-r data-[active=true]:from-blue-600/80 data-[active=true]:to-indigo-600/80 data-[active=true]:text-white data-[active=true]:shadow-md data-[active=true]:shadow-blue-900/30",
                        )}
                      >
                        <NavLink to={item.href} end={item.href === "/"}>
                          {active && (
                            <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-white/90" aria-hidden />
                          )}
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60 bg-[#0b1220] p-4">
        <div className={cn(
          "flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2",
          collapsed ? "justify-center" : "justify-between",
        )}>
          {collapsed ? (
            <button
              onClick={signOut}
              className="rounded-md p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          ) : (
            <>
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-semibold text-white">
                  {(profile?.full_name || profile?.email || "U").trim().charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white">
                    {profile?.full_name || profile?.email || "User"}
                  </p>
                  <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-white/60">
                    {(isAdmin || isSuperAdmin) && <ShieldCheck className="h-3 w-3" />}
                    {roleLabel}
                  </p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="shrink-0 rounded-md p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
