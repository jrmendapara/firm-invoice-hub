import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/indian-states";
import { Download, ClipboardList } from "lucide-react";
import * as XLSX from "xlsx";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, DataTableColumn } from "@/components/common/DataTable";

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

      <DataTable
        data={invoices}
        columns={[
          {
            id: "invoice_date",
            header: "Date",
            cell: (inv) => <span className="text-sm">{formatDate(inv.invoice_date)}</span>,
            sortAccessor: (inv) => inv.invoice_date,
          },
          {
            id: "invoice_number",
            header: "Invoice No",
            cell: (inv) => <span className="text-sm font-medium">{inv.invoice_number}</span>,
            sortAccessor: (inv) => inv.invoice_number,
          },
          {
            id: "customer",
            header: "Customer",
            cell: (inv) => <span className="text-sm">{inv.customers?.trade_name || "-"}</span>,
            sortAccessor: (inv) => inv.customers?.trade_name || "",
          },
          {
            id: "gstin",
            header: "GSTIN",
            cell: (inv) => <span className="font-mono text-xs">{inv.customers?.gstin || "-"}</span>,
            hideOnMobile: true,
          },
          {
            id: "state",
            header: "State",
            cell: (inv) => <span className="text-sm">{inv.place_of_supply_state}</span>,
            sortAccessor: (inv) => inv.place_of_supply_state || "",
            hideOnMobile: true,
          },
          {
            id: "taxable",
            header: "Taxable",
            className: "text-right",
            cell: (inv) => <span className="text-sm tabular-nums">{formatINR(inv.total_taxable_value)}</span>,
            sortAccessor: (inv) => Number(inv.total_taxable_value || 0),
            hideOnMobile: true,
          },
          {
            id: "cgst",
            header: "CGST",
            className: "text-right",
            cell: (inv) => <span className="text-sm tabular-nums">{formatINR(inv.total_cgst)}</span>,
            sortAccessor: (inv) => Number(inv.total_cgst || 0),
            hideOnMobile: true,
          },
          {
            id: "sgst",
            header: "SGST",
            className: "text-right",
            cell: (inv) => <span className="text-sm tabular-nums">{formatINR(inv.total_sgst)}</span>,
            sortAccessor: (inv) => Number(inv.total_sgst || 0),
            hideOnMobile: true,
          },
          {
            id: "igst",
            header: "IGST",
            className: "text-right",
            cell: (inv) => <span className="text-sm tabular-nums">{formatINR(inv.total_igst)}</span>,
            sortAccessor: (inv) => Number(inv.total_igst || 0),
            hideOnMobile: true,
          },
          {
            id: "total_tax",
            header: "Total Tax",
            className: "text-right",
            cell: (inv) => <span className="text-sm tabular-nums">{formatINR(inv.total_tax)}</span>,
            sortAccessor: (inv) => Number(inv.total_tax || 0),
            hideOnMobile: true,
          },
          {
            id: "total",
            header: "Total",
            className: "text-right",
            cell: (inv) => <span className="text-sm font-medium tabular-nums">{formatINR(inv.total_amount)}</span>,
            sortAccessor: (inv) => Number(inv.total_amount || 0),
          },
          {
            id: "status",
            header: "Status",
            cell: (inv) => <StatusBadge status={inv.status} />,
            sortAccessor: (inv) => inv.status,
            hideOnMobile: true,
          },
        ] as DataTableColumn<any>[]}
        rowKey={(inv) => inv.id}
        searchable={false}
        initialSort={{ columnId: "invoice_date", direction: "asc" }}
        empty={{
          icon: ClipboardList,
          title: loading ? "Loading..." : "No invoices found",
          description: loading ? undefined : "Try adjusting the date range or filters.",
        }}
        mobileTitle={(inv) => inv.invoice_number}
        mobileSubtitle={(inv) => `${inv.customers?.trade_name || "—"} • ${formatDate(inv.invoice_date)}`}
        mobileAside={(inv) => (
          <div className="flex flex-col items-end gap-1.5">
            <span className="font-semibold tabular-nums">{formatINR(inv.total_amount)}</span>
            <StatusBadge status={inv.status} />
          </div>
        )}
        footer={(rows) => {
          const t = rows.reduce(
            (acc, i) => ({
              taxable: acc.taxable + Number(i.total_taxable_value || 0),
              cgst: acc.cgst + Number(i.total_cgst || 0),
              sgst: acc.sgst + Number(i.total_sgst || 0),
              igst: acc.igst + Number(i.total_igst || 0),
              tax: acc.tax + Number(i.total_tax || 0),
              total: acc.total + Number(i.total_amount || 0),
            }),
            { taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0, total: 0 },
          );
          return (
            <TableRow className="bg-muted/60 font-bold">
              <TableCell colSpan={5}>TOTAL ({rows.length})</TableCell>
              <TableCell className="text-right tabular-nums">{formatINR(t.taxable)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatINR(t.cgst)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatINR(t.sgst)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatINR(t.igst)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatINR(t.tax)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatINR(t.total)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
          );
        }}
        minWidth={1200}
      />
    </div>
  );
}
