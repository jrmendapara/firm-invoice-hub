import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { InvoicePrintView } from "@/components/invoice/InvoicePrintView";
import { InvoiceMobileView } from "@/components/invoice/InvoiceMobileView";
import { ArrowLeft, Printer, Share2, MessageCircle } from "lucide-react";

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
        supabase.from("invoice_items").select("*, items(name)").eq("invoice_id", id).order("sort_order"),
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

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: `Invoice ${invoice.invoice_number}`,
      text: `Invoice ${invoice.invoice_number} - ${company.name}`,
      url,
    };

    try {
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          return;
        } catch {
          await navigator.share({ text: url });
          return;
        }
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        alert("Invoice link copied to clipboard");
        return;
      }

      window.prompt("Copy this invoice link:", url);
    } catch {
      window.prompt("Copy this invoice link:", url);
    }
  };

  const handleWhatsAppShare = () => {
    const url = window.location.href;
    const msg = `Invoice ${invoice.invoice_number} - ${company.name}\n${url}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4 pb-24 sm:pb-0">
      <div className="no-print flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" asChild>
          <Link to="/invoices"><ArrowLeft className="mr-2 h-4 w-4" />Back to Invoices</Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />Print / Save PDF
        </Button>
      </div>

      <InvoiceMobileView
        invoice={invoice}
        company={company}
        customer={customer}
        items={items}
      />

      <div className="hidden sm:block print:block">
        <InvoicePrintView
          invoice={invoice}
          company={company}
          customer={customer}
          items={items}
          taxSummary={taxSummary}
        />
      </div>

      <div className="fixed bottom-3 left-3 right-3 z-40 sm:hidden print:hidden">
        <div className="rounded-xl border bg-white/95 p-2 shadow-lg backdrop-blur">
          <div className="mb-2 flex items-center justify-between px-1 text-sm">
            <span className="text-muted-foreground">Grand Total</span>
            <span className="font-bold">₹{Number(invoice.total_amount || 0).toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="mr-1 h-4 w-4" />Share
            </Button>
            <Button variant="outline" onClick={handleWhatsAppShare}>
              <MessageCircle className="mr-1 h-4 w-4" />WhatsApp
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="mr-1 h-4 w-4" />Print
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
