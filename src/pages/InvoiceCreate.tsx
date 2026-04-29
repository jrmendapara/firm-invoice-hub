import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { z } from "zod";
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
import {
  INDIAN_STATES,
  GST_RATES,
  UNITS,
  getCurrentFinancialYear,
  numberToWordsINR,
  formatINR,
  validateGSTIN,
  getStateFromGSTIN,
} from "@/lib/indian-states";
import {
  Plus,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle2,
  ArrowLeftRight,
  Home,
  X,
  Wand2,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { cn } from "@/lib/utils";
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
    id: crypto.randomUUID(),
    item_id: null,
    description: "",
    hsn_sac: "",
    quantity: 1,
    unit: "Nos",
    rate: 0,
    discount_percent: 0,
    gst_rate: 18,
    taxable_value: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    total: 0,
  };
}

const headerSchema = z.object({
  customerId: z.string().uuid({ message: "Select a customer" }),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  placeOfSupplyCode: z.string().min(2, "Place of supply is required"),
});

const newCustomerSchema = z.object({
  trade_name: z.string().trim().min(1, "Trade name is required").max(120, "Max 120 characters"),
  legal_name: z.string().trim().max(120, "Max 120 characters").optional().or(z.literal("")),
  contact_person: z.string().trim().max(80, "Max 80 characters").optional().or(z.literal("")),
  gstin: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || validateGSTIN(v), { message: "Invalid GSTIN format" }),
  email: z
    .string()
    .trim()
    .max(255)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: "Invalid email" }),
  mobile: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^[0-9+\-\s]{6,15}$/.test(v), { message: "Invalid mobile" }),
  pincode: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^[0-9]{6}$/.test(v), { message: "Pincode must be 6 digits" }),
  state_code: z.string().min(2, "Select state"),
});

// Per-line validation. We re-derive taxable/tax from primitive inputs so that
// stale/tampered numeric fields cannot bypass GST math.
const lineItemSchema = z
  .object({
    description: z.string().trim().min(1, "Description is required").max(500, "Max 500 characters"),
    hsn_sac: z.string().trim().max(10, "Max 10 chars").optional().or(z.literal("")),
    quantity: z.number({ invalid_type_error: "Quantity must be a number" })
      .positive("Quantity must be greater than zero")
      .max(1_000_000, "Quantity too large"),
    rate: z.number({ invalid_type_error: "Rate must be a number" })
      .nonnegative("Rate cannot be negative")
      .max(1_00_00_00_000, "Rate too large"),
    discount_percent: z.number().min(0, "Discount cannot be negative").max(100, "Discount cannot exceed 100%"),
    gst_rate: z.number().refine((v) => GST_RATES.includes(v as typeof GST_RATES[number]), {
      message: "GST rate must be a standard slab",
    }),
    taxable_value: z.number().nonnegative(),
    cgst: z.number().nonnegative(),
    sgst: z.number().nonnegative(),
    igst: z.number().nonnegative(),
  })
  .superRefine((l, ctx) => {
    const expectedTaxable = +(l.quantity * l.rate * (1 - l.discount_percent / 100)).toFixed(2);
    if (Math.abs(expectedTaxable - +l.taxable_value.toFixed(2)) > 0.05) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["taxable_value"],
        message: `Taxable value mismatch (expected ₹${expectedTaxable.toFixed(2)})`,
      });
    }
  });

