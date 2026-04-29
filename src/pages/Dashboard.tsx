import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { formatINR, formatDate } from "@/lib/indian-states";
import { FileText, Plus, Users, IndianRupee, FileClock, Package, ClipboardList, Building2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";

interface DashboardStats {
  totalInvoices: number;
  totalSales: number;
  totalTax: number;
  pendingDrafts: number;
}

export default function Dashboard() {
  const { selectedCompany } = useCompany();
  const [stats, setStats] = useState<DashboardStats>({ totalInvoices: 0, totalSales: 0, totalTax: 0, pendingDrafts: 0 });
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedCompany) return;

    const fetchStats = async () => {
      const [invoicesRes, draftsRes, recentRes] = await Promise.all([
        supabase.from("invoices").select("total_amount, total_tax").eq("company_id", selectedCompany.id).eq("status", "final"),
        supabase.from("invoices").select("id", { count: "exact" }).eq("company_id", selectedCompany.id).eq("status", "draft"),
        supabase.from("invoices").select("*, customers(trade_name)").eq("company_id", selectedCompany.id).order("created_at", { ascending: false }).limit(5),
      ]);

      const invoices = invoicesRes.data || [];
      setStats({
        totalInvoices: invoices.length,
        totalSales: invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0),
        totalTax: invoices.reduce((sum, i) => sum + (i.total_tax || 0), 0),
        pendingDrafts: draftsRes.count || 0,
      });
      setRecentInvoices(recentRes.data || []);
    };

    fetchStats();
  }, [selectedCompany]);

  if (!selectedCompany) {
    return (
      <Card>
        <EmptyState
          icon={Building2}
          title="No company selected"
          description="Select an existing company from the sidebar or create your first one to get started."
          action={
            <Button asChild>
              <Link to="/companies"><Plus className="mr-2 h-4 w-4" />Manage Companies</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  const statCards = [
    { label: "Total Invoices", value: stats.totalInvoices, icon: FileText, accent: "blue" },
    { label: "Total Sales", value: formatINR(stats.totalSales), icon: IndianRupee, accent: "emerald" },
    { label: "GST Collected", value: formatINR(stats.totalTax), icon: IndianRupee, accent: "violet" },
    { label: "Pending Drafts", value: stats.pendingDrafts, icon: FileClock, accent: "amber" },
  ] as const;

  const accentBg: Record<string, string> = {
    blue: "bg-[hsl(var(--accent-blue)/0.12)] text-[hsl(var(--accent-blue))]",
    emerald: "bg-[hsl(var(--accent-emerald)/0.12)] text-[hsl(var(--accent-emerald))]",
    violet: "bg-[hsl(var(--accent-violet)/0.12)] text-[hsl(var(--accent-violet))]",
    amber: "bg-[hsl(var(--accent-amber)/0.15)] text-[hsl(var(--accent-amber))]",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={selectedCompany.name}
        description={`GSTIN: ${selectedCompany.gstin || "N/A"}`}
        actions={
          <Button asChild>
            <Link to="/invoices/new"><Plus className="mr-2 h-4 w-4" />New Invoice</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${accentBg[s.accent]}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className="mt-1 truncate text-xl font-semibold tabular-nums text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/invoices/new"><Plus className="mr-2 h-4 w-4" />New Invoice</Link></Button>
          <Button asChild variant="outline"><Link to="/customers"><Users className="mr-2 h-4 w-4" />Add Customer</Link></Button>
          <Button asChild variant="outline"><Link to="/items"><Package className="mr-2 h-4 w-4" />Add Item</Link></Button>
          <Button asChild variant="outline"><Link to="/sales-register"><ClipboardList className="mr-2 h-4 w-4" />Sales Register</Link></Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Invoices</CardTitle>
            <Link to="/invoices" className="text-sm font-medium text-primary hover:underline">View all</Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentInvoices.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No invoices yet"
              description="Create your first invoice to see it here."
              action={<Button asChild><Link to="/invoices/new"><Plus className="mr-2 h-4 w-4" />New Invoice</Link></Button>}
            />
          ) : (
            <div className="space-y-3">
              {recentInvoices.map(inv => (
                <Link
                  key={inv.id}
                  to={`/invoices/${inv.id}`}
                  className="flex flex-col gap-2 rounded-lg border border-border/70 p-3 transition-colors hover:border-primary/30 hover:bg-accent/60 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{inv.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">{inv.customers?.trade_name} • {formatDate(inv.invoice_date)}</p>
                  </div>
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                    <p className="font-medium tabular-nums">{formatINR(inv.total_amount)}</p>
                    <StatusBadge status={inv.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

