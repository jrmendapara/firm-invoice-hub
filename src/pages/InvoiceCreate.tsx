import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { INDIAN_STATES, GST_RATES, UNITS, getCurrentFinancialYear, numberToWordsINR, formatINR } from "@/lib/indian-states";
import { Plus, Trash2, Save } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Item = Database["public"]["Tables"]["items"]["Row"];

interface LineItem {
  id: string;
  item_id: string | null;
  description: string;
  hsn_sac: string;
  quantity: number;
  unit: string;
  rate: number;
  discount_percent: number;
  gst_rate: number;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

function createEmptyLine(): LineItem {
  return {
    id: crypto.randomUUID(), item_id: null, description: "", hsn_sac: "",
    quantity: 1, unit: "Nos", rate: 0, discount_percent: 0, gst_rate: 18,
    taxable_value: 0, cgst: 0, sgst: 0, igst: 0, total: 0,
  };
}

export default function InvoiceCreate() {
  const navigate = useNavigate();
  const { id: editInvoiceId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const { toast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [placeOfSupplyCode, setPlaceOfSupplyCode] = useState("");
  const [lines, setLines] = useState<LineItem[]>([createEmptyLine()]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [roundOff, setRoundOff] = useState(0);
  const [saving, setSaving] = useState(false);

  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerType, setNewCustomerType] = useState<"registered" | "unregistered" | "export" | "sez">("registered");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerLegalName, setNewCustomerLegalName] = useState("");
  const [newCustomerContactPerson, setNewCustomerContactPerson] = useState("");
  const [newCustomerGstin, setNewCustomerGstin] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [newCustomerCity, setNewCustomerCity] = useState("");
  const [newCustomerStateCode, setNewCustomerStateCode] = useState("");
  const [newCustomerPincode, setNewCustomerPincode] = useState("");
  const [newCustomerMobile, setNewCustomerMobile] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");

  const [showAddItemForLineId, setShowAddItemForLineId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemType, setNewItemType] = useState<"goods" | "services">("goods");
  const [newItemHsn, setNewItemHsn] = useState("");
  const [newItemRate, setNewItemRate] = useState(0);
  const [newItemGstRate, setNewItemGstRate] = useState(18);
  const [newItemUnit, setNewItemUnit] = useState("Nos");
  const [newItemDescription, setNewItemDescription] = useState("");

  useEffect(() => {
    if (!selectedCompany) return;

    const load = async () => {
      const [custRes, itemRes] = await Promise.all([
        supabase.from("customers").select("*").eq("company_id", selectedCompany.id).eq("is_active", true).order("trade_name"),
        supabase.from("items").select("*").eq("company_id", selectedCompany.id).eq("is_active", true).order("name"),
      ]);

      setCustomers(custRes.data || []);
      setItems(itemRes.data || []);

      if (!editInvoiceId) return;

      const { data: existingInvoice } = await supabase.from("invoices").select("*").eq("id", editInvoiceId).single();
      if (!existingInvoice) return;

      const { data: existingLines } = await supabase.from("invoice_items").select("*").eq("invoice_id", editInvoiceId).order("sort_order");

      setCustomerId(existingInvoice.customer_id);
      setInvoiceDate(existingInvoice.invoice_date);
      setPlaceOfSupplyCode(existingInvoice.place_of_supply_code || "");
      setDiscountAmount(existingInvoice.discount_amount || 0);
      setRoundOff(existingInvoice.round_off || 0);

      if (existingLines && existingLines.length > 0) {
        setLines(
          existingLines.map((l) => ({
            id: crypto.randomUUID(),
            item_id: l.item_id,
            description: l.description || "",
            hsn_sac: l.hsn_sac || "",
            quantity: Number(l.quantity || 0),
            unit: l.unit || "Nos",
            rate: Number(l.rate || 0),
            discount_percent: Number(l.discount_percent || 0),
            gst_rate: Number(l.gst_rate || 0),
            taxable_value: Number(l.taxable_value || 0),
            cgst: Number(l.cgst_amount || 0),
            sgst: Number(l.sgst_amount || 0),
            igst: Number(l.igst_amount || 0),
            total: Number(l.total_amount || 0),
          }))
        );
      }
    };

    load();
  }, [selectedCompany, editInvoiceId]);

  // Auto-set place of supply when customer changes
  useEffect(() => {
    const cust = customers.find(c => c.id === customerId);
    if (cust?.billing_state_code) {
      setPlaceOfSupplyCode(cust.billing_state_code);
    }
  }, [customerId, customers]);

  useEffect(() => {
    if (selectedCompany?.state_code && !newCustomerStateCode) {
      setNewCustomerStateCode(selectedCompany.state_code);
    }
  }, [selectedCompany, newCustomerStateCode]);

  const isInterState = selectedCompany && placeOfSupplyCode && selectedCompany.state_code !== placeOfSupplyCode;

  // Recalculate line items
  const recalcLine = (line: LineItem): LineItem => {
    const gross = line.quantity * line.rate;
    const disc = gross * (line.discount_percent / 100);
    const taxable = gross - disc;
    const taxAmt = taxable * (line.gst_rate / 100);
    const cgst = isInterState ? 0 : taxAmt / 2;
    const sgst = isInterState ? 0 : taxAmt / 2;
    const igst = isInterState ? taxAmt : 0;
    return { ...line, taxable_value: taxable, cgst, sgst, igst, total: taxable + taxAmt };
  };

  const updateLine = (id: string, updates: Partial<LineItem>) => {
    setLines(prev => prev.map(l => l.id === id ? recalcLine({ ...l, ...updates }) : l));
  };

  const selectItem = (lineId: string, itemId: string) => {
    if (itemId === "__add_new_item__") {
      setShowAddItemForLineId(lineId);
      return;
    }

    const item = items.find(i => i.id === itemId);
    if (!item) return;
    updateLine(lineId, {
      item_id: itemId,
      description: item.name,
      hsn_sac: item.hsn_sac || "",
      unit: item.unit,
      rate: item.default_price || 0,
      gst_rate: item.gst_rate,
    });
  };

  const handleCustomerChange = (value: string) => {
    if (value === "__add_new_customer__") {
      setShowAddCustomer(true);
      return;
    }
    setCustomerId(value);
  };

  const handleQuickAddCustomer = async () => {
    if (!selectedCompany) return;
    if (!newCustomerName.trim()) {
      toast({ title: "Enter customer name", variant: "destructive" });
      return;
    }

    const state = INDIAN_STATES.find(s => s.code === newCustomerStateCode);

    const { data, error } = await supabase
      .from("customers")
      .insert({
        company_id: selectedCompany.id,
        trade_name: newCustomerName.trim(),
        legal_name: newCustomerLegalName.trim() || null,
        contact_person: newCustomerContactPerson.trim() || null,
        gstin: newCustomerGstin.trim() || null,
        customer_type: newCustomerType,
        billing_address_line1: newCustomerAddress.trim() || null,
        billing_city: newCustomerCity.trim() || null,
        billing_state_code: newCustomerStateCode || null,
        billing_state_name: state?.name || null,
        billing_pincode: newCustomerPincode.trim() || null,
        mobile: newCustomerMobile.trim() || null,
        email: newCustomerEmail.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (error || !data) {
      toast({ title: "Failed to add customer", description: error?.message, variant: "destructive" });
      return;
    }

    setCustomers(prev => [...prev, data].sort((a, b) => a.trade_name.localeCompare(b.trade_name)));
    setCustomerId(data.id);
    setShowAddCustomer(false);
    setNewCustomerType("registered");
    setNewCustomerName("");
    setNewCustomerLegalName("");
    setNewCustomerContactPerson("");
    setNewCustomerGstin("");
    setNewCustomerAddress("");
    setNewCustomerCity("");
    setNewCustomerPincode("");
    setNewCustomerMobile("");
    setNewCustomerEmail("");
    toast({ title: "Customer added" });
  };

  const handleQuickAddItem = async (lineId: string) => {
    if (!selectedCompany) return;
    if (!newItemName.trim()) {
      toast({ title: "Enter item name", variant: "destructive" });
      return;
    }

    const { data, error } = await supabase
      .from("items")
      .insert({
        company_id: selectedCompany.id,
        name: newItemName.trim(),
        hsn_sac: newItemHsn.trim() || null,
        default_price: newItemRate,
        gst_rate: newItemGstRate,
        unit: newItemUnit || "Nos",
        item_type: newItemType,
        description: newItemDescription.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (error || !data) {
      toast({ title: "Failed to add item", description: error?.message, variant: "destructive" });
      return;
    }

    setItems(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    selectItem(lineId, data.id);
    setShowAddItemForLineId(null);
    setNewItemName("");
    setNewItemType("goods");
    setNewItemHsn("");
    setNewItemRate(0);
    setNewItemGstRate(18);
    setNewItemUnit("Nos");
    setNewItemDescription("");
    toast({ title: "Item added" });
  };

  // Recalc all lines when inter/intra changes
  useEffect(() => {
    setLines(prev => prev.map(l => recalcLine(l)));
  }, [isInterState]);

  const totals = lines.reduce((acc, l) => ({
    taxable: acc.taxable + l.taxable_value,
    cgst: acc.cgst + l.cgst,
    sgst: acc.sgst + l.sgst,
    igst: acc.igst + l.igst,
    total: acc.total + l.total,
  }), { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 });

  const grandTotal = totals.total - discountAmount + roundOff;

  const handleSave = async (status: "draft" | "final") => {
    if (!selectedCompany || !user) return;
    if (!customerId) { toast({ title: "Select a customer", variant: "destructive" }); return; }
    if (!placeOfSupplyCode) { toast({ title: "Select place of supply", variant: "destructive" }); return; }
    if (lines.every(l => !l.description)) { toast({ title: "Add at least one line item", variant: "destructive" }); return; }

    setSaving(true);
    const fy = getCurrentFinancialYear();
    const placeState = INDIAN_STATES.find(s => s.code === placeOfSupplyCode);

    let invoiceNumber = "";
    let invoiceId = editInvoiceId || "";

    if (editInvoiceId) {
      const { data: currentInvoice } = await supabase.from("invoices").select("invoice_number, financial_year, created_by").eq("id", editInvoiceId).single();
      invoiceNumber = currentInvoice?.invoice_number || "";

      const { error } = await supabase.from("invoices").update({
        customer_id: customerId,
        invoice_date: invoiceDate,
        place_of_supply_state: placeState?.name || "",
        place_of_supply_code: placeOfSupplyCode,
        status,
        discount_amount: discountAmount,
        round_off: roundOff,
        total_taxable_value: totals.taxable,
        total_cgst: totals.cgst,
        total_sgst: totals.sgst,
        total_igst: totals.igst,
        total_tax: totals.cgst + totals.sgst + totals.igst,
        total_amount: grandTotal,
        amount_in_words: numberToWordsINR(grandTotal),
      }).eq("id", editInvoiceId);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }

      await supabase.from("invoice_items").delete().eq("invoice_id", editInvoiceId);
      await supabase.from("invoice_tax_summary").delete().eq("invoice_id", editInvoiceId);
    } else {
      const { count } = await supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("company_id", selectedCompany.id)
        .eq("financial_year", fy);

      const num = (count || 0) + 1;
      invoiceNumber = `${selectedCompany.invoice_prefix || "INV/"}${fy}/${String(num).padStart(4, "0")}`;

      const { data: invoice, error } = await supabase.from("invoices").insert({
        company_id: selectedCompany.id,
        customer_id: customerId,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        place_of_supply_state: placeState?.name || "",
        place_of_supply_code: placeOfSupplyCode,
        status,
        discount_amount: discountAmount,
        round_off: roundOff,
        total_taxable_value: totals.taxable,
        total_cgst: totals.cgst,
        total_sgst: totals.sgst,
        total_igst: totals.igst,
        total_tax: totals.cgst + totals.sgst + totals.igst,
        total_amount: grandTotal,
        amount_in_words: numberToWordsINR(grandTotal),
        created_by: user.id,
        financial_year: fy,
      }).select().single();

      if (error || !invoice) {
        toast({ title: "Error", description: error?.message || "Failed to create invoice", variant: "destructive" });
        setSaving(false);
        return;
      }

      invoiceId = invoice.id;
    }

    if (!invoiceId) {
      toast({ title: "Error", description: "Failed to save invoice", variant: "destructive" });
      setSaving(false);
      return;
    }

    // Insert line items
    const validLines = lines.filter(l => l.description);
    const lineInserts = validLines.map((l, idx) => ({
      invoice_id: invoiceId,
      item_id: l.item_id || null,
      description: l.description,
      hsn_sac: l.hsn_sac || null,
      quantity: l.quantity,
      unit: l.unit,
      rate: l.rate,
      discount_percent: l.discount_percent,
      discount_amount: l.quantity * l.rate * (l.discount_percent / 100),
      taxable_value: l.taxable_value,
      gst_rate: l.gst_rate,
      cgst_amount: l.cgst,
      sgst_amount: l.sgst,
      igst_amount: l.igst,
      total_amount: l.total,
      sort_order: idx,
    }));

    await supabase.from("invoice_items").insert(lineInserts);

    // Insert tax summary
    const taxMap = new Map<number, { taxable: number; cgst: number; sgst: number; igst: number }>();
    validLines.forEach(l => {
      const existing = taxMap.get(l.gst_rate) || { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
      taxMap.set(l.gst_rate, {
        taxable: existing.taxable + l.taxable_value,
        cgst: existing.cgst + l.cgst,
        sgst: existing.sgst + l.sgst,
        igst: existing.igst + l.igst,
      });
    });

    const taxSummary = Array.from(taxMap.entries()).map(([rate, vals]) => ({
      invoice_id: invoiceId,
      gst_rate: rate,
      taxable_value: vals.taxable,
      cgst_amount: vals.cgst,
      sgst_amount: vals.sgst,
      igst_amount: vals.igst,
      total_tax: vals.cgst + vals.sgst + vals.igst,
    }));

    await supabase.from("invoice_tax_summary").insert(taxSummary);

    toast({ title: `Invoice ${editInvoiceId ? 'updated' : status === 'final' ? 'created' : 'saved as draft'}`, description: invoiceNumber });
    setSaving(false);
    navigate(editInvoiceId ? `/invoices/${invoiceId}` : "/invoices");
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Please select a company first.</p>;

  return (
    <div className="space-y-3 px-1 text-sm sm:px-0">
      <h1 className="border-b border-zinc-500 bg-zinc-200 px-2 py-1 text-lg font-semibold text-zinc-900">{editInvoiceId ? "Edit Invoice" : "New Invoice Entry"}</h1>

      <Card className="rounded-none border-zinc-500 bg-zinc-100 shadow-none">
        <CardHeader className="border-b border-zinc-400 px-3 py-2"><CardTitle className="text-base font-semibold">Invoice Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Invoice Date</Label>
              <Input className="h-8 rounded-none border-zinc-400 bg-white text-xs" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select value={customerId} onValueChange={handleCustomerChange}>
                <SelectTrigger className="h-8 rounded-none border-zinc-400 bg-white text-xs"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__add_new_customer__">+ Add New Customer</SelectItem>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.trade_name} {c.gstin ? `(${c.gstin})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Place of Supply *</Label>
              <Select value={placeOfSupplyCode} onValueChange={setPlaceOfSupplyCode}>
                <SelectTrigger className="h-8 rounded-none border-zinc-400 bg-white text-xs"><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.code} - {s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {showAddCustomer && (
            <div className="mt-3 border border-zinc-400 bg-zinc-100 p-3">
              <div className="mb-2 text-sm font-semibold">Add New Customer</div>
              <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
                <Select value={newCustomerType} onValueChange={(v) => setNewCustomerType(v as any)}>
                  <SelectTrigger className="h-10 rounded-none border-zinc-400 bg-white text-sm"><SelectValue placeholder="Customer Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="registered">Registered</SelectItem>
                    <SelectItem value="unregistered">Unregistered</SelectItem>
                    <SelectItem value="export">Export</SelectItem>
                    <SelectItem value="sez">SEZ</SelectItem>
                  </SelectContent>
                </Select>
                <Input className="h-10 rounded-none border-zinc-400 bg-white text-sm" placeholder="Trade name *" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} />
                <Input className="h-10 rounded-none border-zinc-400 bg-white text-sm" placeholder="Legal name" value={newCustomerLegalName} onChange={(e) => setNewCustomerLegalName(e.target.value)} />
                <Input className="h-10 rounded-none border-zinc-400 bg-white text-sm" placeholder="Contact person" value={newCustomerContactPerson} onChange={(e) => setNewCustomerContactPerson(e.target.value)} />
              </div>

              <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                <Input className="h-10 rounded-none border-zinc-400 bg-white text-sm" placeholder="GSTIN" value={newCustomerGstin} onChange={(e) => setNewCustomerGstin(e.target.value.toUpperCase())} />
                <Input className="h-10 rounded-none border-zinc-400 bg-white text-sm" placeholder="Mobile" value={newCustomerMobile} onChange={(e) => setNewCustomerMobile(e.target.value)} />
                <Input className="h-10 rounded-none border-zinc-400 bg-white text-sm" placeholder="Email" type="email" value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} />
              </div>

              <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
                <Input className="h-10 rounded-none border-zinc-400 bg-white text-sm md:col-span-2" placeholder="Billing address" value={newCustomerAddress} onChange={(e) => setNewCustomerAddress(e.target.value)} />
                <Input className="h-10 rounded-none border-zinc-400 bg-white text-sm" placeholder="City" value={newCustomerCity} onChange={(e) => setNewCustomerCity(e.target.value)} />
                <Input className="h-10 rounded-none border-zinc-400 bg-white text-sm" placeholder="Pincode" value={newCustomerPincode} onChange={(e) => setNewCustomerPincode(e.target.value)} />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={newCustomerStateCode} onValueChange={setNewCustomerStateCode}>
                  <SelectTrigger className="h-10 min-w-[280px] rounded-none border-zinc-400 bg-white text-sm"><SelectValue placeholder="State" /></SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.code} - {s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" className="h-10 rounded-none border-zinc-500 bg-zinc-200 px-4 text-sm" onClick={handleQuickAddCustomer}>Save</Button>
                <Button type="button" variant="outline" className="h-10 rounded-none border-zinc-500 bg-zinc-200 px-4 text-sm" onClick={() => setShowAddCustomer(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {isInterState !== undefined && (
            <p className="mt-2 text-sm font-medium text-primary">
              {isInterState ? "⬆️ Inter-State Supply (IGST)" : "🏠 Intra-State Supply (CGST + SGST)"}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-none border-zinc-500 bg-zinc-100 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-400 px-3 py-2">
          <CardTitle className="text-base font-semibold">Line Items</CardTitle>
          <Button variant="outline" size="sm" className="h-9 rounded-none border-zinc-500 bg-zinc-200 px-3 text-xs shadow-none" onClick={() => setLines([...lines, createEmptyLine()])}>
            <Plus className="mr-1 h-3 w-3" />Add Line
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <p className="mb-2 text-xs text-zinc-600 md:hidden">Swipe left/right to view all columns.</p>
          <Table className="min-w-[980px] [&_th]:bg-zinc-200 [&_th]:text-zinc-800 [&_td]:bg-zinc-50 [&_th]:border-zinc-400 [&_td]:border-zinc-300">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[220px]">Item</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-20">Qty</TableHead>
                <TableHead className="w-24">Rate</TableHead>
                <TableHead className="w-20">Disc %</TableHead>
                <TableHead className="text-right">Taxable</TableHead>
                {isInterState ? (
                  <TableHead className="text-right">IGST</TableHead>
                ) : (
                  <>
                    <TableHead className="text-right">CGST</TableHead>
                    <TableHead className="text-right">SGST</TableHead>
                  </>
                )}
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map(line => (
                <>
                  <TableRow key={line.id}>
                    <TableCell>
                      <Select value={line.item_id || ""} onValueChange={(v) => selectItem(line.id, v)}>
                        <SelectTrigger className="h-8 rounded-none border-zinc-400 bg-white text-xs"><SelectValue placeholder="Select item" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__add_new_item__">+ Add New Item</SelectItem>
                          {items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Input className="h-8 rounded-none border-zinc-400 bg-white text-xs" value={line.description} onChange={(e) => updateLine(line.id, { description: e.target.value })} placeholder="Description" /></TableCell>
                    <TableCell><Input className="h-8 rounded-none border-zinc-400 bg-white text-xs" type="number" min="0" value={line.quantity} onChange={(e) => updateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })} /></TableCell>
                    <TableCell><Input className="h-8 rounded-none border-zinc-400 bg-white text-xs" type="number" min="0" step="0.01" value={line.rate} onChange={(e) => updateLine(line.id, { rate: parseFloat(e.target.value) || 0 })} /></TableCell>
                    <TableCell><Input className="h-8 rounded-none border-zinc-400 bg-white text-xs" type="number" min="0" max="100" value={line.discount_percent} onChange={(e) => updateLine(line.id, { discount_percent: parseFloat(e.target.value) || 0 })} /></TableCell>
                    <TableCell className="text-right text-xs">{formatINR(line.taxable_value)}</TableCell>
                    {isInterState ? (
                      <TableCell className="text-right text-xs">{formatINR(line.igst)}</TableCell>
                    ) : (
                      <>
                        <TableCell className="text-right text-xs">{formatINR(line.cgst)}</TableCell>
                        <TableCell className="text-right text-xs">{formatINR(line.sgst)}</TableCell>
                      </>
                    )}
                    <TableCell className="text-right font-medium text-xs">{formatINR(line.total)}</TableCell>
                    <TableCell>
                      {lines.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLines(lines.filter(l => l.id !== line.id))}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>

                  {showAddItemForLineId === line.id && (
                    <TableRow>
                      <TableCell colSpan={isInterState ? 9 : 10} className="bg-zinc-100 p-3">
                        <div className="border border-zinc-400 bg-zinc-50 p-3">
                          <div className="mb-2 text-sm font-semibold">Add New Item</div>
                          <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                            <Input className="h-10 rounded-none border-zinc-400 bg-white text-sm" placeholder="Item name *" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} />
                            <Input className="h-10 rounded-none border-zinc-400 bg-white text-sm" placeholder="HSN/SAC" value={newItemHsn} onChange={(e) => setNewItemHsn(e.target.value)} />
                          </div>
                          <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-4">
                            <Select value={newItemType} onValueChange={(v) => setNewItemType(v as "goods" | "services")}>
                              <SelectTrigger className="h-10 rounded-none border-zinc-400 bg-white text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="goods">Goods</SelectItem>
                                <SelectItem value="services">Services</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input className="h-10 rounded-none border-zinc-400 bg-white text-sm" type="number" placeholder="Default Price" value={newItemRate} onChange={(e) => setNewItemRate(parseFloat(e.target.value) || 0)} />
                            <Select value={newItemGstRate.toString()} onValueChange={(v) => setNewItemGstRate(parseFloat(v))}>
                              <SelectTrigger className="h-10 rounded-none border-zinc-400 bg-white text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>{GST_RATES.map(r => <SelectItem key={r} value={r.toString()}>{r}%</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={newItemUnit} onValueChange={setNewItemUnit}>
                              <SelectTrigger className="h-10 rounded-none border-zinc-400 bg-white text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <Input className="mb-2 h-10 rounded-none border-zinc-400 bg-white text-sm" placeholder="Description" value={newItemDescription} onChange={(e) => setNewItemDescription(e.target.value)} />
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" className="h-10 rounded-none border-zinc-500 bg-zinc-200 px-4 text-sm" onClick={() => handleQuickAddItem(line.id)}>Save</Button>
                            <Button type="button" variant="outline" className="h-10 rounded-none border-zinc-500 bg-zinc-200 px-4 text-sm" onClick={() => setShowAddItemForLineId(null)}>Cancel</Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="rounded-none border-zinc-500 bg-zinc-100 shadow-none">
        <CardContent className="pt-3">
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Taxable Value:</span>
              <span className="w-32 text-right font-medium">{formatINR(totals.taxable)}</span>
            </div>
            {!isInterState && (
              <>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">CGST:</span>
                  <span className="w-32 text-right">{formatINR(totals.cgst)}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">SGST:</span>
                  <span className="w-32 text-right">{formatINR(totals.sgst)}</span>
                </div>
              </>
            )}
            {isInterState && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">IGST:</span>
                <span className="w-32 text-right">{formatINR(totals.igst)}</span>
              </div>
            )}
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Discount:</span>
              <Input className="w-32 text-right h-8" type="number" value={discountAmount} onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Round Off:</span>
              <Input className="w-32 text-right h-8" type="number" step="0.01" value={roundOff} onChange={(e) => setRoundOff(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="flex items-center gap-4 border-t pt-2">
              <span className="text-base font-bold">Grand Total:</span>
              <span className="w-32 text-right text-lg font-bold text-primary">{formatINR(grandTotal)}</span>
            </div>
            <p className="text-xs text-muted-foreground italic">{numberToWordsINR(grandTotal)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col justify-end gap-2 border-t border-zinc-400 pt-2 sm:flex-row">
        <Button variant="outline" className="h-10 rounded-none border-zinc-500 bg-zinc-200 text-xs shadow-none" onClick={() => handleSave("draft")} disabled={saving}>
          <Save className="mr-1 h-3 w-3" />{editInvoiceId ? "Update Draft" : "Save Draft"}
        </Button>
        <Button className="h-10 rounded-none bg-zinc-800 px-3 text-xs text-white shadow-none hover:bg-zinc-700" onClick={() => handleSave("final")} disabled={saving}>
          <Save className="mr-1 h-3 w-3" />{editInvoiceId ? "Update Invoice" : "Finalize Invoice"}
        </Button>
      </div>
    </div>
  );
}
