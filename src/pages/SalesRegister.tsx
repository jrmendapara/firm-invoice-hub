import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/indian-states";
import { Download, ClipboardList } from "lucide-react";
import * as XLSX from "xlsx";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";

export default function SalesRegister() {
  const { selectedCompany } = useCompany();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [gstTypeFilter, setGstTypeFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedCompany) return;
    supabase.from("customers").select("id, trade_name").eq("company_id", selectedCompany.id).order("trade_name")
      .then(({ data }) => setCustomers(data || []));
  }, [selectedCompany]);

  useEffect(() => {
    if (!selectedCompany) return;
    fetchData();
  }, [selectedCompany, fromDate, toDate, statusFilter, customerFilter, gstTypeFilter]);

  const fetchData = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    let query = supabase
      .from("invoices")
      .select("*, customers(trade_name, gstin)")
      .eq("company_id", selectedCompany.id)
      .gte("invoice_date", fromDate)
      .lte("invoice_date", toDate)
      .order("invoice_date", { ascending: true });

    if (statusFilter !== "all") query = query.eq("status", statusFilter as "draft" | "final" | "cancelled");
    if (customerFilter !== "all") query = query.eq("customer_id", customerFilter);

    const { data } = await query;
    let filtered = data || [];

    if (gstTypeFilter === "b2b") {
      filtered = filtered.filter(i => i.customers?.gstin);
    } else if (gstTypeFilter === "b2c") {
      filtered = filtered.filter(i => !i.customers?.gstin);
    }

    setInvoices(filtered);
    setLoading(false);
  };

  const totals = invoices.reduce((acc, i) => ({
    taxable: acc.taxable + (i.total_taxable_value || 0),
    cgst: acc.cgst + (i.total_cgst || 0),
    sgst: acc.sgst + (i.total_sgst || 0),
    igst: acc.igst + (i.total_igst || 0),
    tax: acc.tax + (i.total_tax || 0),
    total: acc.total + (i.total_amount || 0),
  }), { taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0, total: 0 });

  const exportToExcel = () => {
    const rows = invoices.map(i => ({
      "Date": formatDate(i.invoice_date),
      "Invoice No": i.invoice_number,
      "Customer": i.customers?.trade_name || "",
      "GSTIN": i.customers?.gstin || "",
      "State": i.place_of_supply_state,
      "Taxable Value": i.total_taxable_value,
      "CGST": i.total_cgst,
      "SGST": i.total_sgst,
      "IGST": i.total_igst,
      "Total Tax": i.total_tax,
      "Invoice Total": i.total_amount,
      "Status": i.status,
    }));

    rows.push({
      "Date": "",
      "Invoice No": "TOTAL",
      "Customer": "",
      "GSTIN": "",
      "State": "",
      "Taxable Value": totals.taxable,
      "CGST": totals.cgst,
      "SGST": totals.sgst,
      "IGST": totals.igst,
      "Total Tax": totals.tax,
      "Invoice Total": totals.total,
      "Status": "",
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 18 }, { wch: 15 },
      { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Register");
    const companyName = selectedCompany?.name?.replace(/[^a-zA-Z0-9]/g, "_") || "Company";
    XLSX.writeFile(wb, `Sales_Register_${companyName}_${fromDate}_to_${toDate}.xlsx`);
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Please select a company first.</p>;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sales Register"
        description={`${invoices.length} invoice${invoices.length === 1 ? "" : "s"} in selected range`}
        actions={
          <Button onClick={exportToExcel} disabled={invoices.length === 0}>
            <Download className="mr-2 h-4 w-4" />Export Excel
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <Label className="text-xs">From Date</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To Date</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Customer</Label>
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.trade_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">GST Type</Label>
              <Select value={gstTypeFilter} onValueChange={setGstTypeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="b2b">B2B (with GSTIN)</SelectItem>
                  <SelectItem value="b2c">B2C (without GSTIN)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[1200px]">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Invoice No</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Taxable</TableHead>
                <TableHead className="text-right">CGST</TableHead>
                <TableHead className="text-right">SGST</TableHead>
                <TableHead className="text-right">IGST</TableHead>
                <TableHead className="text-right">Total Tax</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow><TableCell colSpan={12} className="p-0">
                  <EmptyState
                    icon={ClipboardList}
                    title={loading ? "Loading..." : "No invoices found"}
                    description={loading ? undefined : "Try adjusting the date range or filters."}
                  />
                </TableCell></TableRow>
              ) : (
                invoices.map(inv => (
                  <TableRow key={inv.id} className="even:bg-muted/30 hover:bg-accent/60">
                    <TableCell className="text-sm">{formatDate(inv.invoice_date)}</TableCell>
                    <TableCell className="font-medium text-sm">{inv.invoice_number}</TableCell>
                    <TableCell className="text-sm">{inv.customers?.trade_name || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{inv.customers?.gstin || "-"}</TableCell>
                    <TableCell className="text-sm">{inv.place_of_supply_state}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatINR(inv.total_taxable_value)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatINR(inv.total_cgst)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatINR(inv.total_sgst)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatINR(inv.total_igst)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatINR(inv.total_tax)}</TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">{formatINR(inv.total_amount)}</TableCell>
                    <TableCell>
                      <StatusBadge status={inv.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {invoices.length > 0 && (
              <TableFooter>
                <TableRow className="bg-muted/60 font-bold">
                  <TableCell colSpan={5}>TOTAL</TableCell>
                  <TableCell className="text-right tabular-nums">{formatINR(totals.taxable)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatINR(totals.cgst)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatINR(totals.sgst)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatINR(totals.igst)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatINR(totals.tax)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatINR(totals.total)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
