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
import { GST_RATES, UNITS } from "@/lib/indian-states";
import { Pencil, Plus, Search, Upload } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import * as XLSX from "xlsx";

type Item = Database["public"]["Tables"]["items"]["Row"];

const emptyForm = {
  name: "",
  hsn_sac: "",
  unit: "Nos",
  gst_rate: "18",
  default_price: "",
  item_type: "goods" as "goods" | "services",
  description: "",
};

export default function Items() {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchItems = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase.from("items").select("*").eq("company_id", selectedCompany.id).eq("is_active", true).order("name");
    setItems(data || []);
  };

  useEffect(() => {
    fetchItems();
  }, [selectedCompany]);

  const openCreate = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (item: Item) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      hsn_sac: item.hsn_sac || "",
      unit: item.unit,
      gst_rate: item.gst_rate.toString(),
      default_price: item.default_price?.toString() || "",
      item_type: item.item_type,
      description: item.description || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    setLoading(true);

    const payload = {
      name: form.name,
      hsn_sac: form.hsn_sac || null,
      unit: form.unit,
      gst_rate: parseFloat(form.gst_rate),
      default_price: form.default_price ? parseFloat(form.default_price) : null,
      item_type: form.item_type,
      description: form.description || null,
    };

    const query = editingItem
      ? supabase.from("items").update(payload).eq("id", editingItem.id)
      : supabase.from("items").insert({ company_id: selectedCompany.id, ...payload });

    const { error } = await query;
    setLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingItem ? "Item updated" : "Item created" });
      setDialogOpen(false);
      setEditingItem(null);
      setForm(emptyForm);
      fetchItems();
    }
  };

  const downloadItemsTemplate = () => {
    const rows = [
      { name: "Sample Item", hsn_sac: "9983", unit: "Nos", gst_rate: 18, default_price: 1000, item_type: "goods", description: "Optional" },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ItemsTemplate");
    XLSX.writeFile(wb, "items_import_template.xlsx");
  };

  const handleImportItemsClick = () => {
    downloadItemsTemplate();
    setTimeout(() => importInputRef.current?.click(), 150);
  };

  const handleImportItems = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCompany) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

      const inserts = rows
        .map((r) => ({
          company_id: selectedCompany.id,
          name: String(r.name || r.Name || "").trim(),
          hsn_sac: String(r.hsn_sac || r.HSN || r["HSN/SAC"] || "").trim() || null,
          unit: String(r.unit || r.Unit || "Nos").trim() || "Nos",
          gst_rate: Number(r.gst_rate || r["GST Rate"] || r["GST%"] || 18),
          default_price: r.default_price === "" ? null : Number(r.default_price || r.Price || 0),
          item_type: (String(r.item_type || r.Type || "goods").toLowerCase() === "services" ? "services" : "goods") as "goods" | "services",
          description: String(r.description || r.Description || "").trim() || null,
          is_active: true,
        }))
        .filter((r) => r.name);

      if (inserts.length === 0) {
        toast({ title: "No valid rows found", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("items").insert(inserts);
      if (error) throw error;
      toast({ title: `Imported ${inserts.length} items` });
      fetchItems();
    } catch (err: any) {
      toast({ title: "Import failed", description: err?.message || "Invalid Excel format", variant: "destructive" });
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()) || (i.hsn_sac || "").includes(search));

  if (!selectedCompany) return <p className="text-muted-foreground">Please select a company first.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-display">Items / Products</h1>
        <div className="flex gap-2">
          <input ref={importInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportItems} />
          <Button variant="outline" onClick={handleImportItemsClick}>
            <Upload className="mr-2 h-4 w-4" />Import Excel
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Item" : "Add Item"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2"><Label>Item Name *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>HSN/SAC</Label><Input value={form.hsn_sac} onChange={(e) => setForm((f) => ({ ...f, hsn_sac: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Unit</Label><Select value={form.unit} onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>GST Rate (%)</Label><Select value={form.gst_rate} onValueChange={(v) => setForm((f) => ({ ...f, gst_rate: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{GST_RATES.map((r) => <SelectItem key={r} value={r.toString()}>{r}%</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Default Price (₹)</Label><Input type="number" step="0.01" value={form.default_price} onChange={(e) => setForm((f) => ({ ...f, default_price: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Type</Label><Select value={form.item_type} onValueChange={(v) => setForm((f) => ({ ...f, item_type: v as "goods" | "services" }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="goods">Goods</SelectItem><SelectItem value="services">Services</SelectItem></SelectContent></Select></div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Saving..." : editingItem ? "Update Item" : "Save Item"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by name or HSN/SAC..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>HSN/SAC</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>GST Rate</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No items found</TableCell></TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="font-mono text-sm">{item.hsn_sac || "-"}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>{item.gst_rate}%</TableCell>
                    <TableCell>{item.default_price ? `₹${item.default_price}` : "-"}</TableCell>
                    <TableCell className="capitalize">{item.item_type}</TableCell>
                    <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => openEdit(item)}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button></TableCell>
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
