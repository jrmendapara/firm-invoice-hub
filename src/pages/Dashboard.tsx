import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { formatINR, formatDate } from "@/lib/indian-states";
import { FileText, Plus, Users, Download, IndianRupee, FileClock } from "lucide-react";

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
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Building2Icon className="mx-auto mb-4 h-12 w-12" />
          <p className="text-lg">No company selected. Please select or create a company.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display text-foreground">{selectedCompany.name}</h1>
          <p className="text-sm text-muted-foreground">GSTIN: {selectedCompany.gstin || "N/A"}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/invoices/new"><Plus className="mr-2 h-4 w-4" />New Invoice</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvoices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(stats.totalSales)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">GST Collected</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(stats.totalTax)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Drafts</CardTitle>
            <FileClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingDrafts}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {recentInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet. Create your first invoice!</p>
          ) : (
            <div className="space-y-3">
              {recentInvoices.map(inv => (
                <Link
                  key={inv.id}
                  to={`/invoices/${inv.id}`}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-accent sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{inv.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">{inv.customers?.trade_name} • {formatDate(inv.invoice_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatINR(inv.total_amount)}</p>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      inv.status === 'final' ? 'bg-green-100 text-green-800' :
                      inv.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {inv.status}
                    </span>
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

function Building2Icon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>
    </svg>
  );
}
