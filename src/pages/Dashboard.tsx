import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { formatINR, formatDate } from "@/lib/indian-states";
import {
  FileText,
  Plus,
  Users,
  IndianRupee,
  FileClock,
  Package,
  ClipboardList,
  Building2,
  Download,
  Receipt,
  TrendingUp,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";

interface MonthStats {
  invoiceCount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  totalSales: number;
}

const EMPTY_MONTH: MonthStats = {
  invoiceCount: 0,
  taxable: 0,
  cgst: 0,
  sgst: 0,
  igst: 0,
  totalTax: 0,
  totalSales: 0,
};

const ymd = (d: Date) => d.toISOString().split("T")[0];

function aggregate(rows: any[]): MonthStats {
  return rows.reduce<MonthStats>((acc, i) => ({
    invoiceCount: acc.invoiceCount + 1,
    taxable: acc.taxable + Number(i.total_taxable_value || 0),
    cgst: acc.cgst + Number(i.total_cgst || 0),
    sgst: acc.sgst + Number(i.total_sgst || 0),
    igst: acc.igst + Number(i.total_igst || 0),
    totalTax: acc.totalTax + Number(i.total_tax || 0),
    totalSales: acc.totalSales + Number(i.total_amount || 0),
  }), { ...EMPTY_MONTH });
}

function pctDelta(current: number, previous: number): number | null {
  if (!previous) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

export default function Dashboard() {
  const { selectedCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [mtd, setMtd] = useState<MonthStats>(EMPTY_MONTH);
  const [prevMtd, setPrevMtd] = useState<MonthStats>(EMPTY_MONTH);
  const [pendingDrafts, setPendingDrafts] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedCompany) return;
    let cancelled = false;

    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const run = async () => {
      setLoading(true);
      const cid = selectedCompany.id;
      const [currentRes, prevRes, draftsRes, custRes, recentRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("total_amount, total_tax, total_taxable_value, total_cgst, total_sgst, total_igst")
          .eq("company_id", cid)
          .eq("status", "final")
          .gte("invoice_date", ymd(monthStart))
          .lte("invoice_date", ymd(today)),
        supabase
          .from("invoices")
          .select("total_amount, total_tax, total_taxable_value, total_cgst, total_sgst, total_igst")
          .eq("company_id", cid)
          .eq("status", "final")
          .gte("invoice_date", ymd(prevMonthStart))
          .lte("invoice_date", ymd(prevMonthEnd)),
        supabase
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .eq("company_id", cid)
          .eq("status", "draft"),
        supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("company_id", cid)
          .eq("is_active", true),
        supabase
          .from("invoices")
          .select("id, invoice_number, invoice_date, total_amount, status, customers(trade_name)")
          .eq("company_id", cid)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (cancelled) return;
      setMtd(aggregate(currentRes.data || []));
      setPrevMtd(aggregate(prevRes.data || []));
      setPendingDrafts(draftsRes.count || 0);
      setCustomerCount(custRes.count || 0);
      setRecentInvoices(recentRes.data || []);
      setLoading(false);
    };

    run();
    return () => { cancelled = true; };
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

  const monthLabel = new Date().toLocaleString("en-IN", { month: "long", year: "numeric" });
  const salesDelta = pctDelta(mtd.totalSales, prevMtd.totalSales);
  const invoicesDelta = pctDelta(mtd.invoiceCount, prevMtd.invoiceCount);
  const taxDelta = pctDelta(mtd.totalTax, prevMtd.totalTax);

  const kpis = [
    {
      label: "Sales (MTD)",
      value: formatINR(mtd.totalSales),
      sub: `${monthLabel}`,
      delta: salesDelta,
      icon: TrendingUp,
      accent: "emerald",
    },
    {
      label: "Invoices Issued",
      value: mtd.invoiceCount.toLocaleString("en-IN"),
      sub: `${pendingDrafts} draft${pendingDrafts === 1 ? "" : "s"} pending`,
      delta: invoicesDelta,
      icon: FileText,
      accent: "blue",
    },
    {
      label: "GST Collected",
      value: formatINR(mtd.totalTax),
      sub: `Tax this month`,
      delta: taxDelta,
      icon: Percent,
      accent: "violet",
    },
    {
      label: "Active Customers",
      value: customerCount.toLocaleString("en-IN"),
      sub: `In ${selectedCompany.name}`,
      delta: null,
      icon: Users,
      accent: "amber",
    },
  ] as const;

  const accentBg: Record<string, string> = {
    blue: "bg-[hsl(var(--accent-blue)/0.12)] text-[hsl(var(--accent-blue))]",
    emerald: "bg-[hsl(var(--accent-emerald)/0.12)] text-[hsl(var(--accent-emerald))]",
    violet: "bg-[hsl(var(--accent-violet)/0.12)] text-[hsl(var(--accent-violet))]",
    amber: "bg-[hsl(var(--accent-amber)/0.15)] text-[hsl(var(--accent-amber))]",
  };

  const quickActions = [
    { to: "/invoices/new", icon: Plus, label: "New Invoice", accent: "blue" },
    { to: "/customers", icon: Users, label: "Add Customer", accent: "emerald" },
    { to: "/items", icon: Package, label: "Add Item", accent: "violet" },
    { to: "/sales-register", icon: Download, label: "Export Register", accent: "amber" },
  ] as const;

  const gstRows = [
    { label: "Taxable Value", value: mtd.taxable },
    { label: "CGST", value: mtd.cgst },
    { label: "SGST", value: mtd.sgst },
    { label: "IGST", value: mtd.igst },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={selectedCompany.name}
        description={`GSTIN: ${selectedCompany.gstin || "N/A"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/sales-register"><Download className="mr-2 h-4 w-4" />Export Register</Link>
            </Button>
            <Button asChild>
              <Link to="/invoices/new"><Plus className="mr-2 h-4 w-4" />New Invoice</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const positive = k.delta !== null && k.delta >= 0;
          const DeltaIcon = positive ? ArrowUpRight : ArrowDownRight;
          return (
            <Card key={k.label} className="transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${accentBg[k.accent]}`}>
                    <k.icon className="h-5 w-5" />
                  </div>
                  {k.delta !== null && (
                    <span
                      className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium ${
                        positive
                          ? "bg-[hsl(var(--accent-emerald)/0.12)] text-[hsl(var(--accent-emerald))]"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      <DeltaIcon className="h-3 w-3" />
                      {Math.abs(k.delta).toFixed(0)}%
                    </span>
                  )}
                </div>
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">{k.label}</p>
                <p className="mt-1 truncate text-2xl font-semibold tabular-nums text-foreground">
                  {loading ? "—" : k.value}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{k.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="group flex items-center gap-3 rounded-lg border border-border/70 p-3 transition-colors hover:border-primary/40 hover:bg-accent/60"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accentBg[a.accent]}`}>
                <a.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{a.label}</p>
                <p className="truncate text-xs text-muted-foreground">Open</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">GST Register</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">{monthLabel} • Final invoices</p>
              </div>
              <Receipt className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {gstRows.map((r) => (
              <div key={r.label} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0">
                <span className="text-sm text-muted-foreground">{r.label}</span>
                <span className="text-sm font-medium tabular-nums">{formatINR(r.value)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2">
              <span className="text-sm font-semibold">Total Tax</span>
              <span className="text-sm font-semibold tabular-nums">{formatINR(mtd.totalTax)}</span>
            </div>
            <div className="flex items-center justify-between px-3">
              <span className="text-sm font-semibold text-foreground">Invoice Total</span>
              <span className="text-base font-semibold tabular-nums text-primary">{formatINR(mtd.totalSales)}</span>
            </div>
            <Button asChild variant="outline" className="mt-2 w-full">
              <Link to="/sales-register"><ClipboardList className="mr-2 h-4 w-4" />Open Sales Register</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
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
              <div className="space-y-2">
                {recentInvoices.map(inv => (
                  <Link
                    key={inv.id}
                    to={`/invoices/${inv.id}`}
                    className="flex flex-col gap-2 rounded-lg border border-border/70 p-3 transition-colors hover:border-primary/30 hover:bg-accent/60 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{inv.invoice_number}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {inv.customers?.trade_name || "—"} • {formatDate(inv.invoice_date)}
                      </p>
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

    </div>
  );
}

