import { formatINR, formatDate } from "@/lib/indian-states";

interface InvoiceMobileViewProps {
  invoice: any;
  company: any;
  customer: any;
  items: any[];
}

export function InvoiceMobileView({ invoice, company, customer, items }: InvoiceMobileViewProps) {
  const isInterState = company.state_code !== invoice.place_of_supply_code;

  return (
    <div className="print:hidden space-y-3 sm:hidden">
      <div className="rounded-md border bg-white p-3">
        <h2 className="text-base font-bold">{company.name}</h2>
        <p className="text-xs text-muted-foreground">Tax Invoice</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="font-medium">Invoice No</div>
            <div>{invoice.invoice_number}</div>
          </div>
          <div>
            <div className="font-medium">Date</div>
            <div>{formatDate(invoice.invoice_date)}</div>
          </div>
          <div>
            <div className="font-medium">GSTIN</div>
            <div>{company.gstin || "N/A"}</div>
          </div>
          <div>
            <div className="font-medium">Place of Supply</div>
            <div>{invoice.place_of_supply_state}</div>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-white p-3 text-xs">
        <div className="font-semibold">Bill To</div>
        <div className="mt-1 font-medium">{customer.trade_name}</div>
        <div>
          {[customer.billing_address_line1, customer.billing_address_line2, customer.billing_city, customer.billing_state_name, customer.billing_pincode]
            .filter(Boolean)
            .join(", ")}
        </div>
        {customer.gstin && <div className="mt-1">GSTIN: {customer.gstin}</div>}
      </div>

      <div className="rounded-md border bg-white p-3">
        <div className="mb-2 text-sm font-semibold">Items</div>
        <div className="space-y-2">
          {items.map((item, idx) => {
            const gstRate = isInterState
              ? Number(item.igst_percent || 0)
              : Number(item.cgst_percent || 0) + Number(item.sgst_percent || 0);
            return (
              <div key={item.id || idx} className="rounded border p-2 text-xs">
                <div className="font-medium">{item.items?.name || item.description || "-"}</div>
                <div className="mt-1 grid grid-cols-2 gap-1">
                  <div>Qty: {Number(item.quantity || 0).toFixed(2)}</div>
                  <div>Rate: {Number(item.rate || 0).toFixed(2)}</div>
                  <div>GST %: {gstRate.toFixed(2)}</div>
                  <div className="font-semibold">Amt: {Number(item.total_amount || 0).toFixed(2)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-md border bg-white p-3 text-sm">
        <div className="flex justify-between"><span>Taxable Value</span><span>{formatINR(invoice.total_taxable_value)}</span></div>
        {!isInterState ? (
          <>
            <div className="flex justify-between"><span>CGST</span><span>{formatINR(invoice.total_cgst)}</span></div>
            <div className="flex justify-between"><span>SGST</span><span>{formatINR(invoice.total_sgst)}</span></div>
          </>
        ) : (
          <div className="flex justify-between"><span>IGST</span><span>{formatINR(invoice.total_igst)}</span></div>
        )}
        <div className="mt-1 flex justify-between border-t pt-1 font-bold"><span>Grand Total</span><span>{formatINR(invoice.total_amount)}</span></div>
      </div>
    </div>
  );
}
