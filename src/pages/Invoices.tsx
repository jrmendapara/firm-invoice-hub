import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR, formatDate, getCurrentFinancialYear, INDIAN_STATES, numberToWordsINR } from "@/lib/indian-states";
import { Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

export default function Invoices() {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const fetchInvoices = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase
      .from("invoices")
      .select("*, customers(trade_name, gstin)")
      .eq("company_id", selectedCompany.id)
      .order("invoice_date", { ascending: false });
    setInvoices(data || []);
  };

  useEffect(() => {
    fetchInvoices();
  }, [selectedCompany]);

  const handleDeleteInvoice = async (invoiceId: string, invoiceNumber: string) => {
    if (!confirm(`Delete invoice ${invoiceNumber}? This cannot be undone.`)) return;

    const { error } = await supabase.from("invoices").delete().eq("id", invoiceId);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Invoice deleted" });
    fetchInvoices();
  };

  const handleImportInvoices = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCompany || !user) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

      const { data: customers } = await supabase.from("customers").select("id, trade_name, gstin").eq("company_id", selectedCompany.id);
      const customerByName = new Map((customers || []).map((c) => [String(c.trade_name || "").toLowerCase(), c.id]));
      const customerByGstin = new Map((customers || []).filter((c) => c.gstin).map((c) => [String(c.gstin).toUpperCase(), c.id]));

      const inserts = rows
        .map((r) => {
          const customerId =
            customerByGstin.get(String(r.customer_gstin || r.GSTIN || "").toUpperCase()) ||
            customerByName.get(String(r.customer || r.Customer || r.trade_name || "").toLowerCase());
          if (!customerId) return null;

          const posCode = String(r.place_of_supply_code || r.pos_code || r.POS || selectedCompany.state_code || "");
          const posState = INDIAN_STATES.find((s) => s.code === posCode)?.name || String(r.place_of_supply_state || r.pos_state || "") || selectedCompany.state_name;
          const totalTaxable = Number(r.total_taxable_value || r.taxable || 0);
          const cgst = Number(r.total_cgst || r.cgst || 0);
          const sgst = Number(r.total_sgst || r.sgst || 0);
          const igst = Number(r.total_igst || r.igst || 0);
          const totalTax = Number(r.total_tax || cgst + sgst + igst);
          const totalAmount = Number(r.total_amount || r.total || totalTaxable + totalTax);
          const invoiceDate = String(r.invoice_date || r.Date || new Date().toISOString().slice(0, 10));

          return {
            company_id: selectedCompany.id,
            customer_id: customerId,
            invoice_number: String(r.invoice_number || r["Invoice #"] || "").trim(),
            invoice_date: invoiceDate,
            place_of_supply_code: posCode,
            place_of_supply_state: posState,
            status: ["draft", "final", "cancelled"].includes(String(r.status || "").toLowerCase())
              ? String(r.status).toLowerCase()
              : "final",
            discount_amount: Number(r.discount_amount || 0),
            round_off: Number(r.round_off || 0),
            total_taxable_value: totalTaxable,
            total_cgst: cgst,
            total_sgst: sgst,
            total_igst: igst,
            total_tax: totalTax,
            total_amount: totalAmount,
            amount_in_words: String(r.amount_in_words || numberToWordsINR(totalAmount)),
            financial_year: String(r.financial_year || getCurrentFinancialYear()),
            created_by: user.id,
          };
        })
        .filter((r): r is NonNullable<typeof r> => Boolean(r?.invoice_number));

      if (inserts.length === 0) {
        toast({ title: "No valid rows found", description: "Customer should exist (by name/GSTIN) and invoice_number is required.", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("invoices").insert(inserts);
      if (error) throw error;

      toast({ title: `Imported ${inserts.length} invoices` });
      fetchInvoices();
    } catch (err: any) {
      toast({ title: "Import failed", description: err?.message || "Invalid Excel format", variant: "destructive" });
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const filtered = invoices.filter(
    (i) => i.invoice_number.toLowerCase().includes(search.toLowerCase()) || (i.customers?.trade_name || "").toLowerCase().includes(search.toLowerCase())
  );

  if (!selectedCompany) return <p className="text-muted-foreground">Please select a company first.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-display">Invoices</h1>
        <div className="flex gap-2">
          <input ref={importInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportInvoices} />
          <Button variant="outline" onClick={() => importInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />Import Excel
          </Button>
          <Button asChild>
            <Link to="/invoices/new">
              <Plus className="mr-2 h-4 w-4" />New Invoice
            </Link>
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by invoice number or customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[980px]">
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((inv) => (
                  <TableRow key={inv.id} className="cursor-pointer hover:bg-accent" onClick={() => navigate(`/invoices/${inv.id}`)}>
                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                    <TableCell>{formatDate(inv.invoice_date)}</TableCell>
                    <TableCell>{inv.customers?.trade_name || "-"}</TableCell>
                    <TableCell className="font-mono text-sm">{inv.customers?.gstin || "-"}</TableCell>
                    <TableCell className="text-right">{formatINR(inv.total_taxable_value)}</TableCell>
                    <TableCell className="text-right">{formatINR(inv.total_tax)}</TableCell>
                    <TableCell className="text-right font-medium">{formatINR(inv.total_amount)}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          inv.status === "final" ? "bg-green-100 text-green-800" : inv.status === "draft" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => navigate(`/invoices/${inv.id}/edit`)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8"
                          onClick={() => handleDeleteInvoice(inv.id, inv.invoice_number)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
