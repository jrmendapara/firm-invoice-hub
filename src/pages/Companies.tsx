import { ChangeEvent, useEffect, useMemo, useState } from "react";
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
import { Pencil, Plus } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type Company = Database["public"]["Tables"]["companies"]["Row"];

type CompanyForm = {
  name: string;
  legal_name: string;
  gstin: string;
  pan: string;
  address_line1: string;
  city: string;
  state_code: string;
  pincode: string;
  email: string;
  mobile: string;
  invoice_prefix: string;
  signatory_name: string;
  bank_name: string;
  bank_account_no: string;
  bank_ifsc: string;
  bank_branch: string;
};

const emptyForm: CompanyForm = {
  name: "",
  legal_name: "",
  gstin: "",
  pan: "",
  address_line1: "",
  city: "",
  state_code: "",
  pincode: "",
  email: "",
  mobile: "",
  invoice_prefix: "",
  signatory_name: "",
  bank_name: "",
  bank_account_no: "",
  bank_ifsc: "",
  bank_branch: "",
};

const toFormFromCompany = (company: Company): CompanyForm => ({
  name: company.name || "",
  legal_name: company.legal_name || "",
  gstin: company.gstin || "",
  pan: company.pan || "",
  address_line1: company.address_line1 || "",
  city: company.city || "",
  state_code: company.state_code || "",
  pincode: company.pincode || "",
  email: company.email || "",
  mobile: company.mobile || "",
  invoice_prefix: company.invoice_prefix || "",
  signatory_name: company.signatory_name || "",
  bank_name: company.bank_name || "",
  bank_account_no: company.bank_account_no || "",
  bank_ifsc: company.bank_ifsc || "",
  bank_branch: company.bank_branch || "",
});