type FieldErrors = Record<string, string>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
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
  const [errors, setErrors] = useState<FieldErrors>({});

  // Quick-add customer
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
  const [custErrors, setCustErrors] = useState<FieldErrors>({});

  // Quick-add item
  const [showAddItemForLineId, setShowAddItemForLineId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemType, setNewItemType] = useState<"goods" | "services">("goods");
  const [newItemHsn, setNewItemHsn] = useState("");
  const [newItemRate, setNewItemRate] = useState(0);
  const [newItemGstRate, setNewItemGstRate] = useState(18);
  const [newItemUnit, setNewItemUnit] = useState("Nos");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [itemErrors, setItemErrors] = useState<FieldErrors>({});

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
    const cust = customers.find((c) => c.id === customerId);
    if (cust?.billing_state_code) {
      setPlaceOfSupplyCode(cust.billing_state_code);
    }
  }, [customerId, customers]);

  useEffect(() => {
    if (selectedCompany?.state_code && !newCustomerStateCode) {
      setNewCustomerStateCode(selectedCompany.state_code);
    }
  }, [selectedCompany, newCustomerStateCode]);

  const isInterState =
    selectedCompany && placeOfSupplyCode && selectedCompany.state_code !== placeOfSupplyCode;

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) || null,
    [customers, customerId],
  );

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
    setLines((prev) => prev.map((l) => (l.id === id ? recalcLine({ ...l, ...updates }) : l)));
  };

  const selectItem = (lineId: string, itemId: string) => {
    if (itemId === "__add_new_item__") {
      setShowAddItemForLineId(lineId);
      return;
    }
    const item = items.find((i) => i.id === itemId);
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
    setErrors((prev) => ({ ...prev, customerId: "" }));
  };

  // GSTIN auto-extract for quick-add
  const handleNewCustomerGstinChange = (raw: string) => {
    const upper = raw.toUpperCase().slice(0, 15);
    setNewCustomerGstin(upper);
    setCustErrors((p) => ({ ...p, gstin: "" }));

    if (upper.length >= 2) {
      const state = getStateFromGSTIN(upper);
      if (state && state.code !== newCustomerStateCode) {
        setNewCustomerStateCode(state.code);
      }
    }
    if (upper.length === 15 && !validateGSTIN(upper)) {
      setCustErrors((p) => ({ ...p, gstin: "Invalid GSTIN format" }));
      return;
    }
    if (upper.length === 15 && validateGSTIN(upper)) {
      const dup = customers.find(
        (c) => (c.gstin || "").toUpperCase() === upper
      );
      if (dup) {
        setCustErrors((p) => ({
          ...p,
          gstin: `GSTIN already exists for "${dup.trade_name}"`,
        }));
      }
    }
  };

  const handleQuickAddCustomer = async () => {
    if (!selectedCompany) return;

    const parsed = newCustomerSchema.safeParse({
      trade_name: newCustomerName,
      legal_name: newCustomerLegalName,
      contact_person: newCustomerContactPerson,
      gstin: newCustomerGstin,
      email: newCustomerEmail,
      mobile: newCustomerMobile,
      pincode: newCustomerPincode,
      state_code: newCustomerStateCode,
    });

    if (!parsed.success) {
      const fieldErr: FieldErrors = {};
      parsed.error.issues.forEach((i) => {
        if (i.path[0]) fieldErr[String(i.path[0])] = i.message;
      });
      setCustErrors(fieldErr);
      return;
    }
    // Duplicate GSTIN guard within the same company
    const trimmedGstin = newCustomerGstin.trim().toUpperCase();
    if (trimmedGstin) {
      const dup = customers.find(
        (c) => (c.gstin || "").toUpperCase() === trimmedGstin
      );
      if (dup) {
        setCustErrors({
          gstin: `GSTIN already exists for "${dup.trade_name}"`,
        });
        return;
      }
    }
    setCustErrors({});

    const state = INDIAN_STATES.find((s) => s.code === newCustomerStateCode);

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

    setCustomers((prev) => [...prev, data].sort((a, b) => a.trade_name.localeCompare(b.trade_name)));
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

    const errs: FieldErrors = {};
    if (!newItemName.trim()) errs.name = "Item name is required";
    if (newItemRate < 0) errs.rate = "Rate cannot be negative";
    if (Object.keys(errs).length) {
      setItemErrors(errs);
      return;
    }
    setItemErrors({});

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

    setItems((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
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
    setLines((prev) => prev.map((l) => recalcLine(l)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInterState]);

  const totals = lines.reduce(
    (acc, l) => ({
      taxable: acc.taxable + l.taxable_value,
      cgst: acc.cgst + l.cgst,
      sgst: acc.sgst + l.sgst,
      igst: acc.igst + l.igst,
      total: acc.total + l.total,
    }),
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
  );

  const grandTotal = totals.total - discountAmount + roundOff;

  const validateAll = (): boolean => {
    const fieldErr: FieldErrors = {};
    const parsed = headerSchema.safeParse({ customerId, invoiceDate, placeOfSupplyCode });
    if (!parsed.success) {
      parsed.error.issues.forEach((i) => {
        if (i.path[0]) fieldErr[String(i.path[0])] = i.message;
      });
    }
    const validLines = lines.filter((l) => l.description.trim());
    if (validLines.length === 0) fieldErr.lines = "Add at least one line item with a description";
    const badQty = lines.find((l) => l.description.trim() && l.quantity <= 0);
    if (badQty) fieldErr.lines = "Quantity must be greater than zero";

    setErrors(fieldErr);
    return Object.keys(fieldErr).length === 0;
  };

  const handleSave = async (status: "draft" | "final") => {
    if (!selectedCompany || !user) return;
    if (!validateAll()) {
      toast({ title: "Please fix the highlighted fields", variant: "destructive" });
      return;
    }

    setSaving(true);
    const fy = getCurrentFinancialYear();
    const placeState = INDIAN_STATES.find((s) => s.code === placeOfSupplyCode);

    let invoiceNumber = "";
    let invoiceId = editInvoiceId || "";

    if (editInvoiceId) {
      const { data: currentInvoice } = await supabase
        .from("invoices")
        .select("invoice_number, financial_year, created_by")
        .eq("id", editInvoiceId)
        .single();
      invoiceNumber = currentInvoice?.invoice_number || "";

      const { error } = await supabase
        .from("invoices")
        .update({
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
        })
        .eq("id", editInvoiceId);

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

      const { data: invoice, error } = await supabase
        .from("invoices")
        .insert({
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
        })
        .select()
        .single();

      if (error || !invoice) {
        toast({
          title: "Error",
          description: error?.message || "Failed to create invoice",
          variant: "destructive",
        });
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

    const validLines = lines.filter((l) => l.description.trim());
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

    const taxMap = new Map<number, { taxable: number; cgst: number; sgst: number; igst: number }>();
    validLines.forEach((l) => {
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

    toast({
      title: `Invoice ${editInvoiceId ? "updated" : status === "final" ? "created" : "saved as draft"}`,
      description: invoiceNumber,
    });
    setSaving(false);
    navigate(editInvoiceId ? `/invoices/${invoiceId}` : "/invoices");
  };

  if (!selectedCompany) {
    return <p className="text-muted-foreground">Please select a company first.</p>;
  }

  const newCustGstinValid = newCustomerGstin.length === 15 && validateGSTIN(newCustomerGstin);
  const newCustGstinPartial = newCustomerGstin.length > 0 && newCustomerGstin.length < 15;

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title={editInvoiceId ? "Edit Invoice" : "New Invoice"}
        description={
          editInvoiceId
            ? "Update invoice details. Saved drafts can be edited until finalized."
            : `Issuing from ${selectedCompany.name} • FY ${getCurrentFinancialYear()}`
        }
        actions={
          <Button asChild variant="outline">
            <Link to="/invoices"><X className="mr-2 h-4 w-4" />Cancel</Link>
          </Button>
        }
      />

      {/* Header card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="invoice-date">Invoice Date <span className="text-destructive">*</span></Label>
              <Input
                id="invoice-date"
                type="date"
                value={invoiceDate}
                onChange={(e) => {
                  setInvoiceDate(e.target.value);
                  setErrors((p) => ({ ...p, invoiceDate: "" }));
                }}
                aria-invalid={!!errors.invoiceDate}
                className={cn("mt-1.5", errors.invoiceDate && "border-destructive focus-visible:ring-destructive")}
              />
              <FieldError message={errors.invoiceDate} />
            </div>

            <div>
              <Label htmlFor="customer">Customer <span className="text-destructive">*</span></Label>
              <Select value={customerId} onValueChange={handleCustomerChange}>
                <SelectTrigger
                  id="customer"
                  aria-invalid={!!errors.customerId}
                  className={cn("mt-1.5", errors.customerId && "border-destructive focus:ring-destructive")}
                >
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__add_new_customer__">+ Add New Customer</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.trade_name} {c.gstin ? `(${c.gstin})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.customerId} />
            </div>

            <div>
              <Label htmlFor="pos">Place of Supply <span className="text-destructive">*</span></Label>
              <Select
                value={placeOfSupplyCode}
                onValueChange={(v) => {
                  setPlaceOfSupplyCode(v);
                  setErrors((p) => ({ ...p, placeOfSupplyCode: "" }));
                }}
              >
                <SelectTrigger
                  id="pos"
                  aria-invalid={!!errors.placeOfSupplyCode}
                  className={cn("mt-1.5", errors.placeOfSupplyCode && "border-destructive focus:ring-destructive")}
                >
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.placeOfSupplyCode} />
            </div>
          </div>

          {/* Customer preview + supply badge */}
          <div className="flex flex-wrap items-center gap-3">
            {selectedCustomer && (
              <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-xs">
                <span className="font-medium text-foreground">{selectedCustomer.trade_name}</span>
                {selectedCustomer.gstin && (
                  <span className="font-mono text-muted-foreground">GSTIN: {selectedCustomer.gstin}</span>
                )}
                {selectedCustomer.billing_state_name && (
                  <span className="text-muted-foreground">State: {selectedCustomer.billing_state_name}</span>
                )}
                {selectedCustomer.mobile && (
                  <span className="text-muted-foreground">📱 {selectedCustomer.mobile}</span>
                )}
              </div>
            )}
            {placeOfSupplyCode && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
                  isInterState
                    ? "bg-[hsl(var(--accent-violet)/0.12)] text-[hsl(var(--accent-violet))]"
                    : "bg-[hsl(var(--accent-emerald)/0.12)] text-[hsl(var(--accent-emerald))]",
                )}
              >
                {isInterState ? <ArrowLeftRight className="h-3.5 w-3.5" /> : <Home className="h-3.5 w-3.5" />}
                {isInterState ? "Inter-State (IGST)" : "Intra-State (CGST + SGST)"}
              </span>
            )}
          </div>

          {/* Quick add customer */}
          {showAddCustomer && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Add New Customer</h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowAddCustomer(false); setCustErrors({}); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div>
                  <Label className="text-xs">Customer Type</Label>
                  <Select value={newCustomerType} onValueChange={(v) => setNewCustomerType(v as any)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="registered">Registered</SelectItem>
                      <SelectItem value="unregistered">Unregistered</SelectItem>
                      <SelectItem value="export">Export</SelectItem>
                      <SelectItem value="sez">SEZ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Trade Name <span className="text-destructive">*</span></Label>
                  <Input
                    className={cn("mt-1", custErrors.trade_name && "border-destructive")}
                    value={newCustomerName}
                    maxLength={120}
                    onChange={(e) => { setNewCustomerName(e.target.value); setCustErrors((p) => ({ ...p, trade_name: "" })); }}
                    placeholder="Acme Pvt Ltd"
                  />
                  <FieldError message={custErrors.trade_name} />
                </div>
                <div>
                  <Label className="text-xs">Legal Name</Label>
                  <Input className="mt-1" value={newCustomerLegalName} maxLength={120} onChange={(e) => setNewCustomerLegalName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Contact Person</Label>
                  <Input className="mt-1" value={newCustomerContactPerson} maxLength={80} onChange={(e) => setNewCustomerContactPerson(e.target.value)} />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <Label className="text-xs flex items-center gap-1.5">
                    GSTIN
                    {newCustGstinValid && <CheckCircle2 className="h-3 w-3 text-[hsl(var(--accent-emerald))]" />}
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      className={cn(
                        "pr-9 font-mono uppercase",
                        custErrors.gstin && "border-destructive",
                        newCustGstinValid && "border-[hsl(var(--accent-emerald))]",
                      )}
                      value={newCustomerGstin}
                      onChange={(e) => handleNewCustomerGstinChange(e.target.value)}
                      placeholder="22AAAAA0000A1Z5"
                      maxLength={15}
                    />
                    {newCustGstinPartial && !custErrors.gstin && (
                      <Wand2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    )}
                  </div>
                  {newCustGstinValid && !custErrors.gstin && (
                    <p className="mt-1 text-xs text-[hsl(var(--accent-emerald))]">
                      Auto-filled state from GSTIN
                    </p>
                  )}
                  <FieldError message={custErrors.gstin} />
                </div>
                <div>
                  <Label className="text-xs">Mobile</Label>
                  <Input
                    className={cn("mt-1", custErrors.mobile && "border-destructive")}
                    value={newCustomerMobile}
                    onChange={(e) => { setNewCustomerMobile(e.target.value); setCustErrors((p) => ({ ...p, mobile: "" })); }}
                    placeholder="9876543210"
                  />
                  <FieldError message={custErrors.mobile} />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input
                    className={cn("mt-1", custErrors.email && "border-destructive")}
                    type="email"
                    value={newCustomerEmail}
                    maxLength={255}
                    onChange={(e) => { setNewCustomerEmail(e.target.value); setCustErrors((p) => ({ ...p, email: "" })); }}
                    placeholder="billing@acme.com"
                  />
                  <FieldError message={custErrors.email} />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="md:col-span-2">
                  <Label className="text-xs">Billing Address</Label>
                  <Input className="mt-1" value={newCustomerAddress} maxLength={200} onChange={(e) => setNewCustomerAddress(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">City</Label>
                  <Input className="mt-1" value={newCustomerCity} maxLength={80} onChange={(e) => setNewCustomerCity(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Pincode</Label>
                  <Input
                    className={cn("mt-1", custErrors.pincode && "border-destructive")}
                    value={newCustomerPincode}
                    maxLength={6}
                    inputMode="numeric"
                    onChange={(e) => { setNewCustomerPincode(e.target.value.replace(/\D/g, "")); setCustErrors((p) => ({ ...p, pincode: "" })); }}
                    placeholder="560001"
                  />
                  <FieldError message={custErrors.pincode} />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div className="min-w-[220px] flex-1">
                  <Label className="text-xs">State <span className="text-destructive">*</span></Label>
                  <Select value={newCustomerStateCode} onValueChange={(v) => { setNewCustomerStateCode(v); setCustErrors((p) => ({ ...p, state_code: "" })); }}>
                    <SelectTrigger className={cn("mt-1", custErrors.state_code && "border-destructive")}>
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s.code} value={s.code}>{s.code} - {s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={custErrors.state_code} />
                </div>
                <div className="flex gap-2">
                  <Button type="button" onClick={handleQuickAddCustomer}>Save Customer</Button>
                  <Button type="button" variant="outline" onClick={() => { setShowAddCustomer(false); setCustErrors({}); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Line Items</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setLines([...lines, createEmptyLine()])}>
            <Plus className="mr-1.5 h-4 w-4" />Add Line
          </Button>
        </CardHeader>
        <CardContent>
          {errors.lines && (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {errors.lines}
            </div>
          )}
          <div className="overflow-x-auto">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Item</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-20">Qty</TableHead>
                  <TableHead className="w-24">Rate</TableHead>
                  <TableHead className="w-20">Disc %</TableHead>
                  <TableHead className="w-20">GST%</TableHead>
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
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <>
                    <TableRow key={line.id} className="even:bg-muted/30">
                      <TableCell>
                        <Select value={line.item_id || ""} onValueChange={(v) => selectItem(line.id, v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__add_new_item__">+ Add New Item</SelectItem>
                            {items.map((i) => (
                              <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 text-xs"
                          value={line.description}
                          onChange={(e) => updateLine(line.id, { description: e.target.value })}
                          placeholder="Description"
                          maxLength={500}
                        />
                      </TableCell>
                      <TableCell>
                        <Input className="h-8 text-xs tabular-nums" type="number" min="0" value={line.quantity}
                          onChange={(e) => updateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })} />
                      </TableCell>
                      <TableCell>
                        <Input className="h-8 text-xs tabular-nums" type="number" min="0" step="0.01" value={line.rate}
                          onChange={(e) => updateLine(line.id, { rate: parseFloat(e.target.value) || 0 })} />
                      </TableCell>
                      <TableCell>
                        <Input className="h-8 text-xs tabular-nums" type="number" min="0" max="100" value={line.discount_percent}
                          onChange={(e) => updateLine(line.id, { discount_percent: parseFloat(e.target.value) || 0 })} />
                      </TableCell>
                      <TableCell>
                        <Select value={String(line.gst_rate)} onValueChange={(v) => updateLine(line.id, { gst_rate: parseFloat(v) })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {GST_RATES.map((r) => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{formatINR(line.taxable_value)}</TableCell>
                      {isInterState ? (
                        <TableCell className="text-right text-xs tabular-nums">{formatINR(line.igst)}</TableCell>
                      ) : (
                        <>
                          <TableCell className="text-right text-xs tabular-nums">{formatINR(line.cgst)}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{formatINR(line.sgst)}</TableCell>
                        </>
                      )}
                      <TableCell className="text-right text-xs font-medium tabular-nums">{formatINR(line.total)}</TableCell>
                      <TableCell>
                        {lines.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setLines(lines.filter((l) => l.id !== line.id))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>

                    {showAddItemForLineId === line.id && (
                      <TableRow>
                        <TableCell colSpan={isInterState ? 10 : 11} className="bg-muted/40 p-4">
                          <div className="rounded-lg border border-border bg-card p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <h4 className="text-sm font-semibold">Add New Item</h4>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowAddItemForLineId(null); setItemErrors({}); }}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              <div>
                                <Label className="text-xs">Item Name <span className="text-destructive">*</span></Label>
                                <Input className={cn("mt-1", itemErrors.name && "border-destructive")} value={newItemName} maxLength={120}
                                  onChange={(e) => { setNewItemName(e.target.value); setItemErrors((p) => ({ ...p, name: "" })); }} />
                                <FieldError message={itemErrors.name} />
                              </div>
                              <div>
                                <Label className="text-xs">HSN/SAC</Label>
                                <Input className="mt-1 font-mono" value={newItemHsn} maxLength={8}
                                  onChange={(e) => setNewItemHsn(e.target.value.replace(/\D/g, ""))} placeholder="998314" />
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                              <div>
                                <Label className="text-xs">Type</Label>
                                <Select value={newItemType} onValueChange={(v) => setNewItemType(v as "goods" | "services")}>
                                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="goods">Goods</SelectItem>
                                    <SelectItem value="services">Services</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Default Price</Label>
                                <Input className={cn("mt-1 tabular-nums", itemErrors.rate && "border-destructive")} type="number" min="0"
                                  value={newItemRate} onChange={(e) => setNewItemRate(parseFloat(e.target.value) || 0)} />
                                <FieldError message={itemErrors.rate} />
                              </div>
                              <div>
                                <Label className="text-xs">GST Rate</Label>
                                <Select value={newItemGstRate.toString()} onValueChange={(v) => setNewItemGstRate(parseFloat(v))}>
                                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {GST_RATES.map((r) => <SelectItem key={r} value={r.toString()}>{r}%</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Unit</Label>
                                <Select value={newItemUnit} onValueChange={setNewItemUnit}>
                                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="mt-3">
                              <Label className="text-xs">Description</Label>
                              <Input className="mt-1" value={newItemDescription} maxLength={500} onChange={(e) => setNewItemDescription(e.target.value)} />
                            </div>
                            <div className="mt-3 flex gap-2">
                              <Button type="button" onClick={() => handleQuickAddItem(line.id)}>Save Item</Button>
                              <Button type="button" variant="outline" onClick={() => { setShowAddItemForLineId(null); setItemErrors({}); }}>Cancel</Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Totals</CardTitle></CardHeader>
        <CardContent>
          <div className="ml-auto max-w-md space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Taxable Value</span>
              <span className="font-medium tabular-nums">{formatINR(totals.taxable)}</span>
            </div>
            {!isInterState ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">CGST</span>
                  <span className="tabular-nums">{formatINR(totals.cgst)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">SGST</span>
                  <span className="tabular-nums">{formatINR(totals.sgst)}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">IGST</span>
                <span className="tabular-nums">{formatINR(totals.igst)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <Label htmlFor="discount" className="text-muted-foreground">Discount</Label>
              <Input id="discount" className="h-8 w-32 text-right tabular-nums" type="number" min="0"
                value={discountAmount} onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <Label htmlFor="round-off" className="text-muted-foreground">Round Off</Label>
              <Input id="round-off" className="h-8 w-32 text-right tabular-nums" type="number" step="0.01"
                value={roundOff} onChange={(e) => setRoundOff(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="mt-2 flex items-center justify-between border-t pt-3">
              <span className="text-base font-semibold">Grand Total</span>
              <span className="text-xl font-bold tabular-nums text-primary">{formatINR(grandTotal)}</span>
            </div>
            <p className="text-right text-xs italic text-muted-foreground">{numberToWordsINR(grandTotal)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:left-[var(--sidebar-width,16rem)]">
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {Object.keys(errors).length > 0 ? (
              <span className="flex items-center gap-1.5 text-destructive">
                <AlertCircle className="h-4 w-4" />
                {Object.keys(errors).length} field{Object.keys(errors).length === 1 ? "" : "s"} need attention
              </span>
            ) : (
              <span>Grand Total: <span className="font-semibold tabular-nums text-foreground">{formatINR(grandTotal)}</span></span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />{editInvoiceId ? "Update Draft" : "Save Draft"}
            </Button>
            <Button onClick={() => handleSave("final")} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />{editInvoiceId ? "Update Invoice" : "Finalize Invoice"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
