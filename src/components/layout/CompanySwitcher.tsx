import { Building2, Check, ChevronDown } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface CompanySwitcherProps {
  /** Visual style. "topbar" sits in the app header; "sidebar" sits inside the dark sidebar. */
  variant?: "topbar" | "sidebar";
  className?: string;
  /** Hide entirely when the user has only one accessible company. Default true. */
  hideWhenSingle?: boolean;
}

export function CompanySwitcher({
  variant = "topbar",
  className,
  hideWhenSingle = true,
}: CompanySwitcherProps) {
  const { companies, selectedCompany, setSelectedCompanyId } = useCompany();

  if (companies.length === 0) return null;
  if (hideWhenSingle && companies.length < 2) return null;

  const isSidebar = variant === "sidebar";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-lg text-left text-sm transition-colors",
            isSidebar
              ? "w-full justify-between border border-white/10 bg-white/5 px-3 py-2.5 text-white/90 hover:bg-white/10"
              : "h-9 max-w-[260px] border border-border bg-card px-2.5 text-foreground shadow-sm hover:bg-accent",
            className,
          )}
          aria-label="Select active company"
        >
          {!isSidebar && <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />}
          <div className="min-w-0 flex-1">
            {isSidebar && (
              <p className="truncate text-[11px] font-medium uppercase tracking-wider text-white/50">
                Active Company
              </p>
            )}
            <p className={cn("truncate", isSidebar ? "text-sm text-white" : "text-sm font-medium")}>
              {selectedCompany?.name || "Select Company"}
            </p>
          </div>
          <ChevronDown className={cn("h-4 w-4 shrink-0", isSidebar ? "opacity-70" : "text-muted-foreground")} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isSidebar ? "start" : "end"} className="w-72">
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Switch company ({companies.length})
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {companies.map((c) => {
          const active = selectedCompany?.id === c.id;
          return (
            <DropdownMenuItem
              key={c.id}
              onClick={() => setSelectedCompanyId(c.id)}
              className="flex items-start justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.name}</p>
                {c.gstin && (
                  <p className="truncate font-mono text-[11px] text-muted-foreground">{c.gstin}</p>
                )}
              </div>
              {active && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}