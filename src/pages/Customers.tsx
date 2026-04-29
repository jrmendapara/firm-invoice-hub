import { ChangeEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { INDIAN_STATES, validateGSTIN, getStateFromGSTIN } from "@/lib/indian-states";
import { Pencil, Plus, Search, Upload, Users } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import * as XLSX from "xlsx";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type CustomerType = Database["public"]["Enums"]["customer_type"];

const emptyForm = {
  gstin: "",
  trade_name: "",
  legal_name: "",
  contact_person: "",
  billing_address_line1: "",
  billing_city: "",
  billing_state_code: "",
  billing_pincode: "",
  mobile: "",
  email: "",
  customer_type: "registered" as CustomerType,
};

export default function Customers() {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchCustomers = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase.from("customers").select("*").eq("company_id", selectedCompany.id).eq("is_active", true).order("trade_name");
    setCustomers(data || []);
  };

  useEffect(() => {
    fetchCustomers();
  }, [selectedCompany]);

  const openCreate = () => {
    setEditingCustomer(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({
      gstin: customer.gstin || "",
      trade_name: customer.trade_name || "",
      legal_name: customer.legal_name || "",
      contact_person: customer.contact_person || "",
      billing_address_line1: customer.billing_address_line1 || "",
      billing_city: customer.billing_city || "",
      billing_state_code: customer.billing_state_code || "",
      billing_pincode: customer.billing_pincode || "",
      mobile: customer.mobile || "",
      email: customer.email || "",
      customer_type: customer.customer_type,
    });
    setDialogOpen(true);
  };

  const handleFetchGST = () => {
    if (!form.gstin || !validateGSTIN(form.gstin)) {
      toast({ title: "Enter a valid 15-character GSTIN first", variant: "destructive" });
      return;
    }
    const stateCode = form.gstin.substring(0, 2);
    const state = INDIAN_STATES.find((s) => s.code === stateCode);
    setForm((f) => ({ ...f, billing_state_code: state?.code || f.billing_state_code }));
    toast({ title: "State extracted from GSTIN" });
  };

  const handleGSTINChange = (value: string) => {
    const upper = value.toUpperCase();
    setForm((f) => ({ ...f, gstin: upper }));
    if (upper.length === 15) {
      const state = getStateFromGSTIN(upper);
      if (state) setForm((f) => ({ ...f, billing_state_code: state.code }));
    }
  };

  const applyPortalData = (raw: string) => {
    const pick = (label: string) => {
      const re = new RegExp(`${label}\\s*[:\\-]?\\s*([^\\n\\r]+)`, "i");
      return raw.match(re)?.[1]?.trim() || "";
    };

    const legal = pick("Legal Name of Business") || pick("Legal Name");
    const trade = pick("Trade Name");
    const address = pick("Principal Place of Business") || pick("Address");
    const mobile = pick("Mobile") || pick("Mobile No");
    const email = pick("Email") || pick("Email Address");

    setForm((f) => ({
      ...f,
      legal_name: legal || f.legal_name,
      trade_name: trade || legal || f.trade_name,
      billing_address_line1: address || f.billing_address_line1,
      mobile: mobile || f.mobile,
      email: email || f.email,
    }));
  };

  const fetchFromGSTPortalCaptcha = async () => {
    const gstin = form.gstin?.trim();
    if (!gstin || !validateGSTIN(gstin)) {
      toast({ title: "Enter valid GSTIN first", variant: "destructive" });
      return;
    }

    const configuredBaseUrl = (
      localStorage.getItem("gstAutomationUrl") ||
      import.meta.env.VITE_GST_AUTOMATION_URL ||
      "https://cool-marked-statutory-acquire.trycloudflare.com"
    ).trim();
    if (!configuredBaseUrl) {
      toast({
        title: "GST automation URL missing",
        description: "Set VITE_GST_AUTOMATION_URL to your GST Playwright service URL.",
        variant: "destructive",
      });
      return;
    }

    const baseUrl = configuredBaseUrl.replace(/\/$/, "");
    if (window.location.protocol === "https:" && baseUrl.startsWith("http://")) {
      toast({
        title: "Blocked by browser security",
        description: "App is on HTTPS but GST service is HTTP. Use HTTPS URL for VITE_GST_AUTOMATION_URL.",
        variant: "destructive",
      });
      return;
    }

    try {
      const startRes = await fetch(`${baseUrl}/api/gst/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gstin }),
      });
      const startJson = await startRes.json();
      if (!startRes.ok) throw new Error(startJson?.error || "Failed to start GST session");

      const { sessionId, captchaImage } = startJson;
      if (captchaImage) window.open(captchaImage, "_blank", "noopener,noreferrer");

      const captcha = window.prompt("Enter captcha shown in opened image:");
      if (!captcha) {
        await fetch(`${baseUrl}/api/gst/close`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) });
        return;
      }

      const submitRes = await fetch(`${baseUrl}/api/gst/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, captcha }),
      });
      const submitJson = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitJson?.error || "Captcha submit failed");

      const data = submitJson?.data || {};
      const text = [
        `Legal Name of Business: ${data.legal_name || ""}`,
        `Trade Name: ${data.trade_name || ""}`,
        `Principal Place of Business: ${data.address || ""}`,
        `Mobile: ${data.mobile || ""}`,
        `Email: ${data.email || ""}`,
      ].join("\n");

      applyPortalData(text);
      toast({ title: "GST portal details fetched" });
    } catch (err: any) {
      toast({ title: "GST fetch failed", description: err?.message || "Service unavailable", variant: "destructive" });
    }
  };

  const fillFromPortalText = () => {
    const raw = window.prompt("Paste GST portal taxpayer details text:");
    if (!raw) return;
    applyPortalData(raw);
    toast({ title: "Portal text applied" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    if (form.customer_type === "registered" && form.gstin && !validateGSTIN(form.gstin)) {
      toast({ title: "Invalid GSTIN", description: "Please enter a valid 15-character GSTIN.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const state = INDIAN_STATES.find((s) => s.code === form.billing_state_code);

    const payload = {
      gstin: form.gstin || null,
      trade_name: form.trade_name,
      legal_name: form.legal_name || null,
      contact_person: form.contact_person || null,
      billing_address_line1: form.billing_address_line1 || null,
      billing_city: form.billing_city || null,
      billing_state_name: state?.name || null,
      billing_state_code: form.billing_state_code || null,
      billing_pincode: form.billing_pincode || null,
      mobile: form.mobile || null,
      email: form.email || null,
      customer_type: form.customer_type,
    };

    const query = editingCustomer
      ? supabase.from("customers").update(payload).eq("id", editingCustomer.id)
      : supabase.from("customers").insert({ company_id: selectedCompany.id, ...payload });

    const { error } = await query;
    setLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingCustomer ? "Customer updated" : "Customer created" });
      setDialogOpen(false);
      setEditingCustomer(null);
      setForm(emptyForm);
      fetchCustomers();
    }
  };

  const downloadCustomersTemplate = () => {
    const rows = [
      {
        trade_name: "ABC Traders",
        gstin: "24AAAAA0000A1Z5",
        customer_type: "registered",
        legal_name: "ABC Traders Pvt Ltd",
        contact_person: "John",
        billing_address_line1: "Street 1",
        billing_city: "Rajkot",
        billing_state_code: "24",
        billing_pincode: "360001",
        mobile: "9876543210",
        email: "abc@example.com",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CustomersTemplate");
    XLSX.writeFile(wb, "customers_import_template.xlsx");
  };

  const handleImportCustomersClick = () => {
    downloadCustomersTemplate();
    setTimeout(() => importInputRef.current?.click(), 150);
  };

  const handleImportCustomers = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCompany) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

      const inserts = rows
        .map((r) => {
          const gstin = String(r.gstin || r.GSTIN || "").trim().toUpperCase();
          const stateCode = String(r.billing_state_code || r.state_code || r.StateCode || "").trim();
          const state = INDIAN_STATES.find((s) => s.code === stateCode);
          return {
            company_id: selectedCompany.id,
            trade_name: String(r.trade_name || r["Trade Name"] || r.name || r.Name || "").trim(),
            legal_name: String(r.legal_name || r["Legal Name"] || "").trim() || null,
            contact_person: String(r.contact_person || r["Contact Person"] || "").trim() || null,
            gstin: gstin || null,
            customer_type: (String(r.customer_type || r.Type || (gstin ? "registered" : "unregistered")).toLowerCase() || "unregistered") as CustomerType,
            billing_address_line1: String(r.billing_address_line1 || r.address || r.Address || "").trim() || null,
            billing_city: String(r.billing_city || r.city || r.City || "").trim() || null,
            billing_state_code: stateCode || null,
            billing_state_name: state?.name || null,
            billing_pincode: String(r.billing_pincode || r.pincode || r.Pincode || "").trim() || null,
            mobile: String(r.mobile || r.Mobile || "").trim() || null,
            email: String(r.email || r.Email || "").trim() || null,
            is_active: true,
          };
        })
        .filter((r) => r.trade_name);

      if (inserts.length === 0) {
        toast({ title: "No valid rows found", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("customers").insert(inserts);
      if (error) throw error;
      toast({ title: `Imported ${inserts.length} customers` });
      fetchCustomers();
    } catch (err: any) {
      toast({ title: "Import failed", description: err?.message || "Invalid Excel format", variant: "destructive" });
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const filtered = customers.filter(
    (c) => c.trade_name.toLowerCase().includes(search.toLowerCase()) || (c.gstin || "").toLowerCase().includes(search.toLowerCase()) || (c.mobile || "").includes(search)
  );

  if (!selectedCompany) return <p className="text-muted-foreground">Please select a company first.</p>;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Customers"
        description="Buyers you bill — registered, unregistered, export and SEZ."
        actions={<>
          <input ref={importInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportCustomers} />
          <Button variant="outline" onClick={handleImportCustomersClick}>
            <Upload className="mr-2 h-4 w-4" />Import Excel
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCustomer ? "Edit Customer" : "Add Customer"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2 space-y-2">
                    <Label>Customer Type</Label>
                    <Select value={form.customer_type} onValueChange={(v) => setForm((f) => ({ ...f, customer_type: v as CustomerType }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="registered">Registered</SelectItem>
                        <SelectItem value="unregistered">Unregistered</SelectItem>
                        <SelectItem value="export">Export</SelectItem>
                        <SelectItem value="sez">SEZ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {form.customer_type === "registered" && (
                    <div className="md:col-span-2 space-y-2">
                      <Label>GSTIN</Label>
                      <div className="flex flex-wrap gap-2">
                        <Input value={form.gstin} onChange={(e) => handleGSTINChange(e.target.value)} placeholder="22AAAAA0000A1Z5" maxLength={15} />
                        <Button type="button" variant="outline" onClick={handleFetchGST} disabled={form.gstin.length !== 15}>Extract Info</Button>
                      <Button type="button" variant="outline" onClick={fetchFromGSTPortalCaptcha} disabled={form.gstin.length !== 15}>Fetch from GST Portal</Button>
                      <Button type="button" variant="outline" onClick={fillFromPortalText}>Paste Portal Text</Button>
                      </div>
                    </div>
                  )}

                  <div className="md:col-span-2 space-y-2"><Label>Trade Name *</Label><Input value={form.trade_name} onChange={(e) => setForm((f) => ({ ...f, trade_name: e.target.value }))} required /></div>
                  <div className="space-y-2"><Label>Legal Name</Label><Input value={form.legal_name} onChange={(e) => setForm((f) => ({ ...f, legal_name: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Contact Person</Label><Input value={form.contact_person} onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))} /></div>
                  <div className="md:col-span-2 space-y-2"><Label>Address</Label><Input value={form.billing_address_line1} onChange={(e) => setForm((f) => ({ ...f, billing_address_line1: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>City</Label><Input value={form.billing_city} onChange={(e) => setForm((f) => ({ ...f, billing_city: e.target.value }))} /></div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Select value={form.billing_state_code} onValueChange={(v) => setForm((f) => ({ ...f, billing_state_code: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                      <SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s.code} value={s.code}>{s.code} - {s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Mobile</Label><Input value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Saving..." : editingCustomer ? "Update Customer" : "Save Customer"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </>}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by name, GSTIN, or mobile..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[860px]">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Trade Name</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="p-0">
                  <EmptyState
                    icon={Users}
                    title="No customers found"
                    description={search ? "Try a different search term." : "Add your first customer to start invoicing."}
                  />
                </TableCell></TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id} className="even:bg-muted/30 hover:bg-accent/60">
                    <TableCell className="font-medium">{c.trade_name}</TableCell>
                    <TableCell className="font-mono text-sm">{c.gstin || "-"}</TableCell>
                    <TableCell>{c.billing_state_name || "-"}</TableCell>
                    <TableCell className="capitalize">{c.customer_type}</TableCell>
                    <TableCell>{c.mobile || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
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
