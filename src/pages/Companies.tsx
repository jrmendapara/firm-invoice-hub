import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { INDIAN_STATES, validateGSTIN } from "@/lib/indian-states";
import { Plus } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type Company = Database["public"]["Tables"]["companies"]["Row"];

export default function Companies() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "", legal_name: "", gstin: "", pan: "",
    address_line1: "", city: "", state_code: "", pincode: "",
    email: "", mobile: "", invoice_prefix: "", signatory_name: "",
    bank_name: "", bank_account_no: "", bank_ifsc: "", bank_branch: "",
  });

  const fetchCompanies = async () => {
    const { data } = await supabase.from("companies").select("*").order("name");
    setCompanies(data || []);
  };

  useEffect(() => { fetchCompanies(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.gstin && !validateGSTIN(form.gstin)) {
      toast({ title: "Invalid GSTIN", variant: "destructive" });
      return;
    }
    setLoading(true);
    const state = INDIAN_STATES.find(s => s.code === form.state_code);

    const { error } = await supabase.from("companies").insert({
      name: form.name, legal_name: form.legal_name || null,
      gstin: form.gstin || null, pan: form.pan || null,
      address_line1: form.address_line1 || null, city: form.city || null,
      state_name: state?.name || "", state_code: form.state_code,
      pincode: form.pincode || null, email: form.email || null,
      mobile: form.mobile || null, invoice_prefix: form.invoice_prefix || null,
      signatory_name: form.signatory_name || null,
      bank_name: form.bank_name || null, bank_account_no: form.bank_account_no || null,
      bank_ifsc: form.bank_ifsc || null, bank_branch: form.bank_branch || null,
    });

    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Company created" });
      setDialogOpen(false);
      fetchCompanies();
    }
  };

  if (!isAdmin) return <p className="text-muted-foreground">Admin access required.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display">Companies</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Company</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Company</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Company Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Legal Name</Label>
                  <Input value={form.legal_name} onChange={(e) => setForm(f => ({ ...f, legal_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>GSTIN</Label>
                  <Input value={form.gstin} onChange={(e) => setForm(f => ({ ...f, gstin: e.target.value.toUpperCase() }))} maxLength={15} />
                </div>
                <div className="space-y-2">
                  <Label>PAN</Label>
                  <Input value={form.pan} onChange={(e) => setForm(f => ({ ...f, pan: e.target.value.toUpperCase() }))} maxLength={10} />
                </div>
                <div className="space-y-2">
                  <Label>State *</Label>
                  <Select value={form.state_code} onValueChange={(v) => setForm(f => ({ ...f, state_code: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>{INDIAN_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.code} - {s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Address</Label>
                  <Input value={form.address_line1} onChange={(e) => setForm(f => ({ ...f, address_line1: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Pincode</Label>
                  <Input value={form.pincode} onChange={(e) => setForm(f => ({ ...f, pincode: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Mobile</Label>
                  <Input value={form.mobile} onChange={(e) => setForm(f => ({ ...f, mobile: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Invoice Prefix</Label>
                  <Input value={form.invoice_prefix} onChange={(e) => setForm(f => ({ ...f, invoice_prefix: e.target.value }))} placeholder="e.g. INV/25-26/" />
                </div>
                <div className="space-y-2">
                  <Label>Signatory Name</Label>
                  <Input value={form.signatory_name} onChange={(e) => setForm(f => ({ ...f, signatory_name: e.target.value }))} />
                </div>
                <div className="col-span-2 mt-2 border-t pt-2">
                  <Label className="text-base font-medium">Bank Details</Label>
                </div>
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input value={form.bank_name} onChange={(e) => setForm(f => ({ ...f, bank_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Account No</Label>
                  <Input value={form.bank_account_no} onChange={(e) => setForm(f => ({ ...f, bank_account_no: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>IFSC</Label>
                  <Input value={form.bank_ifsc} onChange={(e) => setForm(f => ({ ...f, bank_ifsc: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Input value={form.bank_branch} onChange={(e) => setForm(f => ({ ...f, bank_branch: e.target.value }))} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Saving..." : "Save Company"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No companies yet</TableCell></TableRow>
              ) : (
                companies.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="font-mono text-sm">{c.gstin || "-"}</TableCell>
                    <TableCell>{c.state_name}</TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
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
