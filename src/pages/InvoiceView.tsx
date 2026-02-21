import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { InvoicePrintView } from "@/components/invoice/InvoicePrintView";
import { ArrowLeft, Printer } from "lucide-react";

export default function InvoiceView() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [taxSummary, setTaxSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      const { data: inv } = await supabase.from("invoices").select("*").eq("id", id).single();
      if (!inv) { setLoading(false); return; }
      setInvoice(inv);

      const [compRes, custRes, itemsRes, taxRes] = await Promise.all([
        supabase.from("companies").select("*").eq("id", inv.company_id).single(),
        supabase.from("customers").select("*").eq("id", inv.customer_id).single(),
        supabase.from("invoice_items").select("*").eq("invoice_id", id).order("sort_order"),
        supabase.from("invoice_tax_summary").select("*").eq("invoice_id", id).order("gst_rate"),
      ]);

      setCompany(compRes.data);
      setCustomer(custRes.data);
      setItems(itemsRes.data || []);
      setTaxSummary(taxRes.data || []);
      setLoading(false);
    };
    fetchAll();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!invoice || !company || !customer) {
    return <p className="text-muted-foreground">Invoice not found.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link to="/invoices"><ArrowLeft className="mr-2 h-4 w-4" />Back to Invoices</Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />Print / Save PDF
        </Button>
      </div>

      <InvoicePrintView
        invoice={invoice}
        company={company}
        customer={customer}
        items={items}
        taxSummary={taxSummary}
      />
    </div>
  );
}
