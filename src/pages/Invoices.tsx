import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/indian-states";
import { Plus, Search } from "lucide-react";

export default function Invoices() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!selectedCompany) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("invoices")
        .select("*, customers(trade_name, gstin)")
        .eq("company_id", selectedCompany.id)
        .order("invoice_date", { ascending: false });
      setInvoices(data || []);
    };
    fetch();
  }, [selectedCompany]);

  const filtered = invoices.filter(i =>
    i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    (i.customers?.trade_name || "").toLowerCase().includes(search.toLowerCase())
  );

  if (!selectedCompany) return <p className="text-muted-foreground">Please select a company first.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-display">Invoices</h1>
        <Button asChild>
          <Link to="/invoices/new"><Plus className="mr-2 h-4 w-4" />New Invoice</Link>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by invoice number or customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead className="text-right">Taxable</TableHead>
                <TableHead className="text-right">Tax</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No invoices found</TableCell></TableRow>
              ) : (
                filtered.map(inv => (
                  <TableRow key={inv.id} className="cursor-pointer hover:bg-accent" onClick={() => navigate(`/invoices/${inv.id}`)}>
                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                    <TableCell>{formatDate(inv.invoice_date)}</TableCell>
                    <TableCell>{inv.customers?.trade_name || "-"}</TableCell>
                    <TableCell className="font-mono text-sm">{inv.customers?.gstin || "-"}</TableCell>
                    <TableCell className="text-right">{formatINR(inv.total_taxable_value)}</TableCell>
                    <TableCell className="text-right">{formatINR(inv.total_tax)}</TableCell>
                    <TableCell className="text-right font-medium">{formatINR(inv.total_amount)}</TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        inv.status === 'final' ? 'bg-green-100 text-green-800' :
                        inv.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>{inv.status}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
