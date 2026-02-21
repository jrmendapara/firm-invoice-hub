import { useEffect, useState } from "react";
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
import { Plus, Search } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type Item = Database["public"]["Tables"]["items"]["Row"];

export default function Items() {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "", hsn_sac: "", unit: "Nos", gst_rate: "18",
    default_price: "", item_type: "goods" as "goods" | "services", description: "",
  });

  const fetchItems = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase.from("items").select("*").eq("company_id", selectedCompany.id).eq("is_active", true).order("name");
    setItems(data || []);
  };

  useEffect(() => { fetchItems(); }, [selectedCompany]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    setLoading(true);

    const { error } = await supabase.from("items").insert({
      company_id: selectedCompany.id,
      name: form.name,
      hsn_sac: form.hsn_sac || null,
      unit: form.unit,
      gst_rate: parseFloat(form.gst_rate),
      default_price: form.default_price ? parseFloat(form.default_price) : null,
      item_type: form.item_type,
      description: form.description || null,
    });

    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Item created" });
      setDialogOpen(false);
      setForm({ name: "", hsn_sac: "", unit: "Nos", gst_rate: "18", default_price: "", item_type: "goods", description: "" });
      fetchItems();
    }
  };

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.hsn_sac || "").includes(search)
  );

  if (!selectedCompany) return <p className="text-muted-foreground">Please select a company first.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display">Items / Products</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Item</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Item</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Item Name *</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>HSN/SAC</Label>
                  <Input value={form.hsn_sac} onChange={(e) => setForm(f => ({ ...f, hsn_sac: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={form.unit} onValueChange={(v) => setForm(f => ({ ...f, unit: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>GST Rate (%)</Label>
                  <Select value={form.gst_rate} onValueChange={(v) => setForm(f => ({ ...f, gst_rate: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{GST_RATES.map(r => <SelectItem key={r} value={r.toString()}>{r}%</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Default Price (₹)</Label>
                  <Input type="number" step="0.01" value={form.default_price} onChange={(e) => setForm(f => ({ ...f, default_price: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.item_type} onValueChange={(v) => setForm(f => ({ ...f, item_type: v as "goods" | "services" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="goods">Goods</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Saving..." : "Save Item"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by name or HSN/SAC..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>HSN/SAC</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>GST Rate</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No items found</TableCell></TableRow>
              ) : (
                filtered.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="font-mono text-sm">{item.hsn_sac || "-"}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>{item.gst_rate}%</TableCell>
                    <TableCell>{item.default_price ? `₹${item.default_price}` : "-"}</TableCell>
                    <TableCell className="capitalize">{item.item_type}</TableCell>
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
