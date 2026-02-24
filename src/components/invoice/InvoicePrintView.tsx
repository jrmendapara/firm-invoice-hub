import { formatINR, formatDate, numberToWordsINR } from "@/lib/indian-states";

interface InvoicePrintViewProps {
  invoice: any;
  company: any;
  customer: any;
  items: any[];
  taxSummary: any[];
}

export function InvoicePrintView({ invoice, company, customer, items }: InvoicePrintViewProps) {
  const isInterState = company.state_code !== invoice.place_of_supply_code;
  const logoUrl = company.logo_url
    ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/company-logos/${company.logo_url}`
    : null;

  return (
    <div className="print-invoice mx-auto max-w-[210mm] bg-white p-8 text-[11px] leading-relaxed text-black">
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-invoice { padding: 0 !important; max-width: 100% !important; }
        }
        .print-invoice table { border-collapse: collapse; width: 100%; }
        .print-invoice th, .print-invoice td { border: 1px solid #333; padding: 4px 6px; }
        .print-invoice th { background: #f0f0f0; font-weight: 600; text-align: center; }
      `}</style>

      <div className="mb-1 border-2 border-black">
        <div className="border-b border-black p-3 text-center text-base font-bold">TAX INVOICE</div>
        <div className="grid grid-cols-2">
          <div className="border-r border-black p-3">
            <div className="flex items-start gap-3">
              {logoUrl && <img src={logoUrl} alt="Logo" className="h-12 w-12 object-contain" />}
              <div>
                <div className="text-lg font-bold">{company.name}</div>
                {company.legal_name && <div className="text-xs">{company.legal_name}</div>}
              </div>
            </div>
            <div className="mt-1">
              {company.address_line1 && <div>{company.address_line1}</div>}
              {company.address_line2 && <div>{company.address_line2}</div>}
              <div>{[company.city, company.state_name, company.pincode].filter(Boolean).join(", ")}</div>
              {company.email && <div>Email: {company.email}</div>}
              {company.mobile && <div>Mobile: {company.mobile}</div>}
            </div>
            <div className="mt-1 font-semibold">GSTIN: {company.gstin || "N/A"}</div>
            {company.pan && <div>PAN: {company.pan}</div>}
          </div>
          <div className="p-3">
            <div className="grid grid-cols-2 gap-y-1">
              <div className="font-semibold">Invoice No:</div><div>{invoice.invoice_number}</div>
              <div className="font-semibold">Date:</div><div>{formatDate(invoice.invoice_date)}</div>
              <div className="font-semibold">Place of Supply:</div><div>{invoice.place_of_supply_code} - {invoice.place_of_supply_state}</div>
              <div className="font-semibold">Reverse Charge:</div><div>{invoice.is_reverse_charge ? "Yes" : "No"}</div>
              {invoice.eway_bill_number && <><div className="font-semibold">E-Way Bill:</div><div>{invoice.eway_bill_number}</div></>}
              {invoice.vehicle_number && <><div className="font-semibold">Vehicle No:</div><div>{invoice.vehicle_number}</div></>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-black">
          <div className="border-r border-black p-3">
            <div className="mb-1 font-semibold">Bill To:</div>
            <div className="font-bold">{customer.trade_name}</div>
            {customer.legal_name && <div>{customer.legal_name}</div>}
            {customer.billing_address_line1 && <div>{customer.billing_address_line1}</div>}
            {customer.billing_address_line2 && <div>{customer.billing_address_line2}</div>}
            <div>{[customer.billing_city, customer.billing_state_name, customer.billing_pincode].filter(Boolean).join(", ")}</div>
            {customer.gstin && <div className="mt-1 font-semibold">GSTIN: {customer.gstin}</div>}
          </div>
          <div className="p-3">
            <div className="mb-1 font-semibold">Ship To:</div>
            <div className="font-bold">{customer.trade_name}</div>
            {customer.shipping_address_line1 && <div>{customer.shipping_address_line1}</div>}
            {customer.shipping_address_line2 && <div>{customer.shipping_address_line2}</div>}
            <div>{[customer.shipping_city, customer.shipping_state_name, customer.shipping_pincode].filter(Boolean).join(", ")}</div>
          </div>
        </div>

        <div className="border-t border-black">
          <table>
            <thead>
              <tr>
                <th className="w-8">S.No</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Disc%</th>
                <th>Taxable (₹)</th>
                {isInterState ? <th>IGST (₹)</th> : <><th>CGST (₹)</th><th>SGST (₹)</th></>}
                <th>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="text-center">{idx + 1}</td>
                  <td>{item.description}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-center">{item.discount_percent > 0 ? `${item.discount_percent}%` : "-"}</td>
                  <td className="text-right">{Number(item.taxable_value).toFixed(2)}</td>
                  {isInterState ? (
                    <td className="text-right">{Number(item.igst_amount).toFixed(2)}</td>
                  ) : (
                    <>
                      <td className="text-right">{Number(item.cgst_amount).toFixed(2)}</td>
                      <td className="text-right">{Number(item.sgst_amount).toFixed(2)}</td>
                    </>
                  )}
                  <td className="text-right">{Number(item.total_amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 border-t border-black">
          <div className="border-r border-black p-3">
            <div className="font-semibold">Amount in Words:</div>
            <div className="italic">{invoice.amount_in_words || numberToWordsINR(invoice.total_amount)}</div>
          </div>
          <div className="p-3">
            <div className="space-y-1">
              <div className="flex justify-between"><span>Taxable Value:</span><span>{formatINR(invoice.total_taxable_value)}</span></div>
              {!isInterState && (
                <>
                  <div className="flex justify-between"><span>CGST:</span><span>{formatINR(invoice.total_cgst)}</span></div>
                  <div className="flex justify-between"><span>SGST:</span><span>{formatINR(invoice.total_sgst)}</span></div>
                </>
              )}
              {isInterState && <div className="flex justify-between"><span>IGST:</span><span>{formatINR(invoice.total_igst)}</span></div>}
              {invoice.discount_amount > 0 && <div className="flex justify-between"><span>Discount:</span><span>-{formatINR(invoice.discount_amount)}</span></div>}
              {invoice.round_off !== 0 && <div className="flex justify-between"><span>Round Off:</span><span>{formatINR(invoice.round_off)}</span></div>}
              <div className="flex justify-between border-t border-black pt-1 text-sm font-bold">
                <span>Grand Total:</span><span>{formatINR(invoice.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-black">
          <div className="border-r border-black p-3">
            {company.bank_name && (
              <>
                <div className="mb-1 font-semibold">Bank Details:</div>
                <div>Bank: {company.bank_name}</div>
                {company.bank_branch && <div>Branch: {company.bank_branch}</div>}
                {company.bank_account_no && <div>A/c No: {company.bank_account_no}</div>}
                {company.bank_ifsc && <div>IFSC: {company.bank_ifsc}</div>}
              </>
            )}
            <div className="mt-3 text-[10px]">
              <div className="font-semibold">Declaration:</div>
              <div>We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct.</div>
            </div>
          </div>
          <div className="p-3 text-right">
            <div className="font-semibold">For {company.name}</div>
            <div className="mt-12">{company.signatory_name || ""}</div>
            <div className="text-xs">Authorized Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
}