export default function Companies() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [form, setForm] = useState<CompanyForm>(emptyForm);

  const isEditMode = useMemo(() => Boolean(editingCompany), [editingCompany]);

  const getLogoPublicUrl = (path: string) => `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/company-logos/${path}`;

  const resetFormState = () => {
    setForm(emptyForm);
    setLogoFile(null);
    setLogoPreview("");
    setEditingCompany(null);
  };

  const openCreateDialog = () => {
    resetFormState();
    setDialogOpen(true);
  };

  const openEditDialog = (company: Company) => {
    setEditingCompany(company);
    setForm(toFormFromCompany(company));
    setLogoFile(null);
    setLogoPreview(company.logo_url ? getLogoPublicUrl(company.logo_url) : "");
    setDialogOpen(true);
  };

  const fetchCompanies = async () => {
    const { data } = await supabase.from("companies").select("*").order("name");
    setCompanies(data || []);
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const resizeLogo = async (file: File): Promise<Blob> => {
    const maxWidth = 900;
    const maxHeight = 300;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = dataUrl;
    });

    const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
    const targetW = Math.max(1, Math.round(img.width * scale));
    const targetH = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Unable to prepare logo canvas");

    ctx.drawImage(img, 0, 0, targetW, targetH);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("Logo conversion failed"));
        resolve(blob);
      }, "image/webp", 0.92);
    });
  };

  const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleFetchGST = () => {
    if (!form.gstin || !validateGSTIN(form.gstin)) {
      toast({ title: "Enter a valid 15-character GSTIN first", variant: "destructive" });
      return;
    }
    const stateCode = form.gstin.substring(0, 2);
    const pan = form.gstin.substring(2, 12);
    const state = INDIAN_STATES.find((s) => s.code === stateCode);
    setForm((f) => ({
      ...f,
      state_code: state?.code || f.state_code,
      pan: pan || f.pan,
    }));
    toast({ title: "State & PAN extracted from GSTIN" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.gstin && !validateGSTIN(form.gstin)) {
      toast({ title: "Invalid GSTIN", variant: "destructive" });
      return;
    }

    setLoading(true);
    const state = INDIAN_STATES.find((s) => s.code === form.state_code);

    let uploadedLogoPath: string | null = null;
    if (logoFile) {
      try {
        const resizedLogo = await resizeLogo(logoFile);
        const fileName = `${Date.now()}-${crypto.randomUUID()}.webp`;
        const filePath = `company/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("company-logos")
          .upload(filePath, resizedLogo, {
            contentType: "image/webp",
            upsert: true,
          });

        if (uploadError) throw uploadError;
        uploadedLogoPath = filePath;
      } catch (err: any) {
        setLoading(false);
        toast({ title: "Logo upload failed", description: err?.message || "Please try another image", variant: "destructive" });
        return;
      }
    }

    const payload = {
      name: form.name,
      legal_name: form.legal_name || null,
      gstin: form.gstin || null,
      pan: form.pan || null,
      address_line1: form.address_line1 || null,
      city: form.city || null,
      state_name: state?.name || "",
      state_code: form.state_code,
      pincode: form.pincode || null,
      email: form.email || null,
      mobile: form.mobile || null,
      invoice_prefix: form.invoice_prefix || null,
      signatory_name: form.signatory_name || null,
      bank_name: form.bank_name || null,
      bank_account_no: form.bank_account_no || null,
      bank_ifsc: form.bank_ifsc || null,
      bank_branch: form.bank_branch || null,
      ...(uploadedLogoPath ? { logo_url: uploadedLogoPath } : {}),
    };

    const query = isEditMode
      ? supabase.from("companies").update(payload).eq("id", editingCompany!.id)
      : supabase.from("companies").insert(payload);

    const { error } = await query;

    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: isEditMode ? "Company updated" : "Company created" });
      setDialogOpen(false);
      resetFormState();
      fetchCompanies();
    }
  };

  if (!isAdmin) return <p className="text-muted-foreground">Admin access required.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-display">Companies</h1>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetFormState();
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />Add Company
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditMode ? "Edit Company" : "Add Company"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2 space-y-2">
                  <Label>Company Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Legal Name</Label>
                  <Input value={form.legal_name} onChange={(e) => setForm((f) => ({ ...f, legal_name: e.target.value }))} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Company Logo (auto-resize)</Label>
                  <Input type="file" accept="image/*" onChange={handleLogoChange} />
                  <p className="text-xs text-muted-foreground">Auto converted to optimized WebP and resized for invoice header.</p>
                  {logoPreview && <img src={logoPreview} alt="Logo preview" className="h-16 w-auto rounded border p-1" />}
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>GSTIN</Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.gstin}
                      onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))}
                      maxLength={15}
                      placeholder="22AAAAA0000A1Z5"
                    />
                    <Button type="button" variant="outline" onClick={handleFetchGST} disabled={form.gstin.length !== 15}>
                      Extract Info
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>PAN</Label>
                  <Input value={form.pan} onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value.toUpperCase() }))} maxLength={10} />
                </div>
                <div className="space-y-2">
                  <Label>State *</Label>
                  <Select value={form.state_code} onValueChange={(v) => setForm((f) => ({ ...f, state_code: v }))}>
                    <SelectTrigger>
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
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Address</Label>
                  <Input value={form.address_line1} onChange={(e) => setForm((f) => ({ ...f, address_line1: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Pincode</Label>
                  <Input value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Mobile</Label>
                  <Input value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Invoice Prefix</Label>
                  <Input
                    value={form.invoice_prefix}
                    onChange={(e) => setForm((f) => ({ ...f, invoice_prefix: e.target.value }))}
                    placeholder="e.g. INV/25-26/"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Signatory Name</Label>
                  <Input value={form.signatory_name} onChange={(e) => setForm((f) => ({ ...f, signatory_name: e.target.value }))} />
                </div>
                <div className="md:col-span-2 mt-2 border-t pt-2">
                  <Label className="text-base font-medium">Bank Details</Label>
                </div>
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input value={form.bank_name} onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Account No</Label>
                  <Input value={form.bank_account_no} onChange={(e) => setForm((f) => ({ ...f, bank_account_no: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>IFSC</Label>
                  <Input value={form.bank_ifsc} onChange={(e) => setForm((f) => ({ ...f, bank_ifsc: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Input value={form.bank_branch} onChange={(e) => setForm((f) => ({ ...f, bank_branch: e.target.value }))} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving..." : isEditMode ? "Update Company" : "Save Company"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No companies yet
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="font-mono text-sm">{c.gstin || "-"}</TableCell>
                    <TableCell>{c.state_name}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(c)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                      </Button>
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
