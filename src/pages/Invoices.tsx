import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { formatINR, formatDate, getCurrentFinancialYear, INDIAN_STATES, numberToWordsINR } from "@/lib/indian-states";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/common/PageHeader";
import { FileText } from "lucide-react";
import { DataTable, DataTableColumn } from "@/components/common/DataTable";

export default function Invoices() {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
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

  const downloadInvoicesTemplate = () => {
    const rows = [
      {
        invoice_number: "INV/25-26/0001",
        invoice_date: "2026-02-27",
        customer: "ABC Traders",
        customer_gstin: "24AAAAA0000A1Z5",
        place_of_supply_code: "24",
        status: "final",
        total_taxable_value: 1000,
        total_cgst: 90,
        total_sgst: 90,
        total_igst: 0,
        total_tax: 180,
        total_amount: 1180,
        discount_amount: 0,
        round_off: 0,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "InvoicesTemplate");
    XLSX.writeFile(wb, "invoices_import_template.xlsx");
  };

  const handleImportInvoicesClick = () => {
    downloadInvoicesTemplate();
    setTimeout(() => importInputRef.current?.click(), 150);
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
              ? (String(r.status).toLowerCase() as "draft" | "final" | "cancelled")
              : ("final" as const),
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

  const visibleInvoices = useMemo(
    () =>
      statusFilter === "all"
        ? invoices
        : invoices.filter((i) => i.status === statusFilter),
    [invoices, statusFilter],
  );

  const columns: DataTableColumn<any>[] = [
    {
      id: "invoice_number",
      header: "Invoice #",
      cell: (i) => <span className="font-medium">{i.invoice_number}</span>,
      sortAccessor: (i) => i.invoice_number,
    },
    {
      id: "invoice_date",
      header: "Date",
      cell: (i) => formatDate(i.invoice_date),
      sortAccessor: (i) => i.invoice_date,
    },
    {
      id: "customer",
      header: "Customer",
      cell: (i) => i.customers?.trade_name || "-",
      sortAccessor: (i) => i.customers?.trade_name || "",
    },
    {
      id: "gstin",
      header: "GSTIN",
      cell: (i) => <span className="font-mono text-sm">{i.customers?.gstin || "-"}</span>,
      hideOnMobile: true,
    },
    {
      id: "taxable",
      header: "Taxable",
      className: "text-right",
      cell: (i) => <span className="tabular-nums">{formatINR(i.total_taxable_value)}</span>,
      sortAccessor: (i) => Number(i.total_taxable_value || 0),
      hideOnMobile: true,
    },
    {
      id: "tax",
      header: "Tax",
      className: "text-right",
      cell: (i) => <span className="tabular-nums">{formatINR(i.total_tax)}</span>,
      sortAccessor: (i) => Number(i.total_tax || 0),
      hideOnMobile: true,
    },
    {
      id: "total",
      header: "Total",
      className: "text-right",
      cell: (i) => <span className="font-medium tabular-nums">{formatINR(i.total_amount)}</span>,
      sortAccessor: (i) => Number(i.total_amount || 0),
      hideOnMobile: true,
    },
    {
      id: "status",
      header: "Status",
      cell: (i) => <StatusBadge status={i.status} />,
      sortAccessor: (i) => i.status,
      hideOnMobile: true,
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right w-[1%] whitespace-nowrap",
      cell: (i) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => navigate(`/invoices/${i.id}/edit`)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="destructive"
            className="h-8 w-8"
            onClick={() => handleDeleteInvoice(i.id, i.invoice_number)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      hideOnMobile: true,
    },
  ];

  if (!selectedCompany) return <p className="text-muted-foreground">Please select a company first.</p>;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Invoices"
        description="Manage all your sales invoices in one place."
        actions={
          <>
            <input ref={importInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportInvoices} />
            <Button variant="outline" onClick={handleImportInvoicesClick}>
              <Upload className="mr-2 h-4 w-4" />Import Excel
            </Button>
            <Button asChild>
              <Link to="/invoices/new"><Plus className="mr-2 h-4 w-4" />New Invoice</Link>
            </Button>
          </>
        }
      />

      <DataTable
        data={visibleInvoices}
        columns={columns}
        rowKey={(i) => i.id}
        onRowClick={(i) => navigate(`/invoices/${i.id}`)}
        searchPlaceholder="Search by invoice number or customer..."
        searchAccessor={(i) =>
          `${i.invoice_number} ${i.customers?.trade_name || ""} ${i.customers?.gstin || ""}`
        }
        filters={[
          {
            id: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "all", label: "All statuses" },
              { value: "final", label: "Final" },
              { value: "draft", label: "Draft" },
              { value: "cancelled", label: "Cancelled" },
            ],
          },
        ]}
        initialSort={{ columnId: "invoice_date", direction: "desc" }}
        empty={{
          icon: FileText,
          title: "No invoices found",
          description: "Create an invoice or change the filters above.",
          action: (
            <Button asChild>
              <Link to="/invoices/new"><Plus className="mr-2 h-4 w-4" />New Invoice</Link>
            </Button>
          ),
        }}
        mobileTitle={(i) => i.invoice_number}
        mobileSubtitle={(i) => `${i.customers?.trade_name || "—"} • ${formatDate(i.invoice_date)}`}
        mobileAside={(i) => (
          <div className="flex flex-col items-end gap-1.5">
            <span className="font-semibold tabular-nums">{formatINR(i.total_amount)}</span>
            <StatusBadge status={i.status} />
          </div>
        )}
        minWidth={980}
      />
    </div>
  );
}
