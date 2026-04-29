import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { GST_RATES, UNITS } from "@/lib/indian-states";
import { Pencil, Plus, Upload, Package } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import * as XLSX from "xlsx";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, DataTableColumn } from "@/components/common/DataTable";

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
  const [typeFilter, setTypeFilter] = useState("all");
  const [gstFilter, setGstFilter] = useState("all");
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

  const visibleItems = useMemo(
    () =>
      items.filter(
        (i) =>
          (typeFilter === "all" || i.item_type === typeFilter) &&
          (gstFilter === "all" || String(i.gst_rate) === gstFilter),
      ),
    [items, typeFilter, gstFilter],
  );

  const columns: DataTableColumn<Item>[] = [
    {
      id: "name",
      header: "Name",
      cell: (i) => <span className="font-medium">{i.name}</span>,
      sortAccessor: (i) => i.name,
    },
    {
      id: "hsn",
      header: "HSN/SAC",
      cell: (i) => <span className="font-mono text-sm">{i.hsn_sac || "-"}</span>,
      sortAccessor: (i) => i.hsn_sac || "",
    },
    {
      id: "unit",
      header: "Unit",
      cell: (i) => i.unit,
      sortAccessor: (i) => i.unit,
      hideOnMobile: true,
    },
    {
      id: "gst",
      header: "GST Rate",
      cell: (i) => <span className="tabular-nums">{i.gst_rate}%</span>,
      sortAccessor: (i) => Number(i.gst_rate),
    },
    {
      id: "price",
      header: "Price",
      cell: (i) => <span className="tabular-nums">{i.default_price ? `₹${i.default_price}` : "-"}</span>,
      sortAccessor: (i) => Number(i.default_price || 0),
    },
    {
      id: "type",
      header: "Type",
      cell: (i) => <span className="capitalize">{i.item_type}</span>,
      sortAccessor: (i) => i.item_type,
      hideOnMobile: true,
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right w-[1%] whitespace-nowrap",
      cell: (i) => (
        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openEdit(i); }}>
          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
        </Button>
      ),
      hideOnMobile: true,
    },
  ];

  if (!selectedCompany) return <p className="text-muted-foreground">Please select a company first.</p>;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Items / Products"
        description="Catalog of goods and services with HSN/SAC and GST rates."
        actions={<>
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
        </>}
      />

      <DataTable
        data={visibleItems}
        columns={columns}
        rowKey={(i) => i.id}
        onRowClick={(i) => openEdit(i)}
        searchPlaceholder="Search by name or HSN/SAC..."
        searchAccessor={(i) => `${i.name} ${i.hsn_sac || ""} ${i.description || ""}`}
        filters={[
          {
            id: "type",
            label: "Type",
            value: typeFilter,
            onChange: setTypeFilter,
            options: [
              { value: "all", label: "All types" },
              { value: "goods", label: "Goods" },
              { value: "services", label: "Services" },
            ],
          },
          {
            id: "gst",
            label: "GST Rate",
            value: gstFilter,
            onChange: setGstFilter,
            options: [
              { value: "all", label: "All rates" },
              ...GST_RATES.map((r) => ({ value: String(r), label: `${r}%` })),
            ],
          },
        ]}
        initialSort={{ columnId: "name", direction: "asc" }}
        empty={{
          icon: Package,
          title: "No items yet",
          description: "Add items to use them on invoices, or adjust your filters.",
        }}
        mobileTitle={(i) => i.name}
        mobileSubtitle={(i) => `${i.hsn_sac || "—"} • ${i.unit}`}
        mobileAside={(i) => (
          <div className="flex flex-col items-end">
            {i.default_price && <span className="font-semibold tabular-nums">₹{i.default_price}</span>}
            <span className="text-[11px] text-muted-foreground tabular-nums">{i.gst_rate}% GST</span>
          </div>
        )}
        minWidth={860}
      />
    </div>
  );
}
