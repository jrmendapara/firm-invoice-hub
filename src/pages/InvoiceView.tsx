import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { InvoicePrintView } from "@/components/invoice/InvoicePrintView";
import { InvoiceMobileView } from "@/components/invoice/InvoiceMobileView";
import { ArrowLeft, Printer, MessageCircle } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export default function InvoiceView() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [taxSummary, setTaxSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharingPdf, setSharingPdf] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      const { data: inv } = await supabase.from("invoices").select("*").eq("id", id).single();
      if (!inv) {
        setLoading(false);
        return;
      }
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

  const generateInvoicePdf = async (): Promise<File> => {
    const node = document.getElementById("invoice-mobile-share") || document.querySelector(".print-invoice");
    if (!node) throw new Error("Invoice view not found");

    const canvas = await html2canvas(node as HTMLElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
    } else {
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    }

    const blob = pdf.output("blob");
    return new File([blob], `Invoice-${invoice.invoice_number}.pdf`, { type: "application/pdf" });
  };

  const handleWhatsAppShare = async () => {
    setSharingPdf(true);
    try {
      const pdfFile = await generateInvoicePdf();
      const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };
      // Try native file share first (best UX on mobile)
      if (nav.share) {
        try {
          // Send only file (no text) so WhatsApp opens contact picker and sends PDF attachment.
          await nav.share({ files: [pdfFile] });
          return;
        } catch {
          // Continue to fallback flow
        }
      }

      // Direct file send is only possible via native share sheet.
      // If unavailable in this browser/webview, inform user clearly.
      throw new Error("Direct PDF send is not supported in this browser. Open this page in mobile Chrome/Safari and use WhatsApp PDF button.");
    } catch (e: any) {
      alert(e?.message || "Unable to generate/share PDF.");
    } finally {
      setSharingPdf(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 sm:pb-0">
      <div className="no-print flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" asChild>
          <Link to="/invoices">
            <ArrowLeft className="mr-2 h-4 w-4" />Back to Invoices
          </Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />Print / Save PDF
        </Button>
      </div>

      <div id="invoice-mobile-share">
        <InvoiceMobileView invoice={invoice} company={company} customer={customer} items={items} />
      </div>

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
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={handleWhatsAppShare} disabled={sharingPdf}>
              <MessageCircle className="mr-1 h-4 w-4" />
              {sharingPdf ? "Preparing PDF..." : "WhatsApp PDF"}
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
