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
  const minItemRows = 16;
  const fillerRowCount = Math.max(0, minItemRows - (items?.length || 0));
  const logoUrl = company.logo_url
    ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/company-logos/${company.logo_url}`
    : null;

  return (
    <div className="print-invoice mx-auto max-w-[210mm] bg-white p-8 text-[11px] leading-relaxed text-black">
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden !important; }
          .print-invoice, .print-invoice * { visibility: visible !important; }
          .print-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 190mm !important;
            min-height: 277mm;
            max-height: 277mm;
            overflow: hidden;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            font-size: 10px;
            line-height: 1.25;
          }
          .no-print { display: none !important; }
        }
        .print-invoice table { border-collapse: collapse; width: 100%; }
        .print-invoice th, .print-invoice td { border: 1px solid #333; padding: 3px 4px; }
        .print-invoice th { background: #f0f0f0; font-weight: 600; text-align: center; }
      `}</style>

      <div className="mb-0 flex min-h-[277mm] flex-col border-2 border-black">
        <div className="grid grid-cols-[200px_1fr] border-b border-black">
          <div className="flex items-center justify-center border-r border-black p-2">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-[100px] w-[170px] rounded-[24px] border border-[#0d7ca6] object-contain p-2" />
            ) : (
              <div className="flex h-[100px] w-[170px] items-center justify-center rounded-[24px] border border-[#0d7ca6] text-xs text-zinc-500">LOGO</div>
            )}
          </div>
          <div>
            <div className="border-b border-black py-2 text-center text-[22px] font-bold tracking-wide uppercase">{company.name}</div>
            <div className="py-2 text-center text-[12px] font-medium uppercase">
              {[company.address_line1, company.address_line2, company.city, company.state_name, company.pincode].filter(Boolean).join(", ")}
            </div>
            <div className="border-t border-black py-1 text-center text-[10px]">
              {company.mobile ? `Mobile : ${company.mobile}` : ""}
              {company.mobile && company.email ? " | " : ""}
              {company.email ? `E-mail : ${company.email}` : ""}
            </div>
          </div>
        </div>

        <div className="border-b border-black p-3 text-center text-base font-bold">Tax Invoice</div>

        <div className="grid grid-cols-2">
          <div className="border-r border-black p-3">
            <div className="grid grid-cols-2 gap-y-1">
              <div className="font-semibold">GSTIN:</div><div>{company.gstin || "N/A"}</div>
              {company.pan && <><div className="font-semibold">PAN:</div><div>{company.pan}</div></>}
              <div className="font-bold">Invoice No:</div><div>{invoice.invoice_number}</div>
              <div className="font-bold">Date:</div><div>{formatDate(invoice.invoice_date)}</div>
            </div>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-2 gap-y-1">
              <div className="font-semibold">Place of Supply:</div><div>{invoice.place_of_supply_code} - {invoice.place_of_supply_state}</div>
              <div className="font-semibold">Reverse Charge:</div><div>{invoice.is_reverse_charge ? "Yes" : "No"}</div>
              {invoice.eway_bill_number && <><div className="font-semibold">E-Way Bill:</div><div>{invoice.eway_bill_number}</div></>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-black">
          <div className="border-r border-black p-3">
            <div className="mb-1 font-semibold">Bill To:</div>
            <div className="font-bold">{customer.trade_name}</div>
            {customer.billing_address_line1 && <div>{customer.billing_address_line1}</div>}
            {customer.billing_address_line2 && <div>{customer.billing_address_line2}</div>}
            <div>{[customer.billing_city, customer.billing_state_name, customer.billing_pincode].filter(Boolean).join(", ")}</div>
            {customer.gstin && <div className="mt-1 font-semibold">GSTIN: {customer.gstin}</div>}
          </div>
          <div className="p-3">
            <div className="mb-1 font-semibold">Ship To:</div>
            <div className="font-bold">{customer.trade_name}</div>
            <div>{customer.shipping_address_line1 || customer.billing_address_line1 || ""}</div>
            <div>{[customer.shipping_city || customer.billing_city, customer.shipping_state_name || customer.billing_state_name, customer.shipping_pincode || customer.billing_pincode].filter(Boolean).join(", ")}</div>
          </div>
        </div>

        {/* Middle section as reference */}
        <div className="flex-1 border-t border-black min-h-[112mm]">
          <table className="h-full">
            <thead>
              <tr>
                <th className="w-8">S.No</th>
                <th>Product Name</th>
                <th className="w-[56px]">HSN / SAC</th>
                <th className="w-[48px]">Qty</th>
                <th className="w-[64px]">Rate</th>
                <th className="w-[48px]">IGST %</th>
                <th className="w-[92px]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const gstRate = isInterState
                  ? Number(item.igst_percent || 0)
                  : Number(item.cgst_percent || 0) + Number(item.sgst_percent || 0);

                return (
                  <tr key={item.id} className="align-top">
                    <td className="text-center">{idx + 1}</td>
                    <td><div className="font-semibold uppercase">{item.items?.name || item.description || "-"}</div></td>
                    <td className="text-center">{item.hsn_sac || "-"}</td>
                    <td className="text-right">{Number(item.quantity || 0).toFixed(2)}</td>
                    <td className="text-right">{Number(item.rate || 0).toFixed(2)}</td>
                    <td className="text-right">{gstRate.toFixed(2)}</td>
                    <td className="text-right">{Number(item.total_amount || 0).toFixed(2)}</td>
                  </tr>
                );
              })}

              {Array.from({ length: fillerRowCount }).map((_, i) => (
                <tr key={`filler-${i}`}>
                  <td className="h-6 text-center">&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
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
              {!isInterState ? <><div className="flex justify-between"><span>CGST:</span><span>{formatINR(invoice.total_cgst)}</span></div><div className="flex justify-between"><span>SGST:</span><span>{formatINR(invoice.total_sgst)}</span></div></> : <div className="flex justify-between"><span>IGST:</span><span>{formatINR(invoice.total_igst)}</span></div>}
              <div className="flex justify-between border-t border-black pt-1 text-sm font-bold"><span>Grand Total:</span><span>{formatINR(invoice.total_amount)}</span></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-black">
          <div className="border-r border-black p-3">
            {company.bank_name && <><div className="mb-1 font-semibold">Bank Details:</div><div>Bank: {company.bank_name}</div>{company.bank_account_no && <div>A/c No: {company.bank_account_no}</div>}{company.bank_ifsc && <div>IFSC: {company.bank_ifsc}</div>}</>}
            <div className="mt-3 text-[10px]"><div className="font-semibold">Declaration:</div><div>We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct.</div></div>
          </div>
          <div className="p-3 text-right"><div className="font-semibold">For {company.name}</div><div className="mt-12">{company.signatory_name || ""}</div><div className="text-xs">Authorized Signatory</div></div>
        </div>
      </div>
    </div>
  );
}
