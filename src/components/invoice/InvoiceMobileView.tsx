import { formatINR, formatDate, numberToWordsINR } from "@/lib/indian-states";

interface InvoiceMobileViewProps {
  invoice: any;
  company: any;
  customer: any;
  items: any[];
}

export function InvoiceMobileView({ invoice, company, customer, items }: InvoiceMobileViewProps) {
  const isInterState = company.state_code !== invoice.place_of_supply_code;
  const logoUrl = company.logo_url
    ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/company-logos/${company.logo_url}`
    : null;

  return (
    <div className="print:hidden sm:hidden">
      <div className="overflow-hidden rounded-md border-2 border-black bg-white text-[12px] text-black">
        <div className="border-b border-black p-3 text-center">
          {logoUrl && (
            <img src={logoUrl} alt="Logo" className="mx-auto mb-2 h-14 w-auto object-contain" />
          )}
          <h2 className="text-[15px] font-bold uppercase tracking-wide">{company.name}</h2>
          <div className="text-[11px]">
            {[company.address_line1, company.address_line2, company.city, company.state_name, company.pincode]
              .filter(Boolean)
              .join(", ")}
          </div>
          <div className="mt-1 text-[11px]">{company.mobile ? `Mobile: ${company.mobile}` : ""}</div>
        </div>

        <div className="border-b border-black bg-zinc-100 p-2 text-center text-[14px] font-bold">Tax Invoice</div>

        <div className="grid grid-cols-2 border-b border-black">
          <div className="border-r border-black p-2">
            <div><span className="font-semibold">GSTIN:</span> {company.gstin || "N/A"}</div>
            {company.pan && <div><span className="font-semibold">PAN:</span> {company.pan}</div>}
            <div><span className="font-semibold">Invoice No:</span> {invoice.invoice_number}</div>
            <div><span className="font-semibold">Date:</span> {formatDate(invoice.invoice_date)}</div>
          </div>
          <div className="p-2">
            <div><span className="font-semibold">Place of Supply:</span> {invoice.place_of_supply_state}</div>
            <div><span className="font-semibold">Reverse Charge:</span> {invoice.is_reverse_charge ? "Yes" : "No"}</div>
            {invoice.eway_bill_number && <div><span className="font-semibold">E-Way Bill:</span> {invoice.eway_bill_number}</div>}
          </div>
        </div>

        <div className="border-b border-black p-2">
          <div className="font-semibold">Bill To:</div>
          <div className="font-bold uppercase">{customer.trade_name}</div>
          <div>
            {[customer.billing_address_line1, customer.billing_address_line2, customer.billing_city, customer.billing_state_name, customer.billing_pincode]
              .filter(Boolean)
              .join(", ")}
          </div>
          {customer.gstin && <div className="mt-1"><span className="font-semibold">GSTIN:</span> {customer.gstin}</div>}
        </div>

        <div className="p-2">
          <div className="mb-2 text-[13px] font-semibold">Items</div>
          <div className="space-y-2">
            {items.map((item, idx) => {
              const gstRate = isInterState
                ? Number(item.igst_percent || 0)
                : Number(item.cgst_percent || 0) + Number(item.sgst_percent || 0);
              return (
                <div key={item.id || idx} className="rounded border border-black p-2">
                  <div className="font-semibold uppercase">{idx + 1}. {item.items?.name || item.description || "-"}</div>
                  <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                    <div>HSN: {item.hsn_sac || "-"}</div>
                    <div>Qty: {Number(item.quantity || 0).toFixed(2)}</div>
                    <div>Rate: {Number(item.rate || 0).toFixed(2)}</div>
                    <div>GST %: {gstRate.toFixed(2)}</div>
                    <div className="col-span-2 text-right font-bold">Amount: {Number(item.total_amount || 0).toFixed(2)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-black p-2">
          <div className="space-y-1 text-[12px]">
            <div className="flex justify-between"><span>Taxable Value</span><span>{formatINR(invoice.total_taxable_value)}</span></div>
            {!isInterState ? (
              <>
                <div className="flex justify-between"><span>CGST</span><span>{formatINR(invoice.total_cgst)}</span></div>
                <div className="flex justify-between"><span>SGST</span><span>{formatINR(invoice.total_sgst)}</span></div>
              </>
            ) : (
              <div className="flex justify-between"><span>IGST</span><span>{formatINR(invoice.total_igst)}</span></div>
            )}
            <div className="flex justify-between border-t border-black pt-1 text-[13px] font-bold"><span>Grand Total</span><span>{formatINR(invoice.total_amount)}</span></div>
            <div className="pt-1 text-[11px]"><span className="font-semibold">Amount in Words:</span> {invoice.amount_in_words || numberToWordsINR(invoice.total_amount)}</div>
          </div>
        </div>

        {(company.bank_name || company.bank_account_no || company.bank_ifsc) && (
          <div className="border-t border-black p-2 text-[11px]">
            <div className="font-semibold">Bank Details</div>
            {company.bank_name && <div>Bank: {company.bank_name}</div>}
            {company.bank_account_no && <div>A/c No: {company.bank_account_no}</div>}
            {company.bank_ifsc && <div>IFSC: {company.bank_ifsc}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
