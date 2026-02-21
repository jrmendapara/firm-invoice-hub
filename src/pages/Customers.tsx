import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { INDIAN_STATES, validateGSTIN, getStateFromGSTIN } from "@/lib/indian-states";
import { Plus, Search, Loader2 } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type CustomerType = Database["public"]["Enums"]["customer_type"];

export default function Customers() {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingGST, setFetchingGST] = useState(false);

  const [form, setForm] = useState({
    gstin: "", trade_name: "", legal_name: "", contact_person: "",
    billing_address_line1: "", billing_city: "", billing_state_code: "", billing_pincode: "",
    mobile: "", email: "", customer_type: "registered" as CustomerType,
  });

  const fetchCustomers = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("company_id", selectedCompany.id)
      .eq("is_active", true)
      .order("trade_name");
    setCustomers(data || []);
  };

  useEffect(() => { fetchCustomers(); }, [selectedCompany]);

  const handleFetchGST = async () => {
    if (!form.gstin || form.gstin.length !== 15) {
      toast({ title: "Enter a valid 15-character GSTIN first", variant: "destructive" });
      return;
    }
    setFetchingGST(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-gstin', {
        body: { gstin: form.gstin },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "GST Lookup Failed", description: data.error, variant: "destructive" });
        return;
      }
      const state = INDIAN_STATES.find(s => s.code === data.state_code);
      setForm(f => ({
        ...f,
        trade_name: data.trade_name || f.trade_name,
        legal_name: data.legal_name || f.legal_name,
        billing_address_line1: data.address || f.billing_address_line1,
        billing_city: data.city || f.billing_city,
        billing_state_code: state?.code || f.billing_state_code,
        billing_pincode: data.pincode || f.billing_pincode,
      }));
      toast({ title: "Details fetched from GST portal" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to fetch GST details", variant: "destructive" });
    } finally {
      setFetchingGST(false);
    }
  };

  const handleGSTINChange = (value: string) => {
    const upper = value.toUpperCase();
    setForm(f => ({ ...f, gstin: upper }));
    if (upper.length === 15) {
      const state = getStateFromGSTIN(upper);
      if (state) {
        setForm(f => ({ ...f, billing_state_code: state.code }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    
    if (form.customer_type === "registered" && form.gstin) {
      if (!validateGSTIN(form.gstin)) {
        toast({ title: "Invalid GSTIN", description: "Please enter a valid 15-character GSTIN.", variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    const state = INDIAN_STATES.find(s => s.code === form.billing_state_code);
    
    const { error } = await supabase.from("customers").insert({
      company_id: selectedCompany.id,
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
    });

    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Customer created" });
      setDialogOpen(false);
      setForm({ gstin: "", trade_name: "", legal_name: "", contact_person: "", billing_address_line1: "", billing_city: "", billing_state_code: "", billing_pincode: "", mobile: "", email: "", customer_type: "registered" });
      fetchCustomers();
    }
  };

  const filtered = customers.filter(c =>
    c.trade_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.gstin || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.mobile || "").includes(search)
  );

  if (!selectedCompany) return <p className="text-muted-foreground">Please select a company first.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display">Customers</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Customer</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Customer</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Customer Type</Label>
                  <Select value={form.customer_type} onValueChange={(v) => setForm(f => ({ ...f, customer_type: v as CustomerType }))}>
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
                  <div className="col-span-2 space-y-2">
                    <Label>GSTIN</Label>
                    <div className="flex gap-2">
                      <Input value={form.gstin} onChange={(e) => handleGSTINChange(e.target.value)} placeholder="22AAAAA0000A1Z5" maxLength={15} />
                      <Button type="button" variant="outline" onClick={handleFetchGST} disabled={fetchingGST || form.gstin.length !== 15}>
                        {fetchingGST ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch from GST"}
                      </Button>
                    </div>
                  </div>
                )}
                <div className="col-span-2 space-y-2">
                  <Label>Trade Name *</Label>
                  <Input value={form.trade_name} onChange={(e) => setForm(f => ({ ...f, trade_name: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Legal Name</Label>
                  <Input value={form.legal_name} onChange={(e) => setForm(f => ({ ...f, legal_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Contact Person</Label>
                  <Input value={form.contact_person} onChange={(e) => setForm(f => ({ ...f, contact_person: e.target.value }))} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Address</Label>
                  <Input value={form.billing_address_line1} onChange={(e) => setForm(f => ({ ...f, billing_address_line1: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={form.billing_city} onChange={(e) => setForm(f => ({ ...f, billing_city: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Select value={form.billing_state_code} onValueChange={(v) => setForm(f => ({ ...f, billing_state_code: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.code} - {s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mobile</Label>
                  <Input value={form.mobile} onChange={(e) => setForm(f => ({ ...f, mobile: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving..." : "Save Customer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by name, GSTIN, or mobile..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trade Name</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Mobile</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No customers found</TableCell></TableRow>
              ) : (
                filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.trade_name}</TableCell>
                    <TableCell className="font-mono text-sm">{c.gstin || "-"}</TableCell>
                    <TableCell>{c.billing_state_name || "-"}</TableCell>
                    <TableCell className="capitalize">{c.customer_type}</TableCell>
                    <TableCell>{c.mobile || "-"}</TableCell>
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
